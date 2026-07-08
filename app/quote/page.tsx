import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import QuoteFormSection from "@/components/QuoteFormSection";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Get Snow Load Quotes: Steel Buildings, Carports & Pole Barns",
  description:
    "Get free quotes for a steel building, carport or pole barn engineered for your ASCE 7 design snow load. Suppliers quote a structure sized for your site.",
  alternates: { canonical: "/quote" },
};

const STEPS = [
  ["You send your project", "Structure type, location and the design snow load from your calculation."],
  ["Suppliers quote it sized right", "Because the snow load is attached, quotes come back engineered for your site, not a generic number."],
  ["You compare and choose", "No obligation. Confirm the rated load and have a licensed engineer review for the permit."],
];

// Fully static: the calculator context (?structure=&load=&pg=) is read in the
// browser by QuoteFormSection, so this page prerenders and serves from cache.
// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

export default function QuotePage() {
  return (
    <div>
      <PageHeader eyebrow="Quotes" title="Quotes for a structure built to your snow load" width="max-w-5xl">
        Get free, no-obligation quotes for a steel building, carport or pole barn engineered for your ASCE 7
        design snow load. We pass your number to suppliers so the quotes come back sized for your site.
      </PageHeader>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Quotes", href: "/quote" }]} />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <Suspense fallback={<div className="border border-ink-300 bg-paper p-6 text-sm text-ink-400">Loading the quote form</div>}>
            <QuoteFormSection />
          </Suspense>

          <aside>
            <h2 className="font-display text-lg font-semibold text-ink-900">How it works</h2>
            <ol className="mt-3 space-y-4">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="tabular shrink-0 font-mono text-sm font-semibold text-frost-600">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{t}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-500">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-ink-200 pt-4 text-xs leading-relaxed text-ink-400">
              Need to recompute first? Use the free{" "}
              <Link href="/calculators/metal-building-snow-load" className="text-frost-700 underline-offset-4 hover:underline">structure calculators</Link>{" "}
              to get your design load, then come back with the number attached.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
