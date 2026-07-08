"use client";

import { useState } from "react";

// Pro checkout. The pricing page (a Server Component) passes `enabled`, computed
// from whether the Stripe env vars are configured at build time. When Stripe is
// not wired yet we render an honest "early access" affordance instead of a
// misleading purchase button that would dead-end in a "coming soon" message.
export default function CheckoutButton({ enabled = false, className }: { enabled?: boolean; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="border border-ink-300 bg-frost-50/40 p-4 text-sm">
        <p className="font-semibold text-ink-800">Pro offprints are in press.</p>
        <a href="mailto:hello@roofhelm.com?subject=RoofHelm%20Pro%20early%20access"
          className="mt-1 inline-flex items-center gap-1 font-semibold text-frost-700 underline-offset-4 hover:underline">
          Email us for early access
          <span aria-hidden>&rarr;</span>
        </a>
      </div>
    );
  }

  async function go() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.message ?? "Checkout is not available yet. Please check back soon.");
    } catch {
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={go} disabled={loading}
        className={className ?? "w-full bg-ink-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-paper transition hover:bg-ink-700 disabled:opacity-60"}>
        {loading ? "Starting checkout" : "Get the Pro offprint · $29"}
      </button>
      {error && <p className="mt-2 text-sm text-load-700">{error}</p>}
    </div>
  );
}
