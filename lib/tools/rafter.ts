// Rafter length calculator: classic run × roof-factor geometry, plus overhang
// and a round-up to the nearest standard stocked lumber length.
import type { ToolDef } from "../calc-engine";
import { num, r2 } from "../calc-engine";

const STANDARD_LENGTHS_FT = [8, 10, 12, 14, 16, 18, 20, 22, 24];

function standardLength(rafterLengthFt: number): number {
  const found = STANDARD_LENGTHS_FT.find((l) => l >= rafterLengthFt);
  return found ?? Math.ceil(rafterLengthFt / 2) * 2;
}

export const RAFTER_TOOL: ToolDef = {
  slug: "rafter-length-calculator",
  kind: "rafter-length",
  name: "Rafter length",
  h1: "Rafter Length Calculator",
  keyword: "rafter length calculator",
  volume: "5,400/mo",
  meta: "Free rafter length calculator. Enter your run, roof pitch and overhang to get the actual sloped rafter length and the stock board length to buy.",
  intro:
    "A rafter's actual length is its horizontal run plus overhang, multiplied by the roof factor for your pitch. This calculator does that conversion and rounds up to the nearest length lumber yards stock.",
  focus: "Converts run + pitch + overhang into actual rafter length and a stock board length.",
  offerCategory: "lumber",
  fields: [
    { type: "number", key: "run", label: "Horizontal run (ft)", hint: "Wall plate to ridge; half the building width for a symmetric gable roof.", unit: "ft", min: 1, max: 60, step: 0.5 },
    { type: "number", key: "rise", label: "Pitch; rise (in per 12 in of run)", hint: "e.g. 6 for a 6:12 roof.", unit: "in/12in", min: 0, max: 24, step: 0.5 },
    { type: "number", key: "overhang", label: "Eave overhang (in)", hint: "Horizontal projection beyond the wall plate, before the slope multiplier.", unit: "in", min: 0, max: 36, step: 1 },
  ],
  defaults: { run: 12, rise: 6, overhang: 12 },
  compute: (inputs) => {
    const run = num(inputs, "run");
    const rise = num(inputs, "rise");
    const overhangIn = num(inputs, "overhang");
    const ratio = rise / 12;
    const angleDeg = r2(Math.atan(ratio) * (180 / Math.PI));
    const roofFactor = Math.sqrt(1 + ratio * ratio);
    const overhangFt = overhangIn / 12;
    const rafterLengthFt = r2((run + overhangFt) * roofFactor);
    const totalRiseFt = r2(run * ratio);
    const boardLengthFt = standardLength(rafterLengthFt);

    return {
      values: { rafterLengthFt, boardLengthFt, angleDeg, totalRiseFt },
      headline: `Actual rafter length ≈ ${rafterLengthFt} ft; buy a ${boardLengthFt}-ft board.`,
      breakdown: [
        { label: "Run", value: `${run} ft` },
        { label: "Pitch ratio", value: `${rise}:12 (${angleDeg}°)` },
        { label: "Roof factor", value: `${roofFactor.toFixed(3)}×`, note: "√(1 + (rise/12)²)" },
        { label: "Overhang (horizontal)", value: `${overhangIn} in (${overhangFt.toFixed(2)} ft)` },
        { label: "Rafter length = (run + overhang) × factor", value: `${rafterLengthFt} ft` },
        { label: "Total rise over the run", value: `${totalRiseFt} ft` },
        { label: "Stock board to buy", value: `${boardLengthFt} ft` },
      ],
      warnings: rafterLengthFt > 24 ? ["This exceeds common stocked single-board lengths (24 ft). You'll likely need an engineered or scarfed/spliced rafter; check with your lumber yard or an engineer."] : undefined,
    };
  },
  resultFields: [
    { key: "rafterLengthFt", label: "Actual rafter length", unit: "ft", primary: true },
    { key: "boardLengthFt", label: "Stock board length", unit: "ft" },
    { key: "angleDeg", label: "Angle", unit: "°" },
  ],
  notes: [
    "This gives the rafter's actual (sloped) length along the roof line. The plumb cut at the ridge and the seat/birdsmouth cut at the wall plate still need to be marked and cut separately.",
    "For an exact ridge layout, subtract half the ridge board's thickness from the run before calculating; most ridge boards are ¾ to 1½ in thick.",
    "Hip and valley rafters run diagonally, so their run and length multiplier are different from common rafters; use a framing square or a hip/valley table for those members.",
  ],
  faqs: [
    { q: "How do I calculate rafter length?", a: "Multiply your horizontal run (plus any overhang) by the roof factor for your pitch: factor = √(1 + (rise/12)²). This calculator does the math and rounds up to a stocked board length." },
    { q: "What length rafter do I need for a 24 ft wide building?", a: "For a symmetric gable, the run is half the building width (12 ft here). Enter 12 ft as the run with your pitch and overhang above to get the exact rafter length and the board to buy." },
  ],
};
