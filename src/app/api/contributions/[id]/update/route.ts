import { NextResponse } from "next/server";
import { z } from "zod";
import { getContribution, patchContribution, UnprovisionedError } from "@/lib/iddb";
import { getStrategy } from "@/lib/content";
import { reviseChapter, validateChapter } from "@/lib/incorporate";
import type { DocExtract } from "@/lib/google-docs";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  update: z.string().trim().min(10).max(5000),
  attachments: z
    .array(z.object({ name: z.string().trim().min(1).max(120), text: z.string().min(1).max(15_000) }))
    .max(3)
    .default([])
    .refine((a) => a.reduce((n, f) => n + f.text.length, 0) <= 30_000, {
      message: "attachments exceed the 30k character budget",
    }),
});

/**
 * Contributor update to an already-incorporated chapter: the LLM revises the
 * stored chapter with the new material (new info wins over stale facts), the
 * result is re-validated and patched in place — live on the next page load.
 * The update text and new attachments are appended to the contribution record
 * for provenance.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution id" }, { status: 400 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    const detail =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "Invalid JSON body";
    return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
  }

  try {
    const contribution = await getContribution(id);
    if (!contribution) {
      return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    }
    if (contribution.status !== "incorporated" || !contribution.chapter_markdown) {
      return NextResponse.json(
        { error: "Only live (incorporated) chapters can be updated." },
        { status: 409 },
      );
    }
    const strategy = getStrategy(contribution.strategy_slug);
    if (!strategy) {
      return NextResponse.json(
        { error: `Unknown strategy: ${contribution.strategy_slug}` },
        { status: 400 },
      );
    }

    const extracts: DocExtract[] = body.attachments.map((a) => ({
      url: `attachment:${a.name}`,
      text: a.text,
    }));

    const result = await reviseChapter({
      strategyTitle: strategy.title,
      strategySlug: strategy.slug,
      chapterTitle: contribution.chapter_title ?? "Untitled chapter",
      chapterMarkdown: contribution.chapter_markdown,
      originalContribution: contribution.content,
      regions: contribution.regions,
      submittedBy: contribution.submitted_by,
      update: body.update,
      extracts,
    });

    if ("rejected" in result) {
      return NextResponse.json({ ok: false, rejected: true, reason: result.rejected }, { status: 422 });
    }

    validateChapter({
      slug: strategy.slug,
      chapterTitle: result.chapterTitle,
      markdown: result.markdown,
    });

    // Provenance: append the update text; merge new attachments (keep the
    // most recent 3 within the shared 30k budget).
    const stamp = new Date().toISOString().slice(0, 10);
    const newContent = `${contribution.content}\n\n— Update (${stamp}):\n${body.update}`.slice(0, 20_000);
    const mergedAttachments = [...(contribution.attachments ?? []), ...body.attachments].slice(-3);
    let budget = 30_000;
    for (const a of mergedAttachments) {
      a.text = a.text.slice(0, Math.max(0, budget));
      budget -= a.text.length;
    }

    await patchContribution(id, {
      chapter_title: result.chapterTitle,
      chapter_markdown: result.markdown,
      content: newContent,
      attachments: mergedAttachments.filter((a) => a.text.length > 0),
      content_updated_at: new Date().toISOString(),
      error: null,
    });

    return NextResponse.json({
      ok: true,
      chapterTitle: result.chapterTitle,
      href: `/strategies/${strategy.slug}`,
    });
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 502 },
    );
  }
}
