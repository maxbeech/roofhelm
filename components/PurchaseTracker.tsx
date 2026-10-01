"use client";

// Fires the funnel events for the return from Stripe Checkout. The success URL
// carries the Checkout Session id; the server confirms it was paid before
// `purchase` is sent, and each session is reported once per browser.
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics-events";
import type { PaidSession } from "@/lib/checkout-session";

function seen(id: string): boolean {
  try {
    const key = `oh_purchase_${id}`;
    if (window.sessionStorage.getItem(key)) return true;
    window.sessionStorage.setItem(key, "1");
  } catch { /* storage blocked: accept a possible duplicate over a lost sale */ }
  return false;
}

function Inner() {
  const sp = useSearchParams();
  const status = sp.get("status");
  const sessionId = sp.get("session_id");

  useEffect(() => {
    if (status === "cancel") { trackEvent("checkout_cancelled", {}); return; }
    if (status !== "success" || !sessionId || seen(sessionId)) return;
    let live = true;
    fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<PaidSession>) : null))
      .then((s) => {
        if (!live) return;
        if (!s) { trackEvent("purchase_failed", { reason: "verify_failed" }); return; }
        if (!s.paid) { trackEvent("purchase_failed", { reason: "not_paid" }); return; }
        trackEvent("purchase", { transaction_id: s.transactionId, currency: s.currency, value: s.value });
      })
      .catch(() => { if (live) trackEvent("purchase_failed", { reason: "verify_failed" }); });
    return () => { live = false; };
  }, [status, sessionId]);

  return null;
}

export default function PurchaseTracker() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
