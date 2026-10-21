// The Pro report: its content comes from the real engines, and the PDF carries
// it. Fixture data is the gable roof from test/unbalanced.test.mts (its numbers
// are hand-computed in that file's comments) and the flat roof from
// test/snow.test.mts, so these tests inherit those checks instead of inventing
// new expected values. Run via npm test.
import { PDFDocument } from "pdf-lib";
import { computeSnow, CE, CT, IS, type SnowInputs } from "../lib/snow.ts";
import { computeUnbalanced } from "../lib/unbalanced.ts";
import { encodeInputs, parseStrictInputs } from "../lib/snow-url.ts";
import {
  buildReport, cleanField, EXPOSURE_LABEL, REPORT_DISCLAIMER, RISK_LABEL, SHAPE_LABEL, SURFACE_LABEL, TERRAIN_LABEL, THERMAL_LABEL,
  type ProReport,
} from "../lib/pro-report.ts";
import { pdfSafe, pdfSafeChecked, renderReportPdf } from "../lib/pro-report-pdf.ts";
import { drawnText } from "./stripe-fixtures.mts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}
function near(name: string, got: number, want: number, tol: number) {
  check(`${name} (=${got}, want ${want}±${tol})`, Math.abs(got - want) <= tol, `got ${got}`);
}

// From test/unbalanced.test.mts: Pg 40, 4:12 (18.43 deg), W 40, warm, non-slippery.
const gable = (o: Partial<SnowInputs> = {}): SnowInputs => ({
  pg: 40, risk: "II", terrain: "C", roofExposure: "partial", thermal: "heated",
  surface: "nonslippery", shape: "gable", slopeDeg: 18.43, width: 40, area: 0, ...o,
});
// From test/snow.test.mts: flat roof, Pg 25 where the 7.3.4 minimum governs.
const flat = (o: Partial<SnowInputs> = {}): SnowInputs => ({
  pg: 30, risk: "II", terrain: "C", roofExposure: "partial", thermal: "heated",
  surface: "nonslippery", shape: "flat", slopeDeg: 0, width: 40, area: 0, ...o,
});

const DATE = new Date("2026-10-10T12:00:00Z");
const section = (r: ProReport, prefix: string) => r.sections.find((s) => s.title.startsWith(prefix));
const rowValue = (r: ProReport, sectionPrefix: string, label: string) =>
  section(r, sectionPrefix)?.rows?.find((x) => x.label === label)?.value;
const allText = (r: ProReport): string[] => [
  r.title, r.subtitle, r.date, r.project.name, r.project.site, r.result.text, ...r.disclaimer,
  ...r.sections.flatMap((s) => [s.title, ...(s.paragraphs ?? []), ...(s.bullets ?? []), ...(s.rows ?? []).flatMap((x) => [x.label, x.value, x.note ?? ""])]),
];

// --- The report is the engine's output, not a restatement of it ---------------
const A = gable({ area: 1500 });
const ra = buildReport(A, { name: "Maple Street garage", site: "14 Maple St" }, DATE);
const engine = computeSnow(A);
const unbal = computeUnbalanced(A, engine);
check("design load equals computeSnow().design", ra.result.designPsf === engine.design && engine.design === 28);
check("governing case is balanced", ra.result.governs === "balanced");
check("project and date carried", ra.project.name === "Maple Street garage" && ra.project.site === "14 Maple St" && ra.date === "2026-10-10");
check("Pf row = 28 psf", rowValue(ra, "How the design load", "Flat-roof snow load, Pf") === "28 psf");
check("design row = 28 psf", rowValue(ra, "How the design load", "Design roof snow load") === "28 psf");
check("total weight = design x area", rowValue(ra, "How the design load", "Total weight on 1,500 sq ft") === "42,000 lb");
// Hand-computed in test/unbalanced.test.mts: windward 8.4, leeward peak 54.7, surcharge 26.7, hd 2.41, gamma 19.2.
near("unbalanced windward", parseFloat(rowValue(ra, "Unbalanced", "Windward slope") ?? "NaN"), 8.4, 0.1);
near("unbalanced leeward peak", parseFloat(rowValue(ra, "Unbalanced", "Leeward slope, at the ridge") ?? "NaN"), 54.7, 0.6);
near("unbalanced surcharge", parseFloat(rowValue(ra, "Unbalanced", "Ridge drift surcharge") ?? "NaN"), 26.7, 0.5);
near("drift height hd", parseFloat(rowValue(ra, "Unbalanced", "Drift height, hd") ?? "NaN"), 2.41, 0.02);
check("unbalanced rows equal computeUnbalanced()", rowValue(ra, "Unbalanced", "Leeward slope, at the ridge") === `${unbal.leewardPeak} psf`);
check("factor rows equal the engine", rowValue(ra, "Factors", "Exposure factor, Ce") === String(engine.Ce) && rowValue(ra, "Factors", "Slope factor, Cs") === String(engine.Cs));
check("inputs echo what the buyer entered", rowValue(ra, "Inputs", "Ground snow load, Pg") === "40 psf" && rowValue(ra, "Inputs", "Roof shape") === "Gable" && rowValue(ra, "Inputs", "Eave-to-ridge width, W") === "40 ft");
check("slope row shows the pitch", section(ra, "Inputs")?.rows?.find((x) => x.label === "Roof slope")?.note === "about 4:12 pitch");
check("disclaimer matches the pricing page wording", ra.disclaimer[0] === REPORT_DISCLAIMER && /not a stamped engineering document/.test(REPORT_DISCLAIMER));
check("checklist section present", Boolean(section(ra, "Checklist")?.bullets?.length));
check("checklist names what is not computed",
  (section(ra, "Checklist")?.bullets ?? []).some((b) => b.includes("§7.7") && b.includes("not in this report")) &&
  (section(ra, "Checklist")?.bullets ?? []).some((b) => b.includes("§7.9")));

// --- Other roof shapes give honest, different content ------------------------
const rf = buildReport(flat({ pg: 25 }), {}, DATE); // Pf 17.5 < Pm 20, no rain-on-snow
check("flat: minimum governs and design is 20", rf.result.governs === "minimum" && rf.result.designPsf === 20);
check("flat: no unbalanced section", !section(rf, "Unbalanced"));
check("flat: no project given is blank, not invented", rf.project.name === "" && rf.project.site === "");

const rm = buildReport(gable({ shape: "monoslope" }), {}, DATE);
check("monoslope: no unbalanced numbers", !section(rm, "Unbalanced"));
check("monoslope: checklist points at 7.6.2", (section(rm, "Checklist")?.bullets ?? []).some((b) => b.includes("§7.6.2")));

const rs = buildReport(gable({ slopeDeg: 45 }), {}, DATE); // outside the 7.6.1 band
check("steep gable: section states why it does not apply", (section(rs, "Unbalanced")?.rows ?? []).length === 0 && /need not be applied/.test(section(rs, "Unbalanced")?.paragraphs?.[0] ?? ""));

const rSmall = buildReport(gable({ width: 18 }), {}, DATE); // W <= 20 simple case
check("small gable: simple case has no surcharge row", !section(rSmall, "Unbalanced")?.rows?.some((x) => x.label === "Ridge drift surcharge") && rowValue(rSmall, "Unbalanced", "Leeward slope, at the ridge") === "40 psf");

// --- Project fields from a form are cleaned, not trusted ---------------------
check("cleanField strips control characters", cleanField("a\u0000b\nc\td") === "a b c d");
check("cleanField collapses space and caps length", cleanField("  x   y  ") === "x y" && cleanField("z".repeat(500), 120).length === 120);
check("cleanField of undefined is empty", cleanField(undefined) === "");

// --- The reproduce link opens the same numbers -------------------------------
const back = parseStrictInputs(new URL(ra.reproduceUrl).search);
check("reproduce URL round-trips to the same inputs", JSON.stringify(back) === JSON.stringify({ ...A }), JSON.stringify(back));
check("reproduce URL uses the calculator's own encoding", ra.reproduceUrl.endsWith(`/?${encodeInputs(A)}`));

// --- Labels cover every allowed value (the records are typed; check at runtime too) ---
check("shape labels", Object.keys(SHAPE_LABEL).length === 4);
check("thermal labels cover Ct table", Object.keys(CT).every((k) => k in THERMAL_LABEL));
check("risk labels cover Is table", Object.keys(IS).every((k) => k in RISK_LABEL));
check("terrain labels cover Ce table", Object.keys(CE).every((k) => k in TERRAIN_LABEL));
check("exposure labels cover Ce columns", Object.keys(CE.B).every((k) => k in EXPOSURE_LABEL));
check("surface labels", Object.keys(SURFACE_LABEL).length === 2);

// --- Text the PDF fonts can draw ---------------------------------------------
check("pdfSafe keeps section sign, degree, half, accents", pdfSafe("§7.6.1 18.4° ½-on-12 café") === "§7.6.1 18.4° ½-on-12 café");
check("pdfSafe maps engine symbols to words", pdfSafe("W ≤ 20 ft, ≈ 5, γ, √S") === "W <= 20 ft, about 5, gamma, sqrtS");
check("pdfSafe flags what it cannot draw", pdfSafeChecked("Łódź 🏠").lossy && pdfSafe("Łódź 🏠").includes("?"));
check("pdfSafe leaves plain text unflagged", !pdfSafeChecked("Maple Street garage, 14 Maple St").lossy);

// Sweep the whole input space the form allows: nothing the report says on its own
// may need a "?" in the PDF.
const SHAPES = Object.keys(SHAPE_LABEL) as SnowInputs["shape"][];
const THERMALS = Object.keys(THERMAL_LABEL) as SnowInputs["thermal"][];
let reports = 0;
const lossy: string[] = [];
for (const shape of SHAPES) for (const thermal of THERMALS) for (const slopeDeg of [0, 2, 18.43, 31, 45, 70]) for (const width of [5, 18, 40, 500]) for (const pg of [0, 15, 40, 400]) {
  const r = buildReport(gable({ shape, thermal, slopeDeg, width, pg, area: 800 }), {}, DATE);
  reports++;
  for (const t of allText(r)) if (pdfSafeChecked(t).lossy) lossy.push(t.slice(0, 60));
}
check(`no unencodable characters across ${reports} generated reports`, lossy.length === 0, lossy.slice(0, 3).join(" | "));

// --- The PDF -----------------------------------------------------------------
const pdf = await renderReportPdf(ra);
const head = Buffer.from(pdf.slice(0, 8)).toString("latin1");
const tail = Buffer.from(pdf.slice(-8)).toString("latin1");
check("PDF header and trailer", head.startsWith("%PDF-1.") && tail.includes("%%EOF"), head);
const loaded = await PDFDocument.load(pdf);
check("PDF parses back with pdf-lib", loaded.getPageCount() >= 1 && loaded.getPageCount() <= 3, `pages ${loaded.getPageCount()}`);
const [pw, ph] = [loaded.getPage(0).getWidth(), loaded.getPage(0).getHeight()];
check("US Letter pages", pw === 612 && ph === 792);
check("title metadata", loaded.getTitle() === "Roof snow load report" && loaded.getAuthor() === "RoofHelm");

const text = drawnText(pdf);
check("PDF text: project and site", text.includes("Maple Street garage") && text.includes("14 Maple St"));
check("PDF text: design load 28", /\n28\n/.test(`\n${text}\n`) && text.includes("DESIGN ROOF SNOW LOAD"));
check("PDF text: Pf row", text.includes("Flat-roof snow load, Pf") && text.includes("28 psf"));
check("PDF text: unbalanced numbers", text.includes("8.4 psf") && text.includes("54.72 psf") && text.includes("26.72 psf") && text.includes("2.41 ft"));
check("PDF text: code references", text.includes("Table 7.3-1") && text.includes("Eq. 7.3-1") && text.includes("§7.6.1"));
check("PDF text: checklist and disclaimer", text.includes("Checklist for the reviewer") && text.includes("not a stamped engineering document"));
check("PDF text: page numbers", /Page 1 of \d/.test(text));
check("PDF text: reproduce link", text.includes("pg=40") && text.includes("sh=gable"));
check("PDF text has no stray symbols the font lacks", !/[≈≤≥γ√]/.test(text));

// Same inputs, same bytes: a re-download matches the emailed copy.
const again = await renderReportPdf(buildReport(A, { name: "Maple Street garage", site: "14 Maple St" }, DATE));
check("rendering is deterministic", Buffer.compare(Buffer.from(pdf), Buffer.from(again)) === 0);

// Awkward project text must not break the document.
const odd = await renderReportPdf(buildReport(A, { name: "Łódź warehouse 🏠 " + "x".repeat(300), site: "A".repeat(400) }, DATE));
check("odd project text still renders", (await PDFDocument.load(odd)).getPageCount() >= 1);
const oddText = drawnText(odd);
// "Łódź" keeps the o-acute the font has and loses the two letters it lacks; the house emoji becomes one "?".
check("unencodable characters become '?', never an error", oddText.split("\n").includes("?\u00f3d? warehouse ?"), JSON.stringify(oddText.split("\n").slice(0, 12)));

// Every roof shape renders to a valid PDF.
let rendered = 0;
for (const shape of SHAPES) {
  const out = await renderReportPdf(buildReport(gable({ shape, area: 2000 }), { name: "t" }, DATE));
  if ((await PDFDocument.load(out)).getPageCount() >= 1) rendered++;
}
check("all four roof shapes render", rendered === SHAPES.length);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
