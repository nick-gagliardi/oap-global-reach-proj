import { NextResponse } from "next/server";
import { getContribution, UnprovisionedError } from "@/lib/iddb";
import { extractFromLinks } from "@/lib/google-docs";

export const dynamic = "force-dynamic";

/**
 * Step 1 of the incorporation pipeline (client-driven so each request stays
 * under the platform's ~30s cap): fetch text exports of any link-shared
 * Google Docs among the contribution's resource links. No LLM here.
 *
 * Sharing errors are returned, not stored — the submitter fixes sharing and
 * retries; the contribution row stays `pending`.
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

    const result = await extractFromLinks(contribution.resource_links ?? []);
    const sharingErrors = result.errors.filter((e) => e.sharing);
    return NextResponse.json({
      ok: sharingErrors.length === 0,
      extracts: result.extracts,
      skipped: result.skipped,
      errors: result.errors,
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
