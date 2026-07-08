# Monetization plan (CPA + CPL)

The free calculator is a top-of-funnel SEO asset. We do **not** upsell the
homeowner a PDF; we monetize *around* the free tool with two mechanics. Search
demand (Google Ads, US) drove these choices: the head term `snow load calculator`
spikes to ~9,900/mo in December but the buyer terms (`carport snow load`,
`greenhouse snow load`) are counter-seasonal and carry advertiser CPC, and the
only high-CPC terms in the space are `stamped engineering drawings` / `pe stamped
drawings` ($4-30 CPC).

Single source of truth: `lib/offers.ts`. Surfaces: `components/SupplierModule.tsx`
(under every result) and the `/quote` page + `app/api/lead/route.ts`.

## Revenue prioritization (added 2026-06-30, with the calculator-suite expansion)

CPL_CATEGORIES in `lib/offers.ts` is sorted by a `priority` field on each
`CategoryOffers` entry, not by source order, so the rank below is enforced in
code (see `test/offers.test.mts`), not just documented and forgotten.

**Ranking method:** monthly US search volume of the calculator that feeds each
category (Google Ads Keyword Planner, live data, recorded per-calculator in
each `lib/roof-types.ts` / `lib/tools/*.ts` entry's `volume`/`keyword` field)
multiplied by the midpoint of that category's typical industry per-lead price
range. This is a *relative* opportunity-sizing heuristic, not a revenue
forecast: it tells you which program is worth wiring live and negotiating a
buyer for *first*, given limited time, not how much you'll actually make.

| Rank | Category | Feeding calculator (mo. volume) | Typical $/lead | Volume × mid-$/lead |
| --- | --- | --- | --- | --- |
| 1 | `hvac` | hvac-load-calculator (4,400/mo) | $40-100 | ~308,000 |
| 2 | `roof-replacement` | roof-replacement-cost-calculator (4,400/mo) | $35-90 | ~275,000 |
| 3 | `insulation` | insulation-r-value-calculator (5,400/mo) | $25-60 | ~229,500 |
| 4 | `metal-building` | metal-building-snow-load (210/mo) | $30-80 | ~11,550 |
| 5 | `pole-barn` | *(no dedicated calculator yet — see gap below)* | $30-70 | n/a |
| 6 | `carport` | carport-patio-cover-snow-load (140/mo) | $20-50 | ~4,900 |

**What this means in practice:**
- Wire **HVAC and roof-replacement leads live first.** They're not just the
  highest combined volume-times-value; HVAC and roofing are also two of the
  most established, easiest-to-find lead-buyer markets in home services
  (Modernize, Angi Leads, regional HVAC/roofing lead networks all actively
  buy), so the search-for-a-buyer step is lower-friction than for steel
  building/pole-barn leads.
- **`pole-barn` has no dedicated organic-traffic calculator.** It only
  receives leads as a structure-type option surfaced from the carport/shed
  snow-load pages, so it currently can't generate its own SEO-driven volume.
  If post-frame buyers are worth pursuing, the highest-leverage next build is
  a dedicated pole-barn calculator (e.g. post spacing or footing-size tool) to
  give it its own keyword-targeted landing page, the same pattern every other
  category already has.
- **Don't over-invest in `carport` and `metal-building` CPL outreach yet** —
  real but low relative to the top three; fine to leave on the existing
  Amazon/brand CPA links until a buyer reaches out, rather than spending time
  sourcing a dedicated lead contract for them.

**Measuring whether this ranking holds up:** every outbound CPA link now
carries `utm_source=roofhelm&utm_medium=affiliate|referral&utm_campaign=<category>`
(`lib/offers.ts` `offerUrl()`), so once Vercel Analytics or an Amazon Associates
/ affiliate dashboard is checked, click-through can be broken out per category
and compared against this ranking — re-derive the table above from *actual*
click/conversion data as soon as you have a few weeks of it, rather than only
from search volume.

**Lead quality, not just lead volume:** the non-snow tool calculators now pass
the full computed result sentence (e.g. *"Estimated cost: $13,000-$24,000 for
2,000 sq ft of architectural shingle"*) into the lead's `notes` field via
`ToolCalculator`'s `detail` query param, not just a bare number. A buyer who
can quote off the notes field without a callback first converts faster than
one who has to call to ask "wait, what are we even quoting?" — this is a
lead-quality lever, not a volume one, and it costs nothing since the data was
already computed.

## CPA — affiliate "where to buy"

Matched to the structure being calculated. Live the moment a tag is set; links
work (unmonetized) before that.

**Wire it live:** set `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` (e.g. `roofhelm-20`)
in Vercel env after joining Amazon Associates. Every Amazon link then carries the
tag automatically.

**Programs to pursue, by attractiveness:**
1. **Amazon Associates** (ship today): roof rakes + heat cable (the December
   "is my roof going to hold?" audience), shed / greenhouse / carport kits.
   Universal, one tag.
2. **VEVOR** affiliate (carports, sheds, canopies) — mid-ticket, decent commission.
   Replace/extend the brand `url` in `lib/offers.ts` with the program deep link.
3. **Palram / Canopia** (greenhouses) and **Wayfair** (sheds) via Impact/CJ.
4. Brand offers are plain real links until you add their tracking URL to the
   registry; nothing else to change.

## CPL — lead capture for quote-based work

Six lead categories as of the roof-calculator-suite expansion: carports (heavy
steel), metal/steel buildings and pole barns (dealers pay $20-100+ per
qualified lead) plus three new ones added with the broader calculator family —
**roof replacement** (the single highest-volume, highest-intent calculator in
the suite per keyword research), **HVAC** (Manual J / system-replacement leads
are a classic high-CPL niche), and **insulation** (whole-attic/spray-foam jobs
are quote-based). The lead carries whatever the calculator computed (design
snow load, or a generic `metricLabel`/`metricValue` pair for the non-snow
tools), so it is pre-qualified.

**Wire it live (pick either or both):**
- **Resend (simplest, recommended to start):** set `RESEND_API_KEY` and
  `LEAD_NOTIFY_EMAIL` (your inbox). Each lead is emailed to you, with `reply_to`
  set to the customer so you can reply straight back. `LEAD_FROM_EMAIL` is
  optional; it defaults to Resend's `onboarding@resend.dev` test sender, which
  only delivers to your own Resend account email until you verify a domain.
- **Webhook:** set `LEAD_WEBHOOK_URL` to any endpoint that accepts a JSON POST
  (Zapier/Make/n8n catch hook, Formspree, Apps Script, or a supplier intake),
  to pipe leads into a CRM or sheet.

The route delivers to every configured sink and succeeds if at least one
accepts. It forwards and forgets (no DB, no PII at rest). Until a sink is set,
the form shows an honest early-access message and a mailto fallback (no fake
success).

**Resend setup steps:** create a Resend account → API Keys → create key (starts
`re_...`) → set `RESEND_API_KEY` + `LEAD_NOTIFY_EMAIL` in Vercel env. To send
from your own domain (better deliverability, any recipient), add the domain in
Resend, set the DNS records it gives you, then set `LEAD_FROM_EMAIL` to e.g.
`RoofHelm <leads@yourdomain.com>`.

**Lead payload** (POSTed to the webhook):
`source, receivedAt, name, email, phone, structure, structureLabel, state, zip,
size, timeframe, designLoadPsf, groundSnowPsf, metricLabel, metricValue, notes`.
`metricLabel`/`metricValue` carry the non-snow tools' computed result (e.g.
`"Max span"` / `"13.6 ft"`); `notes` is prefilled with the full result
sentence for richer context (see "Lead quality" above) but stays user-editable.

**Buyers to approach:** regional steel-building / carport dealers, post-frame
(pole barn) manufacturers, local roofing contractors (roof-replacement leads),
HVAC contractors (Manual J / system-replacement leads), insulation contractors
(spray-foam / whole-attic leads), or a building-leads network. Start with one
dealer or a Zapier-to-Sheet pipe per category to prove lead quality before
signing a CPL contract.

## Higher-ACV next engines (not built here)
- Stamped-letter handoff: free calc -> licensed PE seals a snow-load letter
  ($149-399). Turns the disclaimer into the product.
- Embeddable white-label calculator for manufacturers ($/mo, year-round).

## Guardrails
- The calculator stays free and ungated; offers never block the result.
- No fabricated prices, ratings or stock (they go stale = dummy data).
- FTC disclosure shown wherever offers render (`DISCLOSURE` in `lib/offers.ts`).
- Affiliate links use `rel="sponsored nofollow noopener noreferrer"`.
