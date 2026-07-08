// Roof pitch calculator: rise-per-12 <-> angle <-> slope % <-> roof factor.
// Pure geometry (tan/atan), no external reference data, so there is no
// accuracy uncertainty here the way there is for the joist span tool.
import type { ToolDef } from "../calc-engine";
import { num, r1, r2 } from "../calc-engine";

export const PITCH_TOOL: ToolDef = {
  slug: "roof-pitch-calculator",
  kind: "roof-pitch",
  name: "Roof pitch",
  h1: "Roof Pitch Calculator",
  keyword: "roof pitch calculator",
  volume: "22,200/mo",
  meta: "Free roof pitch calculator. Convert a roof's rise-per-12 pitch to its angle in degrees, slope percentage and roof (rafter length) factor.",
  intro:
    "Roof pitch is usually given as rise-per-12: a 6:12 roof rises 6 inches for every 12 inches of horizontal run. Enter the rise to get the angle, slope percentage and the roof factor that multiplies a horizontal run into an actual sloped length.",
  focus: "Converts rise-per-12 to angle, slope % and the rafter-length (roof) factor.",
  offerCategory: "lumber",
  fields: [
    {
      type: "number",
      key: "rise",
      label: "Rise (in per 12 in of run)",
      hint: "Standard pitch notation, e.g. a 6:12 roof rises 6 in for every 12 in of horizontal run.",
      unit: "in/12in",
      min: 0,
      max: 24,
      step: 0.5,
    },
  ],
  defaults: { rise: 6 },
  compute: (inputs) => {
    const rise = num(inputs, "rise");
    const ratio = rise / 12;
    const angleDeg = r1(Math.atan(ratio) * (180 / Math.PI));
    const slopePercent = r1(ratio * 100);
    const roofFactor = r2(Math.sqrt(1 + ratio * ratio));
    const category = rise < 2 ? "low-slope" : rise <= 9 ? "conventional" : "steep";

    return {
      values: { rise, angleDeg, slopePercent, roofFactor, category },
      headline: `A ${rise}:12 pitch is ${angleDeg}° from horizontal (${slopePercent}% slope), a ${category} roof.`,
      breakdown: [
        { label: "Pitch ratio", value: `${rise}:12`, note: "rise : run" },
        { label: "tan(θ) = rise / run", value: ratio.toFixed(4) },
        { label: "Angle, θ = atan(rise/12)", value: `${angleDeg}°` },
        { label: "Slope percentage", value: `${slopePercent}%`, note: "rise/run × 100" },
        { label: "Roof factor", value: `${roofFactor}×`, note: "√(1 + (rise/12)²); multiplies a flat run into the sloped length" },
      ],
    };
  },
  resultFields: [
    { key: "angleDeg", label: "Angle from horizontal", unit: "°", primary: true },
    { key: "slopePercent", label: "Slope", unit: "%" },
    { key: "roofFactor", label: "Roof factor", unit: "×" },
  ],
  notes: [
    "A 4:12 pitch (≈18.4°) is the common low end for standard asphalt shingle warranties; below that, manufacturers usually require low-slope methods and extra ice-and-water underlayment.",
    "The roof factor multiplies a horizontal (run) measurement into the actual sloped roof-surface length; use it to convert a building footprint into the roofing area you need to order.",
    "Steeper pitches shed snow and water faster but cost more in materials and labor; the ASCE 7 slope factor Cs for snow load also changes with pitch; pair this with the snow load calculators for a full picture.",
  ],
  faqs: [
    { q: "What does a 4:12 roof pitch mean?", a: "It means the roof rises 4 inches vertically for every 12 inches (1 foot) of horizontal run. Enter 4 above to see the exact angle (≈18.4°) and slope percentage." },
    { q: "How do I measure my roof pitch?", a: "Hold a level horizontally against the roof surface (or in the attic against a rafter), measure 12 inches out from the high end, and measure the vertical distance down to the roof surface at that point. That vertical measurement in inches is your rise; enter it above." },
    { q: "What roof pitch is too steep to walk on safely?", a: "Many roofers consider pitches above 6:12 to 8:12 (about 27° to 34°) to need fall protection and specialized footing; above roughly 9:12–12:12 most homeowners should not be on the roof at all." },
  ],
};
