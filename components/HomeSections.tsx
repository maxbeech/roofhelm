import Link from "next/link";
import Contours from "./Contours";
import { Eyebrow, SectionHead } from "./ui";
import { CountUp, Reveal } from "./motion";
import { ROOF_TYPES } from "@/lib/roof-types";
import { TOOLS } from "@/lib/tools";
import { POSTS } from "@/lib/posts";

const STEPS = [
  { n: "01", h: "Set the ground snow load", p: "Pg comes from the ASCE 7 Hazard Tool or your building department. The per-state appendix gives a planning range to start from." },
  { n: "02", h: "Describe the roof", p: "Slope, shape, warmth, surface, exposure and importance. Each maps to a published ASCE 7 factor, never a guess." },
  { n: "03", h: "Read every load case", p: "Flat, sloped, minimum, rain-on-snow and the §7.6.1 unbalanced load, with the governing value and a settled-depth section." },
];

export function HowItWorks() {
  return (
    <section className="border-y-2 border-ink-900 bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <SectionHead num="02" eyebrow="The method"
          title={<>From a ground snow number to a <span className="italic text-frost-600">defensible</span> roof load.</>} />
        <div className="mt-12 grid sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`relative py-2 ${i > 0 ? "sm:border-l sm:border-ink-200 sm:pl-8" : ""} ${i > 0 ? "mt-8 sm:mt-0" : ""}`}>
              <div className="font-display text-6xl font-semibold leading-none text-frost-600/30">{s.n}</div>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">{s.h}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// The snow-load scale, presented as a numbered figure for reading any result.
const BANDS = [
  { label: "very low", range: "0 to 5", w: 8, c: "bg-frost-100" },
  { label: "low", range: "5 to 15", w: 14, c: "bg-frost-200" },
  { label: "moderate", range: "15 to 30", w: 22, c: "bg-frost-400" },
  { label: "high", range: "30 to 50", w: 26, c: "bg-load-300" },
  { label: "very high", range: "50+", w: 30, c: "bg-load-500" },
];

export function StatStrip() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead num="04" eyebrow="The scale" title="Read any result at a glance" />
        <div className="flex gap-10">
          {[[ROOF_TYPES.length, "roof types"], [TOOLS.length, "other calculators"], [51, "states + DC"], [POSTS.length, "essays"]].map(([n, l]) => (
            <div key={l as string} className="border-t-2 border-ink-900 pt-2">
              <div className="tabular font-display text-4xl font-semibold text-ink-900"><CountUp value={n as number} /></div>
              <div className="label mt-1 text-ink-400">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <Reveal className="mt-10 border border-ink-300 bg-paper p-5">
        <div className="flex h-6 overflow-hidden border border-ink-200">
          {BANDS.map((b) => <div key={b.label} className={b.c} style={{ width: `${b.w}%` }} />)}
        </div>
        <div className="mt-1.5 flex font-mono text-[10px] text-ink-400">
          {["0", "5", "15", "30", "50", "70+ psf"].map((t, i) => (
            <span key={t} className={i === 0 ? "" : "flex-1 text-right"} style={i === 0 ? { width: 0 } : undefined}>{t}</span>
          ))}
        </div>
        <div className="mt-4 flex">
          {BANDS.map((b) => (
            <div key={b.label} style={{ width: `${b.w}%` }} className="border-l border-ink-200 pl-2">
              <div className="font-display text-sm font-semibold capitalize text-ink-800">{b.label}</div>
              <div className="font-mono text-[10px] text-ink-400">{b.range}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 figcaption">
          <span className="text-frost-600">Fig. 2</span> &middot; the ASCE 7 ground snow load scale, from a mild Gulf-coast roof to the high Sierra.
        </p>
      </Reveal>
    </section>
  );
}

// The closing edition: a dark endpaper offering the Pro offprint.
export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="relative overflow-hidden border-2 border-ink-900 bg-ink-950 p-8 text-paper sm:p-14">
        <Contours variant="dark" className="opacity-50" />
        <div className="relative max-w-xl">
          <Eyebrow tone="dark">The Pro offprint</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-paper sm:text-4xl">Sizing a permit submittal?</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-200">
            The Pro report sets your calculation as a clean, referenced PDF offprint: every input, every
            factor, the governing case and the cases a reviewer will ask about.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link href="/pricing" className="border border-paper bg-paper px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-900 transition hover:bg-transparent hover:text-paper">See the Pro offprint</Link>
            <Link href="/methodology" className="text-[13px] font-medium text-frost-200 underline-offset-4 hover:underline">Read the methods</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
