/**
 * Canonical region / vertical / objection constants. Slugs are the single
 * source of truth used by frontmatter, URL params, and the prep API.
 */

export const REGIONS = ["latam", "apj", "emea", "pubsec"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  latam: "LATAM",
  apj: "APJ",
  emea: "EMEA",
  pubsec: "PubSec",
};

/**
 * Badge colors, AA-checked (≥4.5:1 text-on-background in both pairings).
 * Tailwind arbitrary values keep everything in one place.
 */
export const REGION_COLORS: Record<Region, { bg: string; text: string }> = {
  latam: { bg: "bg-amber-100", text: "text-amber-900" },
  apj: { bg: "bg-emerald-100", text: "text-emerald-900" },
  emea: { bg: "bg-sky-100", text: "text-sky-900" },
  pubsec: { bg: "bg-violet-100", text: "text-violet-900" },
};

export function isRegion(value: unknown): value is Region {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}

export const VERTICALS = [
  "financial-services",
  "healthcare",
  "technology",
  "public-sector",
] as const;
export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<Vertical, string> = {
  "financial-services": "Financial Services",
  healthcare: "Healthcare",
  technology: "Technology",
  "public-sector": "Public Sector",
};

export const OBJECTIONS = [
  "travel-cost",
  "digital-attendance",
  "attended-last-year",
  "timing-conflict",
  "no-budget",
] as const;
export type Objection = (typeof OBJECTIONS)[number];

export const OBJECTION_LABELS: Record<Objection, string> = {
  "travel-cost": "It's too expensive to travel",
  "digital-attendance": "We'll just watch the sessions online",
  "attended-last-year": "We already went last year",
  "timing-conflict": "The timing conflicts with our schedule",
  "no-budget": "There's no budget for this",
};

export const STRATEGY_SLUGS = [
  "icp-analysis",
  "top-global-customers",
  "regional-marketing",
  "partner-channel",
  "demo-attendance",
  "success-stories",
  "regional-pricing",
  "voc-feedback",
] as const;
export type StrategySlug = (typeof STRATEGY_SLUGS)[number];

export const SECTION_STATUSES = ["placeholder", "in-progress", "complete"] as const;
export type SectionStatus = (typeof SECTION_STATUSES)[number];
