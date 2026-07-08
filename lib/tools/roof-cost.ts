// Roof replacement cost estimator: national-average $/sqft ranges by material
// (low-high, never a single fabricated precise number) x area x a region
// cost-of-living multiplier. Feeds the strongest CPL surface in the suite.
import type { ToolDef } from "../calc-engine";
import { fmtMoney, num, str } from "../calc-engine";

const MATERIAL: Record<string, { label: string; lowPerSqft: number; highPerSqft: number }> = {
  "3-tab-shingle": { label: "3-tab asphalt shingle", lowPerSqft: 4.5, highPerSqft: 7.0 },
  "architectural-shingle": { label: "Architectural / dimensional shingle", lowPerSqft: 5.5, highPerSqft: 9.0 },
  "standing-seam-metal": { label: "Standing-seam metal", lowPerSqft: 9.0, highPerSqft: 16.0 },
  "metal-shingle": { label: "Metal shingle / shake", lowPerSqft: 8.0, highPerSqft: 14.0 },
  tile: { label: "Clay / concrete tile", lowPerSqft: 10.0, highPerSqft: 20.0 },
  "tpo-flat": { label: "TPO / EPDM flat roof", lowPerSqft: 5.0, highPerSqft: 9.0 },
};
const TEAROFF = { lowPerSqft: 1.0, highPerSqft: 3.0 };
const REGION_MULT: Record<string, number> = { low: 0.85, average: 1.0, high: 1.25 };

export const ROOF_COST_TOOL: ToolDef = {
  slug: "roof-replacement-cost-calculator",
  kind: "roof-cost",
  name: "Roof replacement cost",
  h1: "Roof Replacement Cost Calculator",
  keyword: "roof replacement cost calculator",
  volume: "4,400/mo",
  meta: "Free roof replacement cost calculator. Estimate a national-average price range by roof area, material and tear-off, then compare to local contractor quotes.",
  intro:
    "This applies national-average installed cost-per-square-foot ranges by material, plus optional tear-off, to your roof area. It's a planning estimate, not a quote; actual price depends on pitch, complexity, local labor rates and current material costs.",
  focus: "National-average cost range by material and area, before you call a contractor.",
  offerCategory: "roof-replacement",
  fields: [
    { type: "number", key: "area", label: "Roof area", hint: "Actual sloped roof area, not the building footprint; use the roof pitch calculator's roof factor to convert if needed.", unit: "sq ft", min: 200, max: 20000, step: 50 },
    {
      type: "select",
      key: "material",
      label: "Roofing material",
      options: Object.entries(MATERIAL).map(([value, v]) => ({ value, label: v.label })),
    },
    {
      type: "select",
      key: "tearOff",
      label: "Existing roof needs tear-off?",
      options: [{ value: "yes", label: "Yes, remove existing layer(s)" }, { value: "no", label: "No, new construction or already bare deck" }],
    },
    {
      type: "select",
      key: "region",
      label: "Regional cost level",
      hint: "Major metros and high-cost-of-living regions run higher; rural and low-cost regions run lower.",
      options: [{ value: "low", label: "Lower-cost region" }, { value: "average", label: "Average / national" }, { value: "high", label: "Higher-cost region (major metro, coastal)" }],
    },
  ],
  defaults: { area: 2000, material: "architectural-shingle", tearOff: "yes", region: "average" },
  compute: (inputs) => {
    const area = num(inputs, "area");
    const materialKey = str(inputs, "material");
    const tearOff = str(inputs, "tearOff") === "yes";
    const region = str(inputs, "region");
    const m = MATERIAL[materialKey];
    const mult = REGION_MULT[region];

    const lowPerSqft = (m.lowPerSqft + (tearOff ? TEAROFF.lowPerSqft : 0)) * mult;
    const highPerSqft = (m.highPerSqft + (tearOff ? TEAROFF.highPerSqft : 0)) * mult;
    const low = Math.round(lowPerSqft * area);
    const high = Math.round(highPerSqft * area);
    const mid = Math.round((low + high) / 2);

    return {
      values: { low, high, mid },
      headline: `Estimated cost: ${fmtMoney(low)}–${fmtMoney(high)} (≈ ${fmtMoney(mid)} typical) for ${area.toLocaleString("en-US")} sq ft of ${m.label.toLowerCase()}.`,
      breakdown: [
        { label: "Material", value: `${m.label}, $${m.lowPerSqft.toFixed(2)}–$${m.highPerSqft.toFixed(2)}/sq ft` },
        { label: "Tear-off", value: tearOff ? `+$${TEAROFF.lowPerSqft.toFixed(2)}–$${TEAROFF.highPerSqft.toFixed(2)}/sq ft` : "not included" },
        { label: "Regional multiplier", value: `×${mult}` },
        { label: "Roof area", value: `${area.toLocaleString("en-US")} sq ft` },
        { label: "Low estimate", value: fmtMoney(low) },
        { label: "High estimate", value: fmtMoney(high) },
      ],
      warnings: [
        "This is a national-average planning estimate, not a quote. Actual price depends on roof pitch and complexity (valleys, dormers, hips), local labor rates, permit fees and current material costs; get 2–3 itemized quotes from licensed local roofing contractors to confirm.",
      ],
    };
  },
  resultFields: [
    { key: "low", label: "Low estimate" },
    { key: "high", label: "High estimate" },
    { key: "mid", label: "Typical estimate", primary: true },
  ],
  notes: [
    "Steeper roofs (above 6:12) and complex layouts (multiple valleys, dormers, hips) typically add 10–25% in labor cost over a simple gable roof of the same area; use the roof pitch calculator to check your pitch.",
    "Material cost moves with commodity markets (asphalt tracks oil, metal tracks steel); get current quotes rather than relying on a planning estimate for a purchase decision.",
    "A roof replacement is one of the most quote-shoppable home projects: get at least 3 written, itemized bids from licensed, insured local contractors before you sign.",
  ],
  faqs: [
    { q: "How much does it cost to replace a roof?", a: "National averages run roughly $4.50–$9 per sq ft for asphalt shingle and $9–$20+ per sq ft for metal or tile, before tear-off. Enter your roof area and material above for a planning range, then get local quotes to confirm." },
    { q: "What roofing material lasts the longest?", a: "Standing-seam metal and clay/concrete tile typically last 40–70+ years versus 20–30 years for asphalt shingle, but cost roughly 2–3× more upfront. The right choice depends on your budget, climate and how long you plan to own the home." },
  ],
};
