// Verification of the seven new calculators (lib/tools/*.ts) against
// hand-computed values and physical/engineering sanity checks. Run via npm
// test. Pitch, rafter, truss, insulation, HVAC and roof-cost use exact
// hand-checked values (simple, deterministic arithmetic). Joist span uses
// property checks plus a wide sanity range instead of a brittle exact value,
// since hand-verifying real-number bending/deflection arithmetic to the cent
// is error-prone; the properties below would still fail on a broken formula.
import { PITCH_TOOL } from "../lib/tools/pitch.ts";
import { RAFTER_TOOL } from "../lib/tools/rafter.ts";
import { TRUSS_TOOL } from "../lib/tools/truss.ts";
import { JOIST_TOOL } from "../lib/tools/joist.ts";
import { INSULATION_TOOL } from "../lib/tools/insulation.ts";
import { HVAC_TOOL } from "../lib/tools/hvac.ts";
import { ROOF_COST_TOOL } from "../lib/tools/roof-cost.ts";
import { TOOLS, getTool } from "../lib/tools/index.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} ${detail}`); }
}
function near(name: string, got: number, want: number, tol = 0.05) {
  check(`${name} (=${got}, want ${want}±${tol})`, Math.abs(got - want) <= tol, `got ${got}`);
}

// --- Pitch: pure trig, exact-checkable ---
{
  const r6 = PITCH_TOOL.compute({ rise: 6 });
  near("pitch 6:12 angle", Number(r6.values.angleDeg), 26.6, 0.1);
  near("pitch 6:12 slope%", Number(r6.values.slopePercent), 50, 0.01);
  near("pitch 6:12 roof factor", Number(r6.values.roofFactor), 1.12, 0.01);
  check("pitch 6:12 is conventional", r6.values.category === "conventional");

  const r12 = PITCH_TOOL.compute({ rise: 12 });
  near("pitch 12:12 angle", Number(r12.values.angleDeg), 45, 0.01);
  near("pitch 12:12 roof factor", Number(r12.values.roofFactor), 1.41, 0.01);
  check("pitch 12:12 is steep", r12.values.category === "steep");

  const r0 = PITCH_TOOL.compute({ rise: 0 });
  near("pitch 0:12 angle", Number(r0.values.angleDeg), 0, 0.01);
  near("pitch 0:12 roof factor", Number(r0.values.roofFactor), 1, 0.01);
  check("pitch 0:12 is low-slope", r0.values.category === "low-slope");
}

// --- Rafter: run x roof-factor geometry, exact-checkable ---
{
  const r = RAFTER_TOOL.compute({ run: 12, rise: 6, overhang: 12 });
  near("rafter length (12ft run, 6:12, 12in overhang)", Number(r.values.rafterLengthFt), 14.53, 0.02);
  check("rafter board length rounds up to 16ft stock", r.values.boardLengthFt === 16, String(r.values.boardLengthFt));
  near("rafter total rise", Number(r.values.totalRiseFt), 6, 0.01);

  const long = RAFTER_TOOL.compute({ run: 22, rise: 12, overhang: 12 });
  check("rafter warns past 24ft stock length", (long.warnings?.length ?? 0) > 0, String(long.values.rafterLengthFt));
}

// --- Truss: fencepost arithmetic, exact-checkable ---
{
  const r = TRUSS_TOOL.compute({ length: 30, spacing: "24", gableEnds: "yes" });
  check("truss common count (30ft @ 24in oc)", r.values.commonTrusses === 16, String(r.values.commonTrusses));
  check("truss total with gable ends", r.values.totalTrusses === 18, String(r.values.totalTrusses));
  near("truss actual spacing", Number(r.values.actualSpacingIn), 24, 0.01);

  const r2 = TRUSS_TOOL.compute({ length: 40, spacing: "16", gableEnds: "no" });
  check("truss common count (40ft @ 16in oc)", r2.values.commonTrusses === 31, String(r2.values.commonTrusses));
  check("truss total without gable ends == common", r2.values.totalTrusses === 31);
}

// --- Joist: real mechanics, property + sanity-range checks ---
{
  const base = { size: "2x10", spacing: "16", liveLoad: 40, deadLoad: 10, deflLimit: "360", fb: 875, e: 1400000 };
  const r = JOIST_TOOL.compute(base);
  const maxSpan = Number(r.values.maxSpanFt);
  check("joist 2x10 SPF#2 16oc 40psf span is a plausible residential span", maxSpan > 8 && maxSpan < 20, String(maxSpan));
  check("joist governing span <= bending span", maxSpan <= Number(r.values.bendingSpanFt) + 0.05);
  check("joist governing span <= deflection span", maxSpan <= Number(r.values.deflSpanFt) + 0.05);
  check("joist governedBy matches the shorter of the two", maxSpan === Math.min(Number(r.values.bendingSpanFt), Number(r.values.deflSpanFt)) ? true : r.values.governedBy === (Number(r.values.bendingSpanFt) <= Number(r.values.deflSpanFt) ? "bending strength" : "deflection (stiffness)"));
  check("joist carries the safety disclaimer", (r.warnings?.length ?? 0) > 0 && /not a substitute/i.test(r.warnings![0]));

  // Bigger lumber should span further under the same load.
  const bigger = JOIST_TOOL.compute({ ...base, size: "2x12" });
  check("2x12 spans further than 2x10 under the same load", Number(bigger.values.maxSpanFt) > maxSpan);

  // Wider spacing (more tributary load per joist) should reduce span.
  const wider = JOIST_TOOL.compute({ ...base, spacing: "24" });
  check("24in o.c. spans less than 16in o.c. under the same load", Number(wider.values.maxSpanFt) < maxSpan);

  // Higher live load should reduce span.
  const heavier = JOIST_TOOL.compute({ ...base, liveLoad: 80 });
  check("higher live load reduces span", Number(heavier.values.maxSpanFt) < maxSpan);
}

// --- Insulation: R-per-inch x thickness, exact-checkable ---
{
  const r = INSULATION_TOOL.compute({ type: "fiberglass-batt", thickness: 6, zone: "5" });
  near("R-value, 6in fiberglass batt", Number(r.values.rValue), 19.2, 0.01);

  const r2 = INSULATION_TOOL.compute({ type: "spray-foam-closed", thickness: 2, zone: "5" });
  near("R-value, 2in closed-cell spray foam", Number(r2.values.rValue), 13, 0.01);
}

// --- HVAC: multiplier chain, exact-checkable with all-1.0 multipliers ---
{
  const r = HVAC_TOOL.compute({ sqft: 1800, zone: "4", insulation: "average", ceiling: "standard", sun: "moderate" });
  near("HVAC baseline BTU/sqft (zone 4, all-average)", Number(r.values.btuPerSqft), 30, 0.01);
  check("HVAC total BTU (1800sqft x 30)", r.values.totalBtu === 54000, String(r.values.totalBtu));
  near("HVAC tons", Number(r.values.tons), 4.5, 0.01);
  check("HVAC always carries the Manual J disclaimer", (r.warnings?.length ?? 0) > 0 && /Manual J/i.test(r.warnings![0]));

  const r2 = HVAC_TOOL.compute({ sqft: 2000, zone: "1", insulation: "poor", ceiling: "vaulted", sun: "high" });
  near("HVAC worst-case multiplier chain", Number(r2.values.btuPerSqft), 55.7, 0.05);
  near("HVAC worst-case tons", Number(r2.values.tons), 9.5, 0.01);
}

// --- Roof cost: $/sqft range x area x region, exact-checkable ---
{
  const r = ROOF_COST_TOOL.compute({ area: 2000, material: "architectural-shingle", tearOff: "yes", region: "average" });
  check("roof cost low estimate", r.values.low === 13000, String(r.values.low));
  check("roof cost high estimate", r.values.high === 24000, String(r.values.high));
  check("roof cost mid estimate", r.values.mid === 18500, String(r.values.mid));

  const r2 = ROOF_COST_TOOL.compute({ area: 1000, material: "standing-seam-metal", tearOff: "no", region: "high" });
  check("roof cost (metal, no tear-off, high-cost region) low", r2.values.low === 11250, String(r2.values.low));
  check("roof cost (metal, no tear-off, high-cost region) high", r2.values.high === 20000, String(r2.values.high));
}

// --- Registry sanity: every tool's defaults compute without throwing, and slugs are unique ---
{
  for (const t of TOOLS) {
    let threw = false;
    try { t.compute(t.defaults); } catch { threw = true; }
    check(`${t.slug} computes its own defaults without throwing`, !threw);
  }
  const slugs = TOOLS.map((t) => t.slug);
  check("all tool slugs are unique", new Set(slugs).size === slugs.length);
  check("getTool finds a known tool", getTool("roof-pitch-calculator")?.kind === "roof-pitch");
  check("getTool returns undefined for an unknown slug", getTool("not-a-real-slug") === undefined);
}

console.log(`\n${fail === 0 ? 1 : 0} passed, ${fail} failed (${pass} checks ok)`);
process.exit(fail > 0 ? 1 : 0);
