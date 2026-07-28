import type { Metadata } from "next";
import Link from "next/link";
import { getSectionStatuses } from "@/lib/content";
import { StatusDot } from "@/components/status-badge";
import { ReviewQueue } from "./review-queue";

export const metadata: Metadata = { title: "Tracker" };
export const dynamic = "force-dynamic";

export default function TrackerPage() {
  const sections = getSectionStatuses();
  const counts = sections.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  const stats = [
    { label: "Complete", value: counts["complete"] ?? 0, dot: "bg-emerald-500" },
    { label: "In progress", value: counts["in-progress"] ?? 0, dot: "bg-amber-500" },
    { label: "Awaiting content", value: counts["placeholder"] ?? 0, dot: "bg-neutral-300" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <section aria-labelledby="status-heading" className="space-y-6">
        <header className="rise space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-600">
            Progress · all 8 strategies
          </p>
          <h1 id="status-heading" className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Tracker
          </h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm text-neutral-700">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />
                <dd className="font-semibold tabular-nums text-neutral-900">{s.value}</dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        </header>

        <ol className="rise rise-d2 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {sections.map((s) => (
            <li
              key={s.slug}
              className="group relative border-b border-neutral-100 transition-colors last:border-0 hover:bg-okta-50/60"
            >
              <div className="flex items-center gap-5 px-5 py-3.5 sm:px-6">
                <span
                  aria-hidden="true"
                  className="hidden w-10 shrink-0 text-2xl font-bold tabular-nums tracking-tight text-neutral-300 transition-colors group-hover:text-okta-500 sm:block"
                >
                  {String(s.strategy_number).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/strategies/${s.slug}`}
                    className="font-medium text-neutral-900 before:absolute before:inset-0 before:content-[''] group-hover:text-okta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {s.owner} · updated {s.last_updated}
                  </p>
                </div>
                <StatusDot status={s.status} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="queue-heading" className="rise rise-d3 space-y-5">
        <div className="space-y-1">
          <h2 id="queue-heading" className="text-xl font-semibold tracking-tight text-neutral-900">
            Contribution review queue
          </h2>
          <p className="text-sm text-neutral-600">
            Teammate submissions land here before being formatted into their section.
          </p>
        </div>
        <ReviewQueue />
      </section>
    </div>
  );
}
