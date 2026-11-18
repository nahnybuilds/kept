import { describe, expect, it } from "vitest";
import { CITY_SENDS_LEAD_RENEWAL_REMINDERS, leadSafeExpiry } from "@/lib/lead-renewal";

describe("lead-safe renewal rules", () => {
  it("uses a four-year certificate validity period", () => {
    expect(leadSafeExpiry(new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2030-11-18T00:00:00.000Z");
  });
  it("does not rely on City renewal reminders", () => {
    expect(CITY_SENDS_LEAD_RENEWAL_REMINDERS).toBe(false);
  });
});