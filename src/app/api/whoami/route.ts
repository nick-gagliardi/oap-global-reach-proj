import { NextResponse } from "next/server";
import { getRequestIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * Phase 1 Discovery A probe: shows which headers the iddb platform forwards,
 * so we can learn how the authenticated employee identity reaches the app.
 * Sensitive header values are truncated. Once the identity mechanism is
 * confirmed, keep this route but rely on the parsed `identity` field.
 */
const SENSITIVE = ["authorization", "cookie", "x-api-key", "apikey"];

export async function GET(req: Request) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, name) => {
    headers[name] = SENSITIVE.includes(name.toLowerCase()) ? `${value.slice(0, 12)}…` : value;
  });

  return NextResponse.json({
    identity: getRequestIdentity(req.headers),
    headers,
  });
}
