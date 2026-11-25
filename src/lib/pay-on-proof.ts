// Pay-on-Proof: a payments agent that releases money only when it can verify
// the work happened. First use case: a landlord pays Kept for a lead
// inspection, Kept holds the money, and the inspector is paid only once a NEW
// lead certificate for that property shows up in City records.
//
// This file is pure logic (no database, no network) so it can be tested.
// The server routes in src/routes/api.pop*.ts load jobs, call these functions,
// and save the results.

import type { LookupResponse, PropertyResult } from "@/lib/property-lookup";

export type JobStatus =
  | "held" // landlord's money is held, waiting for proof
  | "needs_review" // a rule stopped the agent; a human must approve or reject
  | "paid" // inspector paid
  | "refunded"; // a human rejected the payout; money goes back to the landlord

export type Rules = {
  perJobLimitCents: number; // auto-pay only jobs at or under this amount
  monthlyLimitCents: number; // auto-pay only while this month's payouts stay under this
  autoPay: boolean; // false = proof found still needs a human click
  maxWaitDays: number; // no proof after this many days -> human review
};

export const DEFAULT_RULES: Rules = {
  perJobLimitCents: 25_000,
  monthlyLimitCents: 100_000,
  autoPay: true,
  maxWaitDays: 21,
};

export type Job = {
  id: string;
  address: string;
  opaAccount: string | null;
  payeeName: string;
  amountCents: number;
  status: JobStatus;
  heldAt: string; // ISO timestamp the money was put on hold
  // Lead certificate as it looked when the money was held. Proof must be newer.
  baselineCertStatus: string | null;
  baselineCertExpires: string | null; // YYYY-MM-DD
};

export type Proof = {
  source: "City of Philadelphia lead certification records";
  address: string;
  opaAccount: string | null;
  certStatus: string;
  certExpires: string | null;
  checkedAt: string;
};

export type Verdict =
  | { kind: "verified"; proof: Proof }
  | { kind: "waiting"; note: string }
  | { kind: "review"; reason: string };

export type Decision =
  | { action: "pay"; proof: Proof }
  | { action: "wait"; note: string }
  | { action: "review"; reason: string; proof?: Proof };

const DAY_MS = 24 * 3600 * 1000;

export const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** Checks made when the landlord's money is first held. Spending limits are
 *  enforced at payout time, so an over-limit job can still be held. */
export function checkNewJob(amountCents: number): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, reason: "Amount must be more than $0." };
  if (amountCents > 1_000_000) return { ok: false, reason: "Amount is over the $10,000 demo cap." };
  return { ok: true };
}

/** Pick the City record that belongs to this job. */
export function matchProperty(job: Pick<Job, "opaAccount" | "address">, matches: PropertyResult[]): PropertyResult | "ambiguous" | null {
  if (matches.length === 0) return null;
  if (job.opaAccount) return matches.find((m) => m.opaAccount === job.opaAccount) ?? null;
  const exact = matches.filter((m) => m.address.toUpperCase() === job.address.toUpperCase());
  if (exact.length === 1) return exact[0]!;
  return matches.length === 1 ? matches[0]! : "ambiguous";
}

/**
 * Is there proof the inspection happened? Proof = a lead certificate on file
 * that is NEWER than the one on file when the money was held.
 */
export function verifyProof(job: Job, lookup: LookupResponse, rules: Rules, now: Date): Verdict {
  const overdue = daysSince(job.heldAt, now) > rules.maxWaitDays;
  const waitOrReview = (note: string): Verdict =>
    overdue ? { kind: "review", reason: `No new certificate after ${rules.maxWaitDays} days. ${note}` } : { kind: "waiting", note };

  if (!lookup.ok) {
    if (lookup.error === "upstream") return { kind: "waiting", note: "City records didn't respond. Will try again next run." };
    return waitOrReview("Property not found in City lead records yet.");
  }

  const match = matchProperty(job, lookup.matches);
  if (match === "ambiguous") return { kind: "review", reason: "Address matches more than one City property. Pick the right one before paying." };
  if (!match) return waitOrReview("Property not found in City lead records yet.");

  const { status, expires } = match.lead;
  if (status === "exempt") return { kind: "review", reason: "City shows this property as built 1978 or later (exemption, not a lead certificate)." };

  const certified = status === "current" || status === "expiring";
  const newer =
    certified &&
    (expires
      ? job.baselineCertExpires === null || expires > job.baselineCertExpires
      : // lead-free certificates have no expiry; count it only if it wasn't there before
        job.baselineCertStatus !== "current" && job.baselineCertStatus !== "expiring");

  if (!newer) return waitOrReview(`City still shows: ${match.lead.label}.`);

  return {
    kind: "verified",
    proof: {
      source: "City of Philadelphia lead certification records",
      address: match.address,
      opaAccount: match.opaAccount,
      certStatus: match.lead.label,
      certExpires: expires,
      checkedAt: now.toISOString(),
    },
  };
}

/** Turn a verdict into what the agent should do, applying the owner's spending limits. */
export function decide(job: Job, verdict: Verdict, rules: Rules, paidThisMonthCents: number): Decision {
  if (verdict.kind === "waiting") return { action: "wait", note: verdict.note };
  if (verdict.kind === "review") return { action: "review", reason: verdict.reason };

  const { proof } = verdict;
  if (job.amountCents > rules.perJobLimitCents)
    return { action: "review", proof, reason: `Proof found, but ${dollars(job.amountCents)} is over your per-job limit of ${dollars(rules.perJobLimitCents)}.` };
  if (paidThisMonthCents + job.amountCents > rules.monthlyLimitCents)
    return { action: "review", proof, reason: `Proof found, but paying would put this month at ${dollars(paidThisMonthCents + job.amountCents)}, over your monthly limit of ${dollars(rules.monthlyLimitCents)}.` };
  if (!rules.autoPay) return { action: "review", proof, reason: "Proof found. Auto-pay is off, so this needs your approval." };
  return { action: "pay", proof };
}

/** Sum of payouts made in the same calendar month (UTC) as `now`. */
export function paidThisMonth(payouts: { amountCents: number; paidAt: string }[], now: Date): number {
  const key = now.toISOString().slice(0, 7);
  return payouts.filter((p) => p.paidAt.slice(0, 7) === key).reduce((sum, p) => sum + p.amountCents, 0);
}

export function parseRules(input: unknown): Rules | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const int = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);
  const perJob = int(r.perJobLimitCents, 0, 1_000_000);
  const monthly = int(r.monthlyLimitCents, 0, 10_000_000);
  const wait = int(r.maxWaitDays, 1, 365);
  if (perJob === null || monthly === null || wait === null || typeof r.autoPay !== "boolean") return null;
  return { perJobLimitCents: perJob, monthlyLimitCents: monthly, maxWaitDays: wait, autoPay: r.autoPay };
}
