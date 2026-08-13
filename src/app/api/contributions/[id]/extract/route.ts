import { NextResponse } from "next/server";
import { getContribution, UnprovisionedError } from "@/lib/iddb";
import { extractFromLinks, MAX_CHARS_TOTAL, type DocExtract } from "@/lib/google-docs";

export const dynamic = "force-dynamic";

/**
 * Step 1 of the incorporation pipeline (client-driven so each request stays
 * under the platform's ~30s cap). Extract sources, in priority order:
 *
 * 1. Submitter-attached file text (stored on the row) — the path for
 *    org-restricted Google files the server can never fetch.
 * 2. Google-link fetches (works for genuinely public files) filling whatever
 *    character budget remains.
 *
 * A sharing-blocked link is only FATAL when there is no other source at all —
 * when attachments exist, the attachment is very likely that same file, so the
 * pipeline continues and the block is surfaced as a warning.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution id" }, { status: 400 });
  }

  try {
    const contribution = await getContribution(id);
    if (!contribution) {
      return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    }

    // 1. Attachments first.
    const extracts: DocExtract[] = [];
    let budget = MAX_CHARS_TOTAL;
    for (const att of contribution.attachments ?? []) {
      if (budget <= 0) break;
      const text = att.text.slice(0, budget);
      extracts.push({ url: `attachment:${att.name}`, text });
      budget -= text.length;
    }

    // 2. Google links fill the remaining budget.
    const linkResult =
      budget > 0
        ? await extractFromLinks(contribution.resource_links ?? [])
        : { extracts: [], skipped: contribution.resource_links ?? [], errors: [] };
    for (const ex of linkResult.extracts) {
      if (budget <= 0) break;
      ex.text = ex.text.slice(0, budget);
      budget -= ex.text.length;
      extracts.push(ex);
    }

    const sharingErrors = linkResult.errors.filter((e) => e.sharing);
    // Fatal only when a sharing block leaves us with nothing to synthesize from.
    const blocked = sharingErrors.length > 0 && extracts.length === 0;

    return NextResponse.json({
      ok: !blocked,
      extracts,
      skipped: linkResult.skipped,
      errors: linkResult.errors,
      warnings: !blocked
        ? sharingErrors.map(
            (e) =>
              `Couldn't fetch ${e.url} (restricted sharing) — proceeding with the attached file text.`,
          )
        : [],
    });
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read attachments" },
      { status: 502 },
    );
  }
}
