import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { SiteFrame } from "@/components/site-frame";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";
import type { LookupResponse, PropertyResult, Status } from "@/lib/property-lookup";

const TITLE = "Free Philadelphia Rental Compliance Check | Kept";
const DESCRIPTION =
  "Check any Philadelphia rental's lead certificate, rental license, and open L&I violations in seconds. Free. See what needs fixing and get it handled.";

export const Route = createFileRoute("/check")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://keptlegal.co/check" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://keptlegal.co/check" }],
  }),
  component: CheckPage,
});

const field =
  "mt-2 block w-full min-h-14 rounded-xl border-2 border-input bg-background px-4 text-lg focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/20";
const btnPrimary =
  "inline-flex min-h-14 items-center justify-center rounded-xl bg-primary px-6 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-60";

const tone: Record<Status, { icon: typeof CheckCircle2; className: string }> = {
  current: { icon: CheckCircle2, className: "text-emerald-700 dark:text-emerald-400" },
  exempt: { icon: CheckCircle2, className: "text-emerald-700 dark:text-emerald-400" },
  expiring: { icon: AlertTriangle, className: "text-amber-700 dark:text-amber-400" },
  expired: { icon: XCircle, className: "text-destructive" },
  missing: { icon: XCircle, className: "text-destructive" },
  unknown: { icon: HelpCircle, className: "text-muted-foreground" },
};

const fmt = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;

function CheckPage() {
  const [state, setState] = useState<{ kind: "idle" | "loading" } | { kind: "done"; query: string; result: LookupResponse }>({ kind: "idle" });

  async function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = String(new FormData(e.currentTarget).get("address") ?? "").trim();
    if (!query) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/property-lookup?address=${encodeURIComponent(query)}`);
      setState({ kind: "done", query, result: (await res.json()) as LookupResponse });
    } catch {
      setState({ kind: "done", query, result: { ok: false, error: "upstream" } });
    }
  }

  return (
    <SiteFrame>
      <main className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Is your Philly rental legal? Check any address free.</h1>
        <p className="mt-6 text-xl text-muted-foreground">
          See your lead certificate, rental license, and open city violations in seconds, straight from City of Philadelphia public records.
        </p>

        <form onSubmit={onSearch} className="mt-8 rounded-2xl bg-muted p-6 sm:p-8">
          <label className="block font-semibold">
            Property address
            <input name="address" required maxLength={200} placeholder="e.g. 114 S 45th St" autoComplete="street-address" className={field} />
          </label>
          <button type="submit" disabled={state.kind === "loading"} className={`${btnPrimary} mt-5 w-full`}>
            {state.kind === "loading" ? "Checking city records…" : "Check my property"}
          </button>
        </form>

        {state.kind === "done" && <Results query={state.query} result={state.result} />}

        <p className="mt-10 text-base text-muted-foreground">
          Based on City of Philadelphia public records, which can lag behind recent filings. Kept will confirm everything before any work. Kept is a private
          company and is not affiliated with the City.
        </p>
      </main>
    </SiteFrame>
  );
}

function Results({ query, result }: { query: string; result: LookupResponse }) {
  if (!result.ok) {
    const message = {
      bad_address: "Please enter a street address with a house number, like 114 S 45th St.",
      not_found: "We couldn't find that address in the city's rental records. Leave your info and we'll check it for you by hand.",
      upstream: "The city's records aren't responding right now. Leave your info and we'll check it for you.",
    }[result.error];
    return (
      <section aria-live="polite" className="mt-10 space-y-6">
        <p className="text-lg">{message}</p>
        {result.error !== "bad_address" && <HelpForm address={query} summary={`Manual check requested (${result.error})`} />}
      </section>
    );
  }
  return (
    <section aria-live="polite" className="mt-10 space-y-10">
      {result.matches.map((m) => (
        <PropertyCard key={`${m.address}-${m.opaAccount}`} m={m} />
      ))}
    </section>
  );
}

function PropertyCard({ m }: { m: PropertyResult }) {
  const needsHelp =
    ["expired", "missing", "expiring"].includes(m.lead.status) || ["expired", "missing", "expiring"].includes(m.license.status) || (m.violations?.open ?? 0) > 0;
  const rows: { label: string; status: Status; detail: string | null }[] = [
    { label: "Lead certificate", status: m.lead.status, detail: m.lead.expires ? `${m.lead.status === "expired" ? "Expired" : "Expires"} ${fmt(m.lead.expires)}` : null },
    { label: "Rental license", status: m.license.status, detail: m.license.expires ? `${m.license.status === "expired" ? "Expired" : "Expires"} ${fmt(m.license.expires)}` : null },
  ];
  const summary = `Lead: ${m.lead.status}; License: ${m.license.status}; Open violations: ${m.violations?.open ?? "unknown"}`;

  return (
    <article className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{m.address}</h2>
      {m.yearBuilt && <p className="mt-1 text-muted-foreground">Built {m.yearBuilt}</p>}
      <ul className="mt-6 space-y-5">
        {rows.map((r) => {
          const T = tone[r.status];
          return (
            <li key={r.label} className="flex gap-3">
              <T.icon aria-hidden className={`mt-1 h-6 w-6 shrink-0 ${T.className}`} />
              <div>
                <p className="text-lg font-semibold">{r.label}</p>
                <p className={`text-lg ${T.className}`}>{r.label === "Lead certificate" ? m.lead.label : m.license.label}</p>
                {r.detail && <p className="text-base text-muted-foreground">{r.detail}</p>}
              </div>
            </li>
          );
        })}
        <li className="flex gap-3">
          {(() => {
            const open = m.violations?.open;
            const T = open === undefined ? tone.unknown : open > 0 ? tone.expired : tone.current;
            return (
              <>
                <T.icon aria-hidden className={`mt-1 h-6 w-6 shrink-0 ${T.className}`} />
                <div>
                  <p className="text-lg font-semibold">Open L&I violations</p>
                  <p className={`text-lg ${T.className}`}>
                    {open === undefined ? "Couldn't load violations right now" : open === 0 ? "None found" : `${open} open`}
                  </p>
                  {m.violations?.items.map((v, i) => (
                    <p key={i} className="text-base text-muted-foreground">
                      {v.title}
                      {v.date ? ` · ${fmt(v.date)}` : ""}
                    </p>
                  ))}
                </div>
              </>
            );
          })()}
        </li>
      </ul>

      <div className="mt-8 border-t border-border pt-6">
        {needsHelp ? (
          <>
            <h3 className="text-xl font-semibold">Have Kept fix this. Nothing upfront.</h3>
            <p className="mt-2 text-muted-foreground">
              We book a certified inspector, coordinate with your tenant, file with the city, and track your next deadline. You pay when your results are in.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold">Looking good. Want a reminder before anything expires?</h3>
            <p className="mt-2 text-muted-foreground">The city doesn't remind you about your lead certificate. We will.</p>
          </>
        )}
        <div className="mt-5">
          <HelpForm address={m.address} summary={summary} cta={needsHelp ? "Have Kept fix this" : "Remind me before it expires"} />
        </div>
      </div>
    </article>
  );
}

function HelpForm({ address, summary, cta = "Request a call back" }: { address: string; summary: string; cta?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "done">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setStatus("sending");
    const { error } = await supabase.from("leads").insert({
      letter_code: "WEB-CHECK",
      full_name: get("full_name"),
      phone: get("phone"),
      email: get("email") || null,
      property_address: `${address} | ${summary}`.slice(0, 300),
      best_time: get("best_time"),
    });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-xl bg-secondary p-5 text-lg">
        Thanks! We'll call or text you within 1 business day. Nothing upfront; you pay when your results are in.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block font-semibold">
        Full name
        <input name="full_name" required maxLength={200} autoComplete="name" className={field} />
      </label>
      <label className="block font-semibold">
        Phone number
        <input name="phone" type="tel" required minLength={7} maxLength={40} autoComplete="tel" className={field} />
      </label>
      <label className="block font-semibold">
        Email <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="email" type="email" maxLength={255} autoComplete="email" className={field} />
      </label>
      <fieldset>
        <legend className="font-semibold">Best time to reach you</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Morning", "Afternoon", "Evening"].map((t) => (
            <label
              key={t}
              className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-input text-base font-medium has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground"
            >
              <input type="radio" name="best_time" value={t} required className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={status === "sending"} className={`${btnPrimary} w-full`}>
        {status === "sending" ? "Sending…" : cta}
      </button>
      {status === "error" && (
        <p role="alert" className="text-base text-destructive">
          Something went wrong. Please try again, or{" "}
          <a className="font-semibold underline" href={SITE.phoneHref}>
            call or text {SITE.phoneDisplay}
          </a>
          .
        </p>
      )}
    </form>
  );
}
