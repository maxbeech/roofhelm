// RoofHelm runs on Helm7, not Vercel. A `VERCEL_*` check is always unset there,
// so a Sentry environment read from one reports every production error as
// "development", and a Vercel package or script left behind ships dead code or
// breaks the build. Keep all of it out. The generated service clients are
// copies of a shared source and are not policed here.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.error(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx?|mts|mjs)$/.test(name) ? [path] : [];
  });
}

const files = [
  ...["app", "components", "lib"].flatMap(sources),
  ...["next.config.ts", "instrumentation.ts", "instrumentation-client.ts", "sentry.server.config.ts", "sentry.edge.config.ts"].filter(existsSync),
].filter((f) => !/GENERATED/.test(readFileSync(f, "utf8").slice(0, 400)));

check("finds the source to police", files.length > 30, `${files.length} files`);
const offenders = files.filter((f) => /vercel/i.test(readFileSync(f, "utf8")));
check("names Vercel nowhere in application code", offenders.length === 0, offenders.join(", "));

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const vercelPackages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((n) => n === "vercel" || n.startsWith("@vercel/"));
check("no Vercel package", vercelPackages.length === 0, vercelPackages.join(", "));
check("no script runs the vercel CLI", !Object.values(pkg.scripts ?? {}).some((s) => /(^|[\s&;])(npx\s+)?vercel(\s|$)/.test(s)));
check("no vercel.json", !existsSync("vercel.json"));
// Stripe's success and cancel URLs fall back to the site's own URL, never a
// hosting-provider address that stops resolving once the project is gone.
check("checkout falls back to SITE.url", /NEXT_PUBLIC_SITE_URL \?\? SITE\.url/.test(readFileSync("app/api/checkout/route.ts", "utf8")));
// Helm7 runs `npm start` with PORT set; a hard-coded port leaves the health
// check probing a port nothing listens on.
check("start honours $PORT", (pkg.scripts?.start ?? "").includes("${PORT"), pkg.scripts?.start);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
