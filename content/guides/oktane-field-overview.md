---
title: "Oktane FY27 Field Overview"
summary: "Program-level field guide: attendance value data, FY27 event facts, the Oktane Conversation framework, and the AI Identity Readiness Assessment"
last_updated: 2026-07-28
---

## Why Oktane matters — data you can use

Customers who attend Oktane in person show measurably better outcomes than those who don't:

- **6 percentage points higher renewal rate** vs. customers who don't attend
- **6.5 percentage points higher close rate** for new and upsell licenses vs. non-attendees

These are not estimates — they come from Okta's own data and survive a CFO conversation because they connect attendance to revenue outcomes the customer cares about.

## FY27 event overview

**Dates:** September 22–24, 2026
**Venue:** Caesars Forum, Las Vegas, NV
**Registration:** oktane.com

FY27 goals: 4,100 in-person registrations; 3,600 in-person attendees (excluding employees); 100,000 Oktane Digital livestream views within 24 hours; $300k revenue registration; $3.9m sponsorship.

The scale signals seriousness — this is Okta's largest annual closing event and the one where product roadmap depth, exec access, and hands-on labs are all in the same place at the same time.

## What in-person delivers that online doesn't

- **NDA product roadmap sessions** — not recorded, not shared externally
- **Direct exec access** — keynote speakers, roundtable hosts, and the Executive Summit are all in-person-only
- **Hands-on labs** — instructor-led and self-guided options, same week as the conference; not replicated at regional events
- **Face time with peers** — customers solving the same problems, in the same room; CEC Roundtable and CEC Connect formats only exist onsite
- **Deal acceleration** — the Yahoo case (see the Success Stories section) shows what a custom Oktane track does for a stalled deal

**APJ note:** Japan Welcome Reception, Tuesday Sept 22, 6–9pm — a dedicated APJ networking event on opening night; a concrete benefit for Japanese customers making the long-haul trip.

**LATAM note:** LATAM Reception, Tuesday Sept 22, 6–7pm (contact Vania De Rosas) — regional networking on opening night; worth naming explicitly when inviting LATAM attendees.

## The Oktane Conversation framework

The Oktane Conversation is a named, repeatable pre-event meeting (30–60 minutes) that uses the AI Identity Readiness Assessment to curate a custom Oktane agenda for the customer. It drives registration by making Oktane feel personally relevant.

**Three steps:**

1. **Drive the AI Identity Readiness Assessment** — help the customer discover where AI identity risk exists in their environment. Assessment URL: okta.com/assessments/ai-readiness
2. **Use Gemini to recommend sessions** — once the customer has their assessment URL, enter this prompt:
   > *"Here are the results of my customer's AI Identity Readiness Assessment: [insert AI Assessment unique URL]. I'd like you to visit [Oktane Session Catalog URL] and recommend the top three sessions my customer should watch based on the assessment results."*
   *(Prompt will be updated once the Session Catalog is live in August.)*
3. **Have The Oktane Conversation** — debrief the customer on their AI Identity Readiness results and recommend Oktane sessions to drive registration

**Log in Salesforce:** use the "Oktane" dropdown when logging calls; subject line should be "The Oktane Conversation | [Company Name]".

### AI Identity Readiness Assessment — scoring and pillars

| Score | Tier | Meaning |
|---|---|---|
| 0–49 | Low Readiness (High Risk) | Unsafe for production; weak or shared auth, fragmented governance |
| 50–79 | Moderate (Emerging) | Some structure but coarse-grained controls, manual processes |
| 80–100 | High (Mature / Fully Governed) | Unique identities, least-privilege, centralized visibility |

**Pillar 1 — Agent Surface Awareness:** Where does AI exist and how bounded is it? Surfaces whether the org understands AI as an execution surface, not just a UI feature.

**Pillar 2 — Identity & Auth Architecture:** Do agents authenticate with enforceable constraints? Opens the Auth0 (delegated access, FGA) and Okta (least privilege at scale) conversation.

**Pillar 3 — Secure Build Enablement:** Are secure practices scaling with AI development velocity? Auth0-leaning; reveals whether security is built-in or fighting developer speed.

**Pillar 4 — Centralized Control & Response:** Can AI risk be governed and remediated centrally? Determines whether AI agents are first-class identities or shadow experiments.

### Follow-up angles by score

- **Score in hand:** "Let's unpack your score of [xx]" — deep-dive the weakest pillar using their sub-scores
- **50–79 tier:** "What would it take to reach Fully Governed?" — upgrade conversation, standardization gap
- **Prospecting hook:** "If your AI agent is compromised, how contained is the impact?" — Pillar 4 as blast-radius challenge
- **Blind spot hook:** "Can you define and bound where your AI acts?" — Pillar 1 to make an invisible problem visible
- **C-level:** "When the board asks about AI risk, what's your answer?" — offer to run leadership through the questions for a board-ready baseline
- **Technical:** "Is security slowing down your AI development?" — Pillar 3 for teams building with LangChain or OpenAI

### Where to find assessment leads in Salesforce

- `INB|AI-IdentityReadinessTool-CTS-AST` — completed assessment and requested a 1:1 walkthrough
- `INB|AI-IdentityReadinessTool-AST` — completed assessment only

Assessment scores and report URLs appear in Salesforce prospecting notes for contacts who have taken the assessment.
