import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteFrame } from "@/components/site-frame";
import { findArticle, articleStructuredData } from "@/lib/articles";

export const Route = createFileRoute("/blog/$slug")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const article = findArticle(params.slug);
    if (!article) throw notFound();
    return article;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Article unavailable | Kept" }, { name: "robots", content: "noindex" }, { name: "description", content: "This Kept article is unavailable." }, { property: "og:title", content: "Article unavailable | Kept" }, { property: "og:description", content: "This Kept article is unavailable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
    const url = `https://keptlegal.co/blog/${loaderData.slug}`;
    return {
      meta: [
        { title: loaderData.seoTitle }, { name: "description", content: loaderData.description },
        { property: "og:title", content: loaderData.seoTitle }, { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "article" }, { property: "og:url", content: url }, { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: articleStructuredData(loaderData).map((data) => ({ type: "application/ld+json", children: JSON.stringify(data).replace(/</g, "\\u003c") })),
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const article = Route.useLoaderData();
  return <SiteFrame><main className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
    <Link to="/blog" className="font-semibold text-primary underline underline-offset-4">← Kept blog</Link>
    <article className="mt-8">
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
      <p className="mt-6 text-xl text-muted-foreground">{article.description}</p>
      {article.sections.map((section) => <section key={section.heading} className="mt-10">
        <h2 className="text-2xl font-bold">{section.heading}</h2>
        {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4">{paragraph}</p>)}
      </section>)}
      <section className="mt-10"><h2 className="text-2xl font-bold">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6">{article.faqs.map(([q, a]) => <div key={q}><dt className="text-xl font-semibold">{q}</dt><dd className="mt-2 text-muted-foreground">{a}</dd></div>)}</dl>
      </section>
      <section className="mt-10"><h2 className="text-2xl font-bold">City sources</h2><ul className="mt-4 space-y-3">{article.sources.map((source) => <li key={source.url}><a href={source.url} className="text-primary underline underline-offset-4">{source.title}</a></li>)}</ul></section>
      <p className="mt-8 text-base text-muted-foreground">General information, not legal advice. Confirm the requirements for your property with the City and your certified inspector.</p>
    </article>
    <div className="mt-12 border-t border-border pt-8"><h2 className="text-2xl font-bold">Get a free quote for your property</h2><p className="mt-3 text-muted-foreground">No letter needed. Kept coordinates your renewal.</p><Link to="/" hash="start" className="mt-5 inline-flex min-h-14 items-center justify-center rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground hover:bg-primary/90">Request a call back</Link></div>
  </main></SiteFrame>;
}