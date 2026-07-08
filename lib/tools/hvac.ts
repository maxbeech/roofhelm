// HVAC quick-load (cooling) estimator: an industry-common BTU/sqft rule of
// thumb, NOT a Manual J calculation. Heavily and explicitly disclaimed, and
// the disclaimer is the natural lead-gen hook (book a real Manual J visit).
import type { ToolDef } from "../calc-engine";
import { fmt, num, r1, str } from "../calc-engine";

const ZONE_BASE_BTU_PER_SQFT: Record<string, number> = {
  "1": 40, "2": 40, "3": 35, "4": 30, "5": 25, "6": 30, "7": 35, "8": 35,
};
const INSULATION_MULT: Record<string, number> = { poor: 1.15, average: 1.0, good: 0.85 };
const CEILING_MULT: Record<string, number> = { standard: 1.0, vaulted: 1.1 };
const SUN_MULT: Record<string, number> = { low: 0.95, moderate: 1.0, high: 1.1 };

export const HVAC_TOOL: ToolDef = {
  slug: "hvac-load-calculator",
  kind: "hvac-load",
  name: "HVAC load (quick estimate)",
  h1: "HVAC Load Calculator (Quick Cooling Estimate)",
  keyword: "hvac load calculator",
  volume: "4,400/mo",
  meta: "Free HVAC load quick-estimate calculator. Get a rough cooling BTU/hr and tonnage planning number from square footage, climate zone and insulation quality. Not a Manual J substitute.",
  intro:
    "This is a rough BTU/sqft planning estimate for cooling load, the same kind of quick check HVAC contractors use before a real visit. It is not a Manual J load calculation, which is what's actually required to correctly size equipment.",
  focus: "Quick cooling BTU/hr + tonnage planning estimate; not a Manual J substitute.",
  offerCategory: "hvac",
  fields: [
    { type: "number", key: "sqft", label: "Conditioned area", unit: "sq ft", min: 100, max: 10000, step: 50 },
    {
      type: "select",
      key: "zone",
      label: "Climate zone",
      hint: "IECC zone, roughly: 1–2 hot (FL, S TX), 3 warm (GA), 4 mixed (VA, TN), 5 cool (OH, PA), 6–8 cold to very cold (MN, ME, AK).",
      options: ["1", "2", "3", "4", "5", "6", "7", "8"].map((z) => ({ value: z, label: `Zone ${z}` })),
    },
    {
      type: "select",
      key: "insulation",
      label: "Insulation / envelope quality",
      options: [
        { value: "poor", label: "Poor (older home, little insulation)" },
        { value: "average", label: "Average (meets older code)" },
        { value: "good", label: "Good (well insulated, sealed, newer code)" },
      ],
    },
    {
      type: "select",
      key: "ceiling",
      label: "Ceiling type",
      options: [{ value: "standard", label: "Standard, ~8 ft flat" }, { value: "vaulted", label: "Vaulted / cathedral" }],
    },
    {
      type: "select",
      key: "sun",
      label: "Sun exposure",
      hint: "South/west-facing glass and minimal shade increase cooling load.",
      options: [{ value: "low", label: "Low (mostly shaded)" }, { value: "moderate", label: "Moderate" }, { value: "high", label: "High (lots of south/west glass, little shade)" }],
    },
  ],
  defaults: { sqft: 1800, zone: "4", insulation: "average", ceiling: "standard", sun: "moderate" },
  compute: (inputs) => {
    const sqft = num(inputs, "sqft");
    const zone = str(inputs, "zone");
    const insulation = str(inputs, "insulation");
    const ceiling = str(inputs, "ceiling");
    const sun = str(inputs, "sun");

    const base = ZONE_BASE_BTU_PER_SQFT[zone];
    const mult = INSULATION_MULT[insulation] * CEILING_MULT[ceiling] * SUN_MULT[sun];
    const btuPerSqft = r1(base * mult);
    const totalBtu = Math.round(sqft * btuPerSqft);
    const tons = Math.round((totalBtu / 12000) * 2) / 2; // nearest 0.5 ton, standard HVAC sizing increment

    return {
      values: { totalBtu, tons, btuPerSqft },
      headline: `Rough estimate ≈ ${fmt(totalBtu)} BTU/hr (about ${tons} tons) for ${fmt(sqft)} sq ft.`,
      breakdown: [
        { label: "Base BTU/sq ft, climate zone " + zone, value: String(base) },
        { label: "Insulation multiplier", value: `×${INSULATION_MULT[insulation]}` },
        { label: "Ceiling multiplier", value: `×${CEILING_MULT[ceiling]}` },
        { label: "Sun exposure multiplier", value: `×${SUN_MULT[sun]}` },
        { label: "Adjusted BTU/sq ft", value: String(btuPerSqft) },
        { label: "Total cooling load = BTU/sqft × area", value: `${fmt(totalBtu)} BTU/hr` },
        { label: "Equipment size, rounded to nearest ½ ton", value: `${tons} tons` },
      ],
      warnings: [
        "This is a rough planning estimate, not a Manual J load calculation. Manual J accounts for your actual window area and orientation, infiltration rate, duct losses and local design temperatures, and is required by code in most jurisdictions before sizing or replacing equipment. Oversizing wastes money and causes short-cycling; undersizing can't keep up on extreme days; get a free in-home load assessment from a licensed HVAC contractor before buying equipment.",
      ],
    };
  },
  resultFields: [
    { key: "totalBtu", label: "Cooling load", unit: "BTU/hr", primary: true },
    { key: "tons", label: "Equipment size", unit: "tons" },
    { key: "btuPerSqft", label: "BTU per sq ft" },
  ],
  notes: [
    "This estimates cooling load only, using a rough BTU/sqft rule of thumb. Heating load (furnace BTU input) follows different sizing rules and also needs a proper Manual J / Manual S evaluation.",
    "Oversizing an air conditioner is one of the most common and costly HVAC mistakes: a bigger unit short-cycles, wastes energy, and dehumidifies poorly.",
    "Manual J load calculations are required by the IRC/IECC in most US jurisdictions before new HVAC equipment is installed; this quick estimate is a planning tool, not a permit document.",
  ],
  faqs: [
    { q: "How many BTU do I need per square foot?", a: "A rough rule of thumb is 20–60 BTU/sqft depending on climate zone, insulation and sun exposure; milder, well-insulated, shaded homes need less; hot, poorly insulated, sun-exposed homes need more. Use the calculator above for an estimate, then get a Manual J for the real number." },
    { q: "What size AC unit do I need for 2000 sq ft?", a: "It depends heavily on climate and the home's envelope; anywhere from about 2.5 to 5 tons is typical. Enter your details above for a rough estimate, but always confirm with a licensed contractor's Manual J calculation before buying equipment." },
  ],
};
