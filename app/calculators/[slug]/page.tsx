import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator from "@/components/Calculator";
import ToolCalculator from "@/components/ToolCalculator";
import Faq from "@/components/Faq";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Pill } from "@/components/ui";
import { ROOF_TYPES, getRoofType } from "@/lib/roof-types";
import { TOOLS, getTool } from "@/lib/tools";
import type { ToolDef } from "@/lib/calc-engine";
import { STATE_SNOW } from "@/lib/ground-snow";

// Only the known calculator slugs (snow-load roof types + the tool family)
// are valid, so unknown slugs 404 immediately without an on-demand render
// (keeps the build fully static and Vercel-cheap).
export const dynamicParams = false;
// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

const SNOWY = ["colorado", "minnesota", "michigan", "massachusetts", "new-york", "utah", "wisconsin", "maine"];

export function generateStaticParams() {
  return [...ROOF_TYPES.map((r) => ({ slug: r.slug })), ...TOOLS.map((t) => ({ slug: t.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoofType(slug);
  if (r) return { title: r.h1, description: r.meta, alternates: { canonical: `/calculators/${r.slug}` } };
  const t = getTool(slug);
  if (t) return { title: t.h1, description: t.meta, alternates: { canonical: `/calculators/${t.slug}` } };
  return {};
}

const linkCls = "border border-ink-200 bg-paper px-3 py-1.5 text-sm text-ink-500 transition hover:border-frost-500 hover:text-ink-900";

export default async function CalculatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTool(slug);
  if (t) return <ToolPage tool={t} />;

  const r = getRoofType(slug);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Roof types", href: "/calculators" }, { name: r.name, href: `/calculators/${r.slug}` }]} />

      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-[2.6rem]">{r.h1}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">{r.intro}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Pill tone="load">What is different here</Pill>
        <span className="text-sm text-ink-500">{r.focus}</span>
      </div>

      <div className="mt-8"><Calculator seed={r.defaults} offerSlug={r.slug} /></div>

      <section className="mt-10 border border-ink-200 bg-paper p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Notes for {r.name.toLowerCase()} roofs</h2>
        <ul className="mt-3 space-y-2">
          {r.notes.map((n, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-frost-400" />{n}
            </li>
          ))}
        </ul>
      </section>

      <Faq items={r.faqs} />

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-ink-700">Other roof types</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROOF_TYPES.filter((x) => x.slug !== r.slug).map((x) => (
            <Link key={x.slug} href={`/calculators/${x.slug}`} className={linkCls}>{x.name}</Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink-700">Ground snow load in snowy states</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATE_SNOW.filter((s) => SNOWY.includes(s.slug)).map((s) => (
            <Link key={s.slug} href={`/states/${s.slug}`} className={linkCls}>{s.name}</Link>
          ))}
          <Link href="/drift" className={linkCls}>Snow drift calculator</Link>
          <Link href="/methodology" className={linkCls}>How it works</Link>
        </div>
      </section>
    </div>
  );
}

function ToolPage({ tool }: { tool: ToolDef }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Calculators", href: "/calculators" }, { name: tool.name, href: `/calculators/${tool.slug}` }]} />

      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-[2.6rem]">{tool.h1}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">{tool.intro}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Pill tone="frost">What this gives you</Pill>
        <span className="text-sm text-ink-500">{tool.focus}</span>
      </div>

      <div className="mt-8"><ToolCalculator slug={tool.slug} /></div>

      <section className="mt-10 border border-ink-200 bg-paper p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Notes</h2>
        <ul className="mt-3 space-y-2">
          {tool.notes.map((n, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-frost-400" />{n}
            </li>
          ))}
        </ul>
      </section>

      <Faq items={tool.faqs} />

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-ink-700">Other calculators</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOOLS.filter((x) => x.slug !== tool.slug).map((x) => (
            <Link key={x.slug} href={`/calculators/${x.slug}`} className={linkCls}>{x.name}</Link>
          ))}
          <Link href="/calculators/flat-roof-snow-load" className={linkCls}>Snow load calculators</Link>
          <Link href="/methodology" className={linkCls}>How the snow load engine works</Link>
        </div>
      </section>
    </div>
  );
}
