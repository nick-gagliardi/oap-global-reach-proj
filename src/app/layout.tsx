import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { SearchProvider } from "@/components/search-provider";
import { buildSearchIndex } from "@/lib/search-index";
import { countPending } from "@/lib/iddb";

export const metadata: Metadata = {
  title: {
    default: "OAP Global Reach Hub",
    template: "%s · OAP Global Reach Hub",
  },
  description:
    "Single source of truth for Global Reach strategy outputs and Oktane conversation prep.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const index = buildSearchIndex();

  // Pending-contribution badge. DB may be unreachable or unprovisioned —
  // that must never break the shell.
  let pendingCount: number | null = null;
  try {
    pendingCount = await countPending();
  } catch {
    pendingCount = null;
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SearchProvider index={index}>
          <Nav pendingCount={pendingCount} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="bg-okta-900 py-4 text-center text-xs text-neutral-400">
            <span className="font-semibold lowercase text-neutral-200">okta</span> · OAP Global
            Reach · internal use only · content marked [PLACEHOLDER] is draft
          </footer>
        </SearchProvider>
      </body>
    </html>
  );
}
