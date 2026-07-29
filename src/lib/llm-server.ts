import { getLLMConfig } from "./llm";

/**
 * Server-side LLM helper. Always runs with an AbortController so a hung
 * upstream can never pin an invocation past the deployment gateway's ~30s cap.
 */
export interface CallLLMServerOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  /** Abort timeout in ms. Keep well below the 30s gateway window. */
  timeoutMs?: number;
  /** Override the configured default model. */
  model?: string;
}

export class LLMTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    this.name = "LLMTimeoutError";
  }
}

export async function callLLMServer(opts: CallLLMServerOptions): Promise<string> {
  const { endpoint, headers, model, apiKey } = getLLMConfig();
  if (!apiKey) throw new Error("LLM service key not configured on the server.");

  const timeoutMs = opts.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model ?? model,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`LLM ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ""}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string" || !text) throw new Error("Empty response from the model.");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Multi-turn variant of callLLMServer — passes a messages array through. */
export async function callLLMChat(opts: {
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
}): Promise<string> {
  const { endpoint, headers, model, apiKey } = getLLMConfig();
  if (!apiKey) throw new Error("LLM service key not configured on the server.");

  const timeoutMs = opts.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model ?? model,
        max_tokens: opts.maxTokens ?? 2048,
        // The system prompt embeds the whole content library and is identical
        // across calls — mark it cacheable so repeat queries within the cache
        // TTL pay ~10% of the input price and process faster.
        ...(opts.system
          ? {
              system: [
                {
                  type: "text",
                  text: opts.system,
                  cache_control: { type: "ephemeral" },
                },
              ],
            }
          : {}),
        messages: opts.messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`LLM ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ""}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string" || !text) throw new Error("Empty response from the model.");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a JSON value out of model text: strips ``` fences, and if the whole
 * string still isn't valid JSON, falls back to the first {...} / [...] span.
 * Throws when no JSON can be found.
 */
export function parseJsonFromLLM<T = unknown>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // fall through to the span match
  }
  const match = stripped.match(/[\[{][\s\S]*[\]}]/);
  if (!match) throw new Error("No JSON found in the model response.");
  return JSON.parse(match[0]) as T;
}
