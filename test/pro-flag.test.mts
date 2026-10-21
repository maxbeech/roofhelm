// The buy button is decided per request from the server's Stripe configuration,
// not frozen at build time. The decisive test renders the SAME imported pricing
// page module several times with the environment changing in between: a
// build-time constant would give the same answer every time. Also covers the
// three honest states (off, needs numbers, ready), the Checkout return, and
// the page's rendering mode. Run via npm test.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { proEnabled, proPriceId, NOT_ON_SALE, siteBase } from "../lib/pro-config.ts";
import { FAILURE } from "../lib/pro-fulfilment.ts";
import { encodeInputs } from "../lib/snow-url.ts";
import { SITE } from "../lib/site.ts";
import { GABLE, OTHER_PRICE, SESSION_ID, fakeNet, quietConsole, restoreEnv, session, setEnv } from "./stripe-fixtures.mts";

// tsx loads .tsx as CommonJS, so a default export can arrive as { default: fn }.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrap = <T,>(mod: any): T => (mod.default && mod.default.default ? mod.default.default : mod.default) as T;
const CheckoutButton = unwrap<typeof import("../components/CheckoutButton.tsx").default>(await import("../components/CheckoutButton.tsx"));

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  // stderr directly: quietConsole() below captures console.error, which would hide failures.
  else { fail++; process.stderr.write(`  FAIL ${name}${detail ? `: ${detail}` : ""}\n`); }
}
const BUTTON_TEXT = "Get the Pro offprint";
const NEEDS_NUMBERS = "Start with your roof numbers";
const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

// --- the flag itself --------------------------------------------------------------
check("both variables set: enabled", proEnabled({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_ID: "price_x" }));
check("no secret key: off", !proEnabled({ STRIPE_PRICE_ID: "price_x" }));
check("no price id: off", !proEnabled({ STRIPE_SECRET_KEY: "sk_test_x" }));
check("nothing set: off", !proEnabled({}));
check("blank or whitespace values are off", !proEnabled({ STRIPE_SECRET_KEY: "", STRIPE_PRICE_ID: "price_x" }) && !proEnabled({ STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_ID: "  " }));
check("flag follows process.env as it changes", (() => {
  setEnv({ STRIPE_SECRET_KEY: undefined });
  const off = proEnabled();
  setEnv();
  const on = proEnabled();
  setEnv({ STRIPE_PRICE_ID: undefined });
  const off2 = proEnabled();
  setEnv();
  return !off && on && !off2;
})());
check("price id is trimmed and empty when unset", proPriceId({ STRIPE_PRICE_ID: " price_a " }) === "price_a" && proPriceId({}) === "");
check("site base falls back to the site URL and drops a trailing slash", siteBase({}) === SITE.url.replace(/\/+$/, "") && siteBase({ NEXT_PUBLIC_SITE_URL: "https://override.example.test/" }) === "https://override.example.test");

// --- CheckoutButton: the three states ----------------------------------------------
const calc = encodeInputs(GABLE);
const off = decode(renderToStaticMarkup(createElement(CheckoutButton, { enabled: false, calc })));
check("off: exactly the one sentence", off.includes(NOT_ON_SALE));
check("off: no buy button, no detour link, no 'in press', no email nudge", !off.includes(BUTTON_TEXT) && !off.includes(NEEDS_NUMBERS) && !/in press/i.test(off) && !/early access/i.test(off) && !off.includes("<a ") && !off.includes("<button"));
check("off: nothing else in it but that sentence", off.replace(/<[^>]*>/g, "").trim() === NOT_ON_SALE);
check("the sentence reads plainly, with no em dash", NOT_ON_SALE.length < 100 && !NOT_ON_SALE.includes("\u2014"));

const needs = decode(renderToStaticMarkup(createElement(CheckoutButton, { enabled: true, calc: null })));
check("enabled without numbers: sends the buyer to the calculator, no buy button", needs.includes(NEEDS_NUMBERS) && needs.includes('href="/#calculator"') && !needs.includes(BUTTON_TEXT) && !needs.includes("<button"));

const ready = decode(renderToStaticMarkup(createElement(CheckoutButton, { enabled: true, calc })));
check("enabled with numbers: the buy button", ready.includes(BUTTON_TEXT) && ready.includes("<button") && !ready.includes(NOT_ON_SALE) && !ready.includes(NEEDS_NUMBERS));
check("button is not disabled on first paint (the attribute, not the Tailwind variant class)", !/<button[^>]*\sdisabled(=|>|\s)/.test(ready) && ready.includes("disabled:opacity-60"));

// --- the pricing page, rendered per request ------------------------------------------
const quiet = quietConsole();
const net = fakeNet();
const Pricing = unwrap<typeof import("../app/pricing/page.tsx").default>(await import("../app/pricing/page.tsx"));
const render = async (search: Record<string, string | string[] | undefined> = {}) =>
  decode(renderToStaticMarkup(await Pricing({ searchParams: Promise.resolve(search) })));
const numbers = Object.fromEntries(new URLSearchParams(calc));

setEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_PRICE_ID: undefined });
let html = await render(numbers);
check("page, Stripe not configured: the sentence, no button (even with numbers in the URL)", html.includes(NOT_ON_SALE) && !html.includes(BUTTON_TEXT) && !html.includes(NEEDS_NUMBERS));
check("page, Stripe not configured: no summary of the buyer's roof", !html.includes("Your roof:"));

setEnv();
html = await render(numbers);
check("same page module, variables now set: the buy button appears with no rebuild", html.includes(BUTTON_TEXT) && !html.includes(NOT_ON_SALE));
check("page shows the buyer's roof and the engine's design load", html.includes("Your roof: gable, 18.43 degrees, ground snow load 40 psf.") && html.includes(">28 psf<"), html.match(/Your roof[^<]*/)?.[0] ?? "no summary");
check("page offers a way back to the same numbers", html.includes(`href="/?${calc}#calculator"`));

html = await render({});
check("page, configured, no numbers: calculator first", html.includes(NEEDS_NUMBERS) && !html.includes(BUTTON_TEXT));
html = await render({ pg: "40" });
check("page, configured, partial numbers: calculator first (nothing is defaulted)", html.includes(NEEDS_NUMBERS) && !html.includes(BUTTON_TEXT));
html = await render({ ...numbers, pg: "9999" });
check("page, configured, out-of-range numbers: calculator first", html.includes(NEEDS_NUMBERS) && !html.includes(BUTTON_TEXT));
html = await render({ ...numbers, utm_source: ["a", "b"] });
check("page copes with repeated and tracking params", html.includes(BUTTON_TEXT));

setEnv({ STRIPE_SECRET_KEY: undefined });
html = await render(numbers);
check("variables removed again: back to the sentence", html.includes(NOT_ON_SALE) && !html.includes(BUTTON_TEXT));
setEnv();

html = await render(numbers);
check("page keeps the disclaimer and the plan-review promises", html.includes("not a stamped engineering document") && html.includes("Project and site fields for the plan-review submittal"));

// Return from Stripe Checkout: the redirect alone proves nothing.
net.sessions.set(SESSION_ID, session());
html = await render({ status: "success", session_id: SESSION_ID });
check("paid return: confirmed, with the download link", html.includes("Payment confirmed") && html.includes(`href="/api/report?session_id=${SESSION_ID}"`));
check("paid return: tells the buyer how long the link works", html.includes("This link works for 30 days"));

net.sessions.set(SESSION_ID, session({ payment_status: "unpaid" }));
html = await render({ status: "success", session_id: SESSION_ID });
check("success URL but Stripe says unpaid: no confirmation, no download link", !html.includes("Payment confirmed") && !html.includes("/api/report") && html.includes(FAILURE.not_paid.message));
net.sessions.set(SESSION_ID, session({ line_items: { data: [{ price: { id: OTHER_PRICE } }] } }));
html = await render({ status: "success", session_id: SESSION_ID });
check("success URL with another product's session: no download link", !html.includes("Payment confirmed") && !html.includes("/api/report") && html.includes(FAILURE.wrong_price.message));
html = await render({ status: "success", session_id: "cs_test_forged0000001" });
check("success URL with an invented session id: no download link", !html.includes("Payment confirmed") && !html.includes("/api/report") && html.includes(FAILURE.not_found.message));
html = await render({ status: "success" });
check("success URL with no session id: no download link", !html.includes("Payment confirmed") && html.includes(FAILURE.invalid_id.message));
net.sessions.set(SESSION_ID, session({ metadata: {} }));
html = await render({ status: "success", session_id: SESSION_ID });
check("paid but no stored numbers: says so and gives the contact", html.includes("could not find your calculator numbers") && html.includes("hello [at] roofhelm.com") && !html.includes("/api/report"));
net.failStripe(500);
net.sessions.set(SESSION_ID, session());
html = await render({ status: "success", session_id: SESSION_ID });
check("Stripe lookup fails: asks to try again, no download link", html.includes(FAILURE.lookup_failed.message) && !html.includes("/api/report"));
const lookupsBeforeCancel = net.stripeLookups().length;
html = await render({ status: "cancel" });
check("cancelled return makes no Stripe call and shows no confirmation", !html.includes("Payment confirmed") && net.stripeLookups().length === lookupsBeforeCancel);
const callsAfterNormal = net.calls.length;
await render(numbers);
check("an ordinary view makes no Stripe call (the page is light)", net.calls.length === callsAfterNormal);

// --- rendering mode: per request, nothing frozen ---------------------------------------
const src = readFileSync(new URL("../app/pricing/page.tsx", import.meta.url), "utf8");
check("pricing page opts into per-request rendering", /export const dynamic = "force-dynamic"/.test(src));
check("pricing page no longer exports a revalidate window", !/export const revalidate/.test(src));
const topLevelEnv = src.split("\n").filter((l) => /^\S/.test(l) && /process\.env/.test(l));
check("pricing page reads no environment variable at module scope", topLevelEnv.length === 0, topLevelEnv.join(" | "));
check("pricing page decides from the runtime flag", /proEnabled\(\)/.test(src) && !/Boolean\(process\.env/.test(src));
const configSrc = readFileSync(new URL("../lib/pro-config.ts", import.meta.url), "utf8");
check("pro-config reads env inside functions only", configSrc.split("\n").filter((l) => /^\S/.test(l) && /process\.env\./.test(l)).length === 0);
check("calculators stay static: the home page keeps its revalidate", /export const revalidate = 604800/.test(readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8")));

// --- sitemap: no new page was added, and pricing is still listed -------------------------
const { default: sitemap } = await import("../app/sitemap.ts");
const urls = sitemap().map((e) => e.url);
check("sitemap still lists /pricing", urls.some((u) => u.endsWith("/pricing")));
check("sitemap lists no API or report route", !urls.some((u) => /\/api\//.test(u)));

net.restore();
quiet.restore();
restoreEnv();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
