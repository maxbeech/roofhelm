import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "@/lib/posts";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Snow Load Guides",
  description: "Plain-English guides to roof snow load: how to calculate it, ground vs roof snow load, ASCE 7-22 changes, drift, metal roofs, solar and more.",
  alternates: { canonical: "/blog" },
};

// 1-week ISR (see app/page.tsx for why this is policy-correct even though
// it's currently a no-op: no external fetch backs this page yet).
export const revalidate = 604800;

export default function BlogIndex() {
  return (
    <div>
      <PageHeader eyebrow="Guides" title="Snow load guides">
        Practical, accurate walkthroughs of the ASCE 7 method, written for builders, engineers, solar
        installers and homeowners.
      </PageHeader>
      <div className="mx-auto grid max-w-6xl gap-3 px-5 py-12 sm:grid-cols-2">
        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`}
            className="group border border-ink-200 bg-paper p-5 transition hover:border-frost-500 hover:bg-frost-50">
            <div className="label text-frost-600">{p.readMins} min read</div>
            <div className="mt-2 font-display text-lg font-semibold leading-snug text-ink-900 group-hover:text-frost-700">{p.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
