import type { MetadataRoute } from "next";
import { ROOF_TYPES } from "@/lib/roof-types";
import { TOOLS } from "@/lib/tools";
import { STATE_SNOW } from "@/lib/ground-snow";
import { POSTS } from "@/lib/posts";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, priority: 1 },
    { url: `${SITE.url}/calculators`, lastModified: now, priority: 0.8 },
    { url: `${SITE.url}/states`, lastModified: now, priority: 0.7 },
    { url: `${SITE.url}/drift`, lastModified: now, priority: 0.7 },
    { url: `${SITE.url}/blog`, lastModified: now, priority: 0.7 },
    { url: `${SITE.url}/pricing`, lastModified: now, priority: 0.6 },
    { url: `${SITE.url}/quote`, lastModified: now, priority: 0.7 },
    { url: `${SITE.url}/methodology`, lastModified: now, priority: 0.5 },
  ];
  for (const r of ROOF_TYPES) urls.push({ url: `${SITE.url}/calculators/${r.slug}`, lastModified: now, priority: 0.8 });
  for (const t of TOOLS) urls.push({ url: `${SITE.url}/calculators/${t.slug}`, lastModified: now, priority: 0.8 });
  for (const s of STATE_SNOW) urls.push({ url: `${SITE.url}/states/${s.slug}`, lastModified: now, priority: 0.6 });
  for (const p of POSTS) urls.push({ url: `${SITE.url}/blog/${p.slug}`, lastModified: now, priority: 0.6 });
  return urls;
}
