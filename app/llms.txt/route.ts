import { ROOF_TYPES } from "@/lib/roof-types";
import { TOOLS } from "@/lib/tools";
import { POSTS } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

// llms.txt format: https://llmstxt.org
export function GET() {
  const body = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "RoofHelm is a free roof calculator suite for homeowners, contractors and building professionals. Every calculator shows its formula and every factor it uses. It is a planning and checking aid, not a stamped engineering document: confirm snow loads with the ground snow load your building department adopts, and have a licensed engineer review the design.",
    "",
    "## Snow load calculators",
    ...ROOF_TYPES.map((r) => `- [${r.name}](${SITE.url}/calculators/${r.slug}): ${r.focus}`),
    "",
    "## Roof geometry, envelope, HVAC and cost calculators",
    ...TOOLS.map((t) => `- [${t.name}](${SITE.url}/calculators/${t.slug}): ${t.focus}`),
    "",
    "## Reference",
    `- [Ground snow load by state](${SITE.url}/states): ASCE 7 planning ranges by state`,
    `- [Snow drift calculator](${SITE.url}/drift): drift load from the roof geometry`,
    `- [Methodology](${SITE.url}/methodology): the formulas and standards behind every calculation`,
    "",
    "## Essays",
    ...POSTS.map((p) => `- [${p.title}](${SITE.url}/blog/${p.slug}): ${p.description}`),
    "",
    "## Pricing and quotes",
    `- [Pricing](${SITE.url}/pricing): the calculators are free; the Pro permit-ready PDF report is a one-time $29`,
    `- [Quotes](${SITE.url}/quote): free supplier quotes for steel buildings, carports and pole barns sized to the ASCE 7 design snow load`,
    "",
    "## Machine-readable",
    `- [Sitemap](${SITE.url}/sitemap.xml)`,
    `- [Robots policy](${SITE.url}/robots.txt)`,
    "- There is no public API. Pages carry schema.org JSON-LD (WebApplication, Organization, WebSite, Article, FAQPage, BreadcrumbList).",
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
