// Town-by-town snow tables: the Connecticut counts from Appendix P, the psf tiers, the
// grouping helper, the internal links and the state page wiring. Failures print the value
// that was produced and the value expected, so the inputs are visible in the log.
import { readFileSync } from "node:fs";
import { getStateSnow } from "../lib/ground-snow";
import { getTownSnowTable, groupTownsByPsf, type TownSnow } from "../lib/town-snow";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}

// Grouping helper, on a small input whose order is deliberately scrambled.
const sample: TownSnow[] = [
  { town: "Zeta", pg: 40 },
  { town: "alpha", pg: 30 },
  { town: "Beta", pg: 30 },
  { town: "Gamma", pg: 35 },
];
const sampleTiers = groupTownsByPsf(sample);
check(
  "groupTownsByPsf orders tiers by psf ascending",
  JSON.stringify(sampleTiers.map((t) => t.psf)) === "[30,35,40]",
  JSON.stringify(sampleTiers.map((t) => t.psf)),
);
check(
  "groupTownsByPsf sorts names alphabetically inside a tier, case-insensitively",
  JSON.stringify(sampleTiers[0].towns) === JSON.stringify(["alpha", "Beta"]),
  JSON.stringify(sampleTiers[0].towns),
);
check("groupTownsByPsf returns an empty list for no towns", groupTownsByPsf([]).length === 0);

// Connecticut: counts and values from the 2022 code, Appendix P (read 2026-11-17). The table is
// read through the registry, the same path the state page uses. Importing the data module
// directly here gave a second module instance under tsx, so identity checks against it failed.
const ct = getTownSnowTable("connecticut");
if (!ct) {
  console.error("  FAIL connecticut has a town table: getTownSnowTable('connecticut') returned undefined");
  process.exit(1);
}
const CT_TOWN_SNOW = ct;
check("connecticut has a town table", ct.stateSlug === "connecticut", String(ct.stateSlug));
const towns = CT_TOWN_SNOW.towns;
check("connecticut lists 169 towns", towns.length === 169, `got ${towns.length}, expected 169`);

const names = towns.map((t) => t.town.toLowerCase());
const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
check("connecticut has no duplicate town names", duplicates.length === 0, JSON.stringify(duplicates));

const tiers = groupTownsByPsf(towns);
const countAt = (psf: number) => tiers.find((t) => t.psf === psf)?.towns.length ?? 0;
check("30 psf covers 107 towns", countAt(30) === 107, `got ${countAt(30)}, expected 107`);
check("35 psf covers 44 towns", countAt(35) === 44, `got ${countAt(35)}, expected 44`);
check("40 psf covers 18 towns", countAt(40) === 18, `got ${countAt(40)}, expected 18`);
check(
  "only 30, 35 and 40 psf appear",
  tiers.every((t) => [30, 35, 40].includes(t.psf)),
  JSON.stringify(tiers.map((t) => t.psf)),
);
check(
  "tier sizes add up to the town count",
  tiers.reduce((sum, t) => sum + t.towns.length, 0) === towns.length,
  `sum ${tiers.reduce((sum, t) => sum + t.towns.length, 0)}, towns ${towns.length}`,
);

const valueOf = (town: string) => towns.find((t) => t.town === town)?.pg;
check("Simsbury is 35 psf (the town in the Search Console query)", valueOf("Simsbury") === 35, `got ${valueOf("Simsbury")}`);
check("Andover is 30 psf", valueOf("Andover") === 30, `got ${valueOf("Andover")}`);
check("Canaan is 40 psf", valueOf("Canaan") === 40, `got ${valueOf("Canaan")}`);

// The state range on the page must match the town table, not a hand-typed number.
const ctState = getStateSnow("connecticut");
const pgValues = towns.map((t) => t.pg);
check(
  "state low and high match the town table",
  ctState?.lowPg === Math.min(...pgValues) && ctState?.highPg === Math.max(...pgValues),
  `state ${ctState?.lowPg}-${ctState?.highPg}, table ${Math.min(...pgValues)}-${Math.max(...pgValues)}`,
);

// Source fields.
check("connecticut source link is https", /^https:\/\//.test(CT_TOWN_SNOW.sourceHref), CT_TOWN_SNOW.sourceHref);
check("connecticut source names Appendix P", CT_TOWN_SNOW.sourceTable === "Appendix P", CT_TOWN_SNOW.sourceTable);
check(
  "connecticut checked date is an ISO date",
  /^\d{4}-\d{2}-\d{2}$/.test(CT_TOWN_SNOW.checkedOn),
  CT_TOWN_SNOW.checkedOn,
);

// Internal links: each must be a site path to a blog post that exists in lib/posts.ts.
const postsSource = readFileSync("lib/posts.ts", "utf8");
for (const link of CT_TOWN_SNOW.related ?? []) {
  const slug = link.href.replace(/^\/blog\//, "");
  check(`related link ${link.href} is an internal blog path`, link.href.startsWith("/blog/"), link.href);
  check(
    `related link ${link.href} points at a post in lib/posts.ts`,
    postsSource.includes(`slug: "${slug}"`),
    `no slug "${slug}" in lib/posts.ts`,
  );
}

// Other states have no town table, so their pages are unchanged.
check("montana has no town table", getTownSnowTable("montana") === undefined);
check("an unknown slug has no town table", getTownSnowTable("constructor") === undefined);

// Wiring: the state page must render the table, and the component must exist and group it.
const pageSource = readFileSync("app/states/[slug]/page.tsx", "utf8");
check(
  "state page looks up the town table",
  pageSource.includes("getTownSnowTable(s.slug)"),
  "app/states/[slug]/page.tsx does not call getTownSnowTable(s.slug)",
);
check(
  "state page renders the town list when a table exists",
  pageSource.includes("{towns && <TownSnowList table={towns} stateName={s.name} />}"),
  "app/states/[slug]/page.tsx does not render TownSnowList",
);
const componentSource = readFileSync("components/TownSnowList.tsx", "utf8");
check(
  "town list component groups by psf and cites the source",
  componentSource.includes("groupTownsByPsf(table.towns)") && componentSource.includes("table.checkedOn"),
  "components/TownSnowList.tsx is missing groupTownsByPsf or the checked date",
);

// The governing source for Connecticut must say which edition is in force.
const ctAuthority = getStateSnow("connecticut")?.authority;
check(
  "connecticut source says the 2022 edition is still in force",
  !!ctAuthority && ctAuthority.text.includes("the 2022 edition is still the one in force"),
  JSON.stringify(ctAuthority?.text),
);

console.log(`\ntown-snow: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("town-snow: all passed");
