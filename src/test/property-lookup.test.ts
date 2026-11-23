import { describe, expect, it } from "vitest";
import { classifyLead, classifyLicense, isOpenViolation, lookupProperty, normalizeAddress, parseDate } from "@/lib/property-lookup";

const today = new Date("2026-11-23T00:00:00Z");

describe("normalizeAddress", () => {
  it("matches City address style", () => {
    expect(normalizeAddress("114 South 45th Street, Apt 2, Philadelphia PA 19104")).toBe("114 S 45TH ST");
    expect(normalizeAddress("9808 hardy rd.")).toBe("9808 HARDY RD");
  });
});

describe("parseDate", () => {
  it("handles epoch ms and strings", () => {
    expect(parseDate(Date.UTC(2026, 6, 28))).toBe("2026-07-28");
    expect(parseDate("2030-01-15")).toBe("2030-01-15");
    expect(parseDate("")).toBeNull();
  });
});

describe("classifyLead", () => {
  it("flags expired, expiring, current, lead-free and exempt", () => {
    expect(classifyLead({ lhhp_certification_status: "Expired", opa_year_built: "1925" }, today).status).toBe("expired");
    expect(classifyLead({ lhhp_certification_status: "Certified", lhhp_cert_expiration_date: "2027-03-01" }, today).status).toBe("expiring");
    expect(classifyLead({ lhhp_certification_status: "Certified", lhhp_cert_expiration_date: "2029-03-01" }, today).status).toBe("current");
    expect(classifyLead({ lhhp_certification_status: "Certified" }, today).status).toBe("current");
    expect(classifyLead({ lhhp_certification_status: "", opa_year_built: "1990" }, today).status).toBe("exempt");
    expect(classifyLead({ LHHP_CERTIFICATION_STATUS: "Not Certified", OPA_YEAR_BUILT: "1940" }, today).status).toBe("missing");
  });
});

describe("classifyLicense", () => {
  it("reads active and expiry", () => {
    expect(classifyLicense({ li_rl_status: "Active", li_rl_expiration_date: "2027-01-01" }, today).status).toBe("expiring");
    expect(classifyLicense({ li_rl_status: "Active", li_rl_expiration_date: "2027-06-01" }, today).status).toBe("current");
    expect(classifyLicense({ li_rl_status: "Inactive" }, today).status).toBe("expired");
    expect(classifyLicense({ li_rl_status: "None" }, today).status).toBe("missing");
    expect(classifyLicense({}, today).status).toBe("missing");
  });
});

describe("isOpenViolation", () => {
  it("treats closed and complied as resolved", () => {
    expect(isOpenViolation({ violationstatus: "OPEN" })).toBe(true);
    expect(isOpenViolation({ violationstatus: "COMPLIED" })).toBe(false);
    expect(isOpenViolation({ violationstatus: "CMPLY" })).toBe(false);
    expect(isOpenViolation({ violationstatus: "RESOLVE" })).toBe(false);
    expect(isOpenViolation({ violationstatus: "COMPEXCP" })).toBe(false);
    expect(isOpenViolation({ casestatus: "CLOSED" })).toBe(false);
  });
});

describe("lookupProperty", () => {
  it("combines lead, license and open violations", async () => {
    const fake = async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("arcgis")
          ? { features: [{ attributes: { address: "114 S 45TH ST", opa_account: "123", lhhp_certification_status: "Expired", opa_year_built: "1920", li_rl_status: "Active", li_rl_expiration_date: Date.UTC(2027, 5, 1) } }] }
          : { rows: [{ violationstatus: "OPEN", violationdate: "2026-10-01", violationcodetitle: "SMOKE DETECTOR" }, { violationstatus: "COMPLIED" }] },
    });
    const r = await lookupProperty("114 South 45th Street", fake, today);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const match = r.matches[0];
    expect(match).toBeDefined();
    if (!match) return;
    expect(match.lead.status).toBe("expired");
    expect(match.license.status).toBe("current");
    expect(match.violations?.open).toBe(1);
  });
  it("rejects input without a house number", async () => {
    expect(await lookupProperty("main street")).toEqual({ ok: false, error: "bad_address" });
  });
});
