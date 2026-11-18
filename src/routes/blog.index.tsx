import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFrame } from "@/components/site-frame";
import { articles } from "@/lib/articles";

export const Route = createFileRoute("/blog/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Philadelphia Rental Compliance Blog | Kept" },
      { name: "description", content: "Practical articles for Philadelphia landlords on lead-safe certificate renewals, certified inspections, tenant access and city filing." },
      { property: "og:title", content: "Philadelphia Rental Compliance Blog | Kept" },
      { property: "og:description", content: "Lead-safe certificate renewal articles for Philadelphia landlords, from Kept." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://keptlegal.co/blog" },
      { name: "twitter:card", content: "summary" },
    ], links: [{ rel: "canonical", href: "https://keptlegal.co/blog" }],
  }),
  component: Blog,
});

function Blog() {
  return <SiteFrame><main className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
    <h1 className="text-4xl font-bold sm:text-5xl">Kept blog</h1>
    <p className="mt-6 text-xl text-muted-foreground">Lead-safe certificate renewals and rental compliance for Philadelphia landlords.</p>
    <div className="mt-10 divide-y divide-border">
      {articles.map((article) => <article key={article.slug} className="py-8">
        <h2 className="text-2xl font-bold"><Link to="/blog/$slug" params={{ slug: article.slug }} className="text-primary underline-offset-4 hover:underline">{article.title}</Link></h2>
        <p className="mt-3 text-muted-foreground">{article.description}</p>
        <Link to="/blog/$slug" params={{ slug: article.slug }} className="mt-4 inline-block font-semibold text-primary underline underline-offset-4">Read article</Link>
      </article>)}
    </div>
  </main></SiteFrame>;
}