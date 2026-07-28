import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import {
  RegionFrontmatterSchema,
  SimpleFrontmatterSchema,
  StrategyFrontmatterSchema,
  type RegionFrontmatter,
  type SimpleFrontmatter,
  type StrategyFrontmatter,
} from "./content-schema";
import { isRegion, OBJECTIONS, REGIONS, STRATEGY_SLUGS, VERTICALS, type Region } from "./regions";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** A run of markdown scoped to one region (via :::region blocks) or to all (null). */
export interface BodySegment {
  region: Region | null;
  markdown: string;
}

export interface StrategyDoc extends StrategyFrontmatter {
  slug: string;
  body: string;
  segments: BodySegment[];
}

export interface RegionDoc extends RegionFrontmatter {
  slug: string;
  body: string;
}

export interface SimpleDoc extends SimpleFrontmatter {
  slug: string;
  body: string;
}

function readAndParse(relPath: string): { data: unknown; content: string } {
  const filePath = path.join(CONTENT_DIR, relPath);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
}

/**
 * Split a body on `:::region <slug>` ... `:::` fences into segments.
 * Unknown region tokens throw (caught by the content validator).
 */
export function splitRegionSegments(body: string, sourceName: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const lines = body.split(/\r?\n/);
  let current: string[] = [];
  let currentRegion: Region | null = null;

  const flush = () => {
    const markdown = current.join("\n").trim();
    if (markdown) segments.push({ region: currentRegion, markdown });
    current = [];
  };

  for (const line of lines) {
    const open = line.match(/^:::region\s+(\S+)\s*$/);
    if (open) {
      if (currentRegion !== null) {
        throw new Error(`${sourceName}: nested :::region block is not allowed`);
      }
      if (!isRegion(open[1])) {
        throw new Error(`${sourceName}: unknown region "${open[1]}" in :::region block`);
      }
      flush();
      currentRegion = open[1];
      continue;
    }
    if (/^:::\s*$/.test(line)) {
      if (currentRegion === null) {
        throw new Error(`${sourceName}: closing ::: without an open :::region block`);
      }
      flush();
      currentRegion = null;
      continue;
    }
    current.push(line);
  }
  if (currentRegion !== null) {
    throw new Error(`${sourceName}: unclosed :::region block`);
  }
  flush();
  return segments;
}

function loadStrategy(slug: string): StrategyDoc {
  const rel = path.join("strategies", `${slug}.md`);
  const { data, content } = readAndParse(rel);
  const parsed = StrategyFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`content/strategies/${slug}.md: invalid frontmatter — ${parsed.error.message}`);
  }
  return {
    ...parsed.data,
    slug,
    body: content,
    segments: splitRegionSegments(content, `content/strategies/${slug}.md`),
  };
}

function loadRegionDoc(slug: string): RegionDoc {
  const { data, content } = readAndParse(path.join("regions", `${slug}.md`));
  const parsed = RegionFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`content/regions/${slug}.md: invalid frontmatter — ${parsed.error.message}`);
  }
  if (parsed.data.region !== slug) {
    throw new Error(`content/regions/${slug}.md: frontmatter region "${parsed.data.region}" must match filename`);
  }
  return { ...parsed.data, slug, body: content };
}

function loadSimpleDoc(dir: "objections" | "verticals", slug: string): SimpleDoc {
  const { data, content } = readAndParse(path.join(dir, `${slug}.md`));
  const parsed = SimpleFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`content/${dir}/${slug}.md: invalid frontmatter — ${parsed.error.message}`);
  }
  return { ...parsed.data, slug, body: content };
}

export const getAllStrategies = cache((): StrategyDoc[] => {
  const docs = STRATEGY_SLUGS.map(loadStrategy);
  const seen = new Map<number, string>();
  for (const doc of docs) {
    const dup = seen.get(doc.strategy_number);
    if (dup) {
      throw new Error(
        `Duplicate strategy_number ${doc.strategy_number} in "${dup}" and "${doc.slug}"`,
      );
    }
    seen.set(doc.strategy_number, doc.slug);
  }
  return docs.sort((a, b) => a.strategy_number - b.strategy_number);
});

export const getStrategy = cache((slug: string): StrategyDoc | null => {
  if (!(STRATEGY_SLUGS as readonly string[]).includes(slug)) return null;
  return getAllStrategies().find((s) => s.slug === slug) ?? null;
});

export const getRegions = cache((): RegionDoc[] => REGIONS.map(loadRegionDoc));

export const getRegion = cache((slug: Region): RegionDoc => {
  const doc = getRegions().find((r) => r.slug === slug);
  if (!doc) throw new Error(`Region content missing: ${slug}`);
  return doc;
});

export const getObjections = cache((): SimpleDoc[] =>
  OBJECTIONS.map((slug) => loadSimpleDoc("objections", slug)),
);

export const getObjection = cache((slug: string): SimpleDoc | null =>
  getObjections().find((o) => o.slug === slug) ?? null,
);

export const getVerticals = cache((): SimpleDoc[] =>
  VERTICALS.map((slug) => loadSimpleDoc("verticals", slug)),
);

export const getVertical = cache((slug: string): SimpleDoc | null =>
  getVerticals().find((v) => v.slug === slug) ?? null,
);

export interface SectionStatusRow {
  slug: string;
  title: string;
  strategy_number: number;
  owner: string;
  status: StrategyFrontmatter["status"];
  last_updated: string;
}

/**
 * Tracker data source — derived purely from frontmatter. This intentionally
 * replaces the spec's `content_sections` DB table (in-repo content deploys
 * with the app; a DB copy would drift).
 */
export const getSectionStatuses = cache((): SectionStatusRow[] =>
  getAllStrategies().map(({ slug, title, strategy_number, owner, status, last_updated }) => ({
    slug,
    title,
    strategy_number,
    owner,
    status,
    last_updated,
  })),
);
