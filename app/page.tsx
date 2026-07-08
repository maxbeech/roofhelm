import Link from "next/link";
import Calculator from "@/components/Calculator";
import HeroDiagram from "@/components/HeroDiagram";
import Contours from "@/components/Contours";
import { Reveal } from "@/components/motion";
import Faq from "@/components/Faq";
import AppGallery from "@/components/AppGallery";
import { HowItWorks, StatStrip, ClosingCTA } from "@/components/HomeSections";
import { CTA, SectionHead, FigCaption } from "@/components/ui";
import { HOME_FAQS } from "@/lib/faq";
import { ROOF_TYPES } from "@/lib/roof-types";
import { TOOL_GROUPS } from "@/lib/tools";
import { STATE_SNOW } from "@/lib/ground-snow";
import { POSTS } from "@/lib/posts";
import { SITE } from "@/lib/site";

// Vercel free-tier policy: every content page in this app is pre-rendered at
// build time from in-repo data (no external fetch), so it's already served
// purely from the static CDN cache with zero function invocations -- the
// best case ISR can offer. `revalidate` is set anyway (1 week) so the page
// is correctly classified as ISR-eligible rather than purely static-export,
// which matters if/when a content source here ever moves to a runtime fetch
// (e.g. a future CMS): the cache policy is already in place, not bolted on
// later under time pressure.
export const revalidate = 604800; // 1 week, seconds

export default function Home() {
  return (
    <div>
      {/* Title page */}
      <section className="relative overflow-hidden bg-paper">
        <Contours className="opacity-60" />
        <div className="frost-aurora absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-10">
          <div className="flex items-center justify-between border-b border-ink-200 pb-2 label text-ink-400">
            <span>Vol. 01 &middot; Roof snow load</span>
            <span className="hidden sm:block">Free &middot; No sign-up &middot; Open source</span>
          </div>

          <h1 className="mt-9 max-w-4xl font-display text-[2.9rem] font-semibold leading-[0.96] tracking-[-0.02em] text-ink-900 sm:text-[5rem]">
            The weight of winter, <span className="italic font-normal text-frost-600">measured</span> to the letter of the code.
          </h1>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="dropcap max-w-md text-[17px] leading-relaxed text-ink-700">
                RoofHelm is an interactive monograph on roof engineering. Start with the ASCE 7-22 snow load
                method below (flat, sloped, minimum, rain-on-snow and §7.6.1 unbalanced loads, every factor
                shown), then the roof geometry, insulation, HVAC and cost calculators further down the page.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTA href="#calculator">Open the calculator</CTA>
                <CTA href="/methodology" variant="ghost">Read the method</CTA>
              </div>
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
                {[["5", "load cases"], ["7", "ASCE factors"], ["51", "states + DC"], ["$0", "to use"]].map(([n, l]) => (
                  <div key={l} className="border-t-2 border-ink-900 pt-1.5">
                    <dt className="tabular font-display text-2xl font-semibold text-ink-900">{n}</dt>
                    <dd className="label text-ink-400">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figure>
              <HeroDiagram />
              <FigCaption n="1">a live roof section. Drag the slope or step the snow depth to read the response.</FigCaption>
            </figure>
          </div>
        </div>
      </section>

      {/* §01 The worksheet */}
      <section id="calculator" className="scroll-mt-24 border-t-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHead num="01" eyebrow="The worksheet" title="Run your roof"
            sub="Adjust any input and the section drawing, factor table and governing load update live. Your inputs stay in the URL, so a result is shareable and bookmarkable." />
          <div className="mt-10"><Calculator /></div>
        </div>
      </section>

      <HowItWorks />
      <AppGallery />
      <StatStrip />

      {/* §05 By roof type, an index */}
      <section className="border-t-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHead num="05" eyebrow="By roof type" title="An index of calculators"
            sub="Each runs the same engine with the right defaults for that roof, from a flat membrane to a slippery standing-seam metal building." />
          <Reveal className="mt-10 border-t border-ink-200">
            {ROOF_TYPES.map((rt, i) => (
              <Link key={rt.slug} href={`/calculators/${rt.slug}`}
                className="group flex items-baseline gap-4 border-b border-ink-200 py-4">
                <span className="font-mono text-xs text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-lg font-medium text-ink-900 transition group-hover:text-frost-600">{rt.name}</span>
                <span className="mx-1 hidden flex-1 translate-y-[-3px] border-b border-dotted border-ink-300 sm:block" />
                <span className="hidden font-mono text-xs text-ink-400 sm:block">{rt.keyword}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 stroke-ink-300 transition group-hover:translate-x-0.5 group-hover:stroke-frost-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* §06 Beyond snow: the rest of the calculator suite */}
      <section className="border-t-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHead num="06" eyebrow="Beyond snow" title="Roof geometry, insulation, HVAC & cost"
            sub="The same transparent, real-formula approach applied to the rest of a roof project: pitch and framing, the building envelope, and what it costs to replace." />
          {TOOL_GROUPS.map((g) => (
            <div key={g.heading} className="mt-10">
              <h3 className="font-display text-lg font-semibold text-ink-900">{g.heading}</h3>
              <Reveal className="mt-3 border-t border-ink-200">
                {g.tools.map((t, i) => (
                  <Link key={t.slug} href={`/calculators/${t.slug}`}
                    className="group flex items-baseline gap-4 border-b border-ink-200 py-4">
                    <span className="font-mono text-xs text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-lg font-medium text-ink-900 transition group-hover:text-frost-600">{t.name}</span>
                    <span className="mx-1 hidden flex-1 translate-y-[-3px] border-b border-dotted border-ink-300 sm:block" />
                    <span className="hidden font-mono text-xs text-ink-400 sm:block">{t.keyword}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 stroke-ink-300 transition group-hover:translate-x-0.5 group-hover:stroke-frost-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                ))}
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* §07 By state, appendix preview */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHead num="07" eyebrow="Appendix · by state" title="Ground snow load, state by state"
          sub="Planning ranges for the populated parts of every state, with mountain case-study zones flagged. Confirm the exact value for your site with your building department." />
        <div className="mt-8 flex flex-wrap gap-1.5">
          {STATE_SNOW.map((s) => (
            <Link key={s.slug} href={`/states/${s.slug}`}
              className="border border-ink-200 px-2.5 py-1 font-mono text-xs text-ink-500 transition hover:border-frost-500 hover:text-frost-700">
              {s.abbr}
            </Link>
          ))}
        </div>
        <CTA href="/states" variant="ghost" className="mt-7">Read the full appendix</CTA>
      </section>

      {/* Essays */}
      <section className="border-t-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHead eyebrow="Essays" title="Snow load, explained plainly"
            sub="Practical, accurate walkthroughs for builders, engineers, solar installers and homeowners." />
          <Reveal className="mt-10 grid gap-px border border-ink-200 bg-ink-200 sm:grid-cols-3">
            {POSTS.slice(0, 3).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-paper p-6 transition hover:bg-frost-50">
                <div className="label text-frost-600">{p.readMins} min read</div>
                <div className="mt-3 font-display text-lg font-semibold leading-snug text-ink-900 group-hover:text-frost-700">{p.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.description}</p>
              </Link>
            ))}
          </Reveal>
          <CTA href="/blog" variant="ghost" className="mt-7">All essays</CTA>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6"><Faq items={HOME_FAQS} /></div>
      <div className="mt-16"><ClosingCTA /></div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "WebApplication",
        name: SITE.name, applicationCategory: "EngineeringApplication", operatingSystem: "Web",
        description: SITE.description, url: SITE.url,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }) }} />
    </div>
  );
}
