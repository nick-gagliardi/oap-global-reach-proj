import { NextResponse } from "next/server";
import { z } from "zod";
import { UnprovisionedError, updateContributionStatus } from "@/lib/iddb";
import { getRequestIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["pending", "incorporated", "declined"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution id" }, { status: 400 });
  }

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request: status must be pending | incorporated | declined" },
      { status: 400 },
    );
  }

  // Optional review-gate: only enforced when ADMIN_EMAILS is configured AND
  // the platform exposes a trustworthy identity (Phase 1 discovery).
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    const identity = getRequestIdentity(req.headers);
    if (!identity?.email || !adminEmails.includes(identity.email.toLowerCase())) {
      return NextResponse.json({ error: "Not authorized to review contributions" }, { status: 403 });
    }
  }

  try {
    const updated = await updateContributionStatus(id, body.status);
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
