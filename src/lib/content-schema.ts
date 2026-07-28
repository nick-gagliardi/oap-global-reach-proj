import { z } from "zod";
import { REGIONS, SECTION_STATUSES, STRATEGY_SLUGS } from "./regions";

/** Accepts YAML dates parsed as Date objects or plain ISO strings. */
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
);

export const StrategyFrontmatterSchema = z.object({
  title: z.string().min(1),
  strategy_number: z.number().int().min(1).max(STRATEGY_SLUGS.length),
  owner: z.string().min(1),
  regions: z.array(z.enum(REGIONS)).min(1),
  status: z.enum(SECTION_STATUSES),
  last_updated: isoDate,
  summary: z.string().min(1),
});
export type StrategyFrontmatter = z.infer<typeof StrategyFrontmatterSchema>;

export const RegionFrontmatterSchema = z.object({
  title: z.string().min(1),
  region: z.enum(REGIONS),
  summary: z.string().min(1),
  last_updated: isoDate,
});
export type RegionFrontmatter = z.infer<typeof RegionFrontmatterSchema>;

export const SimpleFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  last_updated: isoDate,
});
export type SimpleFrontmatter = z.infer<typeof SimpleFrontmatterSchema>;
