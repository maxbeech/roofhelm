// Machine-readability surfaces: the canonical host, the AI-crawler policy and llms.txt.
// Failures print the value that was produced so a regression is visible in the log.
import * as robotsModule from "../app/robots";
import { GET as llmsGet } from "../app/llms.txt/route";
import { SITE } from "../lib/site";
import { ROOF_TYPES } from "../lib/roof-types";
import { TOOLS } from "../lib/tools";
import { POSTS } from "../lib/posts";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}

const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];

const canonical = SITE.url;
check("SITE.url is the live www host (bare host 308-redirects to www)", canonical === "https://www.roofhelm.com", canonical);

// tsx loads app/robots.ts as CJS, so the exported function sits one level down.
const robots = (robotsModule.default as unknown as { default: () => { rules: unknown; sitemap?: string } }).default;
const policy = robots() as { rules: { userAgent: string | string[]; allow?: string }[] | { userAgent: string | string[]; allow?: string }; sitemap?: string };
const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
const allowed = (agent: string) => rules.some((r) => {
  const agents = Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent];
  return agents.includes(agent) && r.allow === "/";
});
for (const bot of AI_BOTS) {
  check(`robots.txt explicitly allows ${bot}`, allowed(bot), JSON.stringify(rules));
}
check("robots.txt still allows all other crawlers", allowed("*"), JSON.stringify(rules));
check("robots.txt points to the sitemap on the canonical host", policy.sitemap === `${canonical}/sitemap.xml`, String(policy.sitemap));

const res = llmsGet();
const body = await res.text();
check("llms.txt is served as text/plain", (res.headers.get("Content-Type") ?? "").startsWith("text/plain"), String(res.headers.get("Content-Type")));
check("llms.txt opens with the H1 site name", body.startsWith(`# ${SITE.name}\n`), body.slice(0, 80));
check("llms.txt has a blockquote summary", body.includes(`> ${SITE.description}`));
for (const r of ROOF_TYPES) {
  check(`llms.txt links roof type ${r.slug}`, body.includes(`${canonical}/calculators/${r.slug})`));
}
for (const t of TOOLS) {
  check(`llms.txt links tool ${t.slug}`, body.includes(`${canonical}/calculators/${t.slug})`));
}
for (const p of POSTS) {
  check(`llms.txt links essay ${p.slug}`, body.includes(`${canonical}/blog/${p.slug})`));
}
check("llms.txt states there is no public API", body.includes("There is no public API"));
check("llms.txt links only canonical-host URLs", !/\]\(https:\/\/(?!www\.roofhelm\.com\/)/.test(body));

console.log(`\ngeo-surfaces: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("geo-surfaces: all passed");
