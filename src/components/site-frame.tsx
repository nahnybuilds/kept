import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

export function SiteFrame({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="leading-none"><span className="block text-3xl font-bold text-primary">Kept</span><span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground sm:text-sm">Rental compliance, handled.</span></Link>
        <a href={SITE.phoneHref} className="text-base font-semibold text-primary underline-offset-4 hover:underline sm:text-lg">Call or text {SITE.phoneDisplay}</a>
      </div>
    </header>
    {children}
    <footer className="border-t border-border px-5 py-10 text-base text-muted-foreground"><div className="mx-auto max-w-3xl space-y-2">
      <p><span className="font-bold text-primary">Kept</span> · <a className="underline" href={SITE.phoneHref}>Call or text {SITE.phoneDisplay}</a> · <span>{SITE.email}</span></p>
      <p><Link to="/" className="underline">Home</Link> · <Link to="/blog" className="underline">Blog</Link></p>
      <p>Kept is a private company and is not affiliated with the City of Philadelphia.</p><p>© 2026 Kept</p>
    </div></footer>
  </div>;
}