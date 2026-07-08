import type { Metadata } from "next";
import Link from "next/link";
import { ROOF_TYPES } from "@/lib/roof-types";
import { TOOL_GROUPS } from "@/lib/tools";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Roof Calculators: Snow Load, Pitch, Rafters, Insulation, HVAC & Cost",
  description: "Every roof calculator in one place: ASCE 7-22 snow load by roof type, roof pitch, rafter length, truss count, joist span, insulation R-value, HVAC load and a roof replacement cost estimate.",
  alternates: { canonical: "/calculators" },
};

function CalcCard({ href, name, focus }: { href: string; name: string; focus: string }) {
  return (
    <Link href={href}
      className="group border border-ink-200 bg-paper p-5 transition hover:border-frost-500 hover:bg-frost-50">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-lg font-semibold text-ink-900 group-hover:text-frost-700">{name}</div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 stroke-ink-300 transition group-hover:translate-x-0.5 group-hover:stroke-frost-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{focus}</p>
    </Link>
  );
}

// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

export default function CalculatorsIndex() {
  return (
    <div>
      <PageHeader eyebrow="Every calculator" title="Roof calculators, all in one place">
        Snow load, roof geometry, insulation, HVAC and cost. Each runs a transparent, real-formula engine with
        every factor shown, so you land on a relevant answer fast and can refine from there.
      </PageHeader>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink-900">Snow load, by roof type</h2>
          <p className="mt-1 text-sm text-ink-500">The full ASCE 7-22 engine, pre-set for each roof type.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ROOF_TYPES.map((r) => <CalcCard key={r.slug} href={`/calculators/${r.slug}`} name={r.name} focus={r.focus} />)}
          </div>
        </section>

        {TOOL_GROUPS.map((g) => (
          <section key={g.heading} className="mt-12">
            <h2 className="font-display text-xl font-semibold text-ink-900">{g.heading}</h2>
            <p className="mt-1 text-sm text-ink-500">{g.sub}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {g.tools.map((t) => <CalcCard key={t.slug} href={`/calculators/${t.slug}`} name={t.name} focus={t.focus} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
