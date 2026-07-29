---
title: "Oktane FY27 Field Overview Guide"
summary: "Complete field reference for Oktane FY27: event facts, pass programs, promo codes, SPIFFs, CEC programs, Executive Summit, certifications, travel, and the Oktane Conversation methodology"
last_updated: 2026-07-29
---

## Event Overview

**Event:** Oktane 2026  
**Dates:** September 22–24, 2026  
**Venue:** Caesars Forum, Las Vegas, NV  
**Registration:** oktane.com

### Why Oktane matters

- **6 percentage points higher renewal rate** for customers who attend vs. those who don't
- **6.5 percentage points higher close rate** for new and upsell licenses vs. non-attendees
- Biggest closing event of the year; primary vehicle for face-to-face time with customers

### FY27 goals

| Metric | Target |
|---|---|
| In-person registrations | 4,100 (excluding employees) |
| In-person attendance | 3,600 (excluding employees) |
| Oktane Digital livestream views (within 24 hrs) | 100,000 |
| Revenue registration | $300k |
| Sponsorship | $3.9m |

### Day-by-day agenda

| Day | Date | Highlights |
|---|---|---|
| Pre-event | Monday, Sept 21 | Load in; rehearsals; Partner Summit; Executive Summit; Analyst/Investor Summit; Sales Dinners/Receptions |
| Day 1 | Tuesday, Sept 22 | Registration 7a–7p; Opening Keynote 4:30–5:15p; Breakouts/Labs/Meetings; Welcome Reception; Sales Dinners |
| Day 2 | Wednesday, Sept 23 | Okta Keynote 9–10a; Auth0 Platform Keynote 10:30–11:15a; Okta Platform Keynote 1:15–2p; Breakouts/Labs/CECs all day; Customer Celebration Party (Omnia) |
| Day 3 | Thursday, Sept 24 | Closing Keynote 9–9:45a; Breakouts/Labs/Meetings through afternoon |

---

## Pass Types

### Two types of full conference passes

**Oktane Standard** — the base pass; included in all free/discounted ticket programs (entitlement codes, CPQ passes, Free Ticket Nominations, NPO). All keynotes and breakout sessions (seating prioritized for external attendees), Okta Hub, Expo Hall, Welcome Reception, Customer Celebration Party, onsite ancillary events (not invite-only).

**Oktane Plus** — upgraded full conference pass. Limited to 75 total. Non-discountable and cannot be comp'd (exception: attendees may upgrade a free Standard pass by paying the $600 difference). Includes Standard perks plus: dedicated check-in line, lanyard identifier, exclusive lounge, upleveled F&B, designated keynote seating, swag. Available to VP+ customers/partners (auto-qualify, opt-in during registration) or via purchase.

**Early-bird cutoff: July 29, 2026.** Standard pricing applies after that date.

### Pass upgrades (Standard → Plus)

1. Register for Oktane Standard using your promo/comp code first
2. Complete checkout, then go to the Attendee Portal
3. Click "Upgrade to Oktane Plus" and pay the $600 difference by credit card

If already registered as Standard: log in at oktane.com → Attendee Portal → "Upgrade to Oktane Plus" → pay $600.

---

## Promo Codes & Free Pass Programs

### Contact promo codes (Free Ticket Nominations)

- **How:** Click the "Oktane Nomination" button on a Contact or Lead record in Salesforce
- **What:** 100% off discount on Oktane Standard passes only
- **Approval:** Within 3 business days; include a business reason
- **Approval notification:** Automated email to internal sales user only
- **Code name format:** `[Contact Name] 100% Off - Contact Nomination Discount`
- Only available on the Contact layout in SFDC

### Opportunity promo codes (Passes sold in a deal / CPQ)

Free passes based on deal ARR (no approval needed):

| Deal ARR | Free passes |
|---|---|
| < $200k | 1 |
| $200k – $1m | 2 |
| $1m – $5m | 4 |
| $5m+ | 6 |

- Unlimited additional passes discountable up to 50%
- Available for multi-year adds at flat $499 each
- SKU: **Misc/Add-On - Oktane26** (select in CPQ under ADD/ON tab → Oktane Passes)
- Customer applies code at oktane.com during registration
- **Use only codes with OKT26 in the name**

### Account promo codes (Customer support entitlement)

Auto-generated per account based on support tier. Found in SFDC on Account layout → "Show More". Use only codes where Promo Code Name includes OKT26 and IsActive = True.

| Tier | Support types |
|---|---|
| Gold | Gold Success Plan; Premier Plus; Premier Plus Support; Premier Plus Success; Premier Plus Success Package; Courtesy Premier Plus |
| Silver | Silver Success Plan |
| Premier Access | Premier Access Success |
| Premier | Premier; Premier Success Package; Premier Support; Premier Success |

### User promo codes (open to anyone)

- **OKTN200** — $200 flat rate off, no limit, open to anyone

### Code layout fields to know

- **6-digit code** — share with customer for input at checkout
- **Redemptions available** vs. **Redemptions used** — check how many are left
- **IsActive = True** + **OKT26 in name** — required before sharing

---

## Specialty Pricing & Discounts

| Program | Details |
|---|---|
| Flat rate | $200, code **OKTN200**, open to anyone, no limit |
| NPO (.org) | 5 free passes per organization |
| Public sector (.gov, .edu, .mil) | $200/pass, no limit |
| Group pricing (3–5 full conference passes) | 10% off |
| Group pricing (6–10 full conference passes) | 25% off |

*Group pricing applies to going rate; not stackable with other discounts.*

---

## SPIFFs & Contests

### CSM/TAM Cumulative SPIFF

- **Eligible:** CSMs and Auth0 TAMs
- **Period:** July 13 – September 18, 2026
- **Measured by:** Highest in-person registrations driven per CSM/TAM
- **Winners announced:** Early October

| Category | Reward |
|---|---|
| Auth0 TAM (top winner) | 500 Oktappreciate points |
| Enterprise CSx (top winner) | 500 Oktappreciate points |
| Strat + PubSec CSx (top winner) | 500 Oktappreciate points |
| Dedicated + Commercial CSx (top winner) | 500 Oktappreciate points |
| Non-AMER CSx (top winner) | 300 points |
| Non-AMER TAM (top winner) | 300 points |
| Scale CSx (top 5) | 100 points each |

### SDR In-Person Registration SPIFF (AMER only)

- **Period:** June 10 – September 18
- **How:** Customer or prospect in-person registration after SDR invite with "Oktane" in email subject line
- **Prizes:** Top 5 ENT, Top 3 CRP & STG, Top 2 SMB & PBST
  - 1st: 500 pts | 2nd: 400 pts | 3rd: 300 pts | 4th: 200 pts | 5th: 150 pts

### SDR "The Oktane Conversation" SPIFF (AMER only)

- **Period:** TOC Meetings held July 9 – September 18
- **How:** Meetings logged in SFDC with "Oktane Conversation" or "TOC" in subject; AE Meeting Status must be checked off
- **Prizes:** Top 5 ENT, Top 3 CRP & STG, Top 2 SMB & PBST
  - 1st: 400 pts | 2nd: 300 pts | 3rd: 250 pts | 4th: 150 pts | 5th: 100 pts

### SDR Onsite Sales Meetings SPIFF (AMER only)

- **Period:** Meetings booked August 25 – September 18 via JiffleNow in Salesforce
- **Prizes:** Top 5 ENT, Top 3 CRP & STG, Top 2 SMB & PBST
  - 1st: 500 pts | 2nd: 400 pts | 3rd: 300 pts | 4th: 200 pts | 5th: 150 pts

---

## The Oktane Conversation

The Oktane Conversation is a named, repeatable pre-event meeting (30–60 minutes) that uses the AI Identity Readiness Assessment to curate a custom Oktane agenda for the customer. It drives registration by making Oktane feel personally relevant.

### Three steps

1. **Drive the AI Identity Readiness Assessment** — help the customer discover where AI identity risk exists. Tool: okta.com/assessments/ai-readiness
2. **Use Gemini to recommend sessions** — enter this prompt once the customer has their assessment URL:
   > *"Here are the results of my customer's AI Identity Readiness Assessment: [insert AI Assessment unique URL]. I'd like you to visit [Oktane Session Catalog URL] and recommend the top three sessions my customer should watch based on the assessment results."*
3. **Have The Oktane Conversation** — debrief on AI Identity Readiness results and recommend Oktane sessions to drive registration

**Log in Salesforce:** "Oktane" dropdown when logging calls; subject: "The Oktane Conversation | [Company Name]". AE Meeting Status must be checked off.

### AI Identity Readiness Assessment — scoring

| Score | Tier | Meaning |
|---|---|---|
| 0–49 | Low Readiness (High Risk) | Unsafe for production; weak/shared auth, fragmented governance |
| 50–79 | Moderate (Emerging) | Some structure but coarse-grained controls, manual processes |
| 80–100 | High (Mature / Fully Governed) | Unique identities, least-privilege, centralized visibility |

### Four pillars

**Pillar 1 — Agent Surface Awareness:** Where does AI exist and how bounded is it? Are agents tracked with ownership and access logs, or operating as Shadow AI?

**Pillar 2 — Identity & Auth Architecture:** Do agents authenticate with enforceable constraints? Unique identities with time-bound access vs. shared service accounts and embedded secrets. Opens Auth0 (delegated access, FGA) and Okta (least privilege at scale) conversation.

**Pillar 3 — Secure Build Enablement:** Are secure practices scaling with AI development velocity? Reveals whether security is built-in or fighting developer speed.

**Pillar 4 — Centralized Control & Response:** Can AI risk be governed and remediated centrally? Are agents managed centrally or independently by teams with no consistent process?

### Follow-up angles

- **"Let's unpack your score of [xx]"** — deep-dive weakest pillar using sub-scores
- **"What would it take to reach Fully Governed?"** — 50–79 upgrade conversation
- **"If your AI agent is compromised, how contained is the impact?"** — Pillar 4 blast-radius hook
- **"Can you define and bound where your AI acts?"** — Pillar 1 blind-spot callout
- **"When the board asks about AI risk, what's your answer?"** — C-level boardroom positioning
- **"Is security slowing down your AI development?"** — Pillar 3 velocity hook for technical leaders

### Where to find assessment leads

- `INB|AI-IdentityReadinessTool-CTS-AST` — completed assessment + requested 1:1 walkthrough
- `INB|AI-IdentityReadinessTool-AST` — completed assessment only
- Scores and report URLs appear in Salesforce prospecting notes

---

## Employee Registration

### Employee pass options

**Oktane Standard Pass** (approved/scheduled employees): all keynotes, breakout sessions, Okta Hub, Expo Hall, Welcome Reception, Customer Celebration Party.

**Oktane Digital** (all other employees): hosted ungated on okta.com. Do NOT register on oktane.com. Okta keynotes only.

### Registration timeline

| Date | Milestone |
|---|---|
| June 18 | Dept leaders receive FY27 attendance allocations |
| July 17 | Pre-approved employee info due from dept approvers |
| Aug 3–7 | Registration opens (scheduled employees must confirm 2 half-day shifts, 4–5 hrs each) |
| Aug 14 | Shift assignments due |
| Aug 21 | Employee reg closes; hotel block cutoff |
| Aug 31 | Shift details confirmed via email |
| Sept 1 | Prep calls begin; KBYG comms begin |
| Sept 11 | All prep calls complete |

### Cost model

Oktane covers 100% of hard costs for approved allocations. **75% of hard costs billed back to teams above their allocation** (Oktane covers only 25% for over-allocation attendees).

---

## Session Catalog

Live at **okta.com/oktane** — 60+ sessions: keynotes, breakouts, self-guided labs (new), instructor-led labs, sponsor sessions, evening events.

---

## Executive Programs

### Executive Summit

**What:** Full day offsite for C-level customers and prospects + VIP access to Oktane.  
**When:** Tuesday, September 22, 2026  
**Where:** Waldorf Astoria Las Vegas  
**Host:** Eric Kelleher; **Approves all nominations:** Jon Addison  
**Goal:** 90 registrations / 80 attendees (38 AMER, 8 EMEA, 4 APJ + 30 CISO Forum)

#### Nomination parameters

| Segment | cARR | Oppty | Stage | Title |
|---|---|---|---|---|
| STRAT/ENT/PBST Customers | > $2M | — | — | C-level |
| STRAT/ENT/PBST Prospects | — | > $1M | > 4 | C-level |
| Corp Customers | > $1M | — | — | C-level |
| Corp Prospects | — | > $350K | > 4 | C-level |
| Titanium Sponsors | — | — | — | C-level |

Phase 2 lower thresholds: Customers $750K–$1M cARR; Prospects $250K–$350K oppty.  
FY27 priorities: Red/Yellow accounts, KAP accounts, large white space.

#### Nomination process

1. SFDC Contact/Lead record → "Executive Event Nomination" → Executive Programs → Next
2. Select "FY27 Oktane Executive Summit" and a relevant open opportunity
3. Complete free-form text with context → Submit
4. Invites sent by Eric Kelleher personally; account teams CC'd

#### Timeline

- June 10 — Nominations launch
- June 24 / July 14 — Phase 1 / Phase 2 cut-offs
- June 26 / July 17 — Phase 1 / Phase 2 invites begin
- Aug 21 — Hotel cut-off + registration closes

Account team **cannot attend** Executive Summit. Nomination does not guarantee a slot. Official declines come in August.

### High Oktane

Exclusive experience at Caesars Forum (Tue–Thu) for VP+ customers/partners and Oktane Plus attendees. Perks: dedicated check-in, lounge, swag, upleveled F&B, designated keynote seating. VP+ customers auto-qualify and opt-in during registration.

---

## CEC Programs

### CEC Roundtables

**What:** 1-hour facilitated roundtable on a specific topic; hosted by an Okta SME.  
**When/Where:** Tue Sept 22 – Wed Sept 23, Caesars Forum (3 rooms)  
**Slots:** 12 external attendees per roundtable; 3 roundtables/day  
**Eligibility:** Open FY27 opportunity + Director+; max 1 per account per session, 3 total  
**Nominations open July 14. Deadline July 28. POC: Aileen Shon.**

**Process:** Nominate via CEC Roundtable Nomination Form → CEC reviews → if approved, Slack message with invitation toolkit → customer confirms → CEC sends calendar invite.

Account team cannot attend sessions but may greet contacts in the CEC Lounge.

### CEC Connects

**What:** 45-minute single-topic meeting with a CEC-aligned product speaker or Okta exec.  
**When/Where:** Tue Sept 22 – Thu Sept 24, Caesars Forum (7 rooms, 10 seats each)  
**Slots:** 100 total; max 2 per account  
**Eligibility:** Director+ attendee, open FY27 opportunity  
**Requests open July 28 via BriefingSource. Closes September 4. POC: Aileen Shon.**

**Process:** Account page in SFDC → BriefingSource → Next → select opportunity + contacts → "Oktane CEC Connects" → complete form → CEC responds within 2 business days → once speaker accepts, invites sent.

Requester must attend in person. Changes not possible after September 4.

### Account Team Meetings (formerly Sales Meetings)

Bookable meeting space at Caesars Forum. Book via JiffleNow in Salesforce. Launches late August. POC: Lindsey Dornbusch.

### Key CEC dates

| Date | Event |
|---|---|
| July 14 | CEC Roundtable nominations open |
| July 28 | CEC Connects opens; last day for Roundtable nominations |
| August 28 | CEC Roundtable attendees confirmed |
| September 4 | CEC Connects closes |

Slack: **#oktane-cec-programs**

---

## Certifications & Labs

### Certifications

**Available exams:** Okta Certified Professional, Okta Certified Administrator, Auth0 Certified Developer (all Performance Exams)  
**Pricing:** Early Bird $149 / Standard $199

**Sessions:**
- Tuesday Sept 22: 8:30–11:30am and 1:00–4:00pm
- Wednesday Sept 23: 10:30am–1:30pm and 2:30–5:30pm

Gold/Silver Premier Success Plan customers: register XLP → request voucher → enter certification code at Oktane checkout.

Preparation materials included: recommended learning, study guide, prep workshop promo code, practice exam voucher.

### Labs

**Instructor-Led Labs** — scheduled sessions during Oktane.  
**Self-Guided Labs (NEW)** — flexible timing, new for FY27.

Details: **oktane.com/labs**

---

## Offsite Evening Events

### Tuesday, September 22

| Event | Time | Location | Contact |
|---|---|---|---|
| LATAM Reception | 6–7pm | TBD | Vania De Rosas |
| Japan Welcome Reception | 6–9pm | TBD | Katie Paterson |
| Commercial Reception | 7–10pm | LAVO Italian Restaurant | Angelica Rafter |
| Strategic Reception | 7–10pm | Chica | Cass Kelley |
| Enterprise Reception | 7–10pm | Ole Red | Brenna Simon |

### Wednesday, September 23

| Event | Time | Location | Contact |
|---|---|---|---|
| Todd Dinner | TBD | TBD | Alexis Hall |
| PubSec Reception (Carahsoft) | 5:30–7:30pm | TBD | Francesca Polito |
| Customer Celebration Party | Evening | Omnia | — |

---

## Travel Information

### Hotels (via Attendee Portal after registration)

| Hotel | Rate | Notes |
|---|---|---|
| Caesars Palace | $229++ | Primary |
| The LINQ | $149++ | Primary |
| Venetian | $384++ | Primarily Partners |

Deposit equal to one night's stay + fees required; charged at check-out (expensable).  
**Hotel block cutoff: August 21, 2026.**

### Airline discounts (valid Sept 19–27, 2026)

| Airline | How to book |
|---|---|
| Alaska Airlines | Code **ECMQ358** at AlaskaAir.com |
| Southwest | Book via SWABIZ direct link |
| United Airlines | Code **ZS5J807770** at United.com/meetingtravel |

Apply codes at time of booking; cannot be applied retroactively.

---

## Oktane Ambassador Program

Internal cohort driving Oktane engagement and customer experience.

**FY27 Leadership Council:** Heather Graham (CS Executive), Mike Volpe (Regional Manager CS), Rebecca Gagnon (Event Manager), Shauna Johnson (Event Manager)

**FY27 Cohort includes:** Aleksandra Makowka, Alina Bergelson, Blake Horn, Christina Gallagher, Dan Hart, Dawn Craft, Kae Khan, Lynn Aregood, Marco Becerra, Nick Gagliardi, Shauna Johnson, Shivani Ginde, and others across CS, Sales, SE, and L&D.

---

## Key Dates Summary

| Date | Milestone |
|---|---|
| June 10 | Phase 1 registration open; Exec Summit nominations launch |
| **July 14** | CEC Roundtable nominations open |
| **July 17** | Employee info due from dept approvers |
| **July 28** | CEC Connects opens; last day for CEC Roundtable nominations |
| **July 29** | **Early-bird pricing cut-off** |
| Aug 3 | Employee registration opens |
| Aug 21 | Hotel block cut-off; employee reg closes |
| Aug 28 | CEC Roundtable attendees confirmed |
| Sept 4 | CEC Connects closes |
| Sept 15 | Mobile app launches |
| **Sept 22–24** | **Oktane 2026, Caesars Forum, Las Vegas** |

---

## Resources & Slack Channels

| Resource | Where |
|---|---|
| Oktane site | oktane.com |
| AI Identity Readiness Assessment | okta.com/assessments/ai-readiness |
| Session catalog | okta.com/oktane |
| Labs | oktane.com/labs |
| Slack: general | #oktane |
| Slack: CEC programs | #oktane-cec-programs |
| Slack: Executive Summit | #oktane-executive-summit |
| Slack: AI assessment support | #ai-identity-readiness-assessment-tool-support |
| Email | oktane@okta.com |
