import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CTA } from "@/components/ui";
import { POSTS, getPost } from "@/lib/posts";
import { SITE } from "@/lib/site";

export const dynamicParams = false;
// 1-week ISR (see app/page.tsx for the reasoning).
export const revalidate = 604800;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description },
  };
}

const linkCls = "border border-ink-200 bg-paper px-3 py-1.5 text-sm text-ink-500 transition hover:border-frost-500 hover:text-ink-900";

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Essays", href: "/blog" }, { name: p.title, href: `/blog/${p.slug}` }]} />

      <div className="label text-frost-600">Essay · {p.readMins} min read</div>
      <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-900 sm:text-[2.7rem]">{p.title}</h1>
      <p className="mt-4 border-l-2 border-ink-900 pl-4 font-display text-xl italic leading-relaxed text-ink-600">{p.description}</p>

      <div className="mt-9 space-y-6">
        {p.body.map((sec, i) => (
          <section key={i}>
            {sec.h && <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900">{sec.h}</h2>}
            {sec.p.map((para, j) => (
              <p key={j} className={`mt-3 text-[15.5px] leading-7 text-ink-700 ${i === 0 && j === 0 ? "dropcap" : ""}`}>{para}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 border-2 border-ink-900 bg-paper p-6">
        <div className="font-display text-base font-semibold text-ink-900">Run the numbers</div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">Get your design roof snow load in seconds with the free ASCE 7-22 calculator.</p>
        <CTA href="/" className="mt-4">Open the calculator</CTA>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink-700">Related</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { name: "Snow load by roof type", href: "/calculators" },
            { name: "Ground snow load by state", href: "/states" },
            { name: "Snow drift calculator", href: "/drift" },
            { name: "How it works", href: "/methodology" },
            { name: "More guides", href: "/blog" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>{l.name}</Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Article",
        headline: p.title, description: p.description, datePublished: p.date,
        author: { "@type": "Organization", name: SITE.name },
        publisher: { "@type": "Organization", name: SITE.name },
      }) }} />
    </article>
  );
}
