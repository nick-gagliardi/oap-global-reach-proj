import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAssistantSystemPrompt } from "@/lib/assistant";
import { callLLMChat, LLMTimeoutError } from "@/lib/llm-server";

export const dynamic = "force-dynamic";

const RequestSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000),
        }),
      )
      .min(1)
      .max(24),
  })
  .refine((v) => v.messages[v.messages.length - 1].role === "user", {
    message: "The last message must be from the user.",
  });

export async function POST(req: Request) {
  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await req.json());
  } catch (err) {
    const detail =
      err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid JSON body";
    return NextResponse.json({ error: `Invalid request: ${detail}` }, { status: 400 });
  }

  const timeoutMs = Number(process.env.PREP_TIMEOUT_MS) || 25_000;

  try {
    const reply = await callLLMChat({
      messages: input.messages,
      system: buildAssistantSystemPrompt(),
      maxTokens: 1500,
      timeoutMs,
    });
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    if (err instanceof LLMTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 504 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assistant request failed" },
      { status: 502 },
    );
  }
}
