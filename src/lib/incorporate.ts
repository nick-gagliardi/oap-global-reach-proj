import matter from "gray-matter";
import { callLLMServer, parseJsonFromLLM } from "./llm-server";
import { StrategyFrontmatterSchema } from "./content-schema";
import { splitRegionSegments } from "./content";
import { REGIONS } from "./regions";
import type { DocExtract } from "./google-docs";

/**
 * The incorporation synthesizer: turns a raw contribution (+ Google Doc
 * extracts) into ONE house-style chapter for a strategy page, then splices it
 * into the markdown file. The model never regenerates the whole file — it can
 * only add or replace a single `## ` chapter, which bounds the blast radius of
 * a bad generation. Everything is validated with the same schema/parsers the
 * build uses before a PR is opened.
 */

export interface SynthesisPlan {
  mode: "append" | "replace" | "reject";
  /** Title for the (new or replacement) chapter. */
  chapterTitle?: string;
  /** For mode "replace": the existing chapter title being replaced. */
  replaceTitle?: string;
  /** Chapter BODY markdown — no `## ` heading line (we compose it). */
  markdown?: string;
  /** For mode "reject": why the contribution can't be incorporated. */
  reason?: string;
}

const SYNTHESIS_SYSTEM = `You are the content editor for the OAP Global Reach Resource Hub, an internal Okta site whose strategy pages are markdown "spec sheets". A field contributor has submitted material for one strategy section. Your job: review it, synthesize it with any attached document extracts, and format it as ONE chapter matching the house style — or reject it if it doesn't contain real, usable strategy content.

Return ONLY JSON:

{
  "mode": "append" | "replace" | "reject",
  "chapterTitle": "Short, concrete chapter heading (no numbering)",
  "replaceTitle": "EXACT existing chapter title, only when mode is replace",
  "markdown": "chapter body markdown — do NOT include the ## heading line",
  "reason": "only for reject: one sentence explaining why"
}

House style (follow exactly):
- The body uses "### " sub-headings for internal structure and "**Bold label:** " run-in fields for facts (e.g. "**Account team:** ...", "**The situation:** ...", "**Result:** ..."). Short paragraphs, "-" bullet lists, "1." numbered steps. A "> " blockquote for a strong pull-quote if the material has one.
- NEVER use "## " inside the body — that starts a new chapter and is forbidden.
- Region-specific material goes in a fenced callout, exactly:
:::region <slug>
...markdown...
:::
  where <slug> is one of: ${REGIONS.join(", ")}. Only use regions the contribution is tagged with. Content relevant to all tagged regions stays outside callouts.
- Write in the hub's voice: direct, factual, sales-usable. No marketing fluff, no "[PLACEHOLDER]", no meta-commentary about the contribution itself.

Grounding rules (most important):
- Use ONLY the contribution text and the document extracts. NEVER invent numbers, customer names, quotes, dates, or outcomes that aren't in the source material.
- The document extracts are PRIMARY source material — often the contributor's description is one line and the real substance is an attached Doc/Slides/Sheet. When extracts exist, synthesize the chapter FROM THE EXTRACTS; a brief description is completely normal and is never a problem.
- If sources conflict, prefer the document extracts (they're the artifact of record) and omit the conflicting claim rather than guessing.
- Choose "replace" ONLY when the submission is clearly an update of one existing chapter (same story/topic); "replaceTitle" must copy that chapter's title EXACTLY. Otherwise "append".
- INCORPORATE BY DEFAULT. Field contributions are valuable even when short: a thin-but-real contribution becomes a short, honest chapter (a few bullets is fine — never pad). Choose "reject" ONLY for: obvious spam/test garbage ("1234", "asdf"), a personal account/support issue, or material with literally no relationship to the strategy section. NEVER reject for brevity, informality, or "not enough information" — that judgment belongs to the humans reviewing the publish PR, not to you.`;

export function buildSynthesisPrompt(args: {
  strategyTitle: string;
  strategySlug: string;
  currentBody: string;
  existingChapterTitles: string[];
  contribution: string;
  regions: string[];
  submittedBy: string;
  extracts: DocExtract[];
  referenceLinks: string[];
}): string {
  const extractBlocks = args.extracts
    .map((e, i) => `<doc index="${i + 1}" url="${e.url}">\n${e.text}\n</doc>`)
    .join("\n\n");
  return [
    `Strategy section: "${args.strategyTitle}" (${args.strategySlug})`,
    `Existing chapter titles: ${args.existingChapterTitles.length ? args.existingChapterTitles.map((t) => `"${t}"`).join(", ") : "(none — page is empty)"}`,
    `Contribution regions: ${args.regions.join(", ")}`,
    `Submitted by: ${args.submittedBy}`,
    "",
    "## Current page body (for style/context and replace decisions — do not rewrite it)",
    args.currentBody.trim() || "(empty)",
    "",
    "## Contribution text",
    args.contribution,
    "",
    args.extracts.length ? "## Attached document extracts\n" + extractBlocks : "## Attached document extracts\n(none)",
    "",
    args.referenceLinks.length
      ? `## Reference links (not fetched — cite only if the contribution text describes them)\n${args.referenceLinks.join("\n")}`
      : "",
    "",
    "Synthesize now. Return ONLY the JSON.",
  ].join("\n");
}

export async function synthesizeChapter(
  args: Parameters<typeof buildSynthesisPrompt>[0],
): Promise<SynthesisPlan> {
  const text = await callLLMServer({
    system: SYNTHESIS_SYSTEM,
    prompt: buildSynthesisPrompt(args),
    maxTokens: 2048,
    timeoutMs: 20_000,
  });
  const plan = parseJsonFromLLM<SynthesisPlan>(text);

  if (plan.mode === "reject") {
    if (!plan.reason) plan.reason = "The model judged the material not usable as strategy content.";
    return plan;
  }
  if (plan.mode !== "append" && plan.mode !== "replace") {
    throw new Error(`Synthesis returned an invalid mode: ${JSON.stringify(plan.mode)}`);
  }
  if (!plan.chapterTitle?.trim() || !plan.markdown?.trim()) {
    throw new Error("Synthesis returned an empty chapter title or body.");
  }
  if (/^##\s/m.test(plan.markdown)) {
    throw new Error("Synthesis body contained a '## ' heading — one chapter only.");
  }
  if (plan.mode === "replace" && !plan.replaceTitle?.trim()) {
    throw new Error("Synthesis chose replace but named no chapter to replace.");
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Chapter revision — contributor updates to an already-published chapter.
// ---------------------------------------------------------------------------

const REVISE_SYSTEM = `You are the content editor for the OAP Global Reach Resource Hub. A contributor is UPDATING a chapter they previously published on a strategy page — adding new information, corrections, or fresh material.

Return ONLY JSON:

{
  "chapterTitle": "the chapter heading (keep the existing title unless the update clearly changes the topic)",
  "markdown": "the COMPLETE revised chapter body — no ## heading line",
  "reject": "only for spam/garbage updates: one sentence why (omit otherwise)"
}

Revision rules:
- Integrate the new material into the existing chapter. When the update contradicts or supersedes an existing fact, THE NEW INFORMATION WINS — replace the stale fact, don't keep both.
- Preserve all still-valid existing content. This is an edit, not a rewrite: keep structure, tone, and phrasing where the update doesn't touch them.
- House style: "### " sub-headings, "**Bold label:** " run-in fields, "-" bullets, "1." steps, "> " pull-quotes. NEVER "## " inside the body.
- Region callouts (:::region <slug> … :::) only for content specific to a subset of the contribution's tagged regions.
- Grounding: use ONLY the existing chapter, the original contribution, the new update text, and any attached document extracts. NEVER invent facts. If sources conflict, the newest wins; if something is uncertain, omit it.
- "reject" ONLY for spam/test garbage or content with no relation to the chapter. Never for brevity.`;

export async function reviseChapter(args: {
  strategyTitle: string;
  strategySlug: string;
  chapterTitle: string;
  chapterMarkdown: string;
  originalContribution: string;
  regions: string[];
  submittedBy: string;
  update: string;
  extracts: DocExtract[];
}): Promise<{ chapterTitle: string; markdown: string } | { rejected: string }> {
  const extractBlocks = args.extracts
    .map((e, i) => `<doc index="${i + 1}" url="${e.url}">\n${e.text}\n</doc>`)
    .join("\n\n");
  const prompt = [
    `Strategy section: "${args.strategyTitle}" (${args.strategySlug})`,
    `Contribution regions: ${args.regions.join(", ")}`,
    `Contributor: ${args.submittedBy}`,
    "",
    `## Existing published chapter: "${args.chapterTitle}"`,
    args.chapterMarkdown,
    "",
    "## Original contribution (context)",
    args.originalContribution,
    "",
    "## New update from the contributor",
    args.update,
    "",
    args.extracts.length
      ? "## Newly attached document extracts\n" + extractBlocks
      : "## Newly attached document extracts\n(none)",
    "",
    "Revise the chapter now. Return ONLY the JSON.",
  ].join("\n");

  const text = await callLLMServer({
    system: REVISE_SYSTEM,
    prompt,
    maxTokens: 2048,
    timeoutMs: 20_000,
  });
  const parsed = parseJsonFromLLM<{ chapterTitle?: string; markdown?: string; reject?: string }>(text);
  if (parsed.reject) return { rejected: parsed.reject };
  if (!parsed.chapterTitle?.trim() || !parsed.markdown?.trim()) {
    throw new Error("Revision returned an empty chapter title or body.");
  }
  return { chapterTitle: parsed.chapterTitle.trim(), markdown: parsed.markdown.trim() };
}

/**
 * Storage-boundary validation for a synthesized chapter (used by the live
 * publish path, where there is no file write to validate): the body must not
 * start new chapters, and its region callouts must parse with the exact
 * parser the renderer uses. Throws on violation.
 */
export function validateChapter(args: { slug: string; chapterTitle: string; markdown: string }): void {
  if (!args.chapterTitle.trim()) throw new Error("Chapter title is empty.");
  if (!args.markdown.trim()) throw new Error("Chapter body is empty.");
  if (/^##\s/m.test(args.markdown)) {
    throw new Error("Chapter body contained a '## ' heading — one chapter only.");
  }
  splitRegionSegments(args.markdown, `addendum for content/strategies/${args.slug}.md`);
}

/** Chapter titles as the spec-sheet renderer sees them (## boundaries). */
export function listChapterTitles(body: string): string[] {
  const parts = body.split(/^##\s+(.+)$/m);
  const titles: string[] = [];
  for (let i = 1; i < parts.length; i += 2) titles.push(parts[i].trim());
  return titles;
}

/**
 * Splice the synthesized chapter into the body on `## ` boundaries — the same
 * contract the spec-sheet renderer uses. Append adds at the end; replace swaps
 * the chapter whose title matches (case-insensitive).
 */
export function spliceChapter(
  body: string,
  plan: SynthesisPlan,
  attribution: string,
): { body: string; error?: string } {
  const chapterTitle = plan.chapterTitle!.trim();
  const chapterBlock = `## ${chapterTitle}\n\n${plan.markdown!.trim()}\n\n*${attribution}*`;

  if (plan.mode === "append") {
    const base = body.trim();
    return { body: base ? `${base}\n\n${chapterBlock}\n` : `${chapterBlock}\n` };
  }

  // replace
  const target = plan.replaceTitle!.trim().toLowerCase();
  const parts = body.split(/^##\s+(.+)$/m);
  let found = false;
  const out: string[] = [parts[0]];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const chapterBody = parts[i + 1] ?? "";
    if (!found && title.toLowerCase() === target) {
      found = true;
      out.push(`## ${chapterTitle}\n\n${plan.markdown!.trim()}\n\n*${attribution}*\n`);
    } else {
      out.push(`## ${title}${chapterBody}`);
    }
  }
  if (!found) {
    // The model named a chapter that doesn't exist — degrade to append rather
    // than dropping the contribution.
    const base = body.trim();
    return { body: base ? `${base}\n\n${chapterBlock}\n` : `${chapterBlock}\n` };
  }
  return { body: out.join("").replace(/\n{4,}/g, "\n\n\n") };
}

/**
 * Apply a synthesis plan to a raw strategy file: splice the chapter, bump
 * frontmatter (last_updated, placeholder → in-progress), then validate with
 * the SAME schema + region parser the build uses. Throws on any validation
 * failure — an invalid file must never reach a PR (the build would refuse it).
 */
export function incorporateIntoFile(args: {
  rawFile: string;
  slug: string;
  plan: SynthesisPlan;
  submittedBy: string;
}): { newFile: string; chapterTitle: string } {
  const { data, content } = matter(args.rawFile);

  const now = new Date();
  const attribution = `Contributed by ${args.submittedBy}, ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`;
  const spliced = spliceChapter(content, args.plan, attribution);

  const fm = { ...data } as Record<string, unknown>;
  fm.last_updated = now.toISOString().slice(0, 10);
  if (fm.status === "placeholder") fm.status = "in-progress";

  const newFile = matter.stringify(spliced.body.trimEnd() + "\n", fm);

  // Validate exactly like the build would.
  const reparsed = matter(newFile);
  const fmCheck = StrategyFrontmatterSchema.safeParse(reparsed.data);
  if (!fmCheck.success) {
    throw new Error(`Incorporated file failed frontmatter validation: ${fmCheck.error.message}`);
  }
  // Throws on malformed/unknown :::region blocks.
  splitRegionSegments(reparsed.content, `content/strategies/${args.slug}.md`);

  return { newFile, chapterTitle: args.plan.chapterTitle!.trim() };
}
