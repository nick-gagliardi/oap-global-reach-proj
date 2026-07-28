/**
 * Central LLM config resolver for server-side API routes.
 * IDDB_LLM_* vars are platform-managed (auto-injected by iddb) and take
 * precedence; ANTHROPIC_* is the local-dev fallback.
 */
export function getLLMConfig() {
  const baseUrl =
    process.env.IDDB_LLM_BASE_URL ||
    process.env.ANTHROPIC_BASE_URL ||
    "https://api.anthropic.com";

  const apiKey = process.env.IDDB_LLM_KEY || process.env.ANTHROPIC_API_KEY;

  // Internal cluster URL contains "iddb-system"; external proxy contains "llm.atko.ai".
  const isProxy = baseUrl.includes("llm.atko.ai") || baseUrl.includes("iddb-system");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  // IDDB_LLM_BASE_URL already ends with /v1 — strip it before appending to avoid /v1/v1.
  const endpoint = `${baseUrl.replace(/\/$/, "").replace(/\/v1$/, "")}/v1/messages`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isProxy) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    if (apiKey) headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }

  return { baseUrl, apiKey, model, endpoint, headers, isProxy };
}
