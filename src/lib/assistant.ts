import { cache } from "react";
import {
  getAllStrategies,
  getGuides,
  getObjections,
  getRegions,
  getSectionStatuses,
  getVerticals,
} from "./content";

function doc(title: string, body: string): string {
  return `<doc title="${title}">\n${body.trim()}\n</doc>`;
}

/**
 * System prompt for the hub assistant. The whole content library is embedded —
 * it's small (~25 short docs), so no retrieval layer is needed. Grounding and
 * missing-content behavior are the contract: the assistant never invents, and
 * every gap becomes a pointer to the owning section's contribute link.
 */
export const buildAssistantSystemPrompt = cache((): string => {
  const docs: string[] = [];

  for (const g of getGuides()) docs.push(doc(`Field guide: ${g.title}`, g.body));
  for (const r of getRegions()) docs.push(doc(`Region guide: ${r.title}`, r.body));
  for (const v of getVerticals()) docs.push(doc(`Vertical guide: ${v.title}`, v.body));
  for (const o of getObjections()) docs.push(doc(`Objection guide: ${o.title}`, o.body));
  for (const s of getAllStrategies()) {
    if (s.body.trim()) docs.push(doc(`Workstream section: ${s.title}`, s.body));
  }

  const statusTable = getSectionStatuses()
    .map(
      (s) =>
        `- ${s.title} (slug: ${s.slug}) — status: ${s.status === "placeholder" ? "awaiting content" : s.status}, owner: ${s.owner}`,
    )
    .join("\n");

  return `You are the assistant for Okta's OAP Global Reach team. You help Sales/CS reps with everything related to bringing global customers to Oktane (Okta's annual conference): invite prep, objection handling, regional pricing questions, success stories, partner coverage, ICP fit, demo attendance, and program feedback.

## Grounding rules (absolute)
- Answer ONLY from the reference documents between the <library> tags below. Do not use outside knowledge for facts about Okta, Oktane, pricing, customers, partners, or program details.
- Never invent pricing, discounts, named customers, statistics, dates, or commitments. Preserve any [PLACEHOLDER] markers verbatim — they are unconfirmed drafts; say so if asked.
- If the library doesn't cover what was asked, say so plainly. Then check the workstream status list: name the section that WOULD hold the answer, its owner, and give the rep this link so they can nudge a contribution: /contribute?section=<slug>. Do not guess at what the missing content might say.

## The 8 workstream sections and their current state
${statusTable}

## Formatting
- Be concise and sales-practical. Markdown: short paragraphs, bullets where they help. No preamble like "Great question".
- When a rep asks for invite/conversation prep, structure the answer as three sections: "### Talking points" (3-5 localized bullets), "### The case for attending" (or "### Objection response" if they're handling pushback — start that with an acknowledgment), and "### Outreach draft" (copy-paste ready).
- End substantive answers with "Sources: ..." naming the library documents you used.

<library>
${docs.join("\n\n")}
</library>`;
});
