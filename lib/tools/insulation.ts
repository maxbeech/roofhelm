// Insulation R-value calculator: R-value = R-per-inch x thickness. The
// R-per-inch figures are typical, widely published industry values (they vary
// by manufacturer/product, which is disclosed rather than presented as exact).
import type { ToolDef } from "../calc-engine";
import { num, r1, str } from "../calc-engine";

const R_PER_INCH: Record<string, { label: string; r: number }> = {
  "fiberglass-batt": { label: "Fiberglass batt", r: 3.2 },
  "blown-fiberglass": { label: "Blown fiberglass", r: 2.5 },
  cellulose: { label: "Blown / loose-fill cellulose", r: 3.5 },
  "mineral-wool": { label: "Mineral (rock) wool batt", r: 3.3 },
  "spray-foam-closed": { label: "Closed-cell spray foam", r: 6.5 },
  "spray-foam-open": { label: "Open-cell spray foam", r: 3.7 },
  xps: { label: "Rigid foam board (XPS)", r: 5.0 },
  polyiso: { label: "Rigid foam board (polyiso)", r: 6.0 },
};

const ZONE_RANGE: Record<string, string> = {
  "1": "R30–R49", "2": "R30–R60", "3": "R30–R60", "4": "R38–R60",
  "5": "R49–R60", "6": "R49–R60", "7": "R49–R60", "8": "R49–R60",
};

export const INSULATION_TOOL: ToolDef = {
  slug: "insulation-r-value-calculator",
  kind: "insulation",
  name: "Insulation R-value",
  h1: "Insulation R-Value Calculator",
  keyword: "insulation calculator",
  volume: "5,400/mo",
  meta: "Free insulation R-value calculator. Enter insulation type and thickness to get the total R-value, and see the DOE-recommended attic range for your climate zone.",
  intro:
    "Total R-value is your insulation's R-per-inch multiplied by its thickness. Pick a type and thickness below, and optionally your climate zone to compare against the DOE-recommended attic range.",
  focus: "Total R-value from type and thickness, compared to DOE climate-zone targets.",
  offerCategory: "insulation",
  fields: [
    {
      type: "select",
      key: "type",
      label: "Insulation type",
      options: Object.entries(R_PER_INCH).map(([value, v]) => ({ value, label: v.label })),
    },
    { type: "number", key: "thickness", label: "Thickness", unit: "in", min: 0.5, max: 24, step: 0.5 },
    {
      type: "select",
      key: "zone",
      label: "Climate zone (optional context)",
      hint: "IECC zone, roughly: 1–2 hot (FL, S TX), 3–4 mixed, 5–6 cool/cold, 7–8 very cold.",
      options: ["1", "2", "3", "4", "5", "6", "7", "8"].map((z) => ({ value: z, label: `Zone ${z}` })),
    },
  ],
  defaults: { type: "fiberglass-batt", thickness: 6, zone: "5" },
  compute: (inputs) => {
    const type = str(inputs, "type");
    const thickness = num(inputs, "thickness");
    const zone = str(inputs, "zone");
    const meta = R_PER_INCH[type];
    const rValue = r1(meta.r * thickness);
    const zoneRange = ZONE_RANGE[zone];

    return {
      values: { rValue, rPerInch: meta.r },
      headline: `${thickness} in of ${meta.label.toLowerCase()} gives R-${rValue}.`,
      breakdown: [
        { label: "Insulation type", value: meta.label },
        { label: "Typical R-per-inch", value: String(meta.r), note: "varies by manufacturer/product" },
        { label: "Thickness", value: `${thickness} in` },
        { label: "Total R-value = R/in × thickness", value: `R-${rValue}` },
        { label: "DOE-recommended attic range, Zone " + zone, value: zoneRange, note: "energystar.gov insulation guidance, informational" },
      ],
    };
  },
  resultFields: [
    { key: "rValue", label: "Total R-value", primary: true },
    { key: "rPerInch", label: "R per inch" },
  ],
  notes: [
    "R-per-inch varies by manufacturer and product line; check your product's printed/rated R-value for a precise spec rather than relying solely on a type average.",
    "Total R-value is the insulation's own rating; whole-wall or whole-attic effective R-value is usually lower once framing thermal bridging is accounted for. Your local energy code sets the as-built requirement.",
    "Adding insulation has diminishing returns: going from R-0 to R-30 saves far more energy than going from R-30 to R-60, because heat loss is roughly proportional to 1/R.",
  ],
  faqs: [
    { q: "How many inches of insulation is R-30?", a: "It depends on the type: about 9–10 in of fiberglass batt (R≈3.2/in), roughly 5 in of closed-cell spray foam (R≈6.5/in), or about 6 in of rigid polyiso board (R≈6/in). Use the calculator above for your exact product's R-per-inch." },
    { q: "What R-value do I need for my attic?", a: "The DOE's general guidance ranges from about R30–R49 in the mildest climate zones up to R49–R60 in the coldest. Select your climate zone above for the typical range, and confirm the exact requirement with your local energy code." },
  ],
};
