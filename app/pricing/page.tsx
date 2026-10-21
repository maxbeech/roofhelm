import type { Metadata } from "next";
import Link from "next/link";
import CheckoutButton from "@/components/CheckoutButton";
import PurchaseTracker from "@/components/PurchaseTracker";
import { PageHeader } from "@/components/ui";
import { DOWNLOAD_WINDOW_DAYS, proEnabled } from "@/lib/pro-config";
import { FAILURE, loadPurchase } from "@/lib/pro-fulfilment";
import { REPORT_DISCLAIMER, SHAPE_LABEL } from "@/lib/pro-report";
import { computeSnow } from "@/lib/snow";
import { encodeInputs, parseStrictInputs } from "@/lib/snow-url";

export const metadata: Metadata = {
  title: "Pro: Permit-Ready Snow Load Report",
  description: "Generate a permit-ready ASCE 7-22 snow load report PDF for your project: every factor, the governing load case and a clean summary for plan review. $29 one-time.",
  alternates: { canonical: "/pricing" },
};

const FREE = [
  "Full ASCE 7-22 roof snow load calculator",
  "Flat, sloped, minimum and rain-on-snow cases",
  "§7.6.1 unbalanced load and the §7.7 drift calculator",
  "Every roof type and all 50 states",
  "Shareable, bookmarkable result links",
];
const PRO = [
  "Everything in the free calculator",
  "Permit-ready PDF report with all inputs and factors",
  "Governing load case stated with its code references",
  "Project and site fields for the plan-review submittal",
  "Drift and sliding-load checklist for your reviewer",
];

// Rendered per request, on purpose. Whether the buy button shows depends on the
// server's Stripe variables, and a statically built page freezes that answer at
// `next build` (or until a week-long revalidate lapses). The page is light, with
// no data fetch on the normal path, so rendering it each time costs almost
// nothing, and it can read the buyer's numbers (?pg=...) and the Checkout return
// (?status=success&session_id=...) on first paint. Calculators, state pages and
// the blog stay static.
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function Check() {
  return <svg width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0 stroke-frost-500" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
}

export default async function Pricing({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const enabled = proEnabled(); // read now, on this request
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined) qs.set(k, one);
  }

  // The buyer's calculator numbers, if they came from the calculator. All keys or nothing.
  const inputs = parseStrictInputs(qs.toString());
  const calc = inputs ? encodeInputs(inputs) : null;
  const yours = inputs ? computeSnow(inputs) : null;

  // Back from Stripe Checkout: confirm the payment with Stripe before showing anything.
  const sessionId = qs.get("session_id");
  const returned = qs.get("status") === "success" ? await loadPurchase(sessionId ?? "") : null;

  return (
    <div>
      <PurchaseTracker />
      <PageHeader eyebrow="Pricing" title="Simple, honest pricing" width="max-w-5xl">
        The calculator is free forever. When you need to hand a clean, defensible snow load calculation to a
        plan reviewer or a client, the Pro report packages it as a PDF.
      </PageHeader>
      {returned && (
        <section aria-live="polite" className="mx-auto mt-10 max-w-5xl px-6">
          <div className={`border-2 p-6 ${returned.ok ? "border-frost-600 bg-frost-50/50" : "border-load-300 bg-load-50"}`}>
            {returned.ok ? (
              <>
                <h2 className="font-display text-2xl font-semibold text-ink-900">Payment confirmed</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Your report is ready. This link works for {DOWNLOAD_WINDOW_DAYS} days.
                </p>
                <a href={`/api/report?session_id=${encodeURIComponent(returned.purchase.sessionId)}`} download
                  className="mt-4 inline-block bg-ink-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-ink-700">
                  Download the PDF
                </a>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-ink-700">{FAILURE[returned.reason].message}</p>
            )}
          </div>
        </section>
      )}
      <div className="mx-auto grid max-w-5xl gap-5 px-6 py-12 md:grid-cols-2">
        <div className="border border-ink-300 bg-paper p-7">
          <div className="label text-ink-400">The free edition</div>
          <div className="tabular mt-2 font-display text-5xl font-semibold text-ink-900">$0</div>
          <ul className="mt-6 space-y-3 border-t border-ink-200 pt-5 text-sm text-ink-600">
            {FREE.map((f) => <li key={f} className="flex gap-2.5"><Check />{f}</li>)}
          </ul>
        </div>

        <div className="relative border-2 border-ink-900 bg-paper p-7">
          <div className="flex items-center justify-between">
            <div className="label text-frost-600">The Pro offprint</div>
            <span className="border border-ink-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">PDF</span>
          </div>
          <div className="tabular mt-2 font-display text-5xl font-semibold text-ink-900">$29<span className="font-sans text-base font-medium text-ink-400"> one-time</span></div>
          <ul className="mt-6 space-y-3 border-t border-ink-200 pt-5 text-sm text-ink-600">
            {PRO.map((f) => <li key={f} className="flex gap-2.5"><Check />{f}</li>)}
          </ul>
          {enabled && inputs && yours && (
            <p className="mt-6 border border-ink-200 bg-frost-50/40 p-3 text-sm leading-relaxed text-ink-600">
              Your roof: {SHAPE_LABEL[inputs.shape].toLowerCase()}, {inputs.slopeDeg} degrees, ground snow load {inputs.pg} psf.
              Design load <span className="tabular font-semibold text-ink-900">{yours.design} psf</span>.{" "}
              <Link href={`/?${calc}#calculator`} className="font-semibold text-frost-700 underline-offset-4 hover:underline">Change my numbers</Link>
            </p>
          )}
          <div className="mt-6"><CheckoutButton enabled={enabled} calc={enabled ? calc : null} /></div>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">{REPORT_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
