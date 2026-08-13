import { cache } from "react";
import {
  getAllStrategies,
  getSectionStatuses,
  splitRegionSegments,
  type SectionStatusRow,
  type StrategyDoc,
} from "./content";
import { spliceChapter } from "./incorporate";
import { listIncorporatedBySlug, type Contribution } from "./iddb";

/**
 * Live content layer: strategy docs with DB-published addendum chapters merged
 * in at render time. Contributions are synthesized server-side, stored in
 * Postgres as chapters, and folded into the file content here — so publishing
 * is instant (no PR, no redeploy) and unpublishing is a status flip.
 *
 * The merge happens at the CONTENT-STRING level, so everything downstream —
 * spec-sheet chapters, region callouts, the search index, assistant
 * grounding — sees one coherent body with zero consumer-side changes.
 *
 * Failure posture: any DB problem yields file-only content. Pages never break
 * because the addenda store hiccuped.
 */

function attributionFor(row: Contribution): string {
  const when = new Date(row.created_at).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  return `Contributed by ${row.submitted_by}, ${when}`;
}

const ALL_REGIONS = ["latam", "apj", "emea", "pubsec"];

/**
 * Wrap markdown in :::region blocks when the contribution targets a strict
 * subset of regions. A single-region contribution (e.g. ["pubsec"]) wraps its
 * content so the region filter hides it for non-matching views. Multi-region
 * subsets get one block per region (content duplicated — acceptable for the
 * typical 1–2 region case). Global contributions (all 4 or none) are left
 * unwrapped so they always render.
 */
function wrapForRegions(markdown: string, regions: string[]): string {
  const scoped = regions.filter((r) => ALL_REGIONS.includes(r));
  if (scoped.length === 0 || scoped.length === ALL_REGIONS.length) return markdown;
  return scoped.map((r) => `:::region ${r}\n${markdown.trim()}\n:::`).join("\n\n");
}

/** Fold one slug's addenda into a body string, oldest first. */
export function mergeAddendaIntoBody(body: string, addenda: Contribution[]): string {
  let merged = body;
  for (const row of addenda) {
    const regions: string[] = Array.isArray(row.regions) ? row.regions : [];
    const markdown = wrapForRegions(row.chapter_markdown!, regions);
    const result = spliceChapter(
      merged,
      {
        mode: row.mode === "replace" ? "replace" : "append",
        chapterTitle: row.chapter_title!,
        replaceTitle: row.replace_title ?? undefined,
        markdown,
      },
      attributionFor(row),
    );
    merged = result.body;
  }
  return merged;
}

function withAddenda(doc: StrategyDoc, addenda: Contribution[] | undefined): StrategyDoc {
  if (!addenda?.length) return doc;
  try {
    const body = mergeAddendaIntoBody(doc.body, addenda);
    return {
      ...doc,
      body,
      segments: splitRegionSegments(body, `content/strategies/${doc.slug}.md (live)`),
    };
  } catch {
    // A malformed stored chapter must not take the page down — file-only.
    return doc;
  }
}

const getAddenda = cache(() => listIncorporatedBySlug());

export const getAllStrategiesLive = cache(async (): Promise<StrategyDoc[]> => {
  const addenda = await getAddenda();
  return getAllStrategies().map((doc) => withAddenda(doc, addenda.get(doc.slug)));
});

export const getStrategyLive = cache(async (slug: string): Promise<StrategyDoc | null> => {
  const all = await getAllStrategiesLive();
  return all.find((s) => s.slug === slug) ?? null;
});

export interface SectionStatusLiveRow extends SectionStatusRow {
  /** Live DB-published chapters on this section. */
  addendaCount: number;
  /** Frontmatter status, promoted to in-progress when a placeholder has live addenda. */
  effectiveStatus: SectionStatusRow["status"];
}

export const getSectionStatusesLive = cache(async (): Promise<SectionStatusLiveRow[]> => {
  const addenda = await getAddenda();
  return getSectionStatuses().map((row) => {
    const addendaCount = addenda.get(row.slug)?.length ?? 0;
    return {
      ...row,
      addendaCount,
      effectiveStatus:
        row.status === "placeholder" && addendaCount > 0 ? "in-progress" : row.status,
    };
  });
});
