// Single source of truth for the non-snow-load calculator family: one
// registry combining every ToolDef, the way lib/roof-types.ts is for the
// snow-load family. Consumed by app/calculators/[slug]/page.tsx (routing),
// app/calculators/page.tsx (hub index) and app/sitemap.ts.
import type { ToolDef } from "../calc-engine";
import { PITCH_TOOL } from "./pitch";
import { RAFTER_TOOL } from "./rafter";
import { TRUSS_TOOL } from "./truss";
import { JOIST_TOOL } from "./joist";
import { INSULATION_TOOL } from "./insulation";
import { HVAC_TOOL } from "./hvac";
import { ROOF_COST_TOOL } from "./roof-cost";

export const TOOLS: ToolDef[] = [
  PITCH_TOOL,
  RAFTER_TOOL,
  TRUSS_TOOL,
  JOIST_TOOL,
  INSULATION_TOOL,
  HVAC_TOOL,
  ROOF_COST_TOOL,
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

// Grouped for the hub index page, in phase order (geometry -> envelope -> cost).
export const TOOL_GROUPS: { heading: string; sub: string; tools: ToolDef[] }[] = [
  {
    heading: "Roof geometry & framing",
    sub: "Pitch, rafters, trusses and joist spans; the layout math before you cut lumber.",
    tools: [PITCH_TOOL, RAFTER_TOOL, TRUSS_TOOL, JOIST_TOOL],
  },
  {
    heading: "Insulation & HVAC",
    sub: "R-value and a quick cooling-load planning estimate for the building envelope.",
    tools: [INSULATION_TOOL, HVAC_TOOL],
  },
  {
    heading: "Cost",
    sub: "A national-average planning range before you call a contractor.",
    tools: [ROOF_COST_TOOL],
  },
];
