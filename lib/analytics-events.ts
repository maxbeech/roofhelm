// Typed events for OpenHelm's user journeys (acquisition, quote, upgrade).
// RoofHelm has no accounts, so there is no user id to hash: oh_user_ref and
// oh_plan are not set, and "paid" is decided by a verified Stripe payment.
// Every event goes through track(), which is a no-op unless the GA measurement
// id is set, so nothing fires where the gtag script does not load.
import { track } from "./openhelm-analytics";

export type AnalyticsEvents = {
  /** First change a visitor makes to any calculator on a page view. */
  calculator_used: { tool: string };
  /** Quote request accepted by a delivery sink. */
  generate_lead: { structure: string };
  generate_lead_failed: { reason: "invalid" | "not_live" | "delivery_failed" | "network" };
  /** Stripe returned a checkout URL and the visitor is being sent to it. */
  begin_checkout: { currency: string; value: number };
  begin_checkout_failed: { reason: "not_live" | "stripe_error" | "network" };
  /** Stripe confirmed the session is paid. */
  purchase: { transaction_id: string; currency: string; value: number };
  purchase_failed: { reason: "not_paid" | "verify_failed" };
  checkout_cancelled: Record<string, never>;
};

export function trackEvent<K extends keyof AnalyticsEvents>(name: K, params: AnalyticsEvents[K]): boolean {
  return track(name, params);
}

/** Price shown on the pricing page, in USD. Sent with begin_checkout. */
export const PRO_PRICE = { currency: "USD", value: 29 } as const;
