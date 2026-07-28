import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllStrategies } from "@/lib/content";
import { isRegion } from "@/lib/regions";
import { RegionBadgeList } from "@/components/region-badge";
import { StatusDot } from "@/components/status-badge";
import { RegionFilter } from "@/components/region-filter";

export const metadata: Metadata = { title: "Strategies" };

export default async function StrategiesPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region: raw } = await searchParams;
  const region = isRegion(raw) ? raw : null;

  const strategies = getAllStrategies().filter(
    (s) => region === null || s.regions.includes(region),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="rise space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Strategy sections</h1>
        <p className="max-w-2xl text-sm text-neutral-600">
          One page per Global Reach strategy — its purpose, outputs, and regional guidance.
        </p>
        <Suspense fallback={null}>
          <RegionFilter />
        </Suspense>
      </header>

      {strategies.length === 0 ? (
        <p className="text-neutral-600">No strategy sections cover this region yet.</p>
      ) : (
        <ol className="rise rise-d2 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {strategies.map((s) => (
            <li
              key={s.slug}
              className="group relative border-b border-neutral-100 transition-colors last:border-0 hover:bg-okta-50/60"
            >
              <div className="flex items-center gap-5 px-5 py-4 sm:px-6">
                <span
                  aria-hidden="true"
                  className="hidden w-10 shrink-0 text-3xl font-bold tabular-nums tracking-tight text-neutral-300 transition-colors group-hover:text-okta-500 sm:block"
                >
                  {String(s.strategy_number).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  {/* Stretched link — makes the whole row clickable */}
                  <Link
                    href={{
                      pathname: `/strategies/${s.slug}`,
                      query: region ? { region } : undefined,
                    }}
                    className="font-medium text-neutral-900 before:absolute before:inset-0 before:content-[''] group-hover:text-okta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{s.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <StatusDot status={s.status} />
                    <RegionBadgeList regions={s.regions} />
                  </div>
                </div>

                <div className="hidden shrink-0 items-center gap-4 sm:flex">
                  <RegionBadgeList regions={s.regions} />
                  <StatusDot status={s.status} />
                </div>

                {/* Sits above the stretched link */}
                <Link
                  href={`/contribute?section=${s.slug}`}
                  aria-label={`Contribute to ${s.title}`}
                  className="relative z-10 shrink-0 text-sm font-medium text-okta-600 opacity-0 transition-opacity hover:underline focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500 group-hover:opacity-100 max-sm:opacity-100"
                >
                  Contribute
                </Link>

                <span
                  aria-hidden="true"
                  className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-okta-500"
                >
                  →
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="rise rise-d3 text-xs text-neutral-500">
        Have an output that belongs here? Hover a row and hit{" "}
        <span className="font-medium text-okta-600">Contribute</span>, or use the{" "}
        <Link href="/contribute" className="font-medium text-okta-600 hover:underline">
          contribution form
        </Link>
        .
      </p>
    </div>
  );
}
