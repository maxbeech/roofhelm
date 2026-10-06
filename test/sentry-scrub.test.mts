import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { scrubBreadcrumb, scrubEvent, scrubLog, scrubText, scrubTransaction, stripQuery, MAX_SCAN } from "../lib/scrub.ts";
import { safeContext } from "../lib/observability.ts";
import { FeedbackButton } from "../components/FeedbackButton.tsx";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const any = (x: unknown) => x as any;

// Sample secrets are assembled at runtime so no literal key sits in the repo.
const SECRETS = {
  email: "jane.roofer@example.com",
  phone: "+44 7700 900123",
  stripe: ["sk", "live", "A1b2C3d4E5f6G7h8"].join("_"),
  whsec: ["whsec", "Zz9Yy8Xx7Ww6Vv5U"].join("_"),
  helm: ["hlm_sk", "abcdef123456789"].join("_"),
  sentry: ["sntrys", "eyAAAA1111BBBB2222"].join("_"),
  jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJl",
  bearer: "Bearer abcdefghijklmnop1234",
};
const joined = Object.values(SECRETS).join(" | ");
const out = scrubText(joined);
for (const [k, v] of Object.entries(SECRETS)) check(`scrubText redacts ${k}`, !out.includes(v.replace("Bearer ", "")), out);
check("scrubText redacts key=value and JSON", !scrubText('password=hunter2 {"token":"abc12345"}').match(/hunter2|abc12345/));
check("scrubText keeps harmless text", scrubText("Snow load 25 psf at 4:12 pitch") === "Snow load 25 psf at 4:12 pitch");

// ReDoS: hostile input must finish quickly and be truncated.
const hostile = ["a".repeat(200_000), "a@".repeat(60_000), "+1".concat("1 ".repeat(60_000)), "Bearer ".concat("a".repeat(200_000)), "eyJ" + "a.".repeat(60_000), "password=" + "=".repeat(100_000)];
for (const h of hostile) {
  const t0 = performance.now();
  const r = scrubText(h);
  const ms = performance.now() - t0;
  check(`adversarial ${h.slice(0, 8)} finishes fast (${ms.toFixed(0)}ms)`, ms < 250 && r.length <= MAX_SCAN + 20);
}

// Events.
const ev = scrubEvent(any({
  message: `fail for ${SECRETS.email}`,
  request: { url: "https://x.test/quote?email=a@b.co&token=zzz", headers: { authorization: SECRETS.bearer }, data: { phone: "123" }, cookies: { a: "b" } },
  extra: { password: "x", scope: "lead" },
  user: { id: "u1", email: SECRETS.email, ip_address: "1.2.3.4" },
  breadcrumbs: [{ message: "GET /a?b=c", data: { url: "/a?b=c", to: "/z?q=1" } }],
}));
check("event message scrubbed", !JSON.stringify(ev).includes(SECRETS.email));
check("event url query stripped", any(ev).request.url === "https://x.test/quote");
check("event headers/data redacted", any(ev).request.headers.authorization === "[redacted]" && any(ev).request.data.phone === "[redacted]");
check("event user reduced to id", JSON.stringify(any(ev).user) === '{"id":"u1"}');
check("breadcrumb in event stripped", any(ev).breadcrumbs[0].data.url === "/a" && any(ev).breadcrumbs[0].data.to === "/z" && !any(ev).breadcrumbs[0].message.includes("?"));

const fb = scrubEvent(any({ contexts: { feedback: { message: "QA", contact_email: "me@x.co", name: "Max" } }, user: { email: "me@x.co", username: "Max" } }));
check("feedback keeps name and email", any(fb).contexts.feedback.contact_email === "me@x.co" && any(fb).user.email === "me@x.co");

// Breadcrumb, transaction, log.
const bc = scrubBreadcrumb(any({ message: "fetch /api?x=1", data: { url: "https://x.test/api?token=abc", "http.query": "x=1" } }));
check("breadcrumb scrubbed", any(bc).data.url === "https://x.test/api" && !("http.query" in any(bc).data) && !any(bc).message.includes("?"));
const tx = scrubTransaction(any({ transaction: "GET /a?b=1", request: { url: "https://x.test/a?b=1", headers: { a: "b" } }, spans: [{ description: "GET https://x.test/p?q=1", data: { "http.url": "https://x.test/p?q=1", "url.query": "q=1" } }] }));
check("transaction scrubbed", any(tx).request.url === "https://x.test/a" && any(tx).transaction === "GET /a" && any(tx).spans[0].data["http.url"] === "https://x.test/p" && !("url.query" in any(tx).spans[0].data) && !any(tx).spans[0].description.includes("?"));
const lg = scrubLog(any({ level: "info", message: `hi ${SECRETS.stripe}`, attributes: { token: "t", id: "ok", note: SECRETS.email } }));
check("log scrubbed", !JSON.stringify(lg).includes(SECRETS.stripe) && !JSON.stringify(lg).includes(SECRETS.email) && any(lg).attributes.id === "ok");

// Fail closed: a getter that throws must drop the payload, not pass it on.
const origError = console.error; console.error = () => {};
const bomb = { get message(): string { throw new Error("boom"); } };
check("scrubLog fails closed", scrubLog(any(bomb)) === null);
check("scrubEvent fails closed", scrubEvent(any(bomb)) === null);
check("scrubBreadcrumb fails closed", scrubBreadcrumb(any(bomb)) === null);
check("scrubTransaction fails closed", scrubTransaction(any({ get transaction(): string { throw new Error("boom"); } })) === null);
console.error = origError;
check("stripQuery", stripQuery("/a?b=1#c") === "/a");

// Capture helper context is ids only.
const ctx = safeContext({ scope: "lead", status: 502, ok: false, structure: "steel_building", email: SECRETS.email, notes: "free text with spaces" });
check("safeContext keeps ids and drops text", ctx.scope === "lead" && ctx.status === 502 && ctx.structure === "steel_building" && ctx.email === "[omitted]" && ctx.notes === "[omitted]");

// Feedback control renders in the shell and the footer, and every init is wired.
check("feedback button renders", renderToStaticMarkup(createElement(FeedbackButton, { variant: "menu" })).includes("Send feedback"));
const layout = readFileSync("app/layout.tsx", "utf8");
check("layout has nav, menu and footer feedback controls", ["nav", "menu", "footer"].every((v) => layout.includes(`<FeedbackButton variant="${v}"`)));
const shared = readFileSync("lib/sentry-options.ts", "utf8");
check("shared options wire logs and every scrubber", ["enableLogs: true", "beforeSend: scrubEvent", "beforeSendLog: scrubLog", "beforeSendTransaction", "beforeBreadcrumb", "consoleLoggingIntegration"].every((s) => shared.includes(s)));
check("swallow sites call the capture helper", ["app/api/checkout/route.ts", "app/api/checkout/status/route.ts", "app/api/lead/route.ts"].every((f) => readFileSync(f, "utf8").includes("captureServerError")));
check("client init uses tunnel content-type fix and own button", /application\/x-sentry-envelope/.test(readFileSync("instrumentation-client.ts", "utf8")) && /autoInject: false/.test(readFileSync("instrumentation-client.ts", "utf8")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
