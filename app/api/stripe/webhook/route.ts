import { NextResponse } from "next/server";
import { eventClaims } from "@/lib/event-claims";
import { captureServerError, captureServerMessage, logServer } from "@/lib/observability";
import { proEnabled } from "@/lib/pro-config";
import { emailReport, loadPurchase, renderPurchasePdf } from "@/lib/pro-fulfilment";
import { verifyStripeSignature } from "@/lib/stripe-signature";

// Safety net for the Pro report. The buyer normally gets the PDF on the page
// Stripe returns them to, but Stripe's own guidance is that a landing page is
// not enough: a buyer can pay and close the tab. This endpoint hears about
// every payment directly and emails the report, so nobody who paid is left
// without it. Pattern follows TableHelm's webhook:
//   - verify the signature over the RAW body before reading anything
//   - de-duplicate on the event id, releasing the claim if the work fails
//   - answer 500 when something went wrong, so Stripe retries (up to 3 days)
//
// Register it in Stripe for checkout.session.completed and
// checkout.session.async_payment_succeeded (the second is how a delayed
// payment method, such as a bank debit, reports that it finally paid).
//
// Ownership: a Stripe webhook endpoint hears every event on the account, and
// accounts can be shared between products. The event is acted on only if its
// session is a paid one-time payment for THIS product's price (STRIPE_PRICE_ID),
// read from Stripe, never from metadata or the event payload. Anything else is
// acknowledged with 200 and ignored. A 5xx there would make Stripe retry a
// stranger's event at us for three days.
const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const EVENT_ID = /^evt_[A-Za-z0-9_]{8,200}$/;

const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!whsec || !proEnabled()) {
    captureServerMessage("Stripe webhook received but not configured", { scope: "stripe-webhook" });
    return reply({ received: false, reason: "unconfigured" }, 503);
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text.
  const raw = await req.text();
  const signature = verifyStripeSignature(raw, req.headers.get("stripe-signature"), whsec);
  if (!signature.ok) {
    logServer("warn", "stripe webhook signature rejected", { scope: "stripe-webhook", reason: signature.reason });
    return reply({ received: false, error: "invalid_signature" }, 400);
  }

  let event: { id?: unknown; type?: unknown; data?: { object?: { id?: unknown } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return reply({ received: false, error: "invalid_payload" }, 400);
  }
  const eventId = typeof event.id === "string" && EVENT_ID.test(event.id) ? event.id : null;
  const eventType = typeof event.type === "string" ? event.type : null;
  const sessionId = typeof event.data?.object?.id === "string" ? event.data.object.id : null;
  if (!eventId || !eventType) return reply({ received: false, error: "invalid_payload" }, 400);

  if (!HANDLED.has(eventType)) return reply({ received: true, ignored: "type" });
  if (!sessionId) return reply({ received: false, error: "invalid_payload" }, 400);

  const claim = eventClaims.claim(eventId);
  if (claim === "duplicate") return reply({ received: true, duplicate: true });
  // Same event arriving twice at once: let Stripe's retry find it settled.
  if (claim === "in_flight") return reply({ received: false, reason: "in_flight" }, 409);

  try {
    const found = await loadPurchase(sessionId);
    if (!found.ok) {
      // Temporary: let Stripe retry.
      if (found.reason === "lookup_failed" || found.reason === "not_found" || found.reason === "unconfigured") {
        throw new Error(`session lookup: ${found.reason}`);
      }
      // Ours, paid, and not deliverable. A retry cannot fix it, so say so loudly
      // (Sentry) and acknowledge; someone has to look at this order by hand.
      if (found.reason === "no_calculation") {
        captureServerError(new Error("Paid Pro report order has no calculation"), { scope: "stripe-webhook", event_id: eventId, session_id: sessionId });
      } else {
        logServer("info", "stripe webhook ignored session", { scope: "stripe-webhook", reason: found.reason });
      }
      eventClaims.done(eventId);
      return reply({ received: true, ignored: found.reason });
    }

    const pdf = await renderPurchasePdf(found.purchase);
    const email = await emailReport(found.purchase, pdf); // throws if the send fails
    if (email !== "sent") {
      captureServerMessage("Report paid but not emailed; buyer relies on the return page", { scope: "stripe-webhook", email });
    }
    eventClaims.done(eventId);
    logServer("info", "report fulfilled", { scope: "stripe-webhook", email });
    return reply({ received: true, fulfilled: true, email });
  } catch (err) {
    // Release the claim first, or Stripe's retry would be swallowed as a duplicate.
    eventClaims.release(eventId);
    captureServerError(err, { scope: "stripe-webhook", event_id: eventId, event_type: eventType });
    return reply({ received: false, error: "handler_failed" }, 500);
  }
}
