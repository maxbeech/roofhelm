"use client";

import { useState } from "react";
import Link from "next/link";
import { PRO_PRICE, trackEvent } from "@/lib/analytics-events";
import { NOT_ON_SALE } from "@/lib/pro-config";

const BUTTON =
  "block w-full bg-ink-900 px-5 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-ink-700 disabled:opacity-60";

// Pro checkout. The pricing page (a Server Component rendered per request)
// decides the state from the server's Stripe configuration and the numbers in
// the URL, so what you see on first paint is already correct:
//   - `enabled` false: checkout is off, one plain sentence, no button.
//   - enabled, no `calc`: the report is built from the buyer's calculator
//     numbers, so the button sends them to the calculator first. Selling a
//     report on default inputs the buyer never chose would be worse than a detour.
//   - enabled with `calc` (the encoded calculator inputs): the buy button.
export default function CheckoutButton({ enabled = false, calc = null, className }: { enabled?: boolean; calc?: string | null; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="border border-ink-300 bg-frost-50/40 p-4 text-sm">
        <p className="font-semibold text-ink-800">{NOT_ON_SALE}</p>
      </div>
    );
  }

  if (!calc) {
    return (
      <div>
        <Link href="/#calculator" className={className ?? BUTTON}>Start with your roof numbers</Link>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          The report is built from your calculator inputs. Run them first, then choose the Pro report on your result.
        </p>
      </div>
    );
  }

  async function go() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calc }),
      });
      const data = await res.json();
      if (data.url) { trackEvent("begin_checkout", PRO_PRICE); window.location.href = data.url; return; }
      trackEvent("begin_checkout_failed", { reason: res.ok ? "not_live" : "stripe_error" });
      setError(data.message ?? "Checkout is not available yet. Please check back soon.");
    } catch {
      trackEvent("begin_checkout_failed", { reason: "network" });
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={go} disabled={loading} className={className ?? BUTTON}>
        {loading ? "Starting checkout" : "Get the Pro offprint · $29"}
      </button>
      {error && <p className="mt-2 text-sm text-load-700">{error}</p>}
    </div>
  );
}
