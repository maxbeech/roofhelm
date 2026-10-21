import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";
import { captureServerError, captureServerMessage, logServer } from "@/lib/observability";
import { FIELD_PROJECT, FIELD_SITE, NOT_ON_SALE, REPORT_KIND } from "@/lib/pro-config";
import { encodeInputs, parseStrictInputs } from "@/lib/snow-url";

// Stripe Checkout for the one-time $29 Pro report. Keys are Helm7 variables
// on the product (STRIPE_SECRET_KEY, STRIPE_PRICE_ID). When absent (e.g. before the
// Stripe account is wired) the endpoint degrades gracefully: the Pro tier says
// plainly that checkout is off via the `message` field instead of throwing a 500.
// Deliberately uncached, same reasoning as app/api/lead/route.ts: this
// creates a unique Stripe session per request and must never serve a stale
// checkout URL.
//
// The report is built from the buyer's calculator inputs, so the request must
// carry them ({ calc: "<encoded inputs>" }, the same string the calculator puts
// in its share URL). They are re-validated here, never trusted, and stored in
// the session metadata, which is where fulfilment reads them back.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url;

  if (!secret || !price) {
    return NextResponse.json({ message: NOT_ON_SALE }, { status: 200 });
  }

  let calc: ReturnType<typeof parseStrictInputs> = null;
  try {
    const body = (await req.json()) as { calc?: unknown };
    if (typeof body.calc === "string") calc = parseStrictInputs(body.calc);
  } catch {
    // Falls through to the same answer as a missing calculation.
  }
  if (!calc) {
    return NextResponse.json(
      { message: "The report is built from your calculator numbers. Run the calculator, then choose the Pro report from your result." },
      { status: 422 },
    );
  }

  try {
    const body = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      "success_url": `${base}/pricing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${base}/pricing?status=cancel`,
      "allow_promotion_codes": "true",
      // What fulfilment needs to rebuild the report. Metadata values are strings up to 500 characters.
      "metadata[report]": REPORT_KIND,
      "metadata[calc]": encodeInputs(calc),
      // Project and site details for the plan-review header. Both optional.
      "custom_fields[0][key]": FIELD_PROJECT,
      "custom_fields[0][label][type]": "custom",
      "custom_fields[0][label][custom]": "Project name",
      "custom_fields[0][type]": "text",
      "custom_fields[0][optional]": "true",
      "custom_fields[0][text][maximum_length]": "120",
      "custom_fields[1][key]": FIELD_SITE,
      "custom_fields[1][label][type]": "custom",
      "custom_fields[1][label][custom]": "Site address",
      "custom_fields[1][type]": "text",
      "custom_fields[1][optional]": "true",
      "custom_fields[1][text][maximum_length]": "200",
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const session = await res.json();
    if (!res.ok) {
      captureServerMessage("Stripe rejected checkout session creation", { scope: "checkout", stripe_status: res.status });
      return NextResponse.json({ message: session?.error?.message ?? "Stripe error" }, { status: 502 });
    }
    logServer("info", "checkout session created", { scope: "checkout" });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    captureServerError(err, { scope: "checkout" });
    return NextResponse.json({ message: "Could not reach Stripe. Please try again." }, { status: 502 });
  }
}
