// Fulfilment gate: a Checkout Session unlocks the PDF only when Stripe says it
// is a paid one-time payment for our price, with the calculator numbers we
// stored on it. Covers the pure verifier, the strict input parser, the Stripe
// lookup, the download route and the checkout route. Run via npm test.
import { SESSION_ID_RE, verifyPaidSession, withinDownloadWindow } from "../lib/checkout-session.ts";
import { encodeInputs, parseStrictInputs, decodeInputs } from "../lib/snow-url.ts";
import { DEFAULT_SNOW } from "../lib/snow.ts";
import { loadPurchase, FAILURE } from "../lib/pro-fulfilment.ts";
import { NOT_ON_SALE } from "../lib/pro-config.ts";
import { GABLE, OTHER_PRICE, PRICE, SESSION_ID, fakeNet, quietConsole, restoreEnv, session, setEnv } from "./stripe-fixtures.mts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  // stderr directly: quietConsole() below captures console.error, which would hide failures.
  else { fail++; process.stderr.write(`  FAIL ${name}${detail ? `: ${detail}` : ""}\n`); }
}
const reasonOf = (v: ReturnType<typeof verifyPaidSession>) => (v.ok ? "ok" : v.reason);

// --- strict input parsing: the paid path never defaults or clamps -------------
check("strict parse round-trips the calculator's encoding", JSON.stringify(parseStrictInputs(encodeInputs(GABLE))) === JSON.stringify(GABLE));
check("strict parse round-trips the defaults", JSON.stringify(parseStrictInputs(encodeInputs(DEFAULT_SNOW))) === JSON.stringify({ ...DEFAULT_SNOW }));
const full = new URLSearchParams(encodeInputs(GABLE));
const without = (k: string) => { const p = new URLSearchParams(full); p.delete(k); return p.toString(); };
const withValue = (k: string, v: string) => { const p = new URLSearchParams(full); p.set(k, v); return p.toString(); };
check("empty string is rejected", parseStrictInputs("") === null);
check("only utm params is rejected (the lenient decoder would default)", parseStrictInputs("utm_source=x") === null && decodeInputs("utm_source=x").pg === DEFAULT_SNOW.pg);
for (const k of ["pg", "r", "te", "ex", "th", "su", "sh", "sl", "w", "ar"]) check(`missing ${k} is rejected`, parseStrictInputs(without(k)) === null);
check("out-of-range Pg is rejected, not clamped", parseStrictInputs(withValue("pg", "9999")) === null && decodeInputs(withValue("pg", "9999")).pg === 400);
check("negative slope rejected", parseStrictInputs(withValue("sl", "-1")) === null);
check("width below 5 rejected", parseStrictInputs(withValue("w", "2")) === null);
check("unknown risk category rejected", parseStrictInputs(withValue("r", "V")) === null);
check("unknown shape rejected", parseStrictInputs(withValue("sh", "dome")) === null);
check("non-numeric rejected", parseStrictInputs(withValue("pg", "abc")) === null && parseStrictInputs(withValue("pg", "")) === null && parseStrictInputs(withValue("pg", "Infinity")) === null);
check("extra params are ignored", parseStrictInputs(`${encodeInputs(GABLE)}&utm_source=x&status=success`) !== null);

// --- session verification ------------------------------------------------------
const ok = verifyPaidSession(session(), PRICE);
check("paid one-time session for our price is accepted", ok.ok);
if (ok.ok) {
  check("verified session carries email, metadata and custom fields",
    ok.session.email === "buyer@example.test" && ok.session.metadata.report === "snow-load-v1" &&
    ok.session.customFields.projectname === "Maple Street garage" && ok.session.customFields.siteaddress === "14 Maple St");
}
check("unpaid is rejected as not_paid", reasonOf(verifyPaidSession(session({ payment_status: "unpaid" }), PRICE)) === "not_paid");
check("no_payment_required is not paid", reasonOf(verifyPaidSession(session({ payment_status: "no_payment_required" }), PRICE)) === "not_paid");
check("a missing payment_status is not paid", reasonOf(verifyPaidSession(session({ payment_status: undefined }), PRICE)) === "not_paid");
check("wrong price is rejected", reasonOf(verifyPaidSession(session({ line_items: { data: [{ price: { id: OTHER_PRICE } }] } }), PRICE)) === "wrong_price");
check("one foreign price among ours is rejected", reasonOf(verifyPaidSession(session({ line_items: { data: [{ price: { id: PRICE } }, { price: { id: OTHER_PRICE } }] } }), PRICE)) === "wrong_price");
check("line_items not expanded is rejected, never assumed", reasonOf(verifyPaidSession(session({ line_items: undefined }), PRICE)) === "wrong_price");
check("empty line items rejected", reasonOf(verifyPaidSession(session({ line_items: { data: [] } }), PRICE)) === "wrong_price");
check("a line item with no price id is rejected", reasonOf(verifyPaidSession(session({ line_items: { data: [{ price: null }] } }), PRICE)) === "wrong_price");
check("an empty expected price never matches", reasonOf(verifyPaidSession(session({ line_items: { data: [{ price: { id: "" } }] } }), "")) === "wrong_price");
check("subscription mode is rejected", reasonOf(verifyPaidSession(session({ mode: "subscription" }), PRICE)) === "wrong_mode");
check("setup mode is rejected", reasonOf(verifyPaidSession(session({ mode: "setup" }), PRICE)) === "wrong_mode");
check("mode is checked before price", reasonOf(verifyPaidSession(session({ mode: "subscription", line_items: { data: [{ price: { id: OTHER_PRICE } }] } }), PRICE)) === "wrong_mode");
check("price is checked before payment, so a stranger's unpaid session reads as foreign",
  reasonOf(verifyPaidSession(session({ payment_status: "unpaid", line_items: { data: [{ price: { id: OTHER_PRICE } }] } }), PRICE)) === "wrong_price");
for (const [name, v] of [["null", null], ["string", "cs_x"], ["array", []], ["no id", { mode: "payment" }], ["bad id", session({ id: "../etc/passwd" })]] as const) {
  check(`malformed (${name}) is rejected`, reasonOf(verifyPaidSession(v, PRICE)) === "malformed");
}
check("session id shape", SESSION_ID_RE.test(SESSION_ID) && !SESSION_ID_RE.test("cs_"));
const noEmail = verifyPaidSession(session({ customer_details: null }), PRICE);
check("no buyer email is allowed and reads as null", noEmail.ok && noEmail.session.email === null);
const nowMs = Date.UTC(2026, 9, 10);
check("download window: inside", withinDownloadWindow(nowMs / 1000 - 5 * 86400, 30, nowMs));
check("download window: edge", withinDownloadWindow(nowMs / 1000 - 30 * 86400, 30, nowMs));
check("download window: outside", !withinDownloadWindow(nowMs / 1000 - 31 * 86400, 30, nowMs));
check("download window: unknown creation time fails closed", !withinDownloadWindow(0, 30, nowMs));

// --- loadPurchase: Stripe lookup + verification + stored numbers ----------------
const quiet = quietConsole();
const net = fakeNet();
setEnv();
net.sessions.set(SESSION_ID, session());
let r = await loadPurchase(SESSION_ID);
check("paid session loads a purchase", r.ok);
if (r.ok) {
  check("purchase inputs are the buyer's stored numbers", JSON.stringify(r.purchase.inputs) === JSON.stringify(GABLE));
  check("purchase carries email and project fields", r.purchase.email === "buyer@example.test" && r.purchase.project.name === "Maple Street garage" && r.purchase.project.site === "14 Maple St");
}
const lookup = net.stripeLookups()[0];
check("lookup asks Stripe to expand line_items", Boolean(lookup) && decodeURIComponent(lookup.url).includes("expand[]=line_items"), lookup?.url);
check("lookup is authenticated, without putting the key in the URL", lookup?.headers.authorization === "Bearer sk_test_fixture" && !lookup.url.includes("sk_test"));

net.sessions.set(SESSION_ID, session({ payment_status: "unpaid" }));
r = await loadPurchase(SESSION_ID);
check("unpaid session does not load", !r.ok && r.reason === "not_paid");
net.sessions.set(SESSION_ID, session({ line_items: { data: [{ price: { id: OTHER_PRICE } }] } }));
r = await loadPurchase(SESSION_ID);
check("another product's paid session does not load", !r.ok && r.reason === "wrong_price");
net.sessions.set(SESSION_ID, session({ mode: "subscription" }));
r = await loadPurchase(SESSION_ID);
check("subscription session does not load", !r.ok && r.reason === "wrong_mode");
net.sessions.set(SESSION_ID, session({ metadata: {} }));
r = await loadPurchase(SESSION_ID);
check("paid session with no stored calculation is not guessed at", !r.ok && r.reason === "no_calculation");
net.sessions.set(SESSION_ID, session({ metadata: { report: "snow-load-v1", calc: "pg=40" } }));
r = await loadPurchase(SESSION_ID);
check("incomplete stored calculation is not defaulted", !r.ok && r.reason === "no_calculation");
net.sessions.set(SESSION_ID, session({ metadata: { report: "something-else", calc: encodeInputs(GABLE) } }));
r = await loadPurchase(SESSION_ID);
check("a different report kind is not delivered", !r.ok && r.reason === "no_calculation");
net.sessions.set(SESSION_ID, session({ created: Math.floor(Date.now() / 1000) - 31 * 86400 }));
r = await loadPurchase(SESSION_ID);
check("expired link", !r.ok && r.reason === "expired");
net.sessions.set(SESSION_ID, session());

const before = net.calls.length;
r = await loadPurchase("../etc/passwd");
check("invalid id never reaches Stripe", !r.ok && r.reason === "invalid_id" && net.calls.length === before);
r = await loadPurchase("cs_test_doesnotexist0001");
check("unknown session id", !r.ok && r.reason === "not_found");
net.failStripe(500);
r = await loadPurchase(SESSION_ID);
check("Stripe 500 is a lookup failure, not a verdict", !r.ok && r.reason === "lookup_failed");
net.dropStripe();
r = await loadPurchase(SESSION_ID);
check("network failure is a lookup failure, not a throw", !r.ok && r.reason === "lookup_failed");
setEnv({ STRIPE_SECRET_KEY: undefined });
const beforeUnconfigured = net.calls.length;
r = await loadPurchase(SESSION_ID);
check("unconfigured: no key means no lookup", !r.ok && r.reason === "unconfigured" && net.calls.length === beforeUnconfigured);
setEnv({ STRIPE_PRICE_ID: undefined });
r = await loadPurchase(SESSION_ID);
check("unconfigured: no price id means no lookup", !r.ok && r.reason === "unconfigured");
setEnv();

// --- the download route ----------------------------------------------------------
const { GET } = await import("../app/api/report/route.ts");
const get = (id: string) => GET(new Request(`https://www.roofhelm.test/api/report?session_id=${encodeURIComponent(id)}`));

let res = await get(SESSION_ID);
const bytes = new Uint8Array(await res.arrayBuffer());
check("paid session downloads a PDF", res.status === 200 && res.headers.get("content-type") === "application/pdf" && Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-");
check("PDF response is attachment, private and not cached", /attachment; filename="roofhelm-snow-load-report\.pdf"/.test(res.headers.get("content-disposition") ?? "") && res.headers.get("cache-control") === "private, no-store" && res.headers.get("x-robots-tag") === "noindex");
check("content-length matches the body", Number(res.headers.get("content-length")) === bytes.byteLength);

net.sessions.set(SESSION_ID, session({ payment_status: "unpaid" }));
res = await get(SESSION_ID);
check("unpaid session gets 402, no PDF", res.status === 402 && res.headers.get("content-type")?.includes("json") === true && (await res.json()).message === FAILURE.not_paid.message);
net.sessions.set(SESSION_ID, session({ line_items: { data: [{ price: { id: OTHER_PRICE } }] } }));
check("wrong price gets 403", (await get(SESSION_ID)).status === 403);
net.sessions.set(SESSION_ID, session({ mode: "subscription" }));
check("wrong mode gets 403", (await get(SESSION_ID)).status === 403);
net.sessions.set(SESSION_ID, session({ metadata: {} }));
check("no stored calculation gets 422", (await get(SESSION_ID)).status === 422);
net.sessions.set(SESSION_ID, session({ created: Math.floor(Date.now() / 1000) - 40 * 86400 }));
check("expired gets 410", (await get(SESSION_ID)).status === 410);
net.sessions.set(SESSION_ID, session());
check("bad session id gets 400", (await get("nope")).status === 400);
check("missing session id gets 400", (await GET(new Request("https://www.roofhelm.test/api/report"))).status === 400);
check("unknown session gets 404", (await get("cs_test_doesnotexist0001")).status === 404);
net.failStripe(503);
check("Stripe outage gets 502", (await get(SESSION_ID)).status === 502);
// The return URL proves nothing: the same request a forged ?status=success link would make.
const forged = await GET(new Request("https://www.roofhelm.test/api/report?status=success&session_id=cs_test_forged0000001"));
check("a forged success link gets no PDF", forged.status === 404 && forged.headers.get("content-type")?.includes("pdf") !== true);
setEnv({ STRIPE_PRICE_ID: undefined });
check("unconfigured gets 503", (await get(SESSION_ID)).status === 503);
setEnv();

// --- the checkout route -----------------------------------------------------------
const { POST } = await import("../app/api/checkout/route.ts");
const post = (body: unknown) => POST(new Request("https://www.roofhelm.test/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));

setEnv({ STRIPE_SECRET_KEY: undefined });
let cr = await post({ calc: encodeInputs(GABLE) });
let cj = await cr.json();
check("unconfigured: one plain sentence, no throw", cr.status === 200 && cj.message === NOT_ON_SALE && !cj.url);
setEnv();

const createsBefore = net.calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").length;
for (const [name, body] of [["no body", ""], ["not json", "{"], ["no calc", {}], ["calc not a string", { calc: 5 }], ["calc incomplete", { calc: "pg=40" }], ["calc out of range", { calc: withValue("pg", "9999") }]] as const) {
  cr = await post(body);
  check(`checkout refuses ${name} with 422`, cr.status === 422, String(cr.status));
}
check("a refused checkout never reaches Stripe", net.calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").length === createsBefore);

cr = await post({ calc: encodeInputs(GABLE) });
cj = await cr.json();
check("valid calc returns the Stripe checkout URL", cr.status === 200 && String(cj.url).startsWith("https://checkout.stripe.test/"));
const created = net.calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions").at(-1);
const sent = new URLSearchParams(created?.body ?? "");
check("session is a one-time payment for our price", sent.get("mode") === "payment" && sent.get("line_items[0][price]") === PRICE && sent.get("line_items[0][quantity]") === "1");
check("buyer's numbers are stored in session metadata", sent.get("metadata[calc]") === encodeInputs(GABLE) && sent.get("metadata[report]") === "snow-load-v1");
check("stored numbers survive the round trip", JSON.stringify(parseStrictInputs(sent.get("metadata[calc]") ?? "")) === JSON.stringify(GABLE));
check("project and site are optional text fields", sent.get("custom_fields[0][key]") === "projectname" && sent.get("custom_fields[1][key]") === "siteaddress" &&
  sent.get("custom_fields[0][optional]") === "true" && sent.get("custom_fields[1][optional]") === "true" && sent.get("custom_fields[0][type]") === "text");
check("success URL carries the session id, cancel goes back to pricing",
  sent.get("success_url") === "https://www.roofhelm.test/pricing?status=success&session_id={CHECKOUT_SESSION_ID}" && sent.get("cancel_url") === "https://www.roofhelm.test/pricing?status=cancel");
check("metadata values fit Stripe's 500 character limit", (sent.get("metadata[calc]") ?? "").length < 500);
check("Stripe call uses the secret as a bearer header", created?.headers.authorization === "Bearer sk_test_fixture");

net.restore();
quiet.restore();
restoreEnv();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
