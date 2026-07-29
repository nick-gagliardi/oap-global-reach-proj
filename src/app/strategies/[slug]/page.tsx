import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAllStrategies, getStrategy } from "@/lib/content";
import { isRegion, REGION_LABELS, STRATEGY_SLUGS } from "@/lib/regions";
import { StatusDot } from "@/components/status-badge";
import { RegionFilter } from "@/components/region-filter";
import { SpecSheet } from "@/components/spec-sheet";

export function generateStaticParams() {
  return STRATEGY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getStrategy(slug);
  return { title: doc?.title ?? "Strategy" };
}

export default async function StrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const [{ slug }, { region: rawRegion }] = await Promise.all([params, searchParams]);
  const doc = getStrategy(slug);
  if (!doc) notFound();
  const activeRegion = isRegion(rawRegion) ? rawRegion : null;

  const all = getAllStrategies();
  const idx = all.findIndex((s) => s.slug === doc.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;
  const regionQuery = activeRegion ? { region: activeRegion } : undefined;

  const meta = [
    {
      label: "Status",
      value: <StatusDot status={doc.status} />,
    },
    { label: "Owner", value: doc.owner },
    { label: "Updated", value: doc.last_updated },
    {
      label: "Regions",
      value: doc.regions.map((r) => REGION_LABELS[r]).join(" · "),
    },
  ];

  return (
    <article className="mx-auto max-w-5xl space-y-8">
      {/* Spec-sheet header */}
      <header className="rise space-y-5">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden="true"
            className="text-5xl font-bold tabular-nums tracking-tight text-neutral-200"
          >
            {String(doc.strategy_number).padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-600">
              Global Reach workstream
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              {doc.title}
            </h1>
          </div>
        </div>
        <p className="max-w-3xl text-neutral-700">{doc.summary}</p>

        <dl className="grid grid-cols-2 divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-4 sm:divide-x">
          {meta.map((m) => (
            <div key={m.label} className="px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {m.label}
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">{m.value}</dd>
            </div>
          ))}
        </dl>

        <Suspense fallback={null}>
          <RegionFilter />
        </Suspense>
      </header>

      {doc.segments.length === 0 ? (
        <div className="rise rise-d2 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <p
            aria-hidden="true"
            className="text-5xl font-bold tabular-nums tracking-tight text-neutral-200"
          >
            {String(doc.strategy_number).padStart(2, "0")}
          </p>
          <h2 className="mt-3 text-lg font-semibold text-neutral-900">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            This section fills up as the team contributes. If you own an output that belongs
            here — {doc.summary.charAt(0).toLowerCase() + doc.summary.slice(1)} — send it in
            and it will be formatted into this page.
          </p>
          <Link
            href={`/contribute?section=${doc.slug}`}
            className="mt-6 inline-block rounded-md bg-okta-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-okta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
          >
            Contribute to this section →
          </Link>
        </div>
      ) : (
        <div className="rise rise-d2">
          <SpecSheet segments={doc.segments} activeRegion={activeRegion} />
        </div>
      )}

      <nav
        aria-label="Strategy sections"
        className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-5 text-sm"
      >
        {prev ? (
          <Link
            href={{ pathname: `/strategies/${prev.slug}`, query: regionQuery }}
            className="font-medium text-okta-600 hover:underline"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href={`/contribute?section=${doc.slug}`}
          className="text-xs font-medium text-neutral-500 hover:text-okta-700 hover:underline"
        >
          Contribute to this section
        </Link>
        {next ? (
          <Link
            href={{ pathname: `/strategies/${next.slug}`, query: regionQuery }}
            className="font-medium text-okta-600 hover:underline"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
