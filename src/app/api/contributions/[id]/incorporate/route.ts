import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getContribution, patchContribution, UnprovisionedError } from "@/lib/iddb";
import { getStrategy } from "@/lib/content";
import { synthesizeChapter, incorporateIntoFile, listChapterTitles } from "@/lib/incorporate";
import { openContentPr, getGithubConfig } from "@/lib/github";
import { parseGoogleDocId } from "@/lib/google-docs";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  extracts: z
    .array(z.object({ url: z.string(), text: z.string().max(20_000) }))
    .max(5)
    .default([]),
});

/**
 * Step 2 of the incorporation pipeline: synthesize the contribution (+ doc
 * extracts from step 1) into one house-style chapter, splice + validate the
 * strategy file, and open a PR on the content repo. Merging the PR (auto-
 * deploy) is what publishes — the only human step left in the flow.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution id" }, { status: 400 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid extracts payload" }, { status: 400 });
  }

  if (!getGithubConfig().token) {
    return NextResponse.json(
      { error: "HUB_GITHUB_TOKEN is not configured — incorporation is disabled." },
      { status: 503 },
    );
  }

  let contribution;
  try {
    contribution = await getContribution(id);
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }
  if (!contribution) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }
  if (contribution.status === "incorporated" && contribution.pr_url) {
    // Idempotence: a retry after success just returns the existing PR.
    return NextResponse.json({ ok: true, prUrl: contribution.pr_url, alreadyDone: true });
  }

  const strategy = getStrategy(contribution.strategy_slug);
  if (!strategy) {
    return NextResponse.json({ error: `Unknown strategy: ${contribution.strategy_slug}` }, { status: 400 });
  }

  const fail = async (message: string, status = 502) => {
    await patchContribution(id, { status: "failed", error: message.slice(0, 500) }).catch(() => null);
    return NextResponse.json({ error: message }, { status });
  };

  try {
    // 1. Synthesize one chapter.
    const referenceLinks = (contribution.resource_links ?? []).filter(
      (l) => !parseGoogleDocId(l) || !body.extracts.some((e) => e.url === l),
    );
    const plan = await synthesizeChapter({
      strategyTitle: strategy.title,
      strategySlug: strategy.slug,
      currentBody: strategy.body,
      existingChapterTitles: listChapterTitles(strategy.body),
      contribution: contribution.content,
      regions: contribution.regions,
      submittedBy: contribution.submitted_by,
      extracts: body.extracts,
      referenceLinks,
    });

    if (plan.mode === "reject") {
      // An honest editorial reject, not a pipeline failure: record and surface.
      await patchContribution(id, { status: "declined", error: plan.reason ?? null });
      return NextResponse.json({ ok: false, rejected: true, reason: plan.reason }, { status: 422 });
    }

    // 2. Splice + validate against the same schema/parsers the build uses.
    const rawFile = fs.readFileSync(
      path.join(process.cwd(), "content", "strategies", `${strategy.slug}.md`),
      "utf8",
    );
    const { newFile, chapterTitle } = incorporateIntoFile({
      rawFile,
      slug: strategy.slug,
      plan,
      submittedBy: contribution.submitted_by,
    });

    // 3. Open the PR.
    const branchName = `contrib/${strategy.slug}-${id.slice(0, 6)}`;
    const docSources = body.extracts.map((e) => `- ${e.url}`).join("\n");
    const prBody = [
      `AI-incorporated contribution to **${strategy.title}**.`,
      "",
      `**Submitted by:** ${contribution.submitted_by}${contribution.submitted_email ? ` (${contribution.submitted_email})` : ""}`,
      `**Regions:** ${contribution.regions.join(", ")}`,
      `**Chapter:** ${chapterTitle} (${plan.mode})`,
      "",
      "### Original contribution",
      "",
      contribution.content,
      docSources ? `\n### Document sources\n\n${docSources}` : "",
      referenceLinks.length ? `\n### Reference links (not fetched)\n\n${referenceLinks.map((l) => `- ${l}`).join("\n")}` : "",
      "",
      "---",
      "_This chapter was synthesized and validated automatically. Review the diff for accuracy before merging; merge = publish on next deploy._",
    ].join("\n");

    const { prUrl } = await openContentPr({
      filePath: `content/strategies/${strategy.slug}.md`,
      content: newFile,
      branchName,
      commitMessage: `content(${strategy.slug}): ${chapterTitle}\n\nContributed by ${contribution.submitted_by}; synthesized by the hub incorporation pipeline.`,
      prTitle: `content(${strategy.slug}): ${chapterTitle}`,
      prBody,
    });

    await patchContribution(id, {
      status: "incorporated",
      pr_url: prUrl,
      chapter_title: chapterTitle,
      error: null,
    });

    return NextResponse.json({ ok: true, prUrl, chapterTitle, mode: plan.mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
