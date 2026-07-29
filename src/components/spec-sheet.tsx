import type { BodySegment } from "@/lib/content";
import { REGION_LABELS, type Region } from "@/lib/regions";
import { RegionBadge } from "./region-badge";
import { Prose } from "./markdown";

type Block =
  | { kind: "md"; markdown: string }
  | { kind: "region"; region: Region; markdown: string };

interface Chapter {
  id: string;
  title: string;
  blocks: Block[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Turn markdown segments into a spec-sheet structure: content before the
 * first `## ` heading is the lead; each `## ` starts a numbered chapter.
 * Region callouts attach to whichever chapter they appear in.
 */
export function buildChapters(segments: BodySegment[]): {
  lead: string | null;
  chapters: Chapter[];
} {
  let lead: string | null = null;
  const chapters: Chapter[] = [];

  const push = (block: Block) => {
    const current = chapters[chapters.length - 1];
    if (current) {
      current.blocks.push(block);
    } else if (block.kind === "md") {
      lead = lead ? `${lead}\n\n${block.markdown}` : block.markdown;
    }
    // A region callout before any chapter would be dropped — content
    // convention keeps callouts inside sections, enforced by review.
  };

  for (const seg of segments) {
    if (seg.region !== null) {
      push({ kind: "region", region: seg.region, markdown: seg.markdown });
      continue;
    }
    const parts = seg.markdown.split(/^##\s+(.+)$/m);
    // parts alternates: [before, title1, body1, title2, body2, ...]
    if (parts[0].trim()) push({ kind: "md", markdown: parts[0] });
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i].trim();
      chapters.push({ id: slugify(title), title, blocks: [] });
      const body = (parts[i + 1] ?? "").trim();
      if (body) push({ kind: "md", markdown: body });
    }
  }

  return { lead, chapters };
}

export function SpecSheet({
  segments,
  activeRegion,
}: {
  segments: BodySegment[];
  activeRegion: Region | null;
}) {
  const { lead, chapters } = buildChapters(segments);
  const hasToc = chapters.length > 1;

  return (
    // The 200px rail column only exists when the TOC renders — otherwise a
    // lone content child would land in the narrow first track.
    <div className={hasToc ? "gap-10 lg:grid lg:grid-cols-[200px_1fr] lg:items-start" : ""}>
      {hasToc && (
        <nav
          aria-label="On this page"
          className="mb-8 hidden lg:sticky lg:top-6 lg:mb-0 lg:block"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            On this page
          </p>
          <ol className="space-y-2 border-l border-neutral-200">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="-ml-px flex items-baseline gap-2 border-l-2 border-transparent pl-4 text-sm text-neutral-600 transition-colors hover:border-okta-500 hover:text-okta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                >
                  <span
                    aria-hidden="true"
                    className="text-xs font-bold tabular-nums text-neutral-400"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{c.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="min-w-0 space-y-6">
        {lead && (
          <div className="text-base leading-relaxed text-neutral-700">
            <Prose markdown={lead} />
          </div>
        )}

        {chapters.map((c, i) => (
          <section
            key={c.id}
            id={c.id}
            aria-labelledby={`${c.id}-h`}
            className="scroll-mt-6 rounded-xl border border-neutral-200 bg-white"
          >
            <header className="flex items-baseline gap-3 border-b border-neutral-100 px-6 py-4">
              <span
                aria-hidden="true"
                className="text-sm font-bold tabular-nums tracking-widest text-okta-500"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 id={`${c.id}-h`} className="text-lg font-semibold tracking-tight text-neutral-900">
                {c.title}
              </h2>
            </header>
            <div className="space-y-5 px-6 py-5">
              {c.blocks.map((b, j) => {
                if (b.kind === "md") return <Prose key={j} markdown={b.markdown} />;
                if (activeRegion && b.region !== activeRegion) return null;
                return (
                  <aside
                    key={j}
                    aria-label={`${REGION_LABELS[b.region]} guidance`}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="mb-2">
                      <RegionBadge region={b.region} />
                    </div>
                    <Prose markdown={b.markdown} />
                  </aside>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
