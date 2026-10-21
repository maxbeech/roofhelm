// Runtime switch for the Pro report, and the few constants the buy flow shares.
//
// Everything here reads process.env when it is CALLED, never at module load.
// The pricing page used to read these once at import time, so on a statically
// built page the answer was frozen at `next build`. If the Stripe variables
// were not in the build environment the page said "not on sale" for up to a
// week even though production had the keys. Keep it a function.
import { SITE } from "./site";

type Env = Record<string, string | undefined>;

/** True when the server holds what it needs to take a payment. */
export function proEnabled(env: Env = process.env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_PRICE_ID?.trim());
}

/** The price this product sells. Empty string when unset, which never matches a real price id. */
export function proPriceId(env: Env = process.env): string {
  return env.STRIPE_PRICE_ID?.trim() ?? "";
}

/** The one sentence shown wherever the buy button would be when checkout is off. */
export const NOT_ON_SALE = "Checkout is not switched on yet, so the Pro report can't be bought today.";

/** Origin used in links we send out (email, reproduce-in-calculator). */
export function siteBase(env: Env = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL ?? SITE.url).replace(/\/+$/, "");
}

/** Metadata value that marks a Checkout Session as a Pro snow load report. */
export const REPORT_KIND = "snow-load-v1";

/** How long a paid session can fetch its PDF, counted from the payment. */
export const DOWNLOAD_WINDOW_DAYS = 30;

/** Checkout custom field keys for the project header. Stripe wants alphanumeric keys. */
export const FIELD_PROJECT = "projectname";
export const FIELD_SITE = "siteaddress";
