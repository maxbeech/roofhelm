// Roof snow load engine. Implements the ASCE/SEI 7-22 Chapter 7 snow-load
// procedure exactly. Pure, deterministic, client-side. Every factor is returned
// in the result so the calculation is transparent and defensible (no black box).
//
//   Flat-roof snow load   Pf = 0.7 · Ce · Ct · Is · Pg      (Eq. 7.3-1)
//   Sloped-roof snow load Ps = Cs · Pf                       (Eq. 7.4-1)
//   Minimum snow load     Pm = Is · min(Pg, 20)              (§7.3.4, slope < 15°)
//   Rain-on-snow surcharge +5 psf to Ps when 0 < Pg ≤ 20 and slope < W/50 (§7.10)
//
// Pg (ground snow load) is always a site-specific input. It is set by the
// Authority Having Jurisdiction / the ASCE 7 Hazard Tool, never assumed here.

export type RiskCategory = "I" | "II" | "III" | "IV";
export type Terrain = "B" | "C" | "D" | "aboveTreeline";
export type RoofExposure = "fully" | "partial" | "sheltered";
export type Thermal = "heated" | "slightlyHeated" | "unheated" | "freezer" | "greenhouse";
export type Surface = "slippery" | "nonslippery";
export type RoofShape = "flat" | "monoslope" | "gable" | "hip";

export interface SnowInputs {
  pg: number; // ground snow load, psf (site input)
  risk: RiskCategory; // -> Is (importance factor)
  terrain: Terrain; // surface roughness / exposure category
  roofExposure: RoofExposure;
  thermal: Thermal; // -> Ct (thermal factor)
  surface: Surface; // slippery (metal/membrane) vs not, for Cs
  shape: RoofShape; // roof geometry; drives the §7.6.1 unbalanced case
  slopeDeg: number; // roof slope from horizontal, degrees (0–70)
  width: number; // eave-to-ridge horizontal distance W, ft (rain-on-snow + unbalanced)
  area?: number; // optional roof plan area, sq ft (for total-weight estimate)
}

// Convert a roof pitch ("x-in-12") to slope degrees, and the reverse, so users
// can think in either. Single source of truth for the pitch helper UI.
export function pitchToDeg(rise: number): number {
  return Math.round(Math.atan(rise / 12) * (180 / Math.PI) * 10) / 10;
}
export function degToPitch(deg: number): string {
  const rise = Math.round(Math.tan((deg * Math.PI) / 180) * 12 * 10) / 10;
  return `${rise}:12`;
}

// Importance factor Is for snow loads (ASCE 7-22 Table 1.5-2).
export const IS: Record<RiskCategory, number> = { I: 0.8, II: 1.0, III: 1.1, IV: 1.2 };

// Thermal factor Ct (ASCE 7-22 Table 7.3-2).
export const CT: Record<Thermal, number> = {
  heated: 1.0, // continuously heated (most occupied buildings)
  slightlyHeated: 1.1, // kept just above freezing, or cold ventilated roof (R > 25)
  unheated: 1.2, // unheated / open-air structures
  freezer: 1.3, // continuously kept below freezing
  greenhouse: 0.85, // continuously heated greenhouse, low-R glazing
};

// Exposure factor Ce (ASCE 7-22 Table 7.3-1). [terrain][roofExposure].
export const CE: Record<Terrain, Record<RoofExposure, number>> = {
  B: { fully: 0.9, partial: 1.0, sheltered: 1.2 },
  C: { fully: 0.9, partial: 1.0, sheltered: 1.1 },
  D: { fully: 0.8, partial: 0.9, sheltered: 1.0 },
  // Above the treeline in windswept terrain, sheltered does not apply; reuse partial.
  aboveTreeline: { fully: 0.7, partial: 0.8, sheltered: 0.8 },
};

// Roof slope factor Cs (ASCE 7-22 §7.4.1–7.4.4 / Fig. 7.4-1).
// Cs = 1 up to a breakpoint slope, then falls linearly to 0 at 70°.
// The breakpoint depends on warm vs cold roof (from Ct) and surface slipperiness.
export function slopeFactor(slopeDeg: number, ct: number, surface: Surface): number {
  const s = Math.max(0, Math.min(70, slopeDeg));
  const slippery = surface === "slippery";
  let bp: number; // breakpoint slope where Cs starts dropping below 1.0
  if (ct <= 1.0) bp = slippery ? 5 : 30; // warm roof
  else if (ct <= 1.1) bp = slippery ? 10 : 37.5; // cold ventilated roof
  else bp = slippery ? 15 : 45; // cold roof (unheated / freezer)
  if (s <= bp) return 1.0;
  if (s >= 70) return 0;
  return Math.max(0, (70 - s) / (70 - bp));
}

export interface SnowResult {
  pg: number;
  Is: number;
  Ce: number;
  Ct: number;
  Cs: number;
  pf: number; // flat-roof snow load, psf
  ps: number; // sloped-roof balanced snow load, psf (before rain-on-snow)
  pm: number; // minimum roof snow load, psf (low-slope governing case)
  rainOnSnow: number; // rain-on-snow surcharge added to balanced case, psf
  balanced: number; // ps + rain-on-snow, psf
  design: number; // governing design snow load (max of balanced & minimum), psf
  governs: "balanced" | "minimum";
  slopeAppliesMin: boolean; // whether the §7.3.4 minimum applies (slope < 15°)
  density: number; // estimated snow density γ, pcf (Eq. 7.7-1)
  depth: number; // approx balanced snow depth, in
  totalWeightLb?: number; // design load × area, if area provided
}

function r2(n: number) { return Math.round(n * 100) / 100; }

export function computeSnow(inp: SnowInputs): SnowResult {
  const pg = Math.max(0, inp.pg);
  const Is = IS[inp.risk];
  const Ce = CE[inp.terrain][inp.roofExposure];
  const Ct = CT[inp.thermal];
  const Cs = slopeFactor(inp.slopeDeg, Ct, inp.surface);

  const pf = 0.7 * Ce * Ct * Is * pg; // Eq. 7.3-1
  const ps = Cs * pf; // Eq. 7.4-1

  // Minimum roof snow load (§7.3.4) applies only to low-slope roofs (< 15°).
  const slopeAppliesMin = inp.slopeDeg < 15;
  const pm = slopeAppliesMin ? Is * Math.min(pg, 20) : 0;

  // Rain-on-snow surcharge (§7.10): +5 psf on the balanced case for low-ground-snow,
  // near-flat roofs (Pg ≤ 20 and slope, in degrees, < W/50).
  const eligibleRos = pg > 0 && pg <= 20 && inp.slopeDeg < inp.width / 50;
  const rainOnSnow = eligibleRos ? 5 : 0;
  const balanced = ps + rainOnSnow;

  // Governing design load: the larger of the balanced load and the minimum case.
  const design = Math.max(balanced, pm);
  const governs: "balanced" | "minimum" = pm > balanced ? "minimum" : "balanced";

  // Snow density (Eq. 7.7-1), used for depth + drift. Capped at 30 pcf.
  const density = Math.min(30, 0.13 * pg + 14);
  const depth = density > 0 ? (design / density) * 12 : 0; // in

  const out: SnowResult = {
    pg, Is, Ce, Ct, Cs: r2(Cs),
    pf: r2(pf), ps: r2(ps), pm: r2(pm), rainOnSnow,
    balanced: r2(balanced), design: r2(design), governs, slopeAppliesMin: slopeAppliesMin,
    density: r2(density), depth: Math.round(depth),
  };
  if (inp.area && inp.area > 0) out.totalWeightLb = Math.round(design * inp.area);
  return out;
}

export const DEFAULT_SNOW: SnowInputs = {
  pg: 30,
  risk: "II",
  terrain: "C",
  roofExposure: "partial",
  thermal: "heated",
  surface: "nonslippery",
  shape: "gable",
  slopeDeg: 18.4, // ≈ a common 4:12 pitch, the most representative residential roof
  width: 30,
  area: 1500,
};

export interface SnowInterpretation {
  headline: string;
  designText: string;
  governText: string;
  notes: string[];
  nextSteps: string[];
}

const fmt = (n: number) => n.toLocaleString("en-US");

// Plain-English guidance from the numbers. Pure + deterministic (unit-tested).
export function interpretSnow(inp: SnowInputs, r: SnowResult): SnowInterpretation {
  const steep = inp.slopeDeg >= 15;
  const gableLike = inp.shape === "gable" || inp.shape === "hip";
  return {
    headline: `Design roof snow load ≈ ${r.design} psf` + (r.pg === 0 ? " (no ground snow; verify locally)" : ""),
    designText:
      `Flat-roof load Pf = 0.7 × Ce(${r.Ce}) × Ct(${r.Ct}) × Is(${r.Is}) × Pg(${fmt(r.pg)}) = ${r.pf} psf. ` +
      (inp.slopeDeg > 0
        ? `Sloped-roof balanced load Ps = Cs(${r.Cs}) × Pf = ${r.ps} psf.`
        : `On a flat roof Cs = 1.0, so the balanced load equals Pf.`) +
      (r.rainOnSnow ? ` A +${r.rainOnSnow} psf rain-on-snow surcharge applies (§7.10).` : ""),
    governText:
      r.governs === "minimum"
        ? `The §7.3.4 minimum, Pm = ${r.pm} psf, governs here: low-slope roofs must carry at least this.`
        : steep
          ? `At ${inp.slopeDeg}° the §7.3.4 minimum does not apply, so the balanced load of ${r.balanced} psf governs.`
          : `The balanced load of ${r.balanced} psf governs (it exceeds the ${r.pm} psf minimum).`,
    notes: [
      `Estimated snow density ≈ ${r.density} pcf, so ${r.design} psf is roughly ${r.depth} in of settled snow.`,
      gableLike
        ? "The §7.6.1 unbalanced (leeward-drift) case is computed above for this gable/hip roof; at roof steps, parapets and walls also check drift loads (§7.7) with the drift calculator, plus sliding snow (§7.9) onto anything below."
        : "At roof steps, parapets and against walls check drift loads (§7.7) with the drift calculator, and check sliding snow (§7.9) where this roof sheds onto a lower roof, walk or equipment.",
      "Ground snow load Pg is set by your local building department / the ASCE 7 Hazard Tool. Always confirm the value for your exact site before you build or submit.",
    ],
    nextSteps: [
      "Confirm your site's ground snow load with your building department or the ASCE 7 Hazard Tool.",
      "Check unbalanced, drift and sliding-snow load cases for gable, stepped and multi-level roofs.",
      "For a permit submittal, generate a stamped-ready snow load report (RoofHelm Pro) and have a licensed engineer review it.",
    ],
  };
}
