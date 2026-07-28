import { NextResponse } from "next/server";
import { z } from "zod";
import { getObjection, getObjections, getRegion, getStrategy, getVertical, getVerticals } from "@/lib/content";
import {
  FIRST_INVITE,
  OBJECTION_LABELS,
  REGIONS,
  REGION_LABELS,
  SCENARIOS,
  VERTICALS,
  VERTICAL_LABELS,
  type Objection,
} from "@/lib/regions";
import { callLLMServer, LLMTimeoutError, parseJsonFromLLM } from "@/lib/llm-server";

export const dynamic = "force-dynamic";

const RequestSchema = z
  .object({
    region: z.enum(REGIONS),
    vertical: z.enum(VERTICALS).optional(),
    scenario: z.enum(SCENARIOS).optional(),
    freeText: z.string().trim().min(1).max(500).optional(),
  })
  .refine((v) => (v.scenario ? !v.freeText : !!v.freeText), {
    message: "Provide either a scenario or freeText (not both).",
  });

const ResultSchema = z.object({
  talkingPoints: z.array(z.string().min(1)).min(1),
  objectionResponse: z.string().min(1),
  outreachDraft: z.string().min(1),
  sources: z.array(z.string()).default([]),
});

function systemPrompt(mode: "first-invite" | "objection"): string {
  const secondCard =
    mode === "first-invite"
      ? `"objectionResponse" holds the VALUE CASE for attending: 1-2 persuasive paragraphs a rep can speak from — proactive, no defensive framing (there is no objection yet).`
      : `"objectionResponse" is 1-2 paragraphs responding to the customer's objection, and it MUST start with an acknowledgment of the concern, not a rebuttal.`;

  return `You are a sales-conversation prep assistant for Okta's Global Reach team, helping a rep prepare to invite a customer to Oktane (Okta's annual conference).

Rules:
- You may use ONLY the reference documents provided between <library> tags.
- If the documents do not contain enough relevant material for this request, respond with exactly: {"insufficient_context": true}
- Never invent pricing, discounts, named customers, statistics, or commitments that are not present in the library. Preserve any [PLACEHOLDER] markers verbatim rather than filling them in.
- ${secondCard}
- Respond with ONLY a JSON object of this exact shape (no prose, no markdown fences):
{"talkingPoints": ["3 to 5 concise, region-localized bullets"], "objectionResponse": "see above", "outreachDraft": "a short copy-paste-ready outreach message", "sources": ["titles of the library documents you used"]}`;
}

function doc(title: string, body: string): string {
  return `<doc title="${title}">\n${body.trim()}\n</doc>`;
}

export async function POST(req: Request) {
  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await req.json());
  } catch (err) {
    const detail =
      err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid JSON body";
    return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
  }

  const mode = input.scenario === FIRST_INVITE ? "first-invite" : "objection";
  const regionDoc = getRegion(input.region);
  const docs: string[] = [doc(`Region guide: ${regionDoc.title}`, regionDoc.body)];

  if (input.vertical) {
    const v = getVertical(input.vertical);
    if (v) docs.push(doc(`Vertical guide: ${v.title}`, v.body));
  }

  // Strategy sections start empty (populated by contributions) — only include
  // the objection-relevant ones once they have real content.
  const strategyDocs = (slugs: readonly ("regional-pricing" | "attendance-value" | "success-stories")[]) => {
    for (const slug of slugs) {
      const s = getStrategy(slug);
      if (s && s.body.trim()) docs.push(doc(`Strategy: ${s.title}`, s.body));
    }
  };

  let scenario: string;
  if (input.scenario === FIRST_INVITE) {
    // No vertical chosen → include all vertical guides so the model can pick hooks.
    if (!input.vertical) {
      for (const v of getVerticals()) docs.push(doc(`Vertical guide: ${v.title}`, v.body));
    }
    strategyDocs(["attendance-value", "success-stories"]);
    scenario =
      "The rep is making the FIRST invitation to Oktane — there is no pushback yet. Build the proactive case for attending.";
  } else if (input.scenario) {
    const o = getObjection(input.scenario);
    if (o) docs.push(doc(`Objection guide: ${o.title}`, o.body));
    scenario = `The customer's objection: "${OBJECTION_LABELS[input.scenario as Objection]}"`;
  } else {
    // Free text: full objection library plus objection-relevant strategy content.
    for (const o of getObjections()) docs.push(doc(`Objection guide: ${o.title}`, o.body));
    strategyDocs(["regional-pricing", "attendance-value"]);
    scenario = `The rep describes the scenario in their own words: "${input.freeText}"`;
  }

  const prompt = [
    `<library>`,
    docs.join("\n\n"),
    `</library>`,
    ``,
    `Prep request:`,
    `- Region: ${REGION_LABELS[input.region]}`,
    input.vertical
      ? `- Customer vertical: ${VERTICAL_LABELS[input.vertical]}`
      : `- Customer vertical: not specified`,
    `- ${scenario}`,
  ].join("\n");

  const timeoutMs = Number(process.env.PREP_TIMEOUT_MS) || 25_000;

  let raw: string;
  try {
    raw = await callLLMServer({ prompt, system: systemPrompt(mode), maxTokens: 1500, timeoutMs });
  } catch (err) {
    if (err instanceof LLMTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : "LLM request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const fallback = NextResponse.json({
    ok: false,
    reason: "insufficient_context",
    message:
      "The content library doesn't have matching material for this request yet. Try a different region or scenario — or contribute the missing content.",
  });

  let parsed: unknown;
  try {
    parsed = parseJsonFromLLM(raw);
  } catch {
    return fallback;
  }
  if (parsed && typeof parsed === "object" && "insufficient_context" in parsed) {
    return fallback;
  }
  const result = ResultSchema.safeParse(parsed);
  if (!result.success) return fallback;

  // Clamp rather than reject when the model over-delivers bullets.
  const talkingPoints = result.data.talkingPoints.slice(0, 5);

  return NextResponse.json({ ok: true, mode, result: { ...result.data, talkingPoints } });
}
