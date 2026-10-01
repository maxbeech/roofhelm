import { readFileSync } from "node:fs";
import { parseSession, SESSION_ID_RE } from "../lib/checkout-session.ts";
import { userRefFor } from "../lib/openhelm-analytics-mp.ts";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}

check("ref hash vector", (await userRefFor("00000000-0000-0000-0000-000000000000")) === "12b9377cbe7e5c94");

const paid = parseSession({ id: "cs_live_abc12345", payment_status: "paid", amount_total: 2900, currency: "usd" });
check("paid session", paid?.paid === true && paid.value === 29 && paid.currency === "USD" && paid.transactionId === "cs_live_abc12345", JSON.stringify(paid));
check("unpaid session is not paid", parseSession({ id: "cs_x12345678", payment_status: "unpaid", amount_total: 2900, currency: "usd" })?.paid === false);
check("missing amount is not paid", parseSession({ id: "cs_x12345678", payment_status: "paid", currency: "usd" })?.paid === false);
check("garbage is null", parseSession(null) === null && parseSession({}) === null && parseSession("x") === null);
check("session id shape", SESSION_ID_RE.test("cs_test_a1B2c3D4") && !SESSION_ID_RE.test("../etc") && !SESSION_ID_RE.test("cs_"));

// dataLayer must receive arguments objects (gtag.js ignores plain arrays).
// The product has no vitest, so drive the real module with a stubbed window.
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST12345";
const win: { dataLayer: unknown[]; location: { href: string } } = { dataLayer: [], location: { href: "https://x.test/" } };
Object.assign(globalThis, { window: win });
const { trackEvent, PRO_PRICE } = await import("../lib/analytics-events.ts");
trackEvent("begin_checkout", PRO_PRICE);
const entry = win.dataLayer[0];
check("dataLayer entry is an arguments object", Object.prototype.toString.call(entry) === "[object Arguments]");
check("begin_checkout payload", JSON.stringify(Array.from(entry as ArrayLike<unknown>)) === JSON.stringify(["event", "begin_checkout", { currency: "USD", value: 29 }]));

// Each event the journeys rely on is sent from the place that owns it.
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const wired: [string, string[]][] = [
  ["components/Calculator.tsx", ["useCalculatorUsed"]],
  ["components/ToolCalculator.tsx", ["useCalculatorUsed"]],
  ["components/DriftCalculator.tsx", ["useCalculatorUsed"]],
  ["components/useCalculatorUsed.ts", ["calculator_used"]],
  ["components/LeadForm.tsx", ["generate_lead", "generate_lead_failed"]],
  ["components/CheckoutButton.tsx", ["begin_checkout", "begin_checkout_failed"]],
  ["components/PurchaseTracker.tsx", ["purchase", "purchase_failed", "checkout_cancelled"]],
];
for (const [file, names] of wired) for (const n of names) check(`${file} uses ${n}`, src(file).includes(n));
check("success_url carries the session id", src("app/api/checkout/route.ts").includes("session_id={CHECKOUT_SESSION_ID}"));
check("no plain-array dataLayer push", !/dataLayer\.push\(\s*\[/.test(src("lib/openhelm-analytics.tsx")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
