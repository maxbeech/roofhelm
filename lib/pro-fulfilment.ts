// Fulfilment for the Pro report, shared by the pricing page (return from
// Checkout), the download route and the Stripe webhook. One definition of
// "this Checkout Session is a deliverable purchase", so the three paths cannot
// drift apart. The return URL alone never grants anything: the session is
// fetched from Stripe and must be a paid, one-time payment for our price.
import { SESSION_ID_RE, verifyPaidSession, withinDownloadWindow, type RejectReason } from "./checkout-session";
import { DOWNLOAD_WINDOW_DAYS, FIELD_PROJECT, FIELD_SITE, REPORT_KIND, proEnabled, proPriceId, siteBase } from "./pro-config";
import { buildReport, cleanField } from "./pro-report";
import { renderReportPdf } from "./pro-report-pdf";
import { parseStrictInputs } from "./snow-url";
import { retrieveCheckoutSession } from "./stripe-api";
import { emailEnabled, sendEmail } from "./openhelm-mail";
import { captureServerError, captureServerMessage } from "./observability";
import type { SnowInputs } from "./snow";

export interface Purchase {
  sessionId: string;
  /** Unix seconds, from Stripe. */
  created: number;
  email: string | null;
  inputs: SnowInputs;
  project: { name: string; site: string };
}

export type LookupFailure =
  | "unconfigured" | "invalid_id" | "not_found" | "lookup_failed" | "no_calculation" | "expired" | RejectReason;

export type PurchaseLookup = { ok: true; purchase: Purchase } | { ok: false; reason: LookupFailure };

const CONTACT = "hello [at] roofhelm.com";

/** What to tell the buyer, and the HTTP status the download route uses, for each way a lookup can fail. */
export const FAILURE: Record<LookupFailure, { status: number; message: string }> = {
  unconfigured: { status: 503, message: "Report delivery is not switched on yet." },
  invalid_id: { status: 400, message: "That link is not valid." },
  not_found: { status: 404, message: "We could not find that order." },
  lookup_failed: { status: 502, message: "We could not reach Stripe to check your payment. Try again in a minute." },
  malformed: { status: 403, message: "That order is not a Pro report." },
  wrong_mode: { status: 403, message: "That order is not a Pro report." },
  wrong_price: { status: 403, message: "That order is not a Pro report." },
  not_paid: { status: 402, message: "That payment has not cleared yet. Some bank payments take a few days. Reload this page once it has." },
  no_calculation: { status: 422, message: `We took your payment but could not find your calculator numbers. Email ${CONTACT} with your receipt and we will sort it out.` },
  expired: { status: 410, message: `This download expired after ${DOWNLOAD_WINDOW_DAYS} days. Email ${CONTACT} with your receipt and we will resend it.` },
};

/** Fetch the session from Stripe and decide whether it is a paid Pro report. Never throws. */
export async function loadPurchase(sessionId: string): Promise<PurchaseLookup> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret || !proEnabled()) return { ok: false, reason: "unconfigured" };
  if (!SESSION_ID_RE.test(sessionId)) return { ok: false, reason: "invalid_id" };

  let raw: unknown;
  try {
    const found = await retrieveCheckoutSession(sessionId, secret);
    if (found.kind === "not_found") return { ok: false, reason: "not_found" };
    if (found.kind === "error") {
      captureServerMessage("Stripe session lookup failed", { scope: "fulfil", stripe_status: found.status });
      return { ok: false, reason: "lookup_failed" };
    }
    raw = found.session;
  } catch (err) {
    captureServerError(err, { scope: "fulfil" });
    return { ok: false, reason: "lookup_failed" };
  }

  const verified = verifyPaidSession(raw, proPriceId());
  if (!verified.ok) return { ok: false, reason: verified.reason };
  const { session } = verified;

  // The numbers were stored by our checkout route when the session was made.
  // A paid session without them (say, a Payment Link on the same price) cannot
  // be turned into a report, and we will not guess at inputs.
  const inputs = session.metadata.report === REPORT_KIND ? parseStrictInputs(session.metadata.calc ?? "") : null;
  if (!inputs) return { ok: false, reason: "no_calculation" };

  if (!withinDownloadWindow(session.created, DOWNLOAD_WINDOW_DAYS)) return { ok: false, reason: "expired" };

  return {
    ok: true,
    purchase: {
      sessionId: session.id,
      created: session.created,
      email: session.email,
      inputs,
      project: { name: cleanField(session.customFields[FIELD_PROJECT], 120), site: cleanField(session.customFields[FIELD_SITE], 200) },
    },
  };
}

/** The report dated by the purchase, so a re-download matches the emailed copy. */
export function renderPurchasePdf(purchase: Purchase): Promise<Uint8Array> {
  return renderReportPdf(buildReport(purchase.inputs, purchase.project, new Date(purchase.created * 1000)));
}

export const REPORT_FILENAME = "roofhelm-snow-load-report.pdf";

export function downloadUrl(sessionId: string): string {
  return `${siteBase()}/api/report?session_id=${encodeURIComponent(sessionId)}`;
}

export type EmailOutcome = "sent" | "not_configured" | "no_address";

/**
 * Email the PDF to the buyer. The client id is derived from the Checkout
 * Session, so any number of deliveries for one purchase (webhook retries, the
 * two event types) produce one message. Throws when the send fails so the
 * webhook can answer 500 and let Stripe retry.
 */
export async function emailReport(purchase: Purchase, pdf: Uint8Array): Promise<EmailOutcome> {
  if (!purchase.email) return "no_address";
  if (!emailEnabled()) return "not_configured";
  const result = await sendEmail({
    to: purchase.email,
    subject: "Your RoofHelm snow load report",
    text:
      "Thanks for your order. Your snow load report is attached as a PDF.\n\n" +
      `You can also download it for the next ${DOWNLOAD_WINDOW_DAYS} days:\n${downloadUrl(purchase.sessionId)}\n\n` +
      "The report uses the numbers you entered in the calculator. If anything looks off, reply and tell us what you entered.\n\n" +
      "A RoofHelm report is a calculation aid, not a stamped engineering document.",
    attachments: [{ filename: REPORT_FILENAME, content: Buffer.from(pdf).toString("base64"), contentType: "application/pdf" }],
    clientId: `roofhelm-report-${purchase.sessionId}`,
  });
  if (result.sent) return "sent";
  if (result.reason === "not_configured") return "not_configured";
  throw new Error("report email was not sent");
}
