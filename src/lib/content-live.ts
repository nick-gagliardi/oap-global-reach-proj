import { cache } from "react";
import {
  getAllStrategies,
  getSectionStatuses,
  splitRegionSegments,
  type SectionStatusRow,
  type StrategyDoc,
} from "./content";
import { spliceChapter } from "./incorporate";
import { REGIONS } from "./regions";
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
  let attribution = `Contributed by ${row.submitted_by}, ${when}`;
  if (row.content_updated_at) {
    attribution += ` · updated ${new Date(row.content_updated_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return attribution;
}

const ALL_REGIONS: readonly string[] = REGIONS;

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
  // The synthesizer may already scope parts of the chapter itself — wrapping
  // again would NEST :::region blocks, which the parser rejects (and the
  // whole addendum would vanish via the degrade path). Trust the model's own
  // scoping in that case.
  if (markdown.includes(":::region")) return markdown;
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

/** Distinct contributor names, in first-contribution order. */
function contributorsFor(addenda: Contribution[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of addenda) {
    const name = row.submitted_by.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** Latest of the frontmatter date and every addendum's created/updated date, as YYYY-MM-DD. */
function liveLastUpdated(frontmatterDate: string, addenda: Contribution[]): string {
  let latest = frontmatterDate;
  for (const row of addenda) {
    for (const iso of [row.created_at, row.content_updated_at]) {
      if (!iso) continue;
      const day = new Date(iso).toISOString().slice(0, 10);
      if (day > latest) latest = day;
    }
  }
  return latest;
}

function withAddenda(doc: StrategyDoc, addenda: Contribution[] | undefined): StrategyDoc {
  if (!addenda?.length) return doc;
  try {
    const body = mergeAddendaIntoBody(doc.body, addenda);
    const contributors = contributorsFor(addenda);
    return {
      ...doc,
      body,
      // Sections with live contributions belong to their contributors — the
      // generic frontmatter owner is replaced by the submitter names.
      owner: contributors.length > 0 ? contributors.join(", ") : doc.owner,
      last_updated: liveLastUpdated(doc.last_updated, addenda),
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
    const rows = addenda.get(row.slug) ?? [];
    const contributors = contributorsFor(rows);
    return {
      ...row,
      owner: contributors.length > 0 ? contributors.join(", ") : row.owner,
      last_updated: liveLastUpdated(row.last_updated, rows),
      addendaCount: rows.length,
      effectiveStatus: row.status === "placeholder" && rows.length > 0 ? "in-progress" : row.status,
    };
  });
});
