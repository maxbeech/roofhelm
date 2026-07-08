"use client";

import { type SnowInputs, type SnowResult, interpretSnow } from "@/lib/snow";
import { computeUnbalanced } from "@/lib/unbalanced";
import { categoryForSlug } from "@/lib/offers";
import RoofDiagram from "./RoofDiagram";
import SupplierModule from "./SupplierModule";
import { FigCaption } from "./ui";

const fmt = (n: number) => n.toLocaleString("en-US");

function Stat({ label, value, unit, hint, accent }:
  { label: string; value: string; unit?: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`border p-3 ${accent ? "border-frost-300 bg-frost-50" : "border-ink-200 bg-paper"}`}>
      <div className="label text-ink-400">{label}</div>
      <div className={`tabular mt-0.5 font-display text-2xl font-semibold ${accent ? "text-frost-600" : "text-ink-900"}`}>
        {value}{unit && <span className="ml-1 font-sans text-sm font-medium text-ink-400">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 font-mono text-[11px] text-ink-400">{hint}</div>}
    </div>
  );
}

export default function CalcResults({ inp, r, offerSlug }: { inp: SnowInputs; r: SnowResult; offerSlug?: string }) {
  const view = interpretSnow(inp, r);
  const unbal = computeUnbalanced(inp, r);
  const showUnbal = inp.shape === "gable" || inp.shape === "hip";
  const offerCategory = categoryForSlug(offerSlug);

  return (
    <div className="space-y-4">
      <figure>
        <RoofDiagram inp={inp} r={r} />
        <FigCaption n="A">the roof section at {inp.slopeDeg}°, snow blanket scaled to the design load.</FigCaption>
      </figure>

      {/* Governing load, set as the result block */}
      <div className="border-2 border-ink-900 bg-paper p-5">
        <div className="label text-ink-500">Design roof snow load · balanced</div>
        <div className="tabular mt-1 font-display text-5xl font-semibold text-frost-600">
          {r.design}<span className="ml-2 font-sans text-xl font-medium text-ink-400">psf</span>
        </div>
        <p className="mt-3 max-w-prose border-t border-ink-200 pt-3 text-sm leading-relaxed text-ink-600">{view.governText}</p>
        {r.totalWeightLb !== undefined && (
          <p className="mt-1.5 font-mono text-xs text-frost-600">≈ {fmt(r.totalWeightLb)} lb total on {fmt(inp.area ?? 0)} sq ft of roof plan</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Flat Pf" value={String(r.pf)} unit="psf" hint="0.7·Ce·Ct·Is·Pg" accent />
        <Stat label="Sloped Ps" value={String(r.ps)} unit="psf" hint={`Cs ${r.Cs}`} />
        <Stat label="Minimum Pm" value={r.slopeAppliesMin ? String(r.pm) : "n/a"} unit={r.slopeAppliesMin ? "psf" : ""} hint={r.slopeAppliesMin ? "§7.3.4" : "slope ≥ 15°"} />
        <Stat label="Rain-on-snow" value={r.rainOnSnow ? `+${r.rainOnSnow}` : "0"} unit="psf" hint="§7.10" />
      </div>

      {showUnbal && (
        <div className={`border p-4 ${unbal.applies ? "border-load-300 bg-load-50" : "border-ink-200 bg-paper"}`}>
          <div className="flex items-center justify-between">
            <div className="font-display text-sm font-semibold text-ink-900">Unbalanced load · §7.6.1 {inp.shape}</div>
            {unbal.applies && <span className="border border-load-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-load-700">may govern</span>}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{unbal.reason}</p>
          {unbal.applies && (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: "Windward", v: unbal.windward, lo: true },
                  { k: "Leeward base", v: unbal.leewardBase, lo: true },
                  { k: "Leeward peak", v: unbal.leewardPeak, lo: false },
                ].map((c) => (
                  <div key={c.k} className="border border-load-100 bg-paper p-2">
                    <div className="label text-ink-400">{c.k}</div>
                    <div className={`tabular font-display text-lg font-semibold ${c.lo ? "text-ink-900" : "text-load-600"}`}>{c.v}<span className="font-sans text-[11px] text-ink-400"> psf</span></div>
                  </div>
                ))}
              </div>
              {!unbal.simple && (
                <p className="mt-2 font-mono text-[11px] text-ink-400">surcharge {unbal.surchargeIntensity} psf over {unbal.surchargeWidth} ft · hd {unbal.hd} ft · γ {unbal.density} pcf</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="border border-ink-200 bg-paper p-4">
        <div className="font-display text-sm font-semibold text-ink-900">How this was calculated</div>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{view.designText}</p>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-ink-100">
            <Row k="Ground snow load, Pg" v={`${fmt(r.pg)} psf`} note="site input" />
            <Row k="Exposure factor, Ce" v={String(r.Ce)} note="Table 7.3-1" />
            <Row k="Thermal factor, Ct" v={String(r.Ct)} note="Table 7.3-2" />
            <Row k="Importance factor, Is" v={String(r.Is)} note="Table 1.5-2" />
            <Row k="Slope factor, Cs" v={String(r.Cs)} note="Fig. 7.4-1" />
            <Row k="Snow density, γ" v={`${r.density} pcf`} note="Eq. 7.7-1" />
            <Row k="Settled depth at design load" v={`${r.depth} in`} note="design ÷ density" />
          </tbody>
        </table>
      </div>

      <ul className="space-y-2">
        {view.notes.map((n, i) => (
          <li key={i} className="flex gap-3 border-t border-ink-100 pt-2 text-sm leading-relaxed text-ink-500">
            <span className="font-mono text-xs text-frost-600">{String(i + 1).padStart(2, "0")}</span>{n}
          </li>
        ))}
      </ul>

      <button onClick={() => window.print()}
        className="inline-flex items-center gap-2 border border-ink-900 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-900 transition hover:bg-ink-900 hover:text-paper print:hidden">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
        Print or save as PDF
      </button>

      <SupplierModule
        category={offerCategory}
        contextLine={<>Your design roof snow load is{" "}<span className="tabular font-mono font-semibold text-frost-600">{r.design} psf</span>.</>}
        quoteQuery={{ load: r.design, pg: r.pg }}
      />
    </div>
  );
}

function Row({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-2 text-ink-500">{k}</td>
      <td className="tabular py-1.5 pr-2 text-right font-mono font-semibold text-ink-900">{v}</td>
      <td className="py-1.5 text-right font-mono text-[11px] text-ink-300">{note}</td>
    </tr>
  );
}
