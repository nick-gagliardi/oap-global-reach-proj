import Link from "next/link";
import { getAllStrategies } from "@/lib/content";
import { StatusDot } from "@/components/status-badge";

export default function HomePage() {
  const strategies = getAllStrategies();

  return (
    <div className="space-y-14">
      {/* Hero — dark Okta panel with a quiet blue glow */}
      <section className="rise relative overflow-hidden rounded-2xl bg-okta-900 px-6 py-14 text-white sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-okta-500/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-okta-700/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:24px_24px]"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-200">
            Oktane Attendance Program
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Every Global Reach output,{" "}
            <em className="font-normal italic [font-family:Georgia,'Times_New_Roman',serif]">
              in one place.
            </em>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-300">
            Localized talking points, success proof, and partner context — everything a rep
            needs to bring a global customer to Oktane, findable in under two minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/prep"
              className="rounded-md bg-okta-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-okta-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-200"
            >
              Prep a conversation →
            </Link>
            <Link
              href="/contribute"
              className="text-sm font-medium text-neutral-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-200"
            >
              Contribute an output
            </Link>
          </div>
        </div>
      </section>

      {/* Strategy index — editorial numbered list, whole row clickable */}
      <section aria-labelledby="sections-heading" className="space-y-6">
        <div className="rise rise-d2 flex items-baseline justify-between gap-4">
          <h2 id="sections-heading" className="text-xl font-semibold tracking-tight text-neutral-900">
            The eight strategies
          </h2>
          <Link
            href="/strategies"
            className="text-sm font-medium text-okta-600 hover:underline"
          >
            Browse all →
          </Link>
        </div>
        <ol className="grid gap-x-12 sm:grid-cols-2">
          {strategies.map((s, i) => (
            <li key={s.slug} className={`rise rise-d${Math.min(i + 2, 8)}`}>
              <Link
                href={`/strategies/${s.slug}`}
                className="group flex items-center gap-5 border-b border-neutral-200 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-500"
              >
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 text-3xl font-bold tabular-nums tracking-tight text-neutral-300 transition-colors group-hover:text-okta-500"
                >
                  {String(s.strategy_number).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-900 group-hover:text-okta-700">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-neutral-500">
                    {s.summary}
                  </span>
                </span>
                <StatusDot status={s.status} />
                <span
                  aria-hidden="true"
                  className="text-neutral-300 transition-transform group-hover:translate-x-1 group-hover:text-okta-500"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
