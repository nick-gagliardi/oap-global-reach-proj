import { NextResponse } from "next/server";
import { z } from "zod";
import { UnprovisionedError, updateContributionStatus, patchContribution } from "@/lib/iddb";
import { getRequestIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

const PatchSchema = z.union([
  z.object({ status: z.enum(["pending", "incorporated", "declined", "failed"]) }),
  z.object({
    content: z.string().trim().min(1).max(20_000).optional(),
    regions: z.array(z.string()).max(5).optional(),
    resource_links: z.array(z.string().url()).max(10).optional(),
  }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution id" }, { status: 400 });
  }

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (err) {
    const detail = err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid body";
    return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
  }

  // Optional review-gate. Enforced only when ADMIN_EMAILS is configured AND an
  // identity header is actually present. When identity discovery is incomplete
  // (getRequestIdentity → null because the platform's header name is unknown),
  // we FAIL OPEN behind the iddb employee-auth perimeter — the old behavior
  // 403'd every status change for everyone, which silently broke Dismiss/
  // Unpublish/Republish in prod the moment ADMIN_EMAILS was set.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    const identity = getRequestIdentity(req.headers);
    if (identity?.email && !adminEmails.includes(identity.email.toLowerCase())) {
      return NextResponse.json({ error: "Not authorized to review contributions" }, { status: 403 });
    }
  }

  try {
    let updated;
    if ("status" in body) {
      updated = await updateContributionStatus(id, body.status);
    } else {
      const fields: Parameters<typeof patchContribution>[1] = {};
      if (body.content !== undefined) fields.content = body.content;
      if (body.regions !== undefined) fields.regions = body.regions;
      if (body.resource_links !== undefined) fields.resource_links = body.resource_links;
      updated = await patchContribution(id, fields);
    }
    if (!updated) {
      return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, contribution: updated });
  } catch (err) {
    if (err instanceof UnprovisionedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update contribution" },
      { status: 502 },
    );
  }
}
