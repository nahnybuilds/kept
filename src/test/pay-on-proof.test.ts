import { describe, expect, it } from "vitest";
import { checkNewJob, decide, DEFAULT_RULES, matchProperty, paidThisMonth, parseRules, verifyProof, type Job } from "@/lib/pay-on-proof";
import type { LookupResponse, PropertyResult } from "@/lib/property-lookup";

const now = new Date("2026-11-25T15:00:00Z");

const job: Job = {
  id: "j1",
  address: "9808 HARDY RD",
  opaAccount: "123",
  payeeName: "24 Hour Lead Test",
  amountCents: 12_000,
  status: "held",
  heldAt: "2026-11-20T15:00:00Z",
  baselineCertStatus: "expired",
  baselineCertExpires: "2026-08-15",
};

function property(lead: PropertyResult["lead"], opaAccount = "123", address = "9808 HARDY RD"): PropertyResult {
  return {
    address,
    opaAccount,
    yearBuilt: 1950,
    lead,
    license: { status: "current", label: "Rental license active", expires: "2027-07-14" },
    violations: { open: 0, items: [] },
  };
}
const found = (p: PropertyResult[]): LookupResponse => ({ ok: true, matches: p });
const newCert = found([property({ status: "current", label: "Lead certificate on file", expires: "2030-11-24" })]);
const oldCert = found([property({ status: "expired", label: "Lead certificate expired", expires: "2026-08-15" })]);

describe("verifyProof", () => {
  it("verifies when a newer certificate appears", () => {
    const v = verifyProof(job, newCert, DEFAULT_RULES, now);
    expect(v.kind).toBe("verified");
    if (v.kind === "verified") expect(v.proof.certExpires).toBe("2030-11-24");
  });
  it("keeps waiting while City still shows the old certificate", () => {
    expect(verifyProof(job, oldCert, DEFAULT_RULES, now).kind).toBe("waiting");
  });
  it("sends to review after the max wait", () => {
    const late = new Date("2026-12-20T15:00:00Z");
    expect(verifyProof(job, oldCert, DEFAULT_RULES, late).kind).toBe("review");
  });
  it("waits (never reviews) when City records are down", () => {
    const late = new Date("2026-12-20T15:00:00Z");
    expect(verifyProof(job, { ok: false, error: "upstream" }, DEFAULT_RULES, late).kind).toBe("waiting");
  });
  it("does not count the same certificate that was there at hold time", () => {
    const sameJob = { ...job, baselineCertStatus: "current", baselineCertExpires: "2030-11-24" };
    expect(verifyProof(sameJob, newCert, DEFAULT_RULES, now).kind).toBe("waiting");
  });
  it("counts a new lead-free certificate (no expiry) only if none was on file", () => {
    const leadFree = found([property({ status: "current", label: "Lead certificate on file", expires: null })]);
    expect(verifyProof(job, leadFree, DEFAULT_RULES, now).kind).toBe("verified");
    expect(verifyProof({ ...job, baselineCertStatus: "current", baselineCertExpires: null }, leadFree, DEFAULT_RULES, now).kind).toBe("waiting");
  });
  it("reviews exempt properties and ambiguous addresses", () => {
    const exempt = found([property({ status: "exempt", label: "Exempt", expires: null })]);
    expect(verifyProof(job, exempt, DEFAULT_RULES, now).kind).toBe("review");
    const noOpa = { ...job, opaAccount: null, address: "9808 HARDY" };
    const lead = { status: "current" as const, label: "Lead certificate on file", expires: "2030-01-01" };
    const two = found([property(lead, "1", "9808 HARDY RD"), property(lead, "2", "9808 HARDY RD REAR")]);
    expect(verifyProof(noOpa, two, DEFAULT_RULES, now).kind).toBe("review");
  });
});

describe("matchProperty", () => {
  it("matches by OPA account first, then exact address", () => {
    const a = property({ status: "current", label: "", expires: null }, "1", "1 A ST");
    const b = property({ status: "current", label: "", expires: null }, "2", "1 A ST REAR");
    expect(matchProperty({ opaAccount: "2", address: "x" }, [a, b])).toBe(b);
    expect(matchProperty({ opaAccount: null, address: "1 a st" }, [a, b])).toBe(a);
    expect(matchProperty({ opaAccount: "9", address: "x" }, [a, b])).toBeNull();
  });
});

describe("decide", () => {
  const verified = verifyProof(job, newCert, DEFAULT_RULES, now);
  it("pays when proof is found and within limits", () => {
    expect(decide(job, verified, DEFAULT_RULES, 0).action).toBe("pay");
  });
  it("sends to a human when over the per-job limit", () => {
    expect(decide({ ...job, amountCents: 30_000 }, verified, DEFAULT_RULES, 0).action).toBe("review");
  });
  it("sends to a human when the monthly limit would be exceeded", () => {
    expect(decide(job, verified, DEFAULT_RULES, 95_000).action).toBe("review");
  });
  it("sends to a human when auto-pay is off", () => {
    expect(decide(job, verified, { ...DEFAULT_RULES, autoPay: false }, 0).action).toBe("review");
  });
  it("waits when there is no proof yet", () => {
    expect(decide(job, verifyProof(job, oldCert, DEFAULT_RULES, now), DEFAULT_RULES, 0).action).toBe("wait");
  });
});

describe("helpers", () => {
  it("rejects bad amounts", () => {
    expect(checkNewJob(0).ok).toBe(false);
    expect(checkNewJob(12.5).ok).toBe(false);
    expect(checkNewJob(12_000).ok).toBe(true);
  });
  it("sums only this month's payouts", () => {
    expect(paidThisMonth([{ amountCents: 100, paidAt: "2026-11-02T00:00:00Z" }, { amountCents: 50, paidAt: "2026-10-30T00:00:00Z" }], now)).toBe(100);
  });
  it("validates rules", () => {
    expect(parseRules({ perJobLimitCents: 100, monthlyLimitCents: 1000, maxWaitDays: 14, autoPay: true })).not.toBeNull();
    expect(parseRules({ perJobLimitCents: -1, monthlyLimitCents: 1000, maxWaitDays: 14, autoPay: true })).toBeNull();
  });
});
