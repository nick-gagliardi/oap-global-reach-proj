import { NextResponse } from "next/server";
import { z } from "zod";
import { REGIONS, STRATEGY_SLUGS } from "@/lib/regions";
import {
  countPending,
  insertContribution,
  listContributions,
  UnprovisionedError,
  type ContributionStatus,
} from "@/lib/iddb";
import { getRequestIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  submittedBy: z.string().trim().min(1).max(120),
  strategySlug: z.enum(STRATEGY_SLUGS),
  regions: z.array(z.enum(REGIONS)).min(1),
  content: z.string().trim().min(10).max(5000),
  resourceLinks: z
    .array(z.string().trim().url().startsWith("http"))
    .max(10)
    .default([]),
  // Submitter-attached file text (exported from org-restricted Google files
  // the server can't fetch). Caps mirror the Google-extract budget.
  attachments: z
    .array(z.object({ name: z.string().trim().min(1).max(120), text: z.string().min(1).max(15_000) }))
    .max(3)
    .default([])
    .refine((a) => a.reduce((n, f) => n + f.text.length, 0) <= 30_000, {
      message: "attachments exceed the 30k character budget",
    }),
});

const STATUSES: ContributionStatus[] = ["pending", "incorporated", "declined", "failed"];

export async function POST(req: Request) {
  let body: z.infer<typeof CreateSchema>;
  try {
    body = CreateSchema.parse(await req.json());
  } catch (err) {
    const detail =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "Invalid JSON body";
    return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
  }

  // Prefer the platform-provided identity when available (Phase 1 discovery).
  const identity = getRequestIdentity(req.headers);

  try {
    const created = await insertContribution({
      submitted_by: identity?.name || body.submittedBy,
      submitted_email: identity?.email ?? null,
      strategy_slug: body.strategySlug,
      regions: body.regions,
      content: body.content,
      resource_links: body.resourceLinks,
      // Omit entirely when empty so pre-migration-004 stores still accept rows.
      ...(body.attachments.length > 0 ? { attachments: body.attachments } : {}),
    });
    return NextResponse.json({ ok: true, contribution: created }, { status: 201 });
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save contribution" },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status");
  if (rawStatus && !STATUSES.includes(rawStatus as ContributionStatus)) {
    return NextResponse.json({ error: `Invalid status: ${rawStatus}` }, { status: 400 });
  }

  try {
    const [contributions, pendingCount] = await Promise.all([
      listContributions((rawStatus as ContributionStatus) ?? undefined),
      countPending(),
    ]);
    return NextResponse.json({ ok: true, contributions, pendingCount });
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list contributions" },
      { status: 502 },
    );
  }
}
