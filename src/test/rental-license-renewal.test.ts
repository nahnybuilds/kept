import { describe, expect, it } from "vitest";
import { rentalLicenseTerms, rentalLicenseRenewal } from "@/lib/rental-license-renewal";
import { articleStructuredData } from "@/lib/articles";

describe("rental license renewal terms", () => {
  it("uses an annual license validity period", () => {
    expect(rentalLicenseTerms.validityYears).toBe(1);
  });
  it("uses a $69 per-unit fee", () => {
    expect(rentalLicenseTerms.feePerUnit).toBe(69);
  });
  it("uses a 45-day email renewal notice", () => {
    expect(rentalLicenseTerms.emailNoticeDays).toBe(45);
  });
  it("uses a 30-day mailed renewal notice", () => {
    expect(rentalLicenseTerms.mailNoticeDays).toBe(30);
  });
  it("uses a 60-day grace period before late fees", () => {
    expect(rentalLicenseTerms.lateGraceDays).toBe(60);
  });
  it("uses a 1.5 percent monthly late fee", () => {
    expect(rentalLicenseTerms.monthlyLateFeePercent).toBe(1.5);
  });
  it("uses the five approved Common questions for FAQ data", () => {
    expect(articleStructuredData(rentalLicenseRenewal)[1]?.mainEntity?.map((q) => q.name)).toEqual([
      "How often do I renew my Philadelphia rental license?",
      "How much is the Philadelphia rental license fee?",
      "Will the city remind me to renew?",
      "What can block my renewal?",
      "What if I renew late?",
    ]);
  });
});