// Joist span calculator: real bending + deflection mechanics (exact, no
// uncertainty), applied to user-editable species reference values (Fb, E)
// defaulted to a commonly published baseline (Spruce-Pine-Fir No.2). This is
// an engineering-mechanics ESTIMATE, not a substitute for the IRC/IBC adopted
// span tables or a licensed engineer's stamped design; said explicitly in
// both the result warnings and the notes, the same way lib/snow.ts discloses
// what it does not yet cover.
import type { ToolDef } from "../calc-engine";
import { num, r1, str } from "../calc-engine";

// Actual dressed dimensions for nominal dimension lumber, in inches.
const SIZE_DEPTH_IN: Record<string, number> = { "2x6": 5.5, "2x8": 7.25, "2x10": 9.25, "2x12": 11.25 };
const WIDTH_IN = 1.5;

export const JOIST_TOOL: ToolDef = {
  slug: "joist-span-calculator",
  kind: "joist-span",
  name: "Joist span",
  h1: "Joist Span Calculator",
  keyword: "joist span calculator",
  volume: "1,600/mo",
  meta: "Free joist span calculator. Estimate the maximum span for a dimension-lumber joist from bending and deflection limits, with editable species design values.",
  intro:
    "This estimates the maximum joist span from the two checks that govern sawn-lumber framing: bending strength and deflection (stiffness). It defaults to commonly published Spruce-Pine-Fir No.2 reference values, which you can edit for your actual species and grade.",
  focus: "Bending- and deflection-limited span from real mechanics, with editable Fb / E.",
  offerCategory: "lumber",
  fields: [
    {
      type: "select",
      key: "size",
      label: "Nominal joist size",
      options: [
        { value: "2x6", label: "2×6" },
        { value: "2x8", label: "2×8" },
        { value: "2x10", label: "2×10" },
        { value: "2x12", label: "2×12" },
      ],
    },
    {
      type: "select",
      key: "spacing",
      label: "Joist spacing",
      options: [
        { value: "12", label: "12 in o.c." },
        { value: "16", label: "16 in o.c." },
        { value: "24", label: "24 in o.c." },
      ],
    },
    { type: "number", key: "liveLoad", label: "Live load", hint: "40 psf is the standard IRC residential floor live load.", unit: "psf", min: 10, max: 100, step: 5 },
    { type: "number", key: "deadLoad", label: "Dead load", hint: "10 psf is typical for light-frame floor construction.", unit: "psf", min: 5, max: 30, step: 1 },
    {
      type: "select",
      key: "deflLimit",
      label: "Deflection limit",
      options: [
        { value: "360", label: "L/360 (standard floor)" },
        { value: "240", label: "L/240 (roof, less stringent)" },
      ],
    },
    { type: "number", key: "fb", label: "Bending design value, Fb", hint: "Check your lumber's grade stamp or the NDS Supplement. SPF No.2 ≈ 875 psi, DF-L No.2 ≈ 900 psi.", unit: "psi", min: 300, max: 3000, step: 25 },
    { type: "number", key: "e", label: "Modulus of elasticity, E", hint: "SPF No.2 ≈ 1,400,000 psi.", unit: "psi", min: 500000, max: 2200000, step: 50000 },
  ],
  defaults: { size: "2x10", spacing: "16", liveLoad: 40, deadLoad: 10, deflLimit: "360", fb: 875, e: 1400000 },
  compute: (inputs) => {
    const size = str(inputs, "size");
    const spacingIn = num(inputs, "spacing");
    const liveLoad = num(inputs, "liveLoad");
    const deadLoad = num(inputs, "deadLoad");
    const deflLimit = num(inputs, "deflLimit");
    const fb = num(inputs, "fb");
    const e = num(inputs, "e");

    const depthIn = SIZE_DEPTH_IN[size];
    const I = (WIDTH_IN * depthIn ** 3) / 12; // in^4
    const S = (WIDTH_IN * depthIn ** 2) / 6; // in^3
    const spacingFt = spacingIn / 12;

    const wLiveLbFt = liveLoad * spacingFt; // lb/ft tributary load
    const wDeadLbFt = deadLoad * spacingFt;
    const wTotalLbFt = wLiveLbFt + wDeadLbFt;
    const wTotalLbIn = wTotalLbFt / 12;
    const wLiveLbIn = wLiveLbFt / 12;

    // Bending: M_allow = Fb * S (lb-in); for uniform load, M = w*L^2/8 -> solve L.
    const mAllow = fb * S;
    const bendingSpanIn = Math.sqrt((8 * mAllow) / wTotalLbIn);
    const bendingSpanFt = bendingSpanIn / 12;

    // Deflection (live load only, standard practice): 5wL^4/(384EI) <= L/deflLimit
    // -> L^3 = 384*E*I / (5*w*deflLimit) -> L = cube root of that.
    const deflSpanIn = Math.cbrt((384 * e * I) / (5 * wLiveLbIn * deflLimit));
    const deflSpanFt = deflSpanIn / 12;

    const governedBy = bendingSpanFt <= deflSpanFt ? "bending strength" : "deflection (stiffness)";
    // Round down (floor) to one decimal: a conservative, never-overstated answer.
    const maxSpanFt = Math.floor(Math.min(bendingSpanFt, deflSpanFt) * 10) / 10;

    return {
      values: { maxSpanFt, governedBy, bendingSpanFt: r1(bendingSpanFt), deflSpanFt: r1(deflSpanFt) },
      headline: `Estimated max span ≈ ${maxSpanFt} ft for a ${size} at ${spacingIn} in o.c., governed by ${governedBy}.`,
      breakdown: [
        { label: "Actual dimensions", value: `${WIDTH_IN} × ${depthIn} in` },
        { label: "Section properties", value: `I = ${I.toFixed(1)} in⁴, S = ${S.toFixed(2)} in³` },
        { label: "Tributary load (live + dead)", value: `${wLiveLbFt.toFixed(1)} + ${wDeadLbFt.toFixed(1)} = ${wTotalLbFt.toFixed(1)} lb/ft` },
        { label: "Bending-limited span", value: `${r1(bendingSpanFt)} ft`, note: "L = √(8·Fb·S / w)" },
        { label: "Deflection-limited span", value: `${r1(deflSpanFt)} ft`, note: `L = ∛(384·E·I / (5·w_live·${deflLimit}))` },
        { label: "Governing (shorter) span", value: `${maxSpanFt} ft`, note: governedBy },
      ],
      warnings: [
        "This is a simplified bending + deflection check using the Fb / E values you entered (default: Spruce-Pine-Fir No.2). It is an engineering-mechanics estimate, not a substitute for your jurisdiction's adopted IRC/IBC span tables (e.g. IRC Table R502.3.1) or a licensed engineer's stamped design. Always verify against your local code and a stamped design before construction.",
      ],
    };
  },
  resultFields: [
    { key: "maxSpanFt", label: "Max span", unit: "ft", primary: true },
    { key: "bendingSpanFt", label: "Bending limit", unit: "ft" },
    { key: "deflSpanFt", label: "Deflection limit", unit: "ft" },
  ],
  notes: [
    "Always cross-check this estimate against your jurisdiction's adopted IRC/IBC span tables; they include code-specific adjustment factors (repetitive-member, size, wet-service) this simplified calculator does not apply.",
    "Reducing joist spacing from 24 in to 16 in o.c. increases the allowable span by roughly 20–25% for the same lumber size, since each joist carries less tributary load.",
    "Deflection (stiffness), not just strength, usually governs on longer spans; that's why this calculator checks both and reports the shorter, governing span.",
  ],
  faqs: [
    { q: "What size joist do I need to span 12 feet?", a: "It depends on species, grade, spacing and load; enter your values above (a 2×10 SPF No.2 at 16 in o.c. under standard 40 psf live load typically estimates well past 12 ft). Always confirm against your local code's span table." },
    { q: "Does joist spacing affect span?", a: "Yes. Tighter spacing (e.g. 12 in vs 24 in o.c.) means each joist carries less tributary load, which increases its allowable span for the same lumber size." },
    { q: "What governs joist span, strength or stiffness?", a: "Both are checked; whichever gives the shorter span controls. Short, heavily loaded spans are often bending (strength) limited; long, lightly loaded spans are often deflection (stiffness) limited." },
  ],
};
