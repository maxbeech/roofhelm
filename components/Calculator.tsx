"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeSnow, DEFAULT_SNOW, degToPitch, pitchToDeg, type RiskCategory, type RoofExposure,
  type RoofShape, type SnowInputs, type Surface, type Terrain, type Thermal,
} from "@/lib/snow";
import { decodeInputs, encodeInputs } from "@/lib/snow-url";
import { Field, NumberField, selectControl } from "./FormFields";
import CalcResults from "./CalcResults";

const PITCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]; // rise per 12 run

// Show a pitch in the dropdown only when the slope really matches one (within
// 0.3°), otherwise read "Custom", never silently rounding 25° to "6:12".
function matchedPitch(slopeDeg: number): number | "" {
  const p = Math.round(Math.tan((slopeDeg * Math.PI) / 180) * 12);
  if (!PITCHES.includes(p)) return "";
  return Math.abs(pitchToDeg(p) - slopeDeg) <= 0.3 ? p : "";
}

export default function Calculator({ seed, offerSlug }: { seed?: Partial<SnowInputs>; offerSlug?: string }) {
  const [inp, setInp] = useState<SnowInputs>(() => ({ ...DEFAULT_SNOW, ...seed }));
  const hydrated = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInp(decodeInputs(window.location.search, seed));
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${encodeInputs(inp)}`);
  }, [inp]);

  const r = useMemo(() => computeSnow(inp), [inp]);
  const set = <K extends keyof SnowInputs>(k: K, v: SnowInputs[K]) => setInp((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true"
        className="sticky top-[64px] z-20 mb-3 flex items-center justify-between border border-ink-300 bg-paper/95 px-4 py-2 backdrop-blur md:hidden print:hidden">
        <span className="label text-ink-400">Design snow load</span>
        <span className="tabular font-display text-lg font-semibold text-frost-600">{r.design}<span className="text-xs font-medium text-ink-400"> psf</span></span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="border border-ink-300 bg-paper p-5">
          <div className="flex items-center justify-between border-b border-ink-200 pb-3">
            <h2 className="label text-ink-500">The worksheet</h2>
            <span className="border border-ink-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">ASCE 7-22</span>
          </div>
          <div className="mt-4 space-y-3.5">
            <Field label="Ground snow load, Pg (psf)" hint="From the ASCE 7 Hazard Tool or your building department. The per-state pages give a planning range.">
              <NumberField value={inp.pg} min={0} max={400} step={1} onChange={(n) => set("pg", n)} ariaLabel="Ground snow load in psf" />
            </Field>

            <Field label="Roof shape" hint="Gable and hip roofs trigger the §7.6.1 unbalanced (leeward drift) check.">
              <select className={selectControl} value={inp.shape} onChange={(e) => set("shape", e.target.value as RoofShape)}>
                <option value="flat">Flat or low-slope</option>
                <option value="gable">Gable</option>
                <option value="hip">Hip</option>
                <option value="monoslope">Monoslope or shed</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Roof slope (degrees)" hint={inp.slopeDeg > 0 ? `about ${degToPitch(inp.slopeDeg)} pitch` : "0 = flat"}>
                <NumberField value={inp.slopeDeg} min={0} max={70} step={0.5} onChange={(n) => set("slopeDeg", n)} ariaLabel="Roof slope in degrees" />
              </Field>
              <Field label="or pick a pitch" hint="Sets the slope from rise in 12.">
                <select className={selectControl} aria-label="Roof pitch in twelve" value={matchedPitch(inp.slopeDeg)}
                  onChange={(e) => { if (e.target.value !== "") set("slopeDeg", pitchToDeg(Number(e.target.value))); }}>
                  <option value="">Custom</option>
                  {PITCHES.map((p) => <option key={p} value={p}>{p === 0 ? "Flat (0:12)" : `${p}:12`}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Thermal condition, Ct" hint="How warm is the space under the roof?">
              <select className={selectControl} value={inp.thermal} onChange={(e) => set("thermal", e.target.value as Thermal)}>
                <option value="heated">Heated building · Ct 1.0</option>
                <option value="slightlyHeated">Just above freezing or cold ventilated roof · Ct 1.1</option>
                <option value="unheated">Unheated or open structure · Ct 1.2</option>
                <option value="freezer">Continuously below freezing (freezer) · Ct 1.3</option>
                <option value="greenhouse">Continuously heated greenhouse · Ct 0.85</option>
              </select>
            </Field>

            <Field label="Roof surface, Cs" hint="Smooth metal, membrane and glass count as slippery; they shed snow sooner.">
              <select className={selectControl} value={inp.surface} onChange={(e) => set("surface", e.target.value as Surface)}>
                <option value="nonslippery">Shingles or textured (not slippery)</option>
                <option value="slippery">Metal, membrane or glass (slippery)</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Terrain" hint="Surface roughness around the site.">
                <select className={selectControl} value={inp.terrain} onChange={(e) => set("terrain", e.target.value as Terrain)}>
                  <option value="B">B · suburban or wooded</option>
                  <option value="C">C · open terrain</option>
                  <option value="D">D · flat, unobstructed</option>
                  <option value="aboveTreeline">Above treeline, windswept</option>
                </select>
              </Field>
              <Field label="Roof exposure, Ce">
                <select className={selectControl} value={inp.roofExposure} onChange={(e) => set("roofExposure", e.target.value as RoofExposure)}>
                  <option value="fully">Fully exposed</option>
                  <option value="partial">Partially exposed</option>
                  <option value="sheltered">Sheltered</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Risk category, Is" hint="Most buildings are II.">
                <select className={selectControl} value={inp.risk} onChange={(e) => set("risk", e.target.value as RiskCategory)}>
                  <option value="I">I · low hazard (Is 0.8)</option>
                  <option value="II">II · normal (Is 1.0)</option>
                  <option value="III">III · substantial (Is 1.1)</option>
                  <option value="IV">IV · essential (Is 1.2)</option>
                </select>
              </Field>
              <Field label="Eave-to-ridge width, W (ft)" hint="Drives rain-on-snow and unbalanced drift.">
                <NumberField value={inp.width} min={5} max={500} step={1} onChange={(n) => set("width", n)} ariaLabel="Eave to ridge width in feet" />
              </Field>
            </div>

            <Field label="Roof plan area (sq ft, optional)" hint="Used to estimate the total snow weight.">
              <NumberField value={inp.area ?? 0} min={0} max={1000000} step={10} onChange={(n) => set("area", n)} ariaLabel="Roof plan area in square feet" />
            </Field>
          </div>
        </div>

        <CalcResults inp={inp} r={r} offerSlug={offerSlug} />
      </div>
    </div>
  );
}
