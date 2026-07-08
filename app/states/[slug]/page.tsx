import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator from "@/components/Calculator";
import Breadcrumbs from "@/components/Breadcrumbs";
import { STATE_SNOW, getStateSnow, snowBand } from "@/lib/ground-snow";
import { ROOF_TYPES } from "@/lib/roof-types";

export const dynamicParams = false;
// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

export function generateStaticParams() {
  return STATE_SNOW.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getStateSnow(slug);
  if (!s) return {};
  return {
    title: `${s.name} Ground Snow Load & Roof Snow Load Calculator`,
    description: `${s.name} ground snow load is typically ${s.lowPg} to ${s.highPg} psf (${snowBand(s.typicalPg)}). Calculate the roof snow load for your ${s.name} building with the ASCE 7-22 method.`,
    alternates: { canonical: `/states/${s.slug}` },
  };
}

const linkCls = "border border-ink-200 bg-paper px-3 py-1.5 text-sm text-ink-500 transition hover:border-frost-500 hover:text-ink-900";

export default async function StatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getStateSnow(slug);
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "By state", href: "/states" }, { name: s.name, href: `/states/${s.slug}` }]} />

      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-[2.6rem]">{s.name} Roof Snow Load Calculator</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">
        Ground snow load across the populated parts of {s.name} runs roughly{" "}
        <strong className="text-ink-700">{s.lowPg} to {s.highPg} psf</strong> ({snowBand(s.typicalPg)}). The
        calculator below is pre-loaded with a typical {s.name} value of <strong className="text-ink-700">{s.typicalPg} psf</strong>.
        Change it to your confirmed site value and adjust the roof.
      </p>

      {s.caseStudy ? (
        <div className="mt-4 border-l-2 border-load-500 bg-load-50 p-4 text-sm text-ink-700">
          <strong className="text-load-700">Case-study state.</strong> {s.note}
        </div>
      ) : (
        <div className="mt-4 border-l-2 border-frost-500 bg-frost-50 p-4 text-sm text-ink-700">{s.note}</div>
      )}

      <div className="mt-8"><Calculator seed={{ pg: s.typicalPg }} /></div>

      <section className="mt-10 border border-ink-200 bg-paper p-6 text-sm leading-relaxed text-ink-600">
        <h2 className="font-display text-lg font-semibold text-ink-900">Finding your exact {s.name} ground snow load</h2>
        <p className="mt-2">
          The number above is a planning value, not a permit value. For {s.name}, get your site&apos;s design
          ground snow load from the <a href="https://ascehazardtool.org" target="_blank" rel="noopener noreferrer" className="font-medium text-frost-700 hover:underline">ASCE 7 Hazard Tool</a> or
          your local building department. Many {s.name} jurisdictions adopt a published county or town value.
          {s.caseStudy && " Because elevation drives the value here, two nearby sites can differ a lot, so always use the value for your exact address."}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink-700">Calculate by roof type</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ROOF_TYPES.map((rt) => (
            <Link key={rt.slug} href={`/calculators/${rt.slug}`} className={linkCls}>{rt.name}</Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink-700">Other states</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATE_SNOW.filter((x) => x.slug !== s.slug).slice(0, 12).map((x) => (
            <Link key={x.slug} href={`/states/${x.slug}`} className={linkCls}>{x.name}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
