// The Pro report as data. It is built from the buyer's calculator inputs by the
// same engines the free calculator runs (computeSnow, computeUnbalanced and
// interpretSnow), so the report cannot disagree with what the site shows for
// those inputs. Nothing here is estimated or filled in: a number is either an
// engine output, an input the buyer gave, or a plain statement of what the
// calculation does not cover. The PDF renderer only lays this out.
import {
  computeSnow, degToPitch, interpretSnow,
  type RiskCategory, type RoofExposure, type RoofShape, type SnowInputs, type Surface, type Terrain, type Thermal,
} from "./snow";
import { computeUnbalanced } from "./unbalanced";
import { encodeInputs } from "./snow-url";
import { siteBase } from "./pro-config";

export interface ReportRow { label: string; value: string; note?: string }
export interface ReportSection { title: string; rows?: ReportRow[]; paragraphs?: string[]; bullets?: string[] }

export interface ProReport {
  title: string;
  subtitle: string;
  /** ISO date (YYYY-MM-DD) the report was produced. */
  date: string;
  project: { name: string; site: string };
  /** Headline result block. */
  result: { designPsf: number; governs: "balanced" | "minimum"; text: string };
  sections: ReportSection[];
  disclaimer: string[];
  /** Opens the same numbers in the live calculator. */
  reproduceUrl: string;
}

// Same wording as the Pro card on the pricing page, so the promise and the
// document say one thing.
export const REPORT_DISCLAIMER =
  "A RoofHelm report is a calculation aid, not a stamped engineering document. For a permit, have a licensed engineer review it and confirm the unbalanced, drift and sliding cases.";

// Labels follow the calculator's own option text. They are typed as complete
// records, so adding a value to an input type fails the build until it has a label.
export const SHAPE_LABEL: Record<RoofShape, string> = {
  flat: "Flat or low-slope", monoslope: "Monoslope or shed", gable: "Gable", hip: "Hip",
};
export const THERMAL_LABEL: Record<Thermal, string> = {
  heated: "Heated building",
  slightlyHeated: "Just above freezing, or cold ventilated roof",
  unheated: "Unheated or open structure",
  freezer: "Continuously below freezing (freezer)",
  greenhouse: "Continuously heated greenhouse",
};
export const SURFACE_LABEL: Record<Surface, string> = {
  nonslippery: "Shingles or textured (not slippery)", slippery: "Metal, membrane or glass (slippery)",
};
export const TERRAIN_LABEL: Record<Terrain, string> = {
  B: "B, suburban or wooded", C: "C, open terrain", D: "D, flat and unobstructed", aboveTreeline: "Above treeline, windswept",
};
export const EXPOSURE_LABEL: Record<RoofExposure, string> = {
  fully: "Fully exposed", partial: "Partially exposed", sheltered: "Sheltered",
};
export const RISK_LABEL: Record<RiskCategory, string> = {
  I: "I, low hazard", II: "II, normal", III: "III, substantial", IV: "IV, essential",
};

const fmt = (n: number) => n.toLocaleString("en-US");
const psf = (n: number) => `${fmt(n)} psf`;

/** Free-text project fields from Checkout: one line, bounded, nothing else. */
export function cleanField(v: string | undefined, max = 200): string {
  return (v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function buildReport(
  inp: SnowInputs,
  project: { name?: string; site?: string } = {},
  date: Date = new Date(),
): ProReport {
  const r = computeSnow(inp);
  const view = interpretSnow(inp, r);
  const unbal = computeUnbalanced(inp, r);
  const gableLike = inp.shape === "gable" || inp.shape === "hip";
  const area = inp.area ?? 0;

  const inputs: ReportRow[] = [
    { label: "Ground snow load, Pg", value: psf(r.pg), note: "site input" },
    { label: "Roof shape", value: SHAPE_LABEL[inp.shape] },
    { label: "Roof slope", value: inp.slopeDeg > 0 ? `${inp.slopeDeg} degrees` : "0 degrees (flat)", note: inp.slopeDeg > 0 ? `about ${degToPitch(inp.slopeDeg)} pitch` : undefined },
    { label: "Eave-to-ridge width, W", value: `${fmt(inp.width)} ft` },
    { label: "Thermal condition", value: THERMAL_LABEL[inp.thermal] },
    { label: "Roof surface", value: SURFACE_LABEL[inp.surface] },
    { label: "Terrain", value: TERRAIN_LABEL[inp.terrain] },
    { label: "Roof exposure", value: EXPOSURE_LABEL[inp.roofExposure] },
    { label: "Risk category", value: RISK_LABEL[inp.risk] },
    { label: "Roof plan area", value: area > 0 ? `${fmt(area)} sq ft` : "not given" },
  ];

  const factors: ReportRow[] = [
    { label: "Exposure factor, Ce", value: String(r.Ce), note: "Table 7.3-1" },
    { label: "Thermal factor, Ct", value: String(r.Ct), note: "Table 7.3-2" },
    { label: "Importance factor, Is", value: String(r.Is), note: "Table 1.5-2" },
    { label: "Slope factor, Cs", value: String(r.Cs), note: "Fig. 7.4-1" },
    { label: "Snow density, gamma", value: `${r.density} pcf`, note: "Eq. 7.7-1" },
  ];

  const steps: ReportRow[] = [
    { label: "Flat-roof snow load, Pf", value: psf(r.pf), note: "Eq. 7.3-1: 0.7 x Ce x Ct x Is x Pg" },
    { label: "Sloped-roof balanced load, Ps", value: psf(r.ps), note: "Eq. 7.4-1: Cs x Pf" },
    { label: "Minimum load, Pm", value: r.slopeAppliesMin ? psf(r.pm) : "does not apply", note: r.slopeAppliesMin ? "§7.3.4, slope under 15 degrees" : "§7.3.4 applies to slopes under 15 degrees" },
    { label: "Rain-on-snow surcharge", value: r.rainOnSnow ? `+${r.rainOnSnow} psf` : "none", note: "§7.10" },
    { label: "Balanced load with surcharge", value: psf(r.balanced) },
    { label: "Design roof snow load", value: psf(r.design), note: r.governs === "minimum" ? "minimum governs" : "balanced governs" },
    { label: "Settled snow depth at design load", value: `${r.depth} in`, note: "design / density" },
    ...(r.totalWeightLb !== undefined ? [{ label: `Total weight on ${fmt(area)} sq ft`, value: `${fmt(r.totalWeightLb)} lb` }] : []),
  ];

  const sections: ReportSection[] = [
    { title: "Inputs", rows: inputs },
    { title: "Factors", rows: factors },
    { title: "How the design load was reached", rows: steps, paragraphs: [view.designText, view.governText] },
  ];

  if (gableLike) {
    const rows: ReportRow[] = unbal.applies
      ? [
          { label: "Windward slope", value: psf(unbal.windward) },
          { label: "Leeward slope, base", value: psf(unbal.leewardBase) },
          { label: "Leeward slope, at the ridge", value: psf(unbal.leewardPeak) },
          ...(!unbal.simple
            ? [
                { label: "Ridge drift surcharge", value: psf(unbal.surchargeIntensity), note: `over ${unbal.surchargeWidth} ft from the ridge` },
                { label: "Drift height, hd", value: `${unbal.hd} ft` },
                { label: "Snow density, gamma", value: `${unbal.density} pcf` },
              ]
            : []),
        ]
      : [];
    sections.push({ title: `Unbalanced load, §7.6.1 ${inp.shape}`, rows, paragraphs: [unbal.reason] });
  }

  sections.push({ title: "Notes from the calculation", bullets: view.notes });

  // What a reviewer still has to check. Each line says whether the figure is in
  // this report or not; none of them states a result we did not compute.
  const checklist: string[] = [
    `Ground snow load: confirm Pg = ${psf(r.pg)} for the exact site with the building department or the ASCE 7 Hazard Tool.`,
  ];
  if (gableLike) {
    checklist.push(
      unbal.applies
        ? `Unbalanced load (§7.6.1) is in this report: windward ${psf(unbal.windward)}, leeward ${psf(unbal.leewardPeak)} at the ridge. Check the framing for both.`
        : `Unbalanced load (§7.6.1): ${unbal.reason}`,
    );
  } else if (inp.shape === "monoslope") {
    checklist.push(`Unbalanced load: ${unbal.reason}`);
  }
  checklist.push(
    "Drift (§7.7) at roof steps, parapets, walls and next to taller roofs is not in this report. The RoofHelm drift calculator covers it.",
    "Sliding snow (§7.9) onto a lower roof, walk or equipment is not in this report.",
    "Partial loading (§7.5) is not in this report.",
    "Risk category, terrain and roof exposure are your inputs. Confirm them with the authority having jurisdiction.",
  );
  sections.push({ title: "Checklist for the reviewer", bullets: checklist });

  return {
    title: "Roof snow load report",
    subtitle: "ASCE/SEI 7-22, Chapter 7",
    date: date.toISOString().slice(0, 10),
    project: { name: cleanField(project.name, 120), site: cleanField(project.site, 200) },
    result: { designPsf: r.design, governs: r.governs, text: view.governText },
    sections,
    disclaimer: [
      REPORT_DISCLAIMER,
      "RoofHelm computes the balanced load, the §7.3.4 minimum, the §7.10 rain-on-snow surcharge and the §7.6.1 unbalanced case for gable and hip roofs. Drift, sliding and partial loading are not computed here.",
    ],
    reproduceUrl: `${siteBase()}/?${encodeInputs(inp)}`,
  };
}
