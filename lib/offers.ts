// Monetization: the single source of truth for the two revenue mechanics that
// sit AROUND the free calculator (the tool itself stays free and ungated).
//
//   CPA (cost per action / affiliate): curated, genuinely useful "where to buy"
//   suggestions matched to the structure the user is calculating. Real, working
//   destination links; an Amazon Associates tag is injected from env when set,
//   so the links are monetized the moment a tag is configured and are still
//   useful (just unmonetized) before that. We never fabricate prices, ratings or
//   stock: those go stale and would be dummy data. We link to real category and
//   search pages and let the user verify the rated load against their result.
//
//   CPL (cost per lead): for big-ticket, quote-based structures (steel/metal
//   buildings, large carports, pole barns) we capture a pre-qualified lead that
//   already carries the computed ASCE 7 design load, then forward it to a real
//   endpoint (see app/api/lead/route.ts). No dummy success: an unconfigured or
//   failing forward shows an explicit state, mirroring the Stripe checkout.
//
// One registry, one URL builder, one disclosure: pages and components compose
// from here so the offer set re-skins and re-prices from a single place.

export type OfferCategory =
  | "roof"
  | "carport"
  | "metal-building"
  | "shed"
  | "greenhouse"
  | "pole-barn"
  | "lumber"
  | "insulation"
  | "hvac"
  | "roof-replacement";

export type OfferNetwork = "amazon" | "brand";

export interface Offer {
  label: string;
  blurb: string; // why this is relevant to the snow load result
  cta: string; // button text, e.g. "Shop on Amazon"
  url: string; // real, working destination
  network: OfferNetwork;
  brand?: string; // e.g. "VEVOR", shown as a small source tag
}

export interface CategoryOffers {
  category: OfferCategory;
  heading: string; // module heading for this structure context
  intro: string; // one line tying the offers to the computed load
  lead: boolean; // CPL eligible (big-ticket, quote-based)
  leadPitch?: string; // CPL CTA copy
  offers: Offer[];
  // --- Internal revenue-strategy metadata (lead:true only). NEVER rendered to
  // the end user (a homeowner doesn't need to know what we'd charge a buyer
  // per lead); used to (a) order CPL_CATEGORIES and the lead-form dropdown,
  // (b) decide which CPL program to wire live first in docs/monetization.md,
  // and (c) give the CPL CTA more visual weight for the categories worth it.
  // See "Revenue prioritization" in docs/monetization.md for the full ranking
  // and the search-volume data behind it (Google Ads Keyword Planner, US).
  priority?: number; // 1 = highest revenue opportunity; lower number wins
  leadValueRange?: string; // typical industry per-lead $ range; varies by region/buyer/season, not a quote
}

// Affiliate configuration. NEXT_PUBLIC_ so the (public) tag is available in the
// client bundle; Next inlines this literal reference at build time. Read at call
// time (not module load) so behaviour is deterministic and easy to test.
export function amazonTag(): string {
  return (process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "").trim();
}

// CPA is "live" (monetized) once an Amazon tag is configured. Brand links are
// real referrals regardless; they become monetized when their program-specific
// tracking URL is dropped into the registry below.
export function isCpaLive(): boolean {
  return amazonTag().length > 0;
}

const az = (query: string) =>
  `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;

// Build the outbound URL, injecting the Amazon Associates tag when present,
// plus UTM source/medium/campaign params on every outbound link (Amazon and
// brand alike). This doesn't change where the link goes; it makes click-
// through measurable per origin category once you wire up Vercel Analytics
// or your affiliate dashboard's UTM reports, which is the prerequisite for
// actually re-prioritizing CPA spend later -- you can't optimize a channel
// you can't see broken out by page. campaign defaults to "general" when no
// category is supplied (keeps existing call sites and tests unaffected).
// Returns the real base URL unchanged (plus tracking) when no Amazon tag is
// set, so the link always works; it is simply unmonetized until configured.
export function offerUrl(offer: Offer, category?: OfferCategory): string {
  const tag = amazonTag();
  const u = new URL(offer.url);
  if (offer.network === "amazon" && tag) u.searchParams.set("tag", tag);
  u.searchParams.set("utm_source", "roofhelm");
  u.searchParams.set("utm_medium", offer.network === "amazon" ? "affiliate" : "referral");
  u.searchParams.set("utm_campaign", category ?? "general");
  return u.toString();
}

// FTC affiliate disclosure. Shown wherever offers render. The closing clause
// ties the suggestion back to the engineering value, keeping the calculator's
// neutrality: a supplier is a starting point, not an endorsement.
export const DISCLOSURE =
  "Some links are affiliate links: if you buy through them we may earn a commission at no extra cost to you. These are starting points, not engineering endorsements. Always confirm a product's rated snow load meets the design load above.";

// The registry. Each structure context maps to a small, curated set of real
// suppliers, plus whether it is worth a quote (CPL).
export const OFFERS: CategoryOffers[] = [
  {
    category: "roof",
    heading: "Reduce the load on an existing roof",
    intro:
      "If the design load is close to your roof's capacity, the cheapest fix is to keep snow off it. These are the tools that do that.",
    lead: false,
    offers: [
      {
        label: "Roof snow rake",
        blurb:
          "A long-handled rake pulls snow off from the ground, cutting the load before it builds up. The first thing to buy in a heavy winter.",
        cta: "Shop roof rakes",
        url: az("roof snow rake"),
        network: "amazon",
      },
      {
        label: "Roof de-icing / heat cable",
        blurb:
          "Self-regulating heat cable along eaves and valleys stops the ice dams that trap meltwater and add weight.",
        cta: "Shop heat cable",
        url: az("roof de-icing heat cable"),
        network: "amazon",
      },
    ],
  },
  {
    category: "carport",
    heading: "Carports & patio covers rated for your snow zone",
    intro:
      "Light big-box covers are often rated for only 10 to 20 psf. Match the kit's rated load to the design load above before you buy, or get a quote for a heavier steel structure.",
    lead: true,
    leadPitch:
      "Get matched with a certified steel carport supplier rated for your snow load",
    priority: 6,
    leadValueRange: "$20-50/lead, typical range",
    offers: [
      {
        label: "Steel & metal carport kits",
        blurb:
          "Bolt-together steel carports and patio covers. Check the spec sheet's rated snow load against your number.",
        cta: "Shop carport kits",
        url: az("steel carport kit snow load"),
        network: "amazon",
      },
      {
        label: "VEVOR carports & canopies",
        blurb:
          "Mid-weight metal carports and canopies, often with a stated snow-load rating in the spec sheet.",
        cta: "Browse VEVOR carports",
        url: "https://www.vevor.com/carport-c_11102",
        network: "brand",
        brand: "VEVOR",
      },
    ],
  },
  {
    category: "metal-building",
    heading: "Steel buildings engineered to your snow load",
    intro:
      "Steel building kits are engineered to a specified ground snow load. A supplier can certify the frame for the design load above and stamp drawings for your permit.",
    lead: true,
    leadPitch:
      "Get steel building quotes certified for your design snow load",
    priority: 4,
    leadValueRange: "$30-80/lead, typical range",
    offers: [
      {
        label: "Metal building hardware & brackets",
        blurb:
          "Post brackets, purlin clips and fasteners for reinforcing or finishing a steel-frame building.",
        cta: "Shop building hardware",
        url: az("metal building bracket kit"),
        network: "amazon",
      },
    ],
  },
  {
    category: "pole-barn",
    heading: "Pole barns & post-frame buildings for your snow load",
    intro:
      "Post-frame kits are sized to a design snow load and span. A dealer can quote and engineer-stamp a building for the load above.",
    lead: true,
    leadPitch:
      "Get post-frame pole barn quotes engineered for your snow load",
    priority: 5,
    leadValueRange: "$30-70/lead, typical range",
    offers: [
      {
        label: "Pole barn brackets & truss hardware",
        blurb:
          "Post anchors, truss plates and fasteners for post-frame construction.",
        cta: "Shop post-frame hardware",
        url: az("pole barn bracket truss hardware"),
        network: "amazon",
      },
    ],
  },
  {
    category: "shed",
    heading: "Sheds & barns rated for snow",
    intro:
      "Metal and resin shed kits list a roof snow-load rating. Confirm it clears the design load above, especially for an unheated shed (Ct = 1.2).",
    lead: false,
    offers: [
      {
        label: "Metal & resin shed kits",
        blurb:
          "Arrow, Suncast and Lifetime shed kits. The heavier-gauge and peak-roof models carry more snow.",
        cta: "Shop shed kits",
        url: az("metal storage shed kit snow load"),
        network: "amazon",
      },
      {
        label: "Shed roof reinforcement kits",
        blurb:
          "Truss and rafter reinforcement kits that raise a kit shed's snow rating in a heavy-snow region.",
        cta: "Shop reinforcement kits",
        url: az("shed roof reinforcement truss kit"),
        network: "amazon",
      },
    ],
  },
  {
    category: "greenhouse",
    heading: "Greenhouses rated for snow",
    intro:
      "Polycarbonate kits state a snow-load rating. A continuously heated greenhouse gets the Ct = 0.85 reduction; an unheated hoop house does not, so it needs a higher rating.",
    lead: false,
    offers: [
      {
        label: "Polycarbonate greenhouse kits",
        blurb:
          "Palram / Canopia and similar rigid-panel greenhouses, with a stated roof snow-load rating.",
        cta: "Shop greenhouse kits",
        url: az("polycarbonate greenhouse kit snow load"),
        network: "amazon",
      },
      {
        label: "Greenhouse snow bracing",
        blurb:
          "Internal post and bow-bracing kits that raise a hoop house or kit greenhouse's snow capacity.",
        cta: "Shop bracing kits",
        url: az("greenhouse snow load bracing kit"),
        network: "amazon",
      },
    ],
  },
  {
    category: "lumber",
    heading: "Framing hardware for rafters, trusses & joists",
    intro:
      "Connectors, hangers and fasteners sized to the framing you just calculated. A lumber yard or supplier can also cut and engineer trusses to spec.",
    lead: false,
    offers: [
      {
        label: "Joist hangers & framing connectors",
        blurb: "Simpson Strong-Tie–style joist hangers, rafter ties and hurricane clips for code-compliant framing connections.",
        cta: "Shop framing connectors",
        url: az("joist hanger framing connector"),
        network: "amazon",
      },
      {
        label: "Truss plates & rafter hardware",
        blurb: "Metal truss plates, ridge straps and rafter brackets for built-up or repaired roof framing.",
        cta: "Shop truss hardware",
        url: az("truss plate rafter bracket"),
        network: "amazon",
      },
    ],
  },
  {
    category: "insulation",
    heading: "Insulation rated for the R-value above",
    intro:
      "Match the product's printed R-value to the total you just calculated. Whole-attic or whole-wall jobs (especially spray foam) are usually worth a contractor quote.",
    lead: true,
    leadPitch: "Get matched with local insulation contractors for a free quote",
    priority: 3,
    leadValueRange: "$25-60/lead, typical range",
    offers: [
      {
        label: "Fiberglass & mineral wool batts",
        blurb: "Faced and unfaced batts in standard widths for walls, attics and floors.",
        cta: "Shop insulation batts",
        url: az("fiberglass insulation batt r-value"),
        network: "amazon",
      },
      {
        label: "Spray foam insulation kits",
        blurb: "DIY closed- and open-cell spray foam kits for smaller sealing and insulating jobs.",
        cta: "Shop spray foam kits",
        url: az("spray foam insulation kit"),
        network: "amazon",
      },
    ],
  },
  {
    category: "hvac",
    heading: "Right-sized HVAC equipment & a real load calculation",
    intro:
      "This quick estimate is a starting point. A licensed contractor's Manual J load calculation is what actually sizes your equipment correctly.",
    lead: true,
    leadPitch: "Get a free in-home Manual J load assessment from a local HVAC contractor",
    priority: 1,
    leadValueRange: "$40-100/lead, typical range",
    offers: [
      {
        label: "Programmable & smart thermostats",
        blurb: "Set back temperatures automatically to cut runtime on a correctly sized system.",
        cta: "Shop thermostats",
        url: az("programmable smart thermostat"),
        network: "amazon",
      },
      {
        label: "Ductless mini-split systems",
        blurb: "Zoned mini-split heat pump systems, sized in tons; compare to the estimate above before buying.",
        cta: "Shop mini-split systems",
        url: az("ductless mini split air conditioner"),
        network: "amazon",
      },
    ],
  },
  {
    category: "roof-replacement",
    heading: "Get local roofing contractor quotes",
    intro:
      "This estimate is a national-average planning range. Local, licensed contractors can give you an exact, itemized bid for your roof.",
    lead: true,
    leadPitch: "Get matched with 3 local roofing contractors for a free quote",
    priority: 2,
    leadValueRange: "$35-90/lead, typical range",
    offers: [
      {
        label: "Architectural shingle bundles",
        blurb: "Compare current shingle pricing if you're scoping a DIY or supply-only job.",
        cta: "Shop roofing shingles",
        url: az("architectural roofing shingles bundle"),
        network: "amazon",
      },
      {
        label: "Roofing underlayment & ice & water shield",
        blurb: "Synthetic underlayment and ice-and-water barrier for the layers under the finish roofing.",
        cta: "Shop underlayment",
        url: az("roofing underlayment ice water shield"),
        network: "amazon",
      },
    ],
  },
];

// Map a per-structure calculator slug to its offer category. The calculator
// pages own these slugs (lib/roof-types.ts and lib/tools/*); anything unknown
// or absent (the generic homepage calculator) falls back to the
// roof-mitigation set, which fits the December "is my roof going to hold?"
// audience.
const SLUG_TO_CATEGORY: Record<string, OfferCategory> = {
  "flat-roof-snow-load": "roof",
  "pitched-roof-snow-load": "roof",
  "ground-snow-to-roof-snow-load": "roof",
  "metal-building-snow-load": "metal-building",
  "carport-patio-cover-snow-load": "carport",
  "shed-roof-snow-load": "shed",
  "gambrel-roof-snow-load": "shed",
  "greenhouse-snow-load": "greenhouse",
  "roof-pitch-calculator": "lumber",
  "rafter-length-calculator": "lumber",
  "roof-truss-calculator": "lumber",
  "joist-span-calculator": "lumber",
  "insulation-r-value-calculator": "insulation",
  "hvac-load-calculator": "hvac",
  "roof-replacement-cost-calculator": "roof-replacement",
};

export function categoryForSlug(slug?: string): OfferCategory {
  return (slug && SLUG_TO_CATEGORY[slug]) || "roof";
}

export function getOffers(category: OfferCategory): CategoryOffers {
  return OFFERS.find((o) => o.category === category) ?? OFFERS[0];
}

// CPL is offered for the big-ticket, quote-based structures only, ordered by
// revenue priority (lowest priority number first) rather than declaration
// order, so the lead-form dropdown and any future "which program to wire
// live first" tooling read directly off the same ranking documented in
// docs/monetization.md.
export const CPL_CATEGORIES: OfferCategory[] = OFFERS.filter((o) => o.lead)
  .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  .map((o) => o.category);

export function isLeadCategory(category: OfferCategory): boolean {
  return CPL_CATEGORIES.includes(category);
}

// Human label per category, reused by the lead form and its structure select.
export const CATEGORY_LABEL: Record<OfferCategory, string> = {
  roof: "Roof (existing)",
  carport: "Carport / patio cover",
  "metal-building": "Steel / metal building",
  shed: "Shed / barn",
  greenhouse: "Greenhouse",
  "pole-barn": "Pole barn / post-frame",
  lumber: "Framing / lumber",
  insulation: "Insulation",
  hvac: "HVAC system",
  "roof-replacement": "Roof replacement",
};
