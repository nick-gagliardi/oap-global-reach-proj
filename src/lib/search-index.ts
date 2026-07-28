import { cache } from "react";
import { getAllStrategies, getObjections, getRegions, getVerticals } from "./content";
import type { Region } from "./regions";

export interface SearchEntry {
  href: string;
  title: string;
  type: "strategy" | "region" | "objection" | "vertical";
  regions: Region[];
  summary: string;
  /** Plain-ish lowercased text used for matching (markup stripped). */
  body: string;
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^:::region\s+\S+\s*$/gm, "")
    .replace(/^:::\s*$/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const buildSearchIndex = cache((): SearchEntry[] => {
  const entries: SearchEntry[] = [];

  for (const s of getAllStrategies()) {
    entries.push({
      href: `/strategies/${s.slug}`,
      title: s.title,
      type: "strategy",
      regions: s.regions,
      summary: s.summary,
      body: toPlainText(s.body),
    });
  }
  for (const r of getRegions()) {
    entries.push({
      href: `/strategies?region=${r.slug}`,
      title: r.title,
      type: "region",
      regions: [r.slug as Region],
      summary: r.summary,
      body: toPlainText(r.body),
    });
  }
  for (const o of getObjections()) {
    entries.push({
      href: `/prep?objection=${o.slug}`,
      title: o.title,
      type: "objection",
      regions: [],
      summary: o.summary,
      body: toPlainText(o.body),
    });
  }
  for (const v of getVerticals()) {
    entries.push({
      href: `/prep?vertical=${v.slug}`,
      title: v.title,
      type: "vertical",
      regions: [],
      summary: v.summary,
      body: toPlainText(v.body),
    });
  }
  return entries;
});
