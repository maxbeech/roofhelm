import type { Metadata } from "next";
import CheckoutButton from "@/components/CheckoutButton";
import { PageHeader } from "@/components/ui";

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

// Read at build time: when Stripe is not wired the Pro card shows an honest
// early-access affordance instead of a dead-end purchase button.
const PRO_ENABLED = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

// 1-week ISR (see app/page.tsx for the reasoning). Pricing itself doesn't
// change without a redeploy (PRO_ENABLED is read from env at build time
// anyway), so this is purely the consistent policy, not a functional need.
export const revalidate = 604800;

function Check() {
  return <svg width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0 stroke-frost-500" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
}

export default function Pricing() {
  return (
    <div>
      <PageHeader eyebrow="Pricing" title="Simple, honest pricing" width="max-w-5xl">
        The calculator is free forever. When you need to hand a clean, defensible snow load calculation to a
        plan reviewer or a client, the Pro report packages it as a PDF.
      </PageHeader>
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
          <div className="mt-6"><CheckoutButton enabled={PRO_ENABLED} /></div>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            A RoofHelm report is a calculation aid, not a stamped engineering document. For a permit,
            have a licensed engineer review it and confirm the unbalanced, drift and sliding cases.
          </p>
        </div>
      </div>
    </div>
  );
}
