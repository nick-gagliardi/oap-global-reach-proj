import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BodySegment } from "@/lib/content";
import { REGION_LABELS, type Region } from "@/lib/regions";
import { RegionBadge } from "./region-badge";

function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-4 leading-relaxed [&_a]:font-medium [&_a]:text-okta-600 [&_a]:underline [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-sm [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}

/**
 * Renders a strategy body as segments: general markdown always, regional
 * callouts as cards — hidden when a non-matching region filter is active.
 */
export function SegmentedMarkdown({
  segments,
  activeRegion,
}: {
  segments: BodySegment[];
  activeRegion: Region | null;
}) {
  return (
    <div className="space-y-6">
      {segments.map((seg, i) => {
        if (seg.region === null) {
          return <Prose key={i} markdown={seg.markdown} />;
        }
        if (activeRegion && seg.region !== activeRegion) return null;
        return (
          <aside
            key={i}
            aria-label={`${REGION_LABELS[seg.region]} guidance`}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="mb-2">
              <RegionBadge region={seg.region} />
            </div>
            <Prose markdown={seg.markdown} />
          </aside>
        );
      })}
    </div>
  );
}

export { Prose };
