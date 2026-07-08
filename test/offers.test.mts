// Verification of the monetization registry and URL builder (lib/offers.ts).
// Covers: structure-to-category mapping, CPL eligibility, the disclosure, and
// the affiliate URL builder with and without an Amazon tag configured. Run via
// npm test. The Amazon-tag branch is exercised by setting the env var before
// importing the module, so both the monetized and unmonetized paths are tested.

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name} ${detail}`); }
}

// Import without a tag first (default unmonetized path).
delete process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
const offers = await import("../lib/offers.ts");

// --- category mapping ---
check("carport slug maps to carport", offers.categoryForSlug("carport-patio-cover-snow-load") === "carport");
check("metal building slug maps to metal-building", offers.categoryForSlug("metal-building-snow-load") === "metal-building");
check("gambrel slug maps to shed", offers.categoryForSlug("gambrel-roof-snow-load") === "shed");
check("greenhouse slug maps to greenhouse", offers.categoryForSlug("greenhouse-snow-load") === "greenhouse");
check("unknown slug falls back to roof", offers.categoryForSlug("nope") === "roof");
check("missing slug falls back to roof", offers.categoryForSlug(undefined) === "roof");

// --- every roof-type slug resolves to a category with offers ---
import { ROOF_TYPES } from "../lib/roof-types.ts";
for (const rt of ROOF_TYPES) {
  const cat = offers.categoryForSlug(rt.slug);
  const co = offers.getOffers(cat);
  check(`offers exist for ${rt.slug} -> ${cat}`, co.offers.length > 0, `${cat} had no offers`);
}

// --- every new tool slug resolves to its own category (not the roof fallback) ---
import { TOOLS } from "../lib/tools/index.ts";
for (const t of TOOLS) {
  const cat = offers.categoryForSlug(t.slug);
  const co = offers.getOffers(cat);
  check(`offers exist for ${t.slug} -> ${cat}`, co.offers.length > 0, `${cat} had no offers`);
  check(`${t.slug} maps to its declared offerCategory`, cat === t.offerCategory, `got ${cat}, declared ${t.offerCategory}`);
}

// --- CPL eligibility ---
check("metal-building is a lead category", offers.isLeadCategory("metal-building") === true);
check("carport is a lead category", offers.isLeadCategory("carport") === true);
check("pole-barn is a lead category", offers.isLeadCategory("pole-barn") === true);
check("roof is NOT a lead category", offers.isLeadCategory("roof") === false);
check("greenhouse is NOT a lead category", offers.isLeadCategory("greenhouse") === false);
check("lumber is NOT a lead category (CPA only)", offers.isLeadCategory("lumber") === false);
check("insulation is a lead category", offers.isLeadCategory("insulation") === true);
check("hvac is a lead category", offers.isLeadCategory("hvac") === true);
check("roof-replacement is a lead category", offers.isLeadCategory("roof-replacement") === true);
check("lead categories all carry a leadPitch", offers.CPL_CATEGORIES.every((c) => {
  const co = offers.getOffers(c);
  return co.lead === true && typeof co.leadPitch === "string" && co.leadPitch.length > 0;
}));

// --- revenue-strategy metadata: every lead category is ranked and priced ---
check("every lead category has a priority rank", offers.CPL_CATEGORIES.every((c) => typeof offers.getOffers(c).priority === "number"));
check("every lead category has a leadValueRange", offers.CPL_CATEGORIES.every((c) => typeof offers.getOffers(c).leadValueRange === "string" && offers.getOffers(c).leadValueRange!.length > 0));
check("priority ranks are unique (no ties to break silently)", new Set(offers.CPL_CATEGORIES.map((c) => offers.getOffers(c).priority)).size === offers.CPL_CATEGORIES.length);
check("CPL_CATEGORIES is sorted by priority ascending", offers.CPL_CATEGORIES.every((c, i) => i === 0 || offers.getOffers(offers.CPL_CATEGORIES[i - 1]).priority! <= offers.getOffers(c).priority!));
check("hvac is the top revenue priority (highest $/lead x volume per keyword research)", offers.CPL_CATEGORIES[0] === "hvac", offers.CPL_CATEGORIES[0]);

// --- every offer has a real https url and required fields ---
let allValid = true;
for (const co of offers.OFFERS) {
  for (const o of co.offers) {
    const ok = o.url.startsWith("https://") && o.label.length > 0 && o.cta.length > 0 && o.blurb.length > 0;
    if (!ok) { allValid = false; console.error(`    bad offer in ${co.category}: ${o.label} (${o.url})`); }
  }
}
check("all offers have https url + label + cta + blurb", allValid);

// --- every offer category has a human label (used by the lead form's select) ---
check("every OFFERS category has a CATEGORY_LABEL", offers.OFFERS.every((co) => typeof offers.CATEGORY_LABEL[co.category] === "string" && offers.CATEGORY_LABEL[co.category].length > 0));

// --- disclosure present and meaningful ---
check("disclosure mentions affiliate", /affiliate/i.test(offers.DISCLOSURE));
check("disclosure ties back to rated load", /rated snow load/i.test(offers.DISCLOSURE));

// --- URL builder: no tag configured => destination + query preserved, no tag param, UTM always present ---
const amazonOffer = offers.OFFERS.flatMap((c) => c.offers).find((o) => o.network === "amazon")!;
const brandOffer = offers.OFFERS.flatMap((c) => c.offers).find((o) => o.network === "brand")!;
check("CPA not live without a tag", offers.isCpaLive() === false);
const untaggedUrl = offers.offerUrl(amazonOffer);
check("amazon destination host unchanged without tag", new URL(untaggedUrl).host === new URL(amazonOffer.url).host);
check("amazon original query preserved without tag", new URL(untaggedUrl).searchParams.get("k") === new URL(amazonOffer.url).searchParams.get("k"));
check("no tag param leaks in without config", !untaggedUrl.includes("tag="));
check("UTM tracking present even without a tag", untaggedUrl.includes("utm_source=roofhelm") && untaggedUrl.includes("utm_medium=affiliate"));
check("untagged campaign defaults to general", untaggedUrl.includes("utm_campaign=general"));
check("tracked campaign reflects the supplied category", offers.offerUrl(amazonOffer, "hvac").includes("utm_campaign=hvac"));
check("brand link also carries UTM tracking (medium=referral)", offers.offerUrl(brandOffer).includes("utm_medium=referral"));

// --- URL builder: with a tag configured => tag injected on amazon, brand untouched ---
// The tag is read at call time, so setting the env now flips the behaviour with
// no re-import needed.
process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG = "roofhelm-20";
check("CPA live with a tag", offers.isCpaLive() === true);
const tagged = offers.offerUrl(amazonOffer);
check("amazon url gets the tag", tagged.includes("tag=roofhelm-20"), tagged);
check("amazon url keeps its original query", tagged.includes("k="), tagged);
check("brand url never gets an amazon tag", !offers.offerUrl(brandOffer).includes("tag=roofhelm-20"));

console.log(`\n${fail === 0 ? 1 : 0} passed, ${fail} failed (${pass} checks ok)`);
process.exit(fail > 0 ? 1 : 0);
