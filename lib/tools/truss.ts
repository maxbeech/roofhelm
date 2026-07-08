// Roof truss count calculator: fencepost arithmetic over the building length
// at a chosen on-center spacing, plus optional gable-end trusses.
import type { ToolDef } from "../calc-engine";
import { num, r2, str } from "../calc-engine";

export const TRUSS_TOOL: ToolDef = {
  slug: "roof-truss-calculator",
  kind: "roof-truss",
  name: "Roof truss count",
  h1: "Roof Truss Calculator",
  keyword: "roof truss calculator",
  volume: "2,400/mo",
  meta: "Free roof truss calculator. Enter your building length and truss spacing to get the number of common trusses and the actual on-center spacing.",
  intro:
    "Trusses repeat along the building's length at a fixed on-center spacing (commonly 16, 19.2 or 24 in). This calculator gives the truss count, the gable-end count if you need them, and the actual spacing once trusses are evenly divided over the run.",
  focus: "Truss count from building length and on-center spacing, with gable ends.",
  offerCategory: "lumber",
  fields: [
    { type: "number", key: "length", label: "Building length (ft)", hint: "Measured along the ridge, the direction the trusses repeat.", unit: "ft", min: 6, max: 200, step: 1 },
    {
      type: "select",
      key: "spacing",
      label: "Truss spacing",
      hint: "Tighter spacing carries more load per truss but uses more trusses.",
      options: [
        { value: "16", label: "16 in o.c. (heavier loads / shingle roofs)" },
        { value: "19.2", label: "19.2 in o.c." },
        { value: "24", label: "24 in o.c. (lighter loads / metal roofing)" },
      ],
    },
    {
      type: "select",
      key: "gableEnds",
      label: "Include gable-end trusses?",
      hint: "Gable-end trusses cap both ends of the roof; they don't carry roof load the way common trusses do.",
      options: [{ value: "yes", label: "Yes, add 2 gable ends" }, { value: "no", label: "No, common trusses only" }],
    },
  ],
  defaults: { length: 30, spacing: "24", gableEnds: "yes" },
  compute: (inputs) => {
    const lengthFt = num(inputs, "length");
    const spacingIn = num(inputs, "spacing");
    const gableEnds = str(inputs, "gableEnds") === "yes";
    const lengthIn = lengthFt * 12;
    const commonTrusses = Math.ceil(lengthIn / spacingIn) + 1;
    const totalTrusses = commonTrusses + (gableEnds ? 2 : 0);
    const actualSpacingIn = commonTrusses > 1 ? r2(lengthIn / (commonTrusses - 1)) : lengthIn;

    return {
      values: { commonTrusses, totalTrusses, actualSpacingIn },
      headline: `${totalTrusses} trusses total${gableEnds ? ` (${commonTrusses} common + 2 gable-end)` : ""}, at ${actualSpacingIn} in actual spacing.`,
      breakdown: [
        { label: "Building length", value: `${lengthFt} ft (${lengthIn} in)` },
        { label: "Target spacing", value: `${spacingIn} in o.c.` },
        { label: "Common trusses = ceil(length / spacing) + 1", value: String(commonTrusses) },
        { label: "Gable-end trusses", value: gableEnds ? "2" : "0" },
        { label: "Total trusses", value: String(totalTrusses) },
        { label: "Actual spacing once evenly divided", value: `${actualSpacingIn} in` },
      ],
    };
  },
  resultFields: [
    { key: "totalTrusses", label: "Total trusses needed", primary: true },
    { key: "commonTrusses", label: "Common trusses" },
    { key: "actualSpacingIn", label: "Actual spacing", unit: "in" },
  ],
  notes: [
    "Truss spacing must match your roof sheathing's span rating (check the panel's APA stamp) and your local snow/wind load requirements; lighter loads can sometimes use wider 24 in spacing, heavier loads often need 16 in.",
    "This counts trusses only. Always follow the truss manufacturer's stamped placement and bracing drawings: every roof truss is an individually engineered structural component, not interchangeable with a generic rafter.",
    "Add extra trusses (or girder trusses) at large openings, valleys, hips, or anywhere mechanical equipment bears on the roof.",
  ],
  faqs: [
    { q: "How many trusses do I need for a 40 ft roof?", a: "At 24 in o.c. spacing with gable ends, a 40 ft building needs 21 common trusses plus 2 gable-end trusses (23 total); enter 40 above with your spacing to confirm." },
    { q: "What truss spacing should I use?", a: "16 in o.c. is common for heavier roof loads (shingles, snow-load regions); 24 in o.c. is common for lighter, metal-roofed buildings. Your roof's design loads and sheathing span rating set the requirement, so confirm with your truss supplier or engineer." },
  ],
};
