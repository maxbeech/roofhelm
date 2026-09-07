# Changelog

## 2026-07-10 — Blog rebuilt: featured images, longer guides, 12 new posts

Reworked the blog from a 24-post, plain-text set into a 36-post library that
meets the full SEO/GEO content brief: featured images, tables, FAQs, TOC and
schema on every post, plus 12 brand-new posts targeting the calculator-suite
keyword plan (`docs/seo_geo_content_plan.md`).

### Added
- `lib/posts/types.ts`: extended `Post` shape (`image`, `author`, `keywords`,
  `takeaways`, `table`, `faqs`, `sources`, `internalLinks`, optional `howTo`/
  `review`) so every post carries the SEO scaffolding the brief requires.
- `lib/posts/content/*.ts`: one file per post (36 total), mirroring the
  `lib/tools/*.ts` one-item-per-file convention, aggregated by
  `lib/posts/index.ts`. Replaces the single `lib/posts.ts`.
- `lib/posts/richtext.ts`: a tiny `[label](href)` inline-link parser (not
  markdown) so post prose can carry real contextual internal/external links
  without adding a markdown dependency.
- `lib/posts/schema.ts`: builds BlogPosting + optional HowTo/Review JSON-LD
  per post; FAQPage schema continues to come from the existing `Faq`
  component.
- `components/BlogPost.tsx`: the new post renderer, featured image with
  photographer credit, key-takeaways box, auto-generated table of contents,
  data table, FAQ, sources list, and per-post related links.
- 12 new posts covering the site's biggest keyword gaps: roof pitch, rafter
  length, rafter vs. truss, truss count, attic insulation R-value, Manual J
  /HVAC load, roof replacement cost, pole barn cost, steel building cost,
  stamped engineering drawings, ASCE 7-22 code adoption, and a review
  comparing free snow load calculators.
- `test/posts.test.mts`: 36 posts x ~15 checks validating every required
  field, word count, and howTo/review consistency; wired into `npm test`.

### Changed
- All 24 existing posts expanded from ~300-500 words to 1,200-2,500 words
  each, with the original ASCE 7-22 facts and figures preserved exactly and
  only depth (worked examples, tables, FAQs) added.
- `app/blog/page.tsx`: card grid now shows a featured-image thumbnail and a
  category pill (Academy/News/Review) per post.
- `next.config.ts`: added `images.pexels.com` to `remotePatterns`. Post
  images render `unoptimized` (Pexels already serves pre-sized, compressed
  JPEGs via its own query params, so re-optimizing through Next's image
  pipeline was redundant and, under concurrent load, occasionally timed out).

### Notes
- Images are real, licensed Pexels photos (photographer credited under each,
  linking back to their Pexels profile), sourced via the Pexels MCP tools.
- Author byline is "RoofHelm Content Team" throughout, consistent with the
  site's existing Organization-level (not personal) authorship; no invented
  named "experts" or fabricated quotes, per the brief's factual-accuracy
  guardrail. Where the brief called for expert quotes, posts instead cite and
  paraphrase real authoritative sources (ASCE, DOE/ENERGY STAR, FEMA, ICC).
- Copy stays American English (not the generically-specified British
  English) to match the existing 24 posts and the site's US-code, US-audience
  subject matter.
- Two posts (pole barn cost, steel building cost) explicitly note that
  RoofHelm has no dedicated calculator for those structures yet, rather than
  claiming a tool that doesn't exist.

## 2026-07-08 — Rebrand to RoofHelm

Brand renamed `RoofCalc` → `RoofHelm` everywhere (package name, page copy, wordmark,
metadata, email/domain constants in `lib/site.ts`). `roofhelm.com` is already
registered by a third party, so the domain/email constants are again placeholders
pending ownership/acquisition or a `NEXT_PUBLIC_SITE_URL` override — same open item
as the prior rebrand, just against a new target domain. GitHub repo and local
project directory renamed from `snowloadcalc` to `roofhelm` to match.

## 2026-06-30 — Real browser E2E verification of the form-field consolidation

Two live Haiku-driven browser passes (not curl) against the refactor below,
closing the gap where it had only been curl-smoke-tested.

### Verified, with actual observed values (not just "it loaded")
- `/drift`: edited all 5 number inputs through the shared `NumberField`;
  peak load result changed 101.1 -> 194.72 psf as values changed, confirming
  the post-refactor component is still wired to state and recomputing live.
- Clamping: entering 500 into the (max 400) ground-snow-load field correctly
  snapped to 400 on blur, not NaN or the raw invalid value.
- `/quote?structure=hvac&...&detail=...`: structure dropdown pre-set to
  "HVAC system", context box showed "Cooling load: 54000 BTU/hr", and the
  notes textarea was pre-filled with the passed `detail` text -- confirms
  the `LeadForm` style-constant refactor didn't break the newer prefill
  feature built on top of it.
- Full lead submission with valid data (name/email/state) against the
  unconfigured dev backend correctly showed the honest early-access message
  ("Supplier matching is launching shortly. Email hello@roofcalc.com...")
  rather than a fake success -- the core "no dummy success states" guarantee
  holds through the refactor.
- `/calculators/roof-pitch-calculator`: live result updates re-confirmed
  (26.6 deg -> 45 deg on a rise change) as an unrelated-but-touched-by-the-
  same-session control.
- Zero console errors across every page visited in both passes.

### Mobile viewport: confirmed genuinely untestable this session, not skipped
Two independent agent attempts, two different approaches (spawning a fresh
mobile-sized instance; resizing the existing tab), both blocked: the
chrome-devtools MCP server (which has a `resize_page` tool) disconnected
mid-session, and the fallback `openhelm_browser` toolset has no viewport
resize/emulate capability and pools/reuses a single 1280x720 browser
instance regardless of how a new one is requested. `window.resizeTo()` is
also blocked by browser security, as expected. This is a tooling
availability gap in this session, not an application bug.

**What you must manually verify before launch**: open
`/calculators/roof-pitch-calculator` (or any of the 7 new tool calculators)
and `/drift` on an actual phone or via real Chrome DevTools device emulation
at ~375px width, and confirm: (1) the sticky mobile result bar appears near
the top, (2) the worksheet/results grid stacks to one column with no
horizontal scroll, (3) every number/select input is tappable and legible,
(4) typing into an input still updates both the sticky bar and the main
result panel. The responsive Tailwind classes (`md:grid-cols-2`,
`md:hidden` on the sticky bar) mirror the already-shipped, already-working
snow-load `Calculator`/`CalcResults` pair byte-for-byte in pattern, so risk
is low, but this has not been visually confirmed by either a human or a
real mobile-viewport browser this session.

## 2026-06-30 — Source-of-truth audit: consolidated duplicate form-field code

Closed a real (pre-existing, not introduced this session) duplication gap an
audit surfaced: two components had their own local copies of the exact
input-styling/clear-and-retype logic that `components/FormFields.tsx` now
canonically owns.

### Audit method
`grep` swept `components/` and `app/` for (a) any file defining its own
`selectCls`/`selectControl`-equivalent style string, (b) any file with a
local `function NumberField`/`function Field`, and (c) any second
offers/brand registry. Found two real hits, zero false structural
duplicates (the matches against `lib/offers.ts` types elsewhere were all
legitimate consumers of the one registry, not copies of it).

### Fixed
- `components/DriftCalculator.tsx` had its own `NumField`/`Field`/`fieldCls`
  (predates this session), functionally identical to `FormFields.tsx`'s
  `NumberField`/`Field`. Replaced with the shared import; verified the
  page still renders its 5 inputs and computes correctly.
- `components/LeadForm.tsx` had its own `field`/`selectField` constants
  (predates this session), byte-identical in value to `FormFields.tsx`'s
  `selectCls`/`selectControl`. Replaced with an aliased import so every
  existing usage site needed zero further changes.
- Net effect: `FormFields.tsx` is now the single source of truth for form
  input styling across all 4 consumers (`Calculator`, `ToolCalculator`,
  `DriftCalculator`, `LeadForm`), not just the 2 added this session.

### Verified
- Generated `.next/server/app/sitemap.xml.body` inspected directly (not
  just the route source): confirmed all 7 new calculator slugs, `/quote`,
  and 86 total URLs present, with `/api/*` correctly absent (0 matches).
- `npm test` (109 checks), `npm run build`, `npm run lint` all pass; live
  smoke test of `/drift` (200, 5 number inputs present) and
  `/quote?structure=hvac` (200) after the refactor.

## 2026-06-30 — Explicit ISR caching policy on every static content page

Addressed a gap from the prior two passes: no page declared a `revalidate`,
so the Vercel-optimization requirement wasn't literally satisfied even though
every page was already maximally cached via plain SSG.

### Added
- `export const revalidate = 604800` (1 week) on every content page:
  `/`, `/blog`, `/blog/[slug]`, `/calculators`, `/calculators/[slug]`,
  `/states`, `/states/[slug]`, `/drift`, `/methodology`, `/pricing`, `/quote`.
  Verified current via Vercel's documentation MCP (Context7 was disconnected
  this session) before writing any of it: Next.js 16's newer `use cache:
  remote`/`cacheLife` (Cache Components) is for caching runtime `fetch()`
  calls to external data; none of these pages fetch anything external (they
  render from in-repo `lib/*.ts` arrays at build time), so the route-segment
  `revalidate` export is the correct, current, applicable API here, not a
  stale pattern superseded by Cache Components.
- One-line "deliberately uncached" notes on `app/api/lead/route.ts` and
  `app/api/checkout/route.ts` explaining why those two stay dynamic (each
  processes a unique mutation per request; caching them would either no-op
  or risk serving a stale honeypot/checkout response).

### Honest caveat, stated rather than hidden
This is currently a no-op in terms of measurable savings: with
`dynamicParams = false` and zero external fetches, these pages already
serve from the CDN edge with zero function invocations between deploys, the
best outcome ISR can offer. The `revalidate` export's value is forward
compatibility (if a content source here ever moves to a runtime fetch, e.g.
a future CMS-backed blog) and explicit, auditable policy compliance, not a
performance fix for a problem that existed. Confirmed via `npm run build`'s
route summary, which now prints `1w / 1y` in the Revalidate/Expire columns
for every static route and leaves `/api/lead` and `/api/checkout` correctly
marked dynamic (ƒ).

## 2026-06-30 — Data-driven CPA/CPL revenue prioritization

Follow-up to the calculator-suite expansion below: turned "extend monetization
to the new categories" into an actual revenue strategy, not just plumbing.

### Added
- `CategoryOffers.priority` + `leadValueRange` (`lib/offers.ts`): every CPL
  category ranked by (feeding calculator's real search volume) x (typical
  industry $/lead, labeled as a range, not a fabricated precise figure).
  `CPL_CATEGORIES` now sorts by this rank instead of declaration order, so the
  lead-form dropdown surfaces `hvac` and `roof-replacement` first; they rank
  highest by volume x value per the keyword research. Internal-only data:
  never rendered to the homeowner-facing UI.
- UTM tracking on every outbound CPA link (`offerUrl()`): `utm_source=roofcalc`,
  `utm_medium=affiliate|referral`, `utm_campaign=<category>`. Makes
  click-through measurable per calculator once an analytics/affiliate
  dashboard is checked, the prerequisite for re-prioritizing with real data
  instead of the search-volume proxy.
- Richer lead context: `ToolCalculator` now prefills the lead's `notes` field
  with the full computed result sentence (not just the bare number), via a
  `detail` query param threaded through `QuoteFormSection` -> `LeadForm`. A
  buyer can quote off the notes without a qualifying callback first.
- `docs/monetization.md`: new "Revenue prioritization" section with the
  ranked table, the reasoning, and a flagged gap (`pole-barn` has no
  dedicated calculator yet, so it can't generate its own organic leads).
- `test/offers.test.mts`: priority/leadValueRange coverage, sort-order
  assertion, and UTM param assertions (10 new checks).

### Fixed
- `SupplierModule`'s CPL CTA copy said "we pass your snow load to suppliers"
  unconditionally, which was nonsensical on the new HVAC/insulation/roof-cost
  categories (no snow load involved). Generalized to "we pass your numbers."

## 2026-06-30 — Rebrand to RoofCalc + the wider calculator suite (pitch, framing, insulation, HVAC, cost)

Keyword research (Google Ads Keyword Planner, US) found the single biggest
adjacent opportunity is roof geometry: "roof pitch calculator" and its
variants run ~22,200/mo each, 100% low competition — about 14x the volume of
"snow load calculator." Insulation/HVAC calculators add another ~42,000/mo,
75% low competition, and solve the snow tool's December-only seasonality.
Roof replacement cost is the highest-intent page in the suite for CPL.

### Added
- `lib/calc-engine.ts`: generic `ToolDef` type (fields, `compute()`, result
  fields, notes, FAQs) — the non-snow-load counterpart to `lib/roof-types.ts`,
  so every new calculator is a data file, not a new page or component.
- `lib/tools/{pitch,rafter,truss,joist,insulation,hvac,roof-cost}.ts`: seven
  new calculators with real formulas (pitch/rafter geometry is exact
  trigonometry; joist span uses real bending + deflection mechanics with
  editable Fb/E; insulation uses published R-per-inch figures; HVAC is an
  explicitly-disclaimed quick BTU/sq ft estimate, not a Manual J substitute;
  roof cost uses national-average $/sq ft ranges, shown as a range not a
  fabricated precise number). `lib/tools/index.ts` is the registry.
- `components/ToolCalculator.tsx`: one generic worksheet + results UI that
  renders any `ToolDef` (mirrors `Calculator.tsx` + `CalcResults.tsx` for the
  snow engine, generalized).
- `components/FormFields.tsx`: extracted `Field`/`NumberField`/`SelectField`
  out of `Calculator.tsx` so both calculator families share one source of
  truth for input styling and editing behavior.
- Four new `lib/offers.ts` categories: `lumber` (CPA only — framing
  hardware), `insulation`, `hvac` and `roof-replacement` (all three CPL —
  contractor quotes), extending the monetization registry to the new
  verticals without touching the existing snow-load categories.
- `app/calculators/[slug]/page.tsx` now dispatches on slug: known
  `ROOF_TYPES` render the existing snow flow unchanged; known `TOOLS` render
  the new generic tool flow. One URL namespace, two engines.
- `test/tools.test.mts`: hand-checked formula assertions for all seven new
  calculators (pitch trig, rafter length + board rounding, truss fencepost
  count, joist bending/deflection spans, insulation R-value, HVAC BTU
  multiplier chain, roof cost range math).

### Changed (generalized, not rewritten, to avoid regressing the tested snow flow)
- `components/SupplierModule.tsx`: `designLoad`/`pg` props replaced with a
  generic `contextLine`/`quoteQuery`; the snow-load call site in
  `CalcResults.tsx` composes the exact same sentence as before, so behavior
  is unchanged there.
- `components/LeadForm.tsx` / `QuoteFormSection.tsx` / `app/api/lead/route.ts`:
  added optional generic `metricLabel`/`metricValue` alongside the existing
  `designLoad`/`groundSnow`, so non-snow leads (e.g. "Estimated cooling load:
  36,000 BTU/hr") show correctly labeled context instead of a mislabeled
  "psf" box.
- `app/sitemap.ts`, `app/calculators/page.tsx`, `app/page.tsx`, footer/nav in
  `app/layout.tsx`: extended to include and link the new calculators.
- Brand renamed `SnowLoadCalc` → `RoofCalc` everywhere (package name, page
  titles, copy, OG image, emails). Domain/email in `lib/site.ts` and the API
  routes are placeholders (`roofcalc.com` / `hello@roofcalc.com`) pending
  actual domain registration — flagged in README.

## 2026-06-30 — Resend email sink for leads

- `app/api/lead/route.ts` now delivers leads via **Resend** email
  (`RESEND_API_KEY` + `LEAD_NOTIFY_EMAIL`, optional `LEAD_FROM_EMAIL`) in
  addition to the webhook. It posts to every configured sink and succeeds if at
  least one accepts; with none configured it still returns the honest
  early-access state. The email sets `reply_to` to the customer and HTML-escapes
  all user input. Verified live against the Resend HTTP API spec (Context7).
- README env table and `docs/monetization.md` updated with the Resend setup runbook.

## 2026-06-29 — CPA + CPL monetization around the free calculator

Added the two revenue mechanics that sit around the free tool (the calculator
itself stays free and ungated), keeping the DIY/homeowner persona.

### Added
- `lib/offers.ts`: single source of truth for both mechanics. Curated, real
  supplier offers per structure category, structure-to-category mapping, CPL
  eligibility, the FTC disclosure, and the affiliate URL builder. The Amazon
  Associates tag is read from `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` at call time and
  injected into Amazon links; links work (unmonetized) until the tag is set.
- `components/SupplierModule.tsx`: the on-brand "Next step / Suppliers" block
  under every calculator result. Shows supplier suggestions matched to the
  structure and ties them to the computed design load. Renders a quote CTA for
  quote-based structures. Hidden in print.
- CPL lead flow: `components/LeadForm.tsx`, `components/QuoteFormSection.tsx`,
  the static `/quote` page, and the `app/api/lead/route.ts` intake. A lead
  carries the computed design load so suppliers can quote a sized structure.
- `test/offers.test.mts`: 30 checks over the registry, mapping, CPL eligibility,
  disclosure and the URL builder (tagged and untagged paths).
- `docs/monetization.md`: how to wire the affiliate tag and lead webhook live,
  and which CPA/CPL programs to pursue.

### Behaviour / honesty
- No fabricated data: no fake prices, ratings or stock. Offers link to real
  category and search pages; the user verifies the rated load against the result.
- Honest states, mirroring the Stripe checkout: when `LEAD_WEBHOOK_URL` is not
  configured (or a forward fails), the lead form shows an explicit message and a
  mailto fallback rather than a fake "submitted" success.
- `/quote` prerenders static (calculator context is read client-side from the
  URL), so it serves from cache; only `/api/lead` runs as a function.

### Changed
- `Calculator` / `CalcResults` take an optional `offerSlug` to pick the offer
  category; the per-structure pages pass their slug. Homepage and state pages
  fall back to the roof-mitigation set.
- `app/sitemap.ts` includes `/quote`.
