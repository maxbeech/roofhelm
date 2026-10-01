// Reads a Stripe Checkout Session object and says whether money was taken.
// Kept pure so the purchase event can be tested without calling Stripe.

export interface PaidSession {
  paid: boolean;
  transactionId: string;
  currency: string;
  value: number;
}

export const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{8,200}$/;

export function parseSession(session: unknown): PaidSession | null {
  if (!session || typeof session !== "object") return null;
  const s = session as Record<string, unknown>;
  if (typeof s.id !== "string") return null;
  const cents = typeof s.amount_total === "number" ? s.amount_total : null;
  const currency = typeof s.currency === "string" ? s.currency.toUpperCase() : "";
  return {
    paid: s.payment_status === "paid" && cents !== null && currency !== "",
    transactionId: s.id,
    currency,
    value: cents === null ? 0 : cents / 100,
  };
}
