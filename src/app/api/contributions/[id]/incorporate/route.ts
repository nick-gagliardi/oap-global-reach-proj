import { NextResponse } from "next/server";
import { z } from "zod";
import { getContribution, patchContribution, UnprovisionedError } from "@/lib/iddb";
import { getStrategy } from "@/lib/content";
import { synthesizeChapter, validateChapter, listChapterTitles } from "@/lib/incorporate";
import { parseGoogleDocId } from "@/lib/google-docs";
import { mergeAddendaIntoBody } from "@/lib/content-live";
import { listIncorporatedBySlug } from "@/lib/iddb";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  extracts: z
    .array(z.object({ url: z.string(), text: z.string().max(20_000) }))
    .max(5)
    .default([]),
});

/**
 * Step 2 of the incorporation pipeline: synthesize the contribution (+ doc
 * extracts from step 1) into one house-style chapter, validate it, and store
 * it as a LIVE addendum — it renders on the strategy page immediately (the
 * live content layer merges DB chapters at request time; no PR, no redeploy).
 * Unpublishing is a status flip in the tracker.
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

  const strategy = getStrategy(contribution.strategy_slug);
  if (!strategy) {
    return NextResponse.json(
      { error: `Unknown strategy: ${contribution.strategy_slug}` },
      { status: 400 },
    );
  }
  const href = `/strategies/${strategy.slug}`;

  if (contribution.status === "incorporated" && contribution.chapter_markdown) {
    // Idempotence: a retry after success is a no-op.
    return NextResponse.json({
      ok: true,
      chapterTitle: contribution.chapter_title,
      href,
      alreadyDone: true,
    });
  }

  const fail = async (message: string, status = 502) => {
    await patchContribution(id, { status: "failed", error: message.slice(0, 500) }).catch(
      () => null,
    );
    return NextResponse.json({ error: message }, { status });
  };

  try {
    // The model should see the page as readers see it — including addenda
    // already published by earlier contributions (so replace decisions and
    // duplicate-avoidance work against live content).
    const addenda = await listIncorporatedBySlug();
    const liveBody = mergeAddendaIntoBody(strategy.body, addenda.get(strategy.slug) ?? []);

    // 1. Synthesize one chapter.
    const referenceLinks = (contribution.resource_links ?? []).filter(
      (l) => !parseGoogleDocId(l) || !body.extracts.some((e) => e.url === l),
    );
    const plan = await synthesizeChapter({
      strategyTitle: strategy.title,
      strategySlug: strategy.slug,
      currentBody: liveBody,
      existingChapterTitles: listChapterTitles(liveBody),
      contribution: contribution.content,
      regions: contribution.regions,
      submittedBy: contribution.submitted_by,
      extracts: body.extracts,
      referenceLinks,
    });

    if (plan.mode === "reject") {
      // An honest editorial reject (spam/garbage only per the rubric).
      await patchContribution(id, { status: "declined", error: plan.reason ?? null });
      return NextResponse.json({ ok: false, rejected: true, reason: plan.reason }, { status: 422 });
    }

    // 2. Validate at the storage boundary with the renderer's own parser.
    const chapterTitle = plan.chapterTitle!.trim();
    validateChapter({ slug: strategy.slug, chapterTitle, markdown: plan.markdown! });

    // 3. Publish: store the chapter — the live content layer renders it on the
    // next request to the strategy page.
    await patchContribution(id, {
      status: "incorporated",
      chapter_title: chapterTitle,
      chapter_markdown: plan.markdown!.trim(),
      mode: plan.mode,
      replace_title: plan.mode === "replace" ? (plan.replaceTitle ?? null) : null,
      error: null,
    });

    return NextResponse.json({ ok: true, chapterTitle, href, mode: plan.mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
