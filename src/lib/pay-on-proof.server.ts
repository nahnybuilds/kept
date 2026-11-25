// Server-only side of Pay-on-Proof: database reads/writes, admin auth, and the
// (simulated) payout provider. The decisions themselves live in pay-on-proof.ts.
//
// DEMO MODE: no real money moves. "Holding" and "paying" are ledger entries.
// To go live, replace `payoutProvider` with a Stripe Connect implementation
// (charge the landlord into the platform balance, transfer to the inspector's
// connected account on "pay", refund on "reject").

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { lookupProperty, type LookupResponse } from "@/lib/property-lookup";
import {
  checkNewJob,
  decide,
  DEFAULT_RULES,
  dollars,
  matchProperty,
  paidThisMonth,
  verifyProof,
  type Job,
  type JobStatus,
  type Proof,
  type Rules,
} from "@/lib/pay-on-proof";

// The generated Database types don't include the pop_* tables until Lovable
// regenerates them, so use an untyped client for these queries.
const db = () => supabaseAdmin as unknown as SupabaseClient;

// ---------- auth ----------

async function sameSecret(a: string, b: string) {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const h = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(h(a), h(b));
}

/** Returns a 401/500 Response if the request isn't from the owner, else null. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const secret = process.env["POP_ADMIN_TOKEN"];
  if (!secret || secret.length < 12) return new Response("POP_ADMIN_TOKEN is not set (12+ characters).", { status: 500 });
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  return token && (await sameSecret(token, secret)) ? null : new Response("Unauthorized", { status: 401 });
}

/** Owner token or Lovable's scheduled-job secret. */
export async function requireAdminOrCron(request: Request): Promise<Response | null> {
  if ((await requireAdmin(request)) === null) return null;
  return authenticateCronRequest(request);
}

// ---------- payout provider (simulated) ----------

export const payoutProvider = {
  name: "simulated",
  async pay(job: Job): Promise<{ ref: string }> {
    return { ref: `sim_pay_${job.id.slice(0, 8)}_${Date.now().toString(36)}` };
  },
  async refund(job: Job): Promise<{ ref: string }> {
    return { ref: `sim_refund_${job.id.slice(0, 8)}_${Date.now().toString(36)}` };
  },
};

// ---------- rows ----------

type JobRow = {
  id: string;
  created_at: string;
  address: string;
  opa_account: string | null;
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

const toJob = (r: JobRow): Job => ({
  id: r.id,
  address: r.address,
  opaAccount: r.opa_account,
  payeeName: r.payee_name,
  amountCents: r.amount_cents,
  status: r.status,
  heldAt: r.held_at,
  baselineCertStatus: r.baseline_cert_status,
  baselineCertExpires: r.baseline_cert_expires,
});

async function logEvent(jobId: string | null, kind: string, message: string, detail?: unknown) {
  await db().from("pop_events").insert({ job_id: jobId, kind, message, detail: detail ?? null });
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function loadRules(): Promise<Rules> {
  const row = must(await db().from("pop_rules").select("*").eq("id", 1).maybeSingle()) as Record<string, unknown> | null;
  if (!row) return DEFAULT_RULES;
  return {
    perJobLimitCents: Number(row.per_job_limit_cents),
    monthlyLimitCents: Number(row.monthly_limit_cents),
    autoPay: Boolean(row.auto_pay),
    maxWaitDays: Number(row.max_wait_days),
  };
}

export async function saveRules(rules: Rules) {
  must(
    await db().from("pop_rules").upsert({
      id: 1,
      per_job_limit_cents: rules.perJobLimitCents,
      monthly_limit_cents: rules.monthlyLimitCents,
      auto_pay: rules.autoPay,
      max_wait_days: rules.maxWaitDays,
      updated_at: new Date().toISOString(),
    }),
  );
  await logEvent(null, "rules", `Limits updated: ${dollars(rules.perJobLimitCents)} per job, ${dollars(rules.monthlyLimitCents)} per month, auto-pay ${rules.autoPay ? "on" : "off"}, review after ${rules.maxWaitDays} days.`);
}

async function monthPayouts(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const rows = must(await db().from("pop_jobs").select("amount_cents, paid_at").eq("status", "paid").gte("paid_at", start)) as { amount_cents: number; paid_at: string }[];
  return paidThisMonth(rows.map((r) => ({ amountCents: r.amount_cents, paidAt: r.paid_at })), now);
}

export async function loadState() {
  const now = new Date();
  const [rules, jobs, events, paid] = await Promise.all([
    loadRules(),
    db().from("pop_jobs").select("*").order("created_at", { ascending: false }).limit(100).then(must),
    db().from("pop_events").select("*").order("created_at", { ascending: false }).limit(100).then(must),
    monthPayouts(now),
  ]);
  return { mode: payoutProvider.name, rules, jobs, events, paidThisMonthCents: paid };
}

// ---------- actions ----------

export async function createJob(input: { address: string; payerName: string; payeeName: string; amountCents: number }) {
  const check = checkNewJob(input.amountCents);
  if (!check.ok) return { ok: false as const, error: check.reason };
  const lookup = await lookupProperty(input.address);
  if (!lookup.ok)
    return { ok: false as const, error: lookup.error === "upstream" ? "City records didn't respond. Try again." : "Couldn't find that address in City lead records. Use the street address, e.g. 9808 Hardy Rd." };
  const match = matchProperty({ opaAccount: null, address: input.address.trim() }, lookup.matches);
  if (match === "ambiguous" || !match)
    return { ok: false as const, error: `That address matches ${lookup.matches.length} City properties: ${lookup.matches.map((m) => m.address).join(", ")}. Type the exact one.` };

  const row = must(
    await db()
      .from("pop_jobs")
      .insert({
        address: match.address,
        opa_account: match.opaAccount,
        payer_name: input.payerName,
        payee_name: input.payeeName,
        amount_cents: input.amountCents,
        baseline_cert_status: match.lead.status,
        baseline_cert_expires: match.lead.expires,
        last_note: `Waiting for a new certificate. City shows: ${match.lead.label}.`,
      })
      .select("*")
      .single(),
  ) as JobRow;
  await logEvent(row.id, "held", `Held ${dollars(row.amount_cents)} from ${row.payer_name} for ${row.payee_name} (inspection at ${row.address}). City shows today: ${match.lead.label}${match.lead.expires ? ` (expires ${match.lead.expires})` : ""}.`);
  return { ok: true as const, job: row };
}

async function payJob(row: JobRow, proof: Proof | null, resolvedBy: "agent" | "owner") {
  const { ref } = await payoutProvider.pay(toJob(row));
  const updated = must(
    await db()
      .from("pop_jobs")
      .update({ status: "paid", paid_at: new Date().toISOString(), payout_ref: ref, proof: proof ?? row.proof, resolved_by: resolvedBy, review_reason: null })
      .eq("id", row.id)
      .in("status", ["held", "needs_review"]) // never pay twice
      .select("id"),
  ) as { id: string }[];
  if (updated.length === 0) return false;
  await logEvent(row.id, "paid", `${resolvedBy === "agent" ? "Agent paid" : "You approved paying"} ${row.payee_name} ${dollars(row.amount_cents)}. Ref ${ref}.`, proof);
  return true;
}

export async function resolveJob(jobId: string, action: "approve" | "reject" | "wait") {
  const row = must(await db().from("pop_jobs").select("*").eq("id", jobId).maybeSingle()) as JobRow | null;
  if (!row) return { ok: false as const, error: "Job not found." };
  if (row.status !== "needs_review" && !(action === "approve" && row.status === "held"))
    return { ok: false as const, error: `Job is ${row.status}; nothing to do.` };

  if (action === "approve") {
    await payJob(row, null, "owner");
  } else if (action === "reject") {
    const { ref } = await payoutProvider.refund(toJob(row));
    must(await db().from("pop_jobs").update({ status: "refunded", payout_ref: ref, resolved_by: "owner" }).eq("id", row.id).eq("status", "needs_review"));
    await logEvent(row.id, "refunded", `You rejected the payout. ${dollars(row.amount_cents)} returned to ${row.payer_name}. Ref ${ref}.`);
  } else {
    // keep waiting; restart the clock so it isn't flagged again right away
    must(await db().from("pop_jobs").update({ status: "held", held_at: new Date().toISOString(), review_reason: null }).eq("id", row.id));
    await logEvent(row.id, "waiting", "You sent this back to wait for proof. The wait clock restarted.");
  }
  return { ok: true as const };
}

/** One agent pass over every held job. Safe to run on a schedule. */
export async function runAgent(now = new Date()) {
  const rules = await loadRules();
  const rows = must(await db().from("pop_jobs").select("*").eq("status", "held").order("held_at")) as JobRow[];
  let paidMonth = await monthPayouts(now);
  const lookups = new Map<string, Promise<LookupResponse>>();
  const summary = { checked: rows.length, paid: 0, review: 0, waiting: 0 };

  for (const row of rows) {
    if (!lookups.has(row.address)) lookups.set(row.address, lookupProperty(row.address, fetch, now));
    const job = toJob(row);
    const verdict = verifyProof(job, await lookups.get(row.address)!, rules, now);
    const decision = decide(job, verdict, rules, paidMonth);

    if (decision.action === "pay") {
      if (await payJob(row, decision.proof, "agent")) {
        paidMonth += row.amount_cents;
        summary.paid++;
      }
    } else if (decision.action === "review") {
      must(
        await db()
          .from("pop_jobs")
          .update({ status: "needs_review", review_reason: decision.reason, proof: decision.proof ?? null, last_checked_at: now.toISOString() })
          .eq("id", row.id)
          .eq("status", "held"),
      );
      await logEvent(row.id, "needs_review", `Sent to you for approval: ${decision.reason}`, decision.proof);
      summary.review++;
    } else {
      must(await db().from("pop_jobs").update({ last_checked_at: now.toISOString(), last_note: decision.note }).eq("id", row.id));
      if (decision.note !== row.last_note) await logEvent(row.id, "checked", decision.note);
      summary.waiting++;
    }
  }
  await logEvent(null, "run", `Agent run: checked ${summary.checked}, paid ${summary.paid}, sent to you ${summary.review}, still waiting ${summary.waiting}.`);
  return summary;
}
