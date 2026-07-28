import type { Metadata } from "next";
import { getAllStrategies } from "@/lib/content";
import { ContributeForm } from "./contribute-form";

export const metadata: Metadata = { title: "Contribute" };

const STEPS = [
  {
    n: "01",
    title: "You submit",
    body: "Paste the output itself or a summary plus links to where it lives. No GitHub, no CMS.",
  },
  {
    n: "02",
    title: "It hits the review queue",
    body: "Your submission lands on the tracker, visible to the whole team immediately.",
  },
  {
    n: "03",
    title: "It becomes the section",
    body: "The hub owner formats it into the strategy page — live for every rep within minutes.",
  },
];

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const strategies = getAllStrategies().map((s) => ({ slug: s.slug, title: s.title }));
  const initialSlug = strategies.some((s) => s.slug === section) ? section! : "";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="rise max-w-2xl space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-okta-600">
          Your output, everyone&apos;s resource
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Contribute a strategy output
        </h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          Produced an ICP, blueprint, success story, or regional insight? This is where it
          stops living in a doc nobody can find.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <div className="rise rise-d2">
          <ContributeForm strategies={strategies} initialStrategySlug={initialSlug} />
        </div>

        <aside aria-label="How contributions work" className="rise rise-d3 space-y-5 lg:pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            What happens next
          </p>
          <ol className="space-y-5 border-l border-neutral-200 pl-5">
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-okta-500"
                />
                <p className="text-sm font-semibold text-neutral-900">
                  <span
                    aria-hidden="true"
                    className="mr-1.5 text-xs font-bold tabular-nums tracking-widest text-okta-500"
                  >
                    {s.n}
                  </span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="rounded-lg bg-okta-50 p-3 text-xs leading-relaxed text-okta-800">
            Attachments live as links — point at the doc, deck, or Highspot page where your
            material already is.
          </p>
        </aside>
      </div>
    </div>
  );
}
