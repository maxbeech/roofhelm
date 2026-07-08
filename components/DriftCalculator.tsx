"use client";

import { useMemo, useState } from "react";
import { computeDrift, DEFAULT_DRIFT, type DriftInputs } from "@/lib/drift";
import { Field, NumberField } from "./FormFields";
import { FigCaption } from "./ui";

// Schematic of the roof step and the drift wedge built against it.
function StepDiagram({ stepPx, driftPx, driftWide, required }:
  { stepPx: number; driftPx: number; driftWide: number; required: boolean }) {
  const baseY = 130, stepX = 196, lowerSnowTop = baseY - 8;
  const wedgeLeft = Math.max(40, stepX - driftWide);
  return (
    <svg viewBox="0 0 320 170" className="w-full" role="img" aria-label="Roof step with snow drift">
      <line x1="14" y1="150" x2="306" y2="150" className="stroke-ink-300" strokeWidth="1" />
      <path d={`M${stepX} ${baseY} L${stepX} ${baseY - stepPx} L300 ${baseY - stepPx} L300 150 L${stepX} 150 Z`} className="fill-ink-700" />
      <path d={`M20 ${baseY} L${stepX} ${baseY} L${stepX} 150 L20 150 Z`} className="fill-ink-600" />
      <path d={`M20 ${lowerSnowTop} L${stepX} ${lowerSnowTop} L${stepX} ${baseY} L20 ${baseY} Z`} fill="#dde8ea" className="stroke-frost-400" strokeWidth="1" />
      {required && driftPx > 0 && (
        <path d={`M${stepX} ${lowerSnowTop} L${stepX} ${lowerSnowTop - driftPx} L${wedgeLeft} ${lowerSnowTop} Z`} fill="#d29b80" className="stroke-load-600" strokeWidth="1" />
      )}
      <text x="26" y={baseY - 13} className="fill-frost-700 font-mono text-[9px]">lower roof</text>
      <text x={stepX + 8} y={baseY - stepPx + 13} className="fill-paper font-mono text-[9px]">upper roof</text>
    </svg>
  );
}

export default function DriftCalculator() {
  const [inp, setInp] = useState<DriftInputs>(DEFAULT_DRIFT);
  const r = useMemo(() => computeDrift(inp), [inp]);
  const set = <K extends keyof DriftInputs>(k: K, v: number) => setInp((p) => ({ ...p, [k]: v }));
  const stepPx = Math.max(10, Math.min(70, inp.stepHeight * 7));
  const driftPx = Math.max(0, Math.min(stepPx, r.hd * 7));
  const driftWide = Math.max(20, Math.min(150, r.width * 4));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="border border-ink-300 bg-paper p-5">
        <h2 className="label border-b border-ink-200 pb-3 text-ink-500">The roof step</h2>
        <div className="mt-4 space-y-3.5">
          <Field label="Ground snow load, Pg (psf)"><NumberField value={inp.pg} min={0} max={400} onChange={(n) => set("pg", n)} ariaLabel="Ground snow load" /></Field>
          <Field label="Lower-roof balanced load, Ps (psf)" hint="From the main calculator."><NumberField value={inp.ps} min={0} max={400} onChange={(n) => set("ps", n)} ariaLabel="Lower roof balanced load" /></Field>
          <Field label="Step height (ft)" hint="Upper roof minus lower roof."><NumberField value={inp.stepHeight} min={0} max={100} step={0.5} onChange={(n) => set("stepHeight", n)} ariaLabel="Step height" /></Field>
          <Field label="Upper roof length, Lu (ft)" hint="Leeward fetch feeding the drift."><NumberField value={inp.lu} min={5} max={1000} onChange={(n) => set("lu", n)} ariaLabel="Upper roof length" /></Field>
          <Field label="Lower roof length, Ll (ft)" hint="Windward fetch."><NumberField value={inp.ll} min={5} max={1000} onChange={(n) => set("ll", n)} ariaLabel="Lower roof length" /></Field>
        </div>
      </div>

      <div className="space-y-4">
        <figure className="border border-ink-300 bg-gradient-to-b from-frost-50/70 to-paper p-3">
          <StepDiagram stepPx={stepPx} driftPx={driftPx} driftWide={driftWide} required={r.required} />
          <FigCaption n="1">the drift wedge against the step, height hd capped at the clear height.</FigCaption>
        </figure>
        <div className="border-2 border-ink-900 bg-paper p-5">
          <div className="label text-ink-500">Peak load at the step</div>
          <div className="tabular mt-1 font-display text-4xl font-semibold text-frost-600">{r.peakLoad}<span className="ml-2 font-sans text-lg font-medium text-ink-400">psf</span></div>
          <p className="mt-3 border-t border-ink-200 pt-3 text-sm leading-relaxed text-ink-600">
            {r.required
              ? `Drift surcharge of +${r.surcharge} psf (${r.source}) over a ${r.width} ft width, on top of the ${inp.ps} psf balanced load.`
              : "Clear height is small (hc/hb < 0.2), so ASCE 7 §7.7 says drift need not be considered here."}
          </p>
        </div>
        <div className="border border-ink-200 bg-paper p-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ink-100">
              {[
                ["Snow density, γ", `${r.density} pcf`], ["Balanced snow height, hb", `${r.hb} ft`],
                ["Clear height, hc", `${r.hc} ft`], ["Leeward drift height", `${r.hdLeeward} ft`],
                ["Windward drift height", `${r.hdWindward} ft`], ["Governing drift height, hd", `${r.hd} ft${r.truncated ? " (capped)" : ""}`],
              ].map(([k, v]) => (
                <tr key={k}><td className="py-1.5 text-ink-500">{k}</td><td className="tabular py-1.5 text-right font-mono font-semibold text-ink-900">{v}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-400">§7.7: hd = 0.43·(L)^(1/3)·(Pg+10)^(1/4) − 1.5; surcharge pd = hd·γ. Windward case uses 0.75× of the lower-roof fetch.</p>
        </div>
      </div>
    </div>
  );
}
