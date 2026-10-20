// State-page governing sources: each authority must be a checked https link with non-empty
// copy, and the state page must render it. Failures print the value that was produced.
import { readFileSync } from "node:fs";
import { STATE_SNOW, getStateSnow } from "../lib/ground-snow";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}

const EM_DASH = "—";
const withAuthority = STATE_SNOW.filter((s) => s.authority);

check("at least one state carries a governing source", withAuthority.length > 0, String(withAuthority.length));

for (const s of withAuthority) {
  const a = s.authority!;
  check(`${s.slug} source link is https`, /^https:\/\//.test(a.href), a.href);
  check(`${s.slug} source copy is non-empty`, a.text.trim().length > 0, JSON.stringify(a));
  check(`${s.slug} source link text is non-empty`, a.linkText.trim().length > 0, JSON.stringify(a));
  check(`${s.slug} source copy has no em dash`, !`${a.text} ${a.linkText}`.includes(EM_DASH), JSON.stringify(a));
}

// Montana: checked against bsd.dli.mt.gov/Building-Codes-Permits/snow-load-information on 2026-10-20.
const mt = getStateSnow("montana")?.authority;
check("montana cites the Building Codes Bureau snow load page", mt?.href === "https://bsd.dli.mt.gov/Building-Codes-Permits/snow-load-information", JSON.stringify(mt));
check("montana source states the 30 psf minimum", !!mt && mt.text.includes("30 psf"), JSON.stringify(mt));
check("montana source names the ASCE 7 Hazard Tool", !!mt && mt.text.includes("ASCE 7 Hazard Tool"), JSON.stringify(mt));
check("montana source gives the Bureau phone line", !!mt && mt.text.includes("(406) 841-2056"), JSON.stringify(mt));

// New Hampshire: the 2002 ERDC/CRREL report, cited from its DTIC copy (ADA399953).
const nh = getStateSnow("new-hampshire")?.authority;
check("new hampshire cites the ERDC/CRREL report on DTIC", nh?.href === "https://apps.dtic.mil/sti/pdfs/ADA399953.pdf", JSON.stringify(nh));
check("new hampshire source states the 259-town scope", !!nh && nh.text.includes("259 towns"), JSON.stringify(nh));

// Data that is never rendered is dead weight: the state page must show the source block.
const pageSource = readFileSync("app/states/[slug]/page.tsx", "utf8");
check("state page renders the governing source", pageSource.includes("s.authority && ("), "app/states/[slug]/page.tsx has no s.authority block");

console.log(`\nstate-authority: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("state-authority: all passed");
