import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CalendarClock, FileCheck2, Search, Wallet, PhoneCall, ShieldCheck, BellRing } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kept — Keep your Philly rental legal" },
      { name: "description", content: "We handle your lead-safe certificate inspection and city filing. You don't pay unless it gets done." },
      { property: "og:title", content: "Kept — Keep your Philly rental legal" },
      { property: "og:description", content: "We handle the lead-safe inspection and city filing for small Philadelphia landlords." },
    ],
  }),
  component: Index,
});

const btn = "inline-flex min-h-14 items-center justify-center rounded-xl px-6 text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnOutline = `${btn} border-2 border-primary text-primary hover:bg-accent`;

const steps = [
  { icon: Search, title: "We schedule a certified lead inspector", body: "A state/EPA-certified inspector visits your property." },
  { icon: FileCheck2, title: "We file your new certificate with the city", body: "No portals, no forms for you." },
  { icon: CalendarClock, title: "We watch your deadlines", body: "We remind you before anything expires again." },
];
const benefits = [
  { icon: Wallet, title: "No upfront cost", body: "You only pay once your certificate is filed." },
  { icon: PhoneCall, title: "One call, done", body: "We coordinate the inspector, paperwork, and city upload." },
  { icon: ShieldCheck, title: "Protect your rent", body: "Stay legally able to collect rent and renew your license." },
  { icon: BellRing, title: "Never miss a deadline", body: "We track your lead certificate and rental license dates." },
];
const faqs = [
  ["Are you the City of Philadelphia?", "No. Kept is a private company. We're not affiliated with the City. We help landlords handle city requirements."],
  ["How did you find my property?", "Lead certificate and rental license records are public. We use them to reach landlords who may need help."],
  ["What if I already renewed?", "Great! Just ignore our letter, or text us and we'll update our records."],
  ["How long does it take?", "Inspections can usually be scheduled within a few days, and results are typically back within 1–3 days after that."],
  ["What if my property doesn't pass?", "We'll explain what needs fixing, help coordinate it, and schedule a retest."],
  ["Do I have to be there?", "Someone needs to give the inspector access. We'll help coordinate with you or your tenant."],
];

function Section({ id, title, children, muted }: { id?: string; title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section id={id} className={`px-5 py-16 sm:py-20 ${muted ? "bg-muted" : ""}`}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <a href="#top" className="text-3xl font-bold tracking-tight text-primary">Kept</a>
          <a href={SITE.phoneHref} className="text-base font-semibold text-primary underline-offset-4 hover:underline sm:text-lg">
            Call or text {SITE.phoneDisplay}
          </a>
        </div>
      </header>

      <main id="top">
        <section className="px-5 pb-16 pt-14 sm:pt-24">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Keep your Philly rental legal. <span className="text-primary">We handle the paperwork.</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground">
              If your rental's lead-safe certificate has expired or is about to, we take care of the inspection and city filing for you. You don't pay unless it gets done.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#start" className={btnPrimary}>I got a letter</a>
              <a href={SITE.phoneHref} className={btnOutline}>Call or text {SITE.phoneDisplay}</a>
            </div>
          </div>
        </section>

        <Section title="Why this matters" muted>
          <p className="text-xl">
            In Philadelphia, rentals built before 1978 need a valid lead-safe or lead-free certificate. When it lapses, landlords can't legally collect rent for that time or evict for unpaid rent, and the rental license can't be renewed. Most landlords don't realize it has expired.
          </p>
        </Section>

        <Section title="How it works">
          <ol className="space-y-8">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold text-secondary-foreground">{i + 1}</div>
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-semibold"><s.icon aria-hidden className="h-5 w-5 text-primary" />{s.title}</h3>
                  <p className="mt-1 text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="What you get" muted>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl border border-border bg-background p-6">
                <b.icon aria-hidden className="h-7 w-7 text-primary" />
                <h3 className="mt-3 text-xl font-semibold">{b.title}</h3>
                <p className="mt-1 text-muted-foreground">{b.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Simple pricing">
          <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8">
            <p className="text-xl">
              Starting at <strong className="text-2xl text-primary">{SITE.price}</strong> per unit. Includes the inspection, lab results, and filing with the city. You don't pay unless it's done.
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              If a unit doesn't pass, we'll explain your options and help coordinate the fix before retesting.
            </p>
          </div>
        </Section>

        <Section id="start" title="Got our letter? Let's get started." muted>
          <LeadForm />
        </Section>

        <Section title="Questions">
          <Accordion type="single" collapsible>
            {faqs.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="py-5 text-left text-lg font-semibold">{q}</AccordionTrigger>
                <AccordionContent className="text-lg text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      </main>

      <footer className="border-t border-border px-5 py-10 text-base text-muted-foreground">
        <div className="mx-auto max-w-3xl space-y-2">
          <p>
            <span className="font-bold text-primary">Kept</span> · <a className="underline" href={SITE.phoneHref}>Call or text {SITE.phoneDisplay}</a> · <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
          <p>Kept is a private company and is not affiliated with the City of Philadelphia.</p>
          <p>© 2026 Kept</p>
        </div>
      </footer>
    </div>
  );
}

const field = "mt-2 block w-full min-h-14 rounded-xl border-2 border-input bg-background px-4 text-lg focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/20";

function LeadForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [doneName, setDoneName] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const name = get("full_name");
    setStatus("sending");
    const { error } = await supabase.from("leads").insert({
      letter_code: get("letter_code") || null,
      full_name: name,
      phone: get("phone"),
      email: get("email") || null,
      property_address: get("property_address"),
      best_time: get("best_time"),
    });
    if (error) { setStatus("error"); return; }
    setDoneName(name.split(" ")[0] || name);
  }

  if (doneName) {
    return (
      <div role="status" className="rounded-2xl border-2 border-primary/30 bg-background p-8 text-xl">
        Thanks, {doneName}! We'll call you within 1 business day. Questions sooner? Call or text{" "}
        <a className="font-semibold text-primary underline" href={SITE.phoneHref}>{SITE.phoneDisplay}</a>.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-background p-6 sm:p-8">
      <label className="block font-semibold">Letter code <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="letter_code" maxLength={40} placeholder="e.g. A351057800" className={field} />
      </label>
      <label className="block font-semibold">Full name
        <input name="full_name" required maxLength={200} autoComplete="name" className={field} />
      </label>
      <label className="block font-semibold">Phone number
        <input name="phone" type="tel" required minLength={7} maxLength={40} autoComplete="tel" className={field} />
      </label>
      <label className="block font-semibold">Email <span className="font-normal text-muted-foreground">(optional)</span>
        <input name="email" type="email" maxLength={255} autoComplete="email" className={field} />
      </label>
      <label className="block font-semibold">Property address
        <input name="property_address" required minLength={3} maxLength={300} autoComplete="street-address" className={field} />
      </label>
      <fieldset>
        <legend className="font-semibold">Best time to reach you</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {["Morning", "Afternoon", "Evening"].map((t, i) => (
            <label key={t} className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-input text-base font-medium has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground">
              <input type="radio" name="best_time" value={t} defaultChecked={i === 0} className="sr-only" />{t}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={status === "sending"} className={`${btnPrimary} w-full disabled:opacity-60`}>
        {status === "sending" ? "Sending…" : "Request a call back"}
      </button>
      {status === "error" && <p role="alert" className="text-base text-destructive">Something went wrong. Please try again, or <a className="font-semibold underline" href={SITE.phoneHref}>call or text {SITE.phoneDisplay}</a>.</p>}
      <p className="text-center text-base text-muted-foreground">We'll call you within 1 business day. We never sell your information.</p>
    </form>
  );
}
