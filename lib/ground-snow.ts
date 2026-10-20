// Ground snow load (Pg) reference by US state, for the programmatic per-state
// pages and as a sensible starting value for the calculator.
//
// IMPORTANT, on honesty about the data: under ASCE 7-22 the *governing* ground
// snow load for a site comes from the ASCE 7 Hazard Tool or the local building
// department, not from a national lookup. The ranges below are planning ranges
// for the *populated* parts of each state, read from the ASCE 7 ground snow
// load map (Fig. 7.2-1) and common state code amendments. Mountainous states
// are flagged `caseStudy` because elevation (not the state) sets the value,
// and it can range from ~30 to 150+ psf within one county. We never assert a
// false per-ZIP precision: every page tells the user to confirm with their AHJ.

export interface StateSnow {
  slug: string;
  name: string;
  abbr: string;
  lowPg: number; // populated-area low, psf
  highPg: number; // populated-area high, psf
  typicalPg: number; // representative populated value (calculator default on the page)
  caseStudy: boolean; // elevation-driven; ASCE map requires a site-specific study
  note: string; // honest one-line qualifier for this state
  authority?: StateAuthority; // governing source, only where a primary document has been checked
}

// The official document or page that sets a state's design value, shown on the state page.
// Add one only after opening the primary source; test/state-authority.test.mts guards the shape.
export interface StateAuthority {
  text: string; // one or two sentences on what the source requires or publishes
  linkText: string; // anchor text for the link
  href: string; // https URL of the primary document or official page
}

// Helper: a quick qualitative band from the typical value (used in copy).
export function snowBand(pg: number): string {
  if (pg <= 5) return "very low";
  if (pg <= 15) return "low";
  if (pg <= 30) return "moderate";
  if (pg <= 50) return "high";
  return "very high";
}

// Census regions, used to group the state list so it reads as a reference, not
// a 51-row dump. Snowiness clusters by region, so this also aids scanning.
export const REGIONS = ["Northeast", "Midwest", "South", "West"] as const;
export type Region = (typeof REGIONS)[number];
const REGION_BY_ABBR: Record<string, Region> = {
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast", NJ: "Northeast", NY: "Northeast", PA: "Northeast", RI: "Northeast", VT: "Northeast",
  IL: "Midwest", IN: "Midwest", IA: "Midwest", KS: "Midwest", MI: "Midwest", MN: "Midwest", MO: "Midwest", NE: "Midwest", ND: "Midwest", OH: "Midwest", SD: "Midwest", WI: "Midwest",
  AL: "South", AR: "South", DE: "South", DC: "South", FL: "South", GA: "South", KY: "South", LA: "South", MD: "South", MS: "South", NC: "South", OK: "South", SC: "South", TN: "South", TX: "South", VA: "South", WV: "South",
  AK: "West", AZ: "West", CA: "West", CO: "West", HI: "West", ID: "West", MT: "West", NV: "West", NM: "West", OR: "West", UT: "West", WA: "West", WY: "West",
};
export function regionOf(abbr: string): Region {
  return REGION_BY_ABBR[abbr] ?? "West";
}

const CS = (s: string) =>
  `${s} Mountain and high-elevation sites are ASCE 7 "case study" zones: the ground snow load is driven by elevation and can be several times the lowland value, so confirm your exact site with the ASCE Hazard Tool or your building department.`;

export const STATE_SNOW: StateSnow[] = [
  { slug: "alabama", name: "Alabama", abbr: "AL", lowPg: 0, highPg: 5, typicalPg: 5, caseStudy: false, note: "Snow load is minor across most of Alabama; the north sees a little more than the Gulf coast." },
  { slug: "alaska", name: "Alaska", abbr: "AK", lowPg: 40, highPg: 300, typicalPg: 60, caseStudy: true, note: CS("Alaska has some of the highest snow loads in the US.") },
  { slug: "arizona", name: "Arizona", abbr: "AZ", lowPg: 0, highPg: 50, typicalPg: 5, caseStudy: true, note: CS("The low deserts carry almost no snow load while the Mogollon Rim and Flagstaff are very high.") },
  { slug: "arkansas", name: "Arkansas", abbr: "AR", lowPg: 5, highPg: 15, typicalPg: 10, caseStudy: false, note: "Low to moderate ground snow load statewide, a little higher in the Ozarks." },
  { slug: "california", name: "California", abbr: "CA", lowPg: 0, highPg: 200, typicalPg: 0, caseStudy: true, note: CS("Coastal and valley California is essentially zero; the Sierra Nevada is among the highest in the country.") },
  { slug: "colorado", name: "Colorado", abbr: "CO", lowPg: 25, highPg: 150, typicalPg: 35, caseStudy: true, note: CS("The Front Range cities are moderate; the mountains are very high and strictly case-study.") },
  { slug: "connecticut", name: "Connecticut", abbr: "CT", lowPg: 25, highPg: 40, typicalPg: 30, caseStudy: false, note: "Moderate to high ground snow load, increasing inland from Long Island Sound." },
  { slug: "delaware", name: "Delaware", abbr: "DE", lowPg: 15, highPg: 25, typicalPg: 20, caseStudy: false, note: "Moderate ground snow load across the state." },
  { slug: "district-of-columbia", name: "District of Columbia", abbr: "DC", lowPg: 20, highPg: 25, typicalPg: 25, caseStudy: false, note: "Washington, DC commonly designs to roughly 25 psf ground snow; confirm the current adopted value." },
  { slug: "florida", name: "Florida", abbr: "FL", lowPg: 0, highPg: 0, typicalPg: 0, caseStudy: false, note: "Ground snow load is zero throughout Florida; snow is not a design case." },
  { slug: "georgia", name: "Georgia", abbr: "GA", lowPg: 0, highPg: 10, typicalPg: 5, caseStudy: false, note: "Very low except the far north Georgia mountains." },
  { slug: "hawaii", name: "Hawaii", abbr: "HI", lowPg: 0, highPg: 0, typicalPg: 0, caseStudy: false, note: "No snow design case at habitable elevations." },
  { slug: "idaho", name: "Idaho", abbr: "ID", lowPg: 20, highPg: 120, typicalPg: 40, caseStudy: true, note: CS("Valley towns are moderate to high; the mountains are very high.") },
  { slug: "illinois", name: "Illinois", abbr: "IL", lowPg: 20, highPg: 30, typicalPg: 25, caseStudy: false, note: "Moderate ground snow load; the Chicago area commonly designs near 25 psf." },
  { slug: "indiana", name: "Indiana", abbr: "IN", lowPg: 20, highPg: 30, typicalPg: 25, caseStudy: false, note: "Moderate ground snow load, a little higher near Lake Michigan." },
  { slug: "iowa", name: "Iowa", abbr: "IA", lowPg: 25, highPg: 40, typicalPg: 30, caseStudy: false, note: "Moderate to high ground snow load statewide." },
  { slug: "kansas", name: "Kansas", abbr: "KS", lowPg: 15, highPg: 25, typicalPg: 20, caseStudy: false, note: "Low to moderate, increasing to the north and west." },
  { slug: "kentucky", name: "Kentucky", abbr: "KY", lowPg: 10, highPg: 20, typicalPg: 15, caseStudy: false, note: "Low to moderate ground snow load." },
  { slug: "louisiana", name: "Louisiana", abbr: "LA", lowPg: 0, highPg: 5, typicalPg: 0, caseStudy: false, note: "Effectively no snow design case statewide." },
  { slug: "maine", name: "Maine", abbr: "ME", lowPg: 50, highPg: 100, typicalPg: 60, caseStudy: false, note: "High to very high ground snow load, among the highest in the lower 48." },
  { slug: "maryland", name: "Maryland", abbr: "MD", lowPg: 20, highPg: 35, typicalPg: 25, caseStudy: true, note: CS("The coastal plain is moderate; western Maryland's mountains are higher.") },
  { slug: "massachusetts", name: "Massachusetts", abbr: "MA", lowPg: 30, highPg: 50, typicalPg: 40, caseStudy: false, note: "High ground snow load; many towns adopt site-specific values from the state ground-snow study." },
  { slug: "michigan", name: "Michigan", abbr: "MI", lowPg: 30, highPg: 70, typicalPg: 40, caseStudy: false, note: "High, and very high in the snowbelt of the Upper Peninsula." },
  { slug: "minnesota", name: "Minnesota", abbr: "MN", lowPg: 35, highPg: 60, typicalPg: 50, caseStudy: false, note: "High to very high ground snow load statewide." },
  { slug: "mississippi", name: "Mississippi", abbr: "MS", lowPg: 0, highPg: 5, typicalPg: 0, caseStudy: false, note: "Effectively no snow design case." },
  { slug: "missouri", name: "Missouri", abbr: "MO", lowPg: 15, highPg: 25, typicalPg: 20, caseStudy: false, note: "Low to moderate ground snow load." },
  { slug: "montana", name: "Montana", abbr: "MT", lowPg: 30, highPg: 130, typicalPg: 40, caseStudy: true, note: CS("Valley towns are high; the mountains are very high."), authority: { text: "Montana requires a minimum design roof snow load of 30 psf after allowed reductions. The State Building Codes Bureau says the design snow load shall be based on the ASCE 7 Hazard Tool, and its phone line is (406) 841-2056.", linkText: "Montana Building Codes Bureau: snow load information", href: "https://bsd.dli.mt.gov/Building-Codes-Permits/snow-load-information" } },
  { slug: "nebraska", name: "Nebraska", abbr: "NE", lowPg: 20, highPg: 35, typicalPg: 30, caseStudy: false, note: "Moderate to high ground snow load." },
  { slug: "nevada", name: "Nevada", abbr: "NV", lowPg: 0, highPg: 120, typicalPg: 10, caseStudy: true, note: CS("Las Vegas and the low desert are near zero; the Sierra and high basins are very high.") },
  { slug: "new-hampshire", name: "New Hampshire", abbr: "NH", lowPg: 50, highPg: 100, typicalPg: 60, caseStudy: true, note: CS("High statewide; the White Mountains are very high."), authority: { text: "New Hampshire's ground snow loads come from a 2002 ERDC/CRREL study that sets a value for each of the state's 259 towns, and the state building code amendments allow its use. Sites above 2,500 ft still need a site-specific case study.", linkText: "Ground Snow Loads for New Hampshire (ERDC/CRREL, 2002)", href: "https://apps.dtic.mil/sti/pdfs/ADA399953.pdf" } },
  { slug: "new-jersey", name: "New Jersey", abbr: "NJ", lowPg: 20, highPg: 30, typicalPg: 25, caseStudy: false, note: "Moderate ground snow load, a little higher in the northwest." },
  { slug: "new-mexico", name: "New Mexico", abbr: "NM", lowPg: 5, highPg: 60, typicalPg: 15, caseStudy: true, note: CS("The southern deserts are low; the northern mountains are high.") },
  { slug: "new-york", name: "New York", abbr: "NY", lowPg: 25, highPg: 70, typicalPg: 40, caseStudy: true, note: CS("NYC and Long Island are moderate; the Tug Hill, Adirondacks and Catskills are very high.") },
  { slug: "north-carolina", name: "North Carolina", abbr: "NC", lowPg: 5, highPg: 30, typicalPg: 10, caseStudy: true, note: CS("The coast and Piedmont are low; the western mountains are much higher.") },
  { slug: "north-dakota", name: "North Dakota", abbr: "ND", lowPg: 30, highPg: 45, typicalPg: 40, caseStudy: false, note: "High ground snow load statewide." },
  { slug: "ohio", name: "Ohio", abbr: "OH", lowPg: 20, highPg: 30, typicalPg: 25, caseStudy: false, note: "Moderate ground snow load, higher in the northeast snowbelt." },
  { slug: "oklahoma", name: "Oklahoma", abbr: "OK", lowPg: 5, highPg: 15, typicalPg: 10, caseStudy: false, note: "Low ground snow load statewide." },
  { slug: "oregon", name: "Oregon", abbr: "OR", lowPg: 5, highPg: 150, typicalPg: 15, caseStudy: true, note: CS("The Willamette Valley and coast are low; the Cascades are very high.") },
  { slug: "pennsylvania", name: "Pennsylvania", abbr: "PA", lowPg: 20, highPg: 40, typicalPg: 30, caseStudy: false, note: "Moderate to high, increasing across the northern tier." },
  { slug: "rhode-island", name: "Rhode Island", abbr: "RI", lowPg: 25, highPg: 35, typicalPg: 30, caseStudy: false, note: "Moderate to high ground snow load." },
  { slug: "south-carolina", name: "South Carolina", abbr: "SC", lowPg: 0, highPg: 10, typicalPg: 5, caseStudy: false, note: "Very low except the far northwest upstate." },
  { slug: "south-dakota", name: "South Dakota", abbr: "SD", lowPg: 25, highPg: 50, typicalPg: 35, caseStudy: true, note: CS("Moderate to high on the plains; the Black Hills are higher.") },
  { slug: "tennessee", name: "Tennessee", abbr: "TN", lowPg: 5, highPg: 20, typicalPg: 10, caseStudy: true, note: CS("Low across most of the state; the eastern mountains are higher.") },
  { slug: "texas", name: "Texas", abbr: "TX", lowPg: 0, highPg: 15, typicalPg: 5, caseStudy: false, note: "Very low statewide, slightly higher in the Panhandle." },
  { slug: "utah", name: "Utah", abbr: "UT", lowPg: 20, highPg: 150, typicalPg: 35, caseStudy: true, note: CS("The Wasatch Front cities are moderate to high; the mountains are very high.") },
  { slug: "vermont", name: "Vermont", abbr: "VT", lowPg: 45, highPg: 90, typicalPg: 60, caseStudy: true, note: CS("High to very high statewide; the Green Mountains are highest.") },
  { slug: "virginia", name: "Virginia", abbr: "VA", lowPg: 10, highPg: 30, typicalPg: 20, caseStudy: true, note: CS("Tidewater is low; the Blue Ridge and Shenandoah are higher.") },
  { slug: "washington", name: "Washington", abbr: "WA", lowPg: 5, highPg: 150, typicalPg: 20, caseStudy: true, note: CS("The Puget Sound lowlands are low to moderate; the Cascades are very high.") },
  { slug: "west-virginia", name: "West Virginia", abbr: "WV", lowPg: 20, highPg: 50, typicalPg: 30, caseStudy: true, note: CS("Moderate in the valleys; the Allegheny highlands are higher.") },
  { slug: "wisconsin", name: "Wisconsin", abbr: "WI", lowPg: 30, highPg: 60, typicalPg: 40, caseStudy: false, note: "High ground snow load, very high in the north." },
  { slug: "wyoming", name: "Wyoming", abbr: "WY", lowPg: 25, highPg: 130, typicalPg: 40, caseStudy: true, note: CS("The basin towns are moderate to high; the mountains are very high.") },
];

export function getStateSnow(slug: string): StateSnow | undefined {
  return STATE_SNOW.find((s) => s.slug === slug);
}
