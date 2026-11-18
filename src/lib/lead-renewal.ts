export const LEAD_SAFE_VALIDITY_MONTHS = 48;
export const CITY_SENDS_LEAD_RENEWAL_REMINDERS = false;

export function leadSafeExpiry(inspectionDate: Date): Date {
  const expiry = new Date(inspectionDate);
  expiry.setUTCMonth(expiry.getUTCMonth() + LEAD_SAFE_VALIDITY_MONTHS);
  return expiry;
}

export const renewalFaqs: [string, string][] = [
  ["How long does a Philadelphia lead-safe certificate last?", `A lead-safe certificate is generally valid for ${LEAD_SAFE_VALIDITY_MONTHS / 12} years from the inspection date. Check the date on your certificate and the City's records before renewing. Lead-free certification follows a different process.`],
  ["Does the City send lead-safe certificate renewal reminders?", CITY_SENDS_LEAD_RENEWAL_REMINDERS ? "Check your City notifications for renewal reminders." : "No. The City does not send lead-safe certificate renewal reminders. You are responsible for tracking the deadline. Kept tracks your dates and reminds you before your certificate expires."],
  ["What happens if a unit fails?", "We'll explain what needs fixing, help coordinate a certified professional where required, and schedule a retest. A passing result is needed before a lead-safe certificate can be issued and filed."],
  ["How does tenant access work?", "Someone needs to give the certified inspector access to the unit. We coordinate a suitable time with you or your tenant. You do not have to attend if someone else can provide access; arrange any required notice with your tenant first."],
];