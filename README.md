# RoofHelm

Free **roof calculator suite**: ASCE 7-22 snow load by roof type, roof pitch, rafter
length, truss count, joist span, insulation R-value, HVAC load and a roof replacement
cost estimate, with every factor shown.

Live: https://roofhelm.com *(pending DNS cutover; see "Rebrand" below)*

## What it does

### Snow load (the original engine)
- **Roof snow load** using `Pf = 0.7·Ce·Ct·Is·Pg` (Eq. 7.3-1), sloped load `Ps = Cs·Pf`,
  the §7.3.4 minimum load and the §7.10 rain-on-snow surcharge.
- **Unbalanced load (§7.6.1)** for hip and gable roofs in the 2.38° to 30.2° band:
  windward `0.3·Ps`, leeward `Ps` plus a ridge drift surcharge `hd·γ/√S` (W > 20 ft) or the
  simple `Is·Pg` uniform case (W ≤ 20 ft).
- **Live roof-section diagram** that draws the roof at its real slope and the snow
  blanket sized to the load, with a toggle to the §7.6.1 leeward-drift profile.
- **Per-roof-type calculators** for flat, pitched/gable, metal building, carport,
  shed/monoslope, gambrel, greenhouse, and a ground-to-roof converter.
- **Ground snow load by state**, **snow drift calculator** (§7.7).

### The wider calculator suite (added in the RoofHelm expansion)
- **Roof geometry & framing**: roof pitch (rise/run → angle/slope %/roof factor),
  rafter length (run + pitch + overhang → board length), roof truss count (length +
  spacing → truss count), and joist span (real bending + deflection mechanics with
  editable species design values).
- **Insulation & HVAC**: insulation R-value (type + thickness, compared against
  DOE climate-zone targets) and a quick HVAC cooling-load estimate (explicitly *not*
  a Manual J substitute, with a lead-gen path to a real assessment).
- **Cost**: a roof replacement cost estimator using national-average $/sq ft ranges
  by material.

Every new calculator is a `ToolDef` record in `lib/tools/*.ts` (see
`lib/calc-engine.ts` for the shape) rendered by one generic component,
`components/ToolCalculator.tsx` — adding a calculator is data, not a new page.
- **Print or Save-as-PDF** of any result; shareable result URLs; breadcrumbs and JSON-LD.
- **Methodology** page citing every snow-load equation, factor and table.

## Design

The site is set as a published engineering monograph: warm ivory paper, warm ink, a
serif display face (Fraunces) over Inter and JetBrains Mono, hairline rules, numbered
sections (§01…) and figures (Fig. 1, Plate I), drop caps and a colophon. One cold accent
(a deep petrol "marine") carries links, figure numbers and the snow data; one warm accent
(brick) is reserved for load and drift warnings. Two recurring motifs: a **topographic
contour field** (`components/Contours.tsx`, echoing ASCE ground-snow maps) and the
**roof-section drawing**, set as a cool figure-plate on the warm page. The header is a
masthead; inner pages share a contour-washed `PageHeader`. A small, dependency-free motion
layer (`components/motion.tsx`: scroll reveals, count-ups, the diagram drawing itself in)
is fully gated behind `prefers-reduced-motion`. Tokens live in `app/globals.css`; shared
primitives in `components/ui.tsx`, `components/FormFields.tsx` and `components/Brand.tsx`,
so the whole tree re-skins from one place.

## Stack

Next.js 16 (App Router) + React 19 + Tailwind CSS 4. Pure client-side engines
(`lib/snow.ts`, `lib/drift.ts`, `lib/unbalanced.ts`, `lib/diagram.ts`, `lib/tools/*.ts`)
with no database. Every calculator page is fully static (`generateStaticParams` +
`dynamicParams = false`), so calculator traffic costs zero Vercel function invocations —
only `/api/lead` and `/api/checkout` run as functions, and only on a form submit. The Pro
report tier uses an env-gated Stripe Checkout that degrades gracefully when keys are absent.

## Monetization (CPA + CPL)

The calculators stay free and ungated; two revenue mechanics sit around them, both
keyed off a single source of truth (`lib/offers.ts`). See `docs/monetization.md`
for the full plan and which programs to pursue.

- **CPA (affiliate):** `components/SupplierModule.tsx` renders contextual, real
  "where to buy" suggestions under every result, matched to the structure/calculator
  and tied to the computed result. No fabricated prices or stock.
- **CPL (lead capture):** the static `/quote` page plus `app/api/lead/route.ts`
  capture a pre-qualified quote request that carries the calculator's computed
  result, for ten categories: steel buildings, carports, pole barns, **roof
  replacement, HVAC and insulation** (the three categories added with the wider
  calculator suite — roof replacement in particular is the single highest-intent
  page in the whole site by search volume).

Environment variables (all optional; each feature degrades to an honest state):

| Var | Effect when set |
| --- | --- |
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Injects the Amazon Associates tag into affiliate links (CPA goes live) |
| `RESEND_API_KEY` + `LEAD_NOTIFY_EMAIL` | Emails each lead to your inbox via Resend (CPL goes live) |
| `LEAD_FROM_EMAIL` | Optional Resend sender; defaults to `onboarding@resend.dev` (test sender) |
| `LEAD_WEBHOOK_URL` | Alternative/additional CPL sink: POSTs each lead as JSON to a webhook |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` | Enables the Pro report Stripe Checkout |
| `NEXT_PUBLIC_SITE_URL` | Overrides the Stripe success/cancel base URL (defaults to the placeholder Vercel URL in `lib/site.ts`) |

`/api/lead` delivers to every configured sink (Resend and/or webhook) and
succeeds if at least one accepts the lead; with none configured it returns an
explicit early-access state.

## Rebrand (SnowLoadCalc → RoofCalc → RoofHelm)

The brand name, wordmark, page copy, package name and email/domain were all updated
to RoofHelm. **Two things still need a real action before launch, which this codebase
cannot do on its own:**

1. **Domain.** `lib/site.ts` points `SITE.domain`/`SITE.url` at `roofhelm.com` (it
   drives every canonical tag, OG tag and the sitemap). That domain is already
   registered by a third party — confirm ownership/acquisition or point
   `NEXT_PUBLIC_SITE_URL` at whatever domain you actually control before go-live.
2. **Email.** `hello@roofhelm.com` appears as the contact/fallback address in
   several places (checkout, lead route, methodology CTA). Set up that mailbox
   (or forward it) once the domain is live, or replace it with a real address you
   already control.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine + URL + drift + unbalanced + diagram + offers + tools + copy-style
npm run build
```

`npm test` includes a copy-style guard that fails the build if an em dash appears
anywhere in `app`, `components` or `lib`, keeping the writing free of that tell.

## Accuracy and disclaimer

The snow engine is validated against hand-computed ASCE 7-22 values (see `test/snow.test.mts`).
RoofHelm computes the **balanced** snow load plus minimum and rain-on-snow, the
**§7.6.1 unbalanced** case for hip and gable roofs, and a separate §7.7 drift surcharge.
It does not yet resolve sliding snow (§7.9), partial loading (§7.5) or the
monoslope/sawtooth unbalanced cases (§7.6.2 and §7.6.3).

The wider calculator suite is built the same way: real formulas, every input shown,
explicit disclaimers where a result is a planning estimate rather than a code-table
or contractor-grade number (see each calculator's "Read before you build" callout —
most pointedly the joist span calculator, which is an engineering-mechanics estimate
using editable species values, not a substitute for the IRC/IBC span tables, and the
HVAC load calculator, which is a quick BTU/sq ft planning number, not a Manual J).

All of it must still be checked by a licensed engineer or contractor before you build,
submit for permit, or buy equipment. Always confirm the governing ground snow load,
local code span tables, and current material/labor costs for your exact site.
