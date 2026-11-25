import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock, PauseCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { SiteFrame } from "@/components/site-frame";
import { dollars, type JobStatus, type Proof, type Rules } from "@/lib/pay-on-proof";

export const Route = createFileRoute("/admin/pay-on-proof")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Pay-on-Proof | Kept" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: PayOnProofPage,
});

type JobRow = {
  id: string;
  created_at: string;
  address: string;
  payer_name: string;
  payee_name: string;
  amount_cents: number;
  status: JobStatus;
  held_at: string;
  baseline_cert_status: string | null;
  baseline_cert_expires: string | null;
  last_checked_at: string | null;
  last_note: string | null;
  review_reason: string | null;
  proof: Proof | null;
  paid_at: string | null;
  payout_ref: string | null;
  resolved_by: string | null;
};
type EventRow = { id: number; created_at: string; job_id: string | null; kind: string; message: string };
type State = { mode: string; rules: Rules; jobs: JobRow[]; events: EventRow[]; paidThisMonthCents: number };

const TOKEN_KEY = "kept-pop-token";
const readToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
};
const writeToken = (t: string) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: token lives in memory only */
  }
};

const field =
  "mt-1 block w-full min-h-12 rounded-xl border-2 border-input bg-background px-3 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/20";
const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:opacity-60";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnOutline = `${btn} border-2 border-border bg-background hover:bg-muted`;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const statusStyle: Record<JobStatus, { label: string; className: string; icon: typeof Clock }> = {
  held: { label: "Held · waiting for proof", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", icon: Clock },
  needs_review: { label: "Needs your approval", className: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200", icon: PauseCircle },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200", icon: CheckCircle2 },
  refunded: { label: "Refunded", className: "bg-muted text-muted-foreground", icon: RotateCcw },
};

function PayOnProofPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setToken(readToken()), []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
      if (res.status === 401) {
        writeToken("");
        setToken("");
        throw new Error("Wrong admin password.");
      }
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || body.ok === false) throw new Error(String(body.error ?? `Request failed (${res.status})`));
      return body;
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setState((await api("/api/pop-jobs")) as unknown as State);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(label: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice(success);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const lock = (t: string) => {
    writeToken(t);
    setToken(t);
  };

  if (!token) return <Login onToken={lock} />;

  const queue = state?.jobs.filter((j) => j.status === "needs_review") ?? [];
  const held = state?.jobs.filter((j) => j.status === "held") ?? [];
  const heldTotal = held.reduce((s, j) => s + j.amount_cents, 0);

  return (
    <SiteFrame>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pay-on-Proof</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
              Landlord money is held. The agent checks City lead-certificate records and pays the inspector only when a new certificate appears. Anything outside your
              limits comes to you.
            </p>
          </div>
          {state?.mode === "simulated" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">Demo mode · no real money moves</span>
          )}
        </div>

        {error && <p role="alert" className="mt-6 rounded-xl border-2 border-destructive p-4 text-destructive">{error}</p>}
        {notice && <p aria-live="polite" className="mt-6 rounded-xl bg-muted p-4">{notice}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Held, waiting for proof" value={dollars(heldTotal)} sub={`${held.length} job${held.length === 1 ? "" : "s"}`} />
          <Stat label="Needs your approval" value={String(queue.length)} sub={queue.length ? "See below" : "Nothing waiting"} />
          <Stat
            label="Paid this month"
            value={dollars(state?.paidThisMonthCents ?? 0)}
            sub={state ? `of ${dollars(state.rules.monthlyLimitCents)} monthly limit` : ""}
          />
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className={btnPrimary}
            disabled={busy !== null}
            onClick={() =>
              act("run", async () => {
                const r = (await api("/api/pop-run", { method: "POST" })) as { summary: { checked: number; paid: number; review: number; waiting: number } };
                setNotice(`Checked ${r.summary.checked} · paid ${r.summary.paid} · sent to you ${r.summary.review} · still waiting ${r.summary.waiting}`);
              })
            }
          >
            <ShieldCheck aria-hidden className="h-5 w-5" />
            {busy === "run" ? "Checking City records…" : "Run checks now"}
          </button>
          <button className={btnOutline} onClick={() => void refresh()} disabled={busy !== null}>
            Refresh
          </button>
          <button className={btnOutline} onClick={() => lock("")}>
            Lock
          </button>
        </div>

        {queue.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Needs your approval</h2>
            <div className="mt-4 space-y-4">
              {queue.map((j) => (
                <article key={j.id} className="rounded-2xl border-2 border-blue-300 bg-card p-5 dark:border-blue-800">
                  <JobHeader j={j} />
                  <p className="mt-3 text-lg">{j.review_reason}</p>
                  {j.proof && <ProofBox proof={j.proof} />}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button className={btnPrimary} disabled={busy !== null} onClick={() => act(j.id, () => api("/api/pop-jobs", { method: "POST", body: JSON.stringify({ op: "approve", jobId: j.id }) }), `Paid ${j.payee_name}.`)}>
                      Approve and pay {dollars(j.amount_cents)}
                    </button>
                    <button className={btnOutline} disabled={busy !== null} onClick={() => act(j.id, () => api("/api/pop-jobs", { method: "POST", body: JSON.stringify({ op: "wait", jobId: j.id }) }), "Sent back to wait for proof.")}>
                      Keep waiting
                    </button>
                    <button className={btnOutline} disabled={busy !== null} onClick={() => act(j.id, () => api("/api/pop-jobs", { method: "POST", body: JSON.stringify({ op: "reject", jobId: j.id }) }), `Refunded ${j.payer_name}.`)}>
                      Reject and refund
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <NewJob busy={busy !== null} onCreate={(body) => act("create", () => api("/api/pop-jobs", { method: "POST", body: JSON.stringify({ op: "create", ...body }) }), "Money held. The agent will check City records on each run.")} />
          {state && <Limits rules={state.rules} busy={busy !== null} onSave={(rules) => act("rules", () => api("/api/pop-jobs", { method: "POST", body: JSON.stringify({ op: "rules", rules }) }), "Limits saved.")} />}
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">All jobs</h2>
          {state && state.jobs.length === 0 && <p className="mt-3 text-muted-foreground">No jobs yet. Create one above.</p>}
          <div className="mt-4 space-y-3">
            {state?.jobs
              .filter((j) => j.status !== "needs_review")
              .map((j) => (
                <article key={j.id} className="rounded-2xl border-2 border-border bg-card p-5">
                  <JobHeader j={j} />
                  <p className="mt-2 text-muted-foreground">
                    {j.status === "held" && <>Last check {when(j.last_checked_at)}: {j.last_note}</>}
                    {j.status === "paid" && <>Paid {when(j.paid_at)} by {j.resolved_by === "agent" ? "the agent" : "you"} · {j.payout_ref}</>}
                    {j.status === "refunded" && <>Refunded · {j.payout_ref}</>}
                  </p>
                  {j.status === "paid" && j.proof && <ProofBox proof={j.proof} />}
                </article>
              ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Activity log</h2>
          <ol className="mt-4 space-y-2">
            {state?.events.map((e) => (
              <li key={e.id} className="flex gap-3 text-base">
                <span className="w-32 shrink-0 text-muted-foreground">{when(e.created_at)}</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </SiteFrame>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-muted p-5">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function JobHeader({ j }: { j: JobRow }) {
  const s = statusStyle[j.status];
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-bold">{j.address}</h3>
        <p className="text-muted-foreground">
          {j.payer_name} → {j.payee_name} · <span className="font-semibold text-foreground tabular-nums">{dollars(j.amount_cents)}</span> · held {when(j.held_at)}
        </p>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${s.className}`}>
        <s.icon aria-hidden className="h-4 w-4" />
        {s.label}
      </span>
    </div>
  );
}

function ProofBox({ proof }: { proof: Proof }) {
  return (
    <div className="mt-3 rounded-xl bg-muted p-4 text-base">
      <p className="font-semibold">Proof from {proof.source}</p>
      <p>
        {proof.address} · {proof.certStatus}
        {proof.certExpires ? ` · expires ${proof.certExpires}` : ""}
      </p>
      <p className="text-sm text-muted-foreground">Checked {when(proof.checkedAt)}</p>
    </div>
  );
}

function NewJob({ busy, onCreate }: { busy: boolean; onCreate: (b: Record<string, string>) => void }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onCreate(Object.fromEntries(["address", "payerName", "payeeName", "amountDollars"].map((k) => [k, String(f.get(k) ?? "")])));
  }
  return (
    <form onSubmit={submit} className="rounded-2xl border-2 border-border bg-card p-5">
      <h2 className="text-2xl font-bold">New job</h2>
      <p className="mt-1 text-muted-foreground">The landlord pays, and the money is held until City records show a new lead certificate.</p>
      <label className="mt-4 block font-semibold">
        Property address
        <input name="address" required maxLength={200} placeholder="9808 Hardy Rd" className={field} />
      </label>
      <label className="mt-3 block font-semibold">
        Landlord (pays)
        <input name="payerName" required maxLength={120} placeholder="Donald Collins" className={field} />
      </label>
      <label className="mt-3 block font-semibold">
        Inspector (gets paid)
        <input name="payeeName" required maxLength={120} defaultValue="24 Hour Lead Test" className={field} />
      </label>
      <label className="mt-3 block font-semibold">
        Amount ($)
        <input name="amountDollars" required type="number" min="1" max="10000" step="0.01" defaultValue="120" className={field} />
      </label>
      <button type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
        Hold payment
      </button>
    </form>
  );
}

function Limits({ rules, busy, onSave }: { rules: Rules; busy: boolean; onSave: (r: Rules) => void }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave({
      perJobLimitCents: Math.round(Number(f.get("perJob")) * 100),
      monthlyLimitCents: Math.round(Number(f.get("monthly")) * 100),
      maxWaitDays: Math.round(Number(f.get("wait"))),
      autoPay: f.get("autoPay") === "on",
    });
  }
  return (
    <form key={JSON.stringify(rules)} onSubmit={submit} className="rounded-2xl border-2 border-border bg-card p-5">
      <h2 className="text-2xl font-bold">Your limits</h2>
      <p className="mt-1 text-muted-foreground">The agent pays on its own only inside these rules. Everything else comes to you.</p>
      <label className="mt-4 block font-semibold">
        Auto-pay up to ($ per job)
        <input name="perJob" type="number" min="0" step="1" defaultValue={rules.perJobLimitCents / 100} className={field} />
      </label>
      <label className="mt-3 block font-semibold">
        Monthly payout limit ($)
        <input name="monthly" type="number" min="0" step="1" defaultValue={rules.monthlyLimitCents / 100} className={field} />
      </label>
      <label className="mt-3 block font-semibold">
        Ask me if there's no proof after (days)
        <input name="wait" type="number" min="1" max="365" step="1" defaultValue={rules.maxWaitDays} className={field} />
      </label>
      <label className="mt-4 flex items-center gap-3 font-semibold">
        <input name="autoPay" type="checkbox" defaultChecked={rules.autoPay} className="h-5 w-5" />
        Pay automatically when proof is found
      </label>
      <button type="submit" disabled={busy} className={`${btnOutline} mt-5 w-full`}>
        Save limits
      </button>
    </form>
  );
}

function Login({ onToken }: { onToken: (t: string) => void }) {
  return (
    <SiteFrame>
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-3xl font-bold">Pay-on-Proof</h1>
        <p className="mt-2 text-muted-foreground">Owner access only.</p>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            const t = String(new FormData(e.currentTarget).get("token") ?? "").trim();
            if (t) onToken(t);
          }}
        >
          <label className="block font-semibold">
            Admin password
            <input name="token" type="password" required autoComplete="current-password" className={field} />
          </label>
          <button type="submit" className={`${btnPrimary} mt-4 w-full`}>
            Open
          </button>
        </form>
      </main>
    </SiteFrame>
  );
}
