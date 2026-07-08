"use client";

// The "where to buy / next step" block that renders under a calculator result.
// It is the CPA + CPL surface: contextual supplier suggestions matched to the
// structure being calculated, plus a quote CTA for big-ticket structures. All
// offer data and URL building comes from lib/offers.ts (single source of truth);
// this component is purely presentational and on-brand (frost accent, ruled
// frames). It never invents prices or ratings: it ties every suggestion back to
// the computed result the user is looking at. Outbound CPA links carry UTM
// tracking per category (see lib/offers.ts offerUrl) so click-through is
// measurable per calculator once analytics/affiliate dashboards are checked.

import Link from "next/link";
import {
  type OfferCategory,
  DISCLOSURE,
  getOffers,
  isLeadCategory,
  offerUrl,
} from "@/lib/offers";

function ArrowOut() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export default function SupplierModule({
  category,
  contextLine,
  quoteQuery,
}: {
  category: OfferCategory;
  contextLine: React.ReactNode;
  quoteQuery?: Record<string, string | number>;
}) {
  const cat = getOffers(category);
  const showLead = isLeadCategory(category);
  // Carry the engineering context into the quote form so the lead is already
  // qualified: structure plus whatever computed values this calculator has.
  const qs = new URLSearchParams({ structure: category });
  for (const [k, v] of Object.entries(quoteQuery ?? {})) qs.set(k, String(v));
  const quoteHref = `/quote?${qs.toString()}`;

  return (
    <section className="border border-ink-300 bg-paper print:hidden" aria-label="Where to buy and get quotes">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2">
        <span className="label text-frost-600">Next step</span>
        <span className="border border-ink-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">Suppliers</span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">{cat.heading}</h3>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-600">
          {contextLine} {cat.intro}
        </p>

        {/* CPL: the quote CTA for quote-based, big-ticket structures. */}
        {showLead && (
          <Link
            href={quoteHref}
            className="mt-4 flex items-center justify-between gap-3 border-2 border-ink-900 bg-ink-900 px-4 py-3 text-paper transition hover:bg-ink-700"
          >
            <span>
              <span className="block text-[13px] font-semibold uppercase tracking-[0.1em]">{cat.leadPitch}</span>
              <span className="mt-0.5 block text-xs text-paper/70">Free, no obligation. We pass your numbers to suppliers so quotes come back accurate.</span>
            </span>
            <span aria-hidden className="text-lg">&rarr;</span>
          </Link>
        )}

        {/* CPA: curated, real supplier suggestions. */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {cat.offers.map((offer) => (
            <a
              key={offer.label}
              href={offerUrl(offer, category)}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="group flex flex-col border border-ink-200 bg-paper p-3.5 transition hover:border-frost-500"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-900">{offer.label}</span>
                {offer.brand && (
                  <span className="shrink-0 border border-ink-200 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-400">{offer.brand}</span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{offer.blurb}</p>
              <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-frost-700 group-hover:underline underline-offset-4">
                {offer.cta}
                <ArrowOut />
              </span>
            </a>
          ))}
        </div>

        <p className="mt-3.5 border-t border-ink-100 pt-3 text-[11px] leading-relaxed text-ink-400">{DISCLOSURE}</p>
      </div>
    </section>
  );
}
