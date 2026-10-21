// The Stripe webhook safety net: signature over the raw body, de-duplication by
// event id (with the claim released on failure), ownership by price id, and a
// 500 whenever something went wrong so Stripe retries. Fake Stripe and fake
// mail sit behind globalThis.fetch; nothing here touches the network.
// Run via npm test.
import { createClaimStore } from "../lib/event-claims.ts";
import { SIGNATURE_TOLERANCE_SECONDS, verifyStripeSignature } from "../lib/stripe-signature.ts";
import {
  OTHER_PRICE, SESSION_ID, drawnText, event, fakeNet, quietConsole, restoreEnv, session, setEnv, signedRequest,
} from "./stripe-fixtures.mts";
import { createHmac } from "node:crypto";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  // stderr directly: quietConsole() below captures console.error, which would hide failures.
  else { fail++; process.stderr.write(`  FAIL ${name}${detail ? `: ${detail}` : ""}\n`); }
}

// --- signature check (Stripe's documented manual procedure) -----------------------
// Known answer computed independently with: printf '%s' '1700000000.{"id":"evt_vector00000001"}' | openssl dgst -sha256 -hmac whsec_vector_secret
const VECTOR = { body: '{"id":"evt_vector00000001"}', t: 1700000000, secret: "whsec_vector_secret", v1: "fadd538b28837c9671620f75606b36494d0e4e7b29aec5cab8aa0acf901597ab" };
const header = (t: number, ...v1: string[]) => `t=${t},${v1.map((s) => `v1=${s}`).join(",")}`;
const sigOf = (body: string, t: number, secret: string) => createHmac("sha256", secret).update(`${t}.${body}`, "utf8").digest("hex");
const verdict = (body: string, hdr: string | null, secret = VECTOR.secret, now = VECTOR.t) => {
  const r = verifyStripeSignature(body, hdr, secret, now);
  return r.ok ? "ok" : r.reason;
};

check("known-answer vector verifies", verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1)) === "ok");
check("wrong secret is a mismatch", verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1), "whsec_other") === "mismatch");
check("tampered body is a mismatch", verdict(`${VECTOR.body} `, header(VECTOR.t, VECTOR.v1)) === "mismatch");
check("a changed timestamp invalidates the signature", verdict(VECTOR.body, header(VECTOR.t + 1, VECTOR.v1)) === "mismatch");
check("missing header", verdict(VECTOR.body, null) === "missing_header" && verdict(VECTOR.body, "") === "missing_header");
check("header without timestamp or v1 is malformed", verdict(VECTOR.body, "garbage") === "malformed_header" && verdict(VECTOR.body, `v1=${VECTOR.v1}`) === "malformed_header" && verdict(VECTOR.body, `t=${VECTOR.t}`) === "malformed_header");
check("non-numeric timestamp is malformed", verdict(VECTOR.body, `t=abc,v1=${VECTOR.v1}`) === "malformed_header");
check("only a v0 signature is not accepted (downgrade)", verdict(VECTOR.body, `t=${VECTOR.t},v0=${VECTOR.v1}`) === "malformed_header");
check("a v0 signature beside a bad v1 is not accepted", verdict(VECTOR.body, `t=${VECTOR.t},v1=${"0".repeat(64)},v0=${VECTOR.v1}`) === "mismatch");
check("rolled secret: any matching v1 passes", verdict(VECTOR.body, header(VECTOR.t, "0".repeat(64), VECTOR.v1)) === "ok" && verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1, "0".repeat(64))) === "ok");
check("non-hex and short v1 values are skipped, not thrown on", verdict(VECTOR.body, header(VECTOR.t, "zz", "abcd")) === "mismatch");
check("default tolerance is five minutes", SIGNATURE_TOLERANCE_SECONDS === 300);
check("at the tolerance edge still passes", verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1), VECTOR.secret, VECTOR.t + 300) === "ok");
check("one second past the edge is stale (replay)", verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1), VECTOR.secret, VECTOR.t + 301) === "stale");
check("a timestamp far in the future is stale too", verdict(VECTOR.body, header(VECTOR.t, VECTOR.v1), VECTOR.secret, VECTOR.t - 301) === "stale");
let threw = false;
try { verifyStripeSignature(VECTOR.body, header(VECTOR.t, VECTOR.v1), VECTOR.secret, VECTOR.t, 0); } catch { threw = true; }
check("tolerance of zero is refused (it would disable the recency check)", threw);
check("signature covers multi-byte bodies", verdict("{\"n\":\"café\"}", header(VECTOR.t, sigOf("{\"n\":\"café\"}", VECTOR.t, VECTOR.secret))) === "ok");

// --- claim store ------------------------------------------------------------------
let clock = 1_000;
const store = createClaimStore(10_000, 3, () => clock);
check("first claim wins", store.claim("evt_a") === "claimed");
check("a second claim while working is in_flight", store.claim("evt_a") === "in_flight");
store.release("evt_a");
check("a released claim can be taken again (failure then retry)", store.claim("evt_a") === "claimed");
store.done("evt_a");
check("a finished event is a duplicate", store.claim("evt_a") === "duplicate");
clock += 10_001;
check("finished ids expire", store.claim("evt_a") === "claimed");
store.done("evt_a");
for (const id of ["evt_b", "evt_c", "evt_d"]) { store.claim(id); store.done(id); }
check("the store is capped, oldest first", store.claim("evt_a") === "claimed" && store.claim("evt_d") === "duplicate");

// --- the route --------------------------------------------------------------------
const quiet = quietConsole();
const net = fakeNet();
const { POST } = await import("../app/api/stripe/webhook/route.ts");

let n = 0;
const nextId = () => `evt_test_${String(++n).padStart(8, "0")}`;
const send = async (req: Request) => { const res = await POST(req); return { status: res.status, body: await res.json() as Record<string, unknown> }; };
const fresh = () => { net.calls.length = 0; net.sessions.set(SESSION_ID, session()); setEnv(); };
const emailBody = () => JSON.parse(net.mailSends()[0]?.body ?? "{}") as Record<string, unknown>;

// Unconfigured / unsigned / malformed
setEnv({ STRIPE_WEBHOOK_SECRET: undefined });
let r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("no webhook secret: 503, nothing happens", r.status === 503 && net.calls.length === 0);
setEnv({ STRIPE_PRICE_ID: undefined });
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("no price id: 503", r.status === 503);

fresh();
r = await send(signedRequest(event(nextId(), "checkout.session.completed"), { secret: "whsec_wrong" }));
check("wrong secret: 400 and no Stripe or mail calls", r.status === 400 && net.calls.length === 0);
r = await send(signedRequest(event(nextId(), "checkout.session.completed"), { tamper: true }));
check("body altered after signing: 400", r.status === 400 && net.calls.length === 0);
r = await send(signedRequest(event(nextId(), "checkout.session.completed"), { t: Math.floor(Date.now() / 1000) - 400 }));
check("old timestamp (replay): 400", r.status === 400 && net.calls.length === 0);
r = await send(new Request("https://www.roofhelm.test/api/stripe/webhook", { method: "POST", body: JSON.stringify(event(nextId(), "checkout.session.completed")) }));
check("no signature header: 400", r.status === 400 && net.calls.length === 0);
r = await send(signedRequest("not json at all"));
check("signed but not JSON: 400", r.status === 400);
r = await send(signedRequest({ id: "nope", type: "checkout.session.completed", data: { object: { id: SESSION_ID } } }));
check("event id with the wrong shape: 400", r.status === 400);
r = await send(signedRequest({ id: nextId(), type: "checkout.session.completed", data: {} }));
check("event with no session: 400", r.status === 400);

// Event types
r = await send(signedRequest(event(nextId(), "payment_intent.succeeded")));
check("other event types are acknowledged and ignored", r.status === 200 && r.body.ignored === "type" && net.calls.length === 0);

// Happy path
fresh();
const e1 = nextId();
r = await send(signedRequest(event(e1, "checkout.session.completed")));
check("paid session for our price: 200 fulfilled and emailed", r.status === 200 && r.body.fulfilled === true && r.body.email === "sent", JSON.stringify(r));
check("exactly one email was sent", net.mailSends().length === 1);
const mail = emailBody();
const attachment = (mail.attachments as { filename: string; content_base64: string; content_type: string }[] | undefined)?.[0];
check("email goes to the buyer", JSON.stringify(mail.to) === JSON.stringify(["buyer@example.test"]));
check("email carries the PDF", attachment?.filename === "roofhelm-snow-load-report.pdf" && attachment.content_type === "application/pdf" && Buffer.from(attachment.content_base64, "base64").subarray(0, 5).toString() === "%PDF-");
check("email links to the download route", String(mail.text).includes("https://www.roofhelm.test/api/report?session_id=cs_test_a1B2c3D4e5F6g7H8"));
check("email is idempotent per purchase (client id from the session)", mail.client_id === `roofhelm-report-${SESSION_ID}`);
check("email copy has no em dash", !String(mail.text).includes("\u2014") && !String(mail.subject).includes("\u2014"));
const pdfText = drawnText(Buffer.from(attachment?.content_base64 ?? "", "base64"));
check("the buyer's project field from Checkout is in the emailed PDF", pdfText.includes("Maple Street garage") && pdfText.includes("14 Maple St"));
check("the engine's numbers for the stored inputs are in the emailed PDF", pdfText.includes("54.72 psf") && pdfText.includes("8.4 psf") && pdfText.includes("pg=40"));

// Idempotency
r = await send(signedRequest(event(e1, "checkout.session.completed")));
check("the same event again is a duplicate: 200, no second email, no second lookup", r.status === 200 && r.body.duplicate === true && net.mailSends().length === 1 && net.stripeLookups().length === 1);
r = await send(signedRequest(event(nextId(), "checkout.session.async_payment_succeeded")));
check("a second event for the same purchase still sends with the same client id (platform de-duplicates)",
  r.status === 200 && net.mailSends().length === 2 && (JSON.parse(net.mailSends()[1].body) as { client_id: string }).client_id === mail.client_id);

// The same event delivered twice at once: one does the work, the other is told to come back
fresh();
const eRace = nextId();
const [first, second] = await Promise.all([
  send(signedRequest(event(eRace, "checkout.session.completed"))),
  send(signedRequest(event(eRace, "checkout.session.completed"))),
]);
const statuses = [first.status, second.status].sort();
check("concurrent duplicate delivery: one fulfils, the other gets 409 to retry later", statuses[0] === 200 && statuses[1] === 409, JSON.stringify([first, second]));
check("...and only one email goes out", net.mailSends().length === 1);
r = await send(signedRequest(event(eRace, "checkout.session.completed")));
check("...and the later retry sees it settled", r.status === 200 && r.body.duplicate === true && net.mailSends().length === 1);

// Failure releases the claim, so the retry does the work
fresh();
const e2 = nextId();
net.failStripe(500);
r = await send(signedRequest(event(e2, "checkout.session.completed")));
check("Stripe lookup fails: 500 so Stripe retries", r.status === 500 && net.mailSends().length === 0);
r = await send(signedRequest(event(e2, "checkout.session.completed")));
check("the retry of that event is processed, not swallowed as a duplicate", r.status === 200 && r.body.fulfilled === true && net.mailSends().length === 1, JSON.stringify(r));

fresh();
const e3 = nextId();
net.dropStripe();
r = await send(signedRequest(event(e3, "checkout.session.completed")));
check("Stripe unreachable: 500", r.status === 500 && net.mailSends().length === 0);
r = await send(signedRequest(event(e3, "checkout.session.completed")));
check("then it recovers on retry", r.status === 200 && net.mailSends().length === 1);

fresh();
const e4 = nextId();
net.failMail(500);
r = await send(signedRequest(event(e4, "checkout.session.completed")));
check("mail platform down: 500 (the buyer must not be left without a PDF)", r.status === 500);
r = await send(signedRequest(event(e4, "checkout.session.completed")));
check("mail retry delivers once", r.status === 200 && r.body.email === "sent" && net.mailSends().length === 2);
check("the error is reported, not printed with the buyer's address", quiet.out.some((l) => l.includes("stripe-webhook")) && !quiet.out.some((l) => l.includes("buyer@example.test")));

// Ownership: shared Stripe accounts deliver other products' events here
fresh();
net.sessions.set(SESSION_ID, session({ line_items: { data: [{ price: { id: OTHER_PRICE } }] } }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("another product's paid session: 200 ignored, no email", r.status === 200 && r.body.ignored === "wrong_price" && net.mailSends().length === 0);
net.sessions.set(SESSION_ID, session({ mode: "subscription" }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("a subscription checkout: 200 ignored", r.status === 200 && r.body.ignored === "wrong_mode" && net.mailSends().length === 0);
net.sessions.set(SESSION_ID, session({ metadata: { report: "snow-load-v1", calc: "pg=40" }, line_items: { data: [{ price: { id: OTHER_PRICE } }] } }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("our metadata on somebody else's price does not make it ours", r.status === 200 && r.body.ignored === "wrong_price" && net.mailSends().length === 0);

// Unpaid first, paid later (delayed payment methods)
fresh();
net.sessions.set(SESSION_ID, session({ payment_status: "unpaid" }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("completed but unpaid: 200 ignored, nothing sent yet", r.status === 200 && r.body.ignored === "not_paid" && net.mailSends().length === 0);
net.sessions.set(SESSION_ID, session());
r = await send(signedRequest(event(nextId(), "checkout.session.async_payment_succeeded")));
check("async_payment_succeeded then fulfils it", r.status === 200 && r.body.fulfilled === true && net.mailSends().length === 1);

// Ours and paid, but nothing to build the report from
fresh();
quiet.out.length = 0;
net.sessions.set(SESSION_ID, session({ metadata: {} }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("paid but no stored calculation: acknowledged, not retried forever", r.status === 200 && r.body.ignored === "no_calculation" && net.mailSends().length === 0);
check("...and reported loudly for a human", quiet.out.some((l) => l.includes("[stripe-webhook]") && l.includes("unreported error")));

// Email not set up, or nowhere to send it
fresh();
setEnv({ OPENHELM_API_KEY: undefined, OPENHELM_MAIL_INBOX_ID: undefined });
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("mail not configured: 200, no send attempted, buyer relies on the return page", r.status === 200 && r.body.email === "not_configured" && net.mailSends().length === 0);
fresh();
net.sessions.set(SESSION_ID, session({ customer_details: null }));
r = await send(signedRequest(event(nextId(), "checkout.session.completed")));
check("no buyer address: 200, nothing to send to", r.status === 200 && r.body.email === "no_address" && net.mailSends().length === 0);

// Other methods
const webhookModule = await import("../app/api/stripe/webhook/route.ts");
check("only POST is exported", Object.keys(webhookModule).join() === "POST");

net.restore();
quiet.restore();
restoreEnv();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
