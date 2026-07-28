import Link from "next/link";
import { Suspense } from "react";
import { Search } from "./search";

const LINKS = [
  { href: "/strategies", label: "Strategies" },
  { href: "/prep", label: "Conversation Prep" },
  { href: "/contribute", label: "Contribute" },
  { href: "/tracker", label: "Tracker" },
];

export function Nav({ pendingCount }: { pendingCount: number | null }) {
  return (
    <header className="bg-okta-900 text-white">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
      >
        <Link
          href="/"
          className="flex items-baseline gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-200"
        >
          <span className="text-xl font-bold lowercase tracking-tight">okta</span>
          <span aria-hidden="true" className="text-neutral-500">
            |
          </span>
          <span className="text-sm font-semibold tracking-tight text-neutral-200">
            Global Reach Hub
          </span>
        </Link>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-sm font-medium text-neutral-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-okta-200"
              >
                {l.label}
                {l.href === "/tracker" && pendingCount ? (
                  <span
                    aria-label={`${pendingCount} pending contributions`}
                    className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-okta-500 px-1.5 py-0.5 text-xs font-semibold text-white"
                  >
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto">
          <Suspense fallback={null}>
            <Search />
          </Suspense>
        </div>
      </nav>
      <div className="h-0.5 bg-gradient-to-r from-okta-500 via-okta-600 to-okta-800" />
    </header>
  );
}
