import { NextResponse } from "next/server";
import { UnprovisionedError } from "@/lib/iddb";

export const dynamic = "force-dynamic";

/**
 * Deployment probe. Booleans only — never echoes secret values.
 * db: 'ok' | 'unprovisioned' | 'error' | 'unconfigured'
 */
export async function GET() {
  const env = {
    iddbUrl: !!process.env.IDDB_URL,
    iddbKey: !!(
      process.env.IDDB_APP_KEY ||
      process.env.IDDB_SERVICE_KEY ||
      process.env.IDDB_ANON_KEY
    ),
    llmBase: !!(process.env.IDDB_LLM_BASE_URL || process.env.ANTHROPIC_BASE_URL),
    llmKey: !!(process.env.IDDB_LLM_KEY || process.env.ANTHROPIC_API_KEY),
  };

  let db: "ok" | "unprovisioned" | "error" | "unconfigured" = "unconfigured";
  if (env.iddbUrl && env.iddbKey) {
    try {
      const base = process.env.IDDB_URL!.replace(/\/$/, "");
      const key =
        process.env.IDDB_APP_KEY || process.env.IDDB_SERVICE_KEY || process.env.IDDB_ANON_KEY!;
      const res = await fetch(`${base}/rest/v1/contributions?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.ok) db = "ok";
      else {
        const text = await res.text();
        db =
          res.status === 404 || text.includes("42P01") || /relation .* does not exist/.test(text)
            ? "unprovisioned"
            : "error";
      }
    } catch (err) {
      db = err instanceof UnprovisionedError ? "unprovisioned" : "error";
    }
  }

  return NextResponse.json({ ok: Object.values(env).every(Boolean) && db === "ok", env, db });
}
