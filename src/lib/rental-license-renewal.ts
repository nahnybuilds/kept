import type { Article } from "./articles";

export const rentalLicenseTerms = {
  "feePerUnit": 69,
  "validityYears": 1,
  "emailNoticeDays": 45,
  "mailNoticeDays": 30,
  "lateGraceDays": 60,
  "monthlyLateFeePercent": 1.5
} as const;

export const rentalLicenseRenewal: Article = {
  slug: "philadelphia-rental-license-renewal",
  title: "Philadelphia Rental License Renewal: Step-by-Step Checklist",
  seoTitle: "Philadelphia Rental License Renewal: Step-by-Step Checklist",
  description: "Renewing your Philadelphia rental license? Here's the step-by-step checklist, the fee, deadlines, and the lead certificate issue that blocks most renewals.",
  markdown: `**Your Philadelphia rental license has to be renewed every year. The renewal itself is simple. What usually holds it up is everything that has to be in order first.**

If you rent out property in Philadelphia, you need a rental license from the Department of Licenses and Inspections (L&I), and it's only good for one year. This checklist walks you through what you need, what it costs, and the one issue that catches many long-time landlords off guard.

## Who needs a Philadelphia rental license?

You need a rental license to rent out any dwelling, rooming, or sleeping unit to tenants in Philadelphia. One license covers all the units in a building, but each building needs its own license.

If a family member lives in your property and you don't collect rent, you file an Affidavit of Non-Rental instead.

Official source: [Get a rental license (phila.gov)](https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-and-property/get-a-rental-license/)

## How much does it cost, and when is it due?

- **Fee:** $${rentalLicenseTerms.feePerUnit} per unit (owner-occupied units are exempt), as listed on the city's site in November 2026. Renewal costs the same as the original license.
- **How long it lasts:** one year.
- **Reminders:** L&I emails a renewal notice about ${rentalLicenseTerms.emailNoticeDays} days before your license expires and mails one about ${rentalLicenseTerms.mailNoticeDays} days before.
- **Late fee:** if you renew more than ${rentalLicenseTerms.lateGraceDays} days after the due date, the city adds ${rentalLicenseTerms.monthlyLateFeePercent}% of the license fee for each month since it expired.

## The renewal checklist

Before you start, make sure each of these is in order. Any one of them can block your renewal.

1. **You're current on city taxes and fines.** The city checks this before renewing. If you're not sure, request a tax clearance from the Department of Revenue.
2. **There are no open L&I violations on the property.** Open violations block renewal. You can check your property on the city's records before you apply.
3. **Your lead certification is on file.** Rental properties built before March 1978 must have a valid lead-safe or lead-free certificate uploaded to the city. Properties built in 1978 or later need an exemption filed.
4. **Your Commercial Activity License and tax account are active** (if you don't live at the property, or it has four or more units).
5. **Your contact details are current.** You need a valid email address, and owners living outside Philadelphia must name a managing agent with a Philadelphia address.

Then renew online through **eCLIPSE**, the city's licensing system: log in, upload anything requested, and pay once your renewal is approved. You can also book an in-person appointment at the Permit and License Center, 1401 John F. Kennedy Blvd.

## The step that trips up long-time landlords: the lead certificate

Here's the catch. **The city reminds you about your rental license, but it does not remind you about your lead certificate.**

A lead-safe certificate is valid for four years. Many landlords got theirs years ago, then went back to running their properties. When the license renewal notice arrives, they try to renew and find out their lead certificate expired, which blocks the renewal.

This is common. Kept's October 2026 analysis of about 81,000 city records found that roughly **one in seven** older Philadelphia rentals were out of compliance on their lead certificate. Landlords licensed for three or more years were about **three times as likely** to be out of compliance as newer landlords. (These are Kept's findings, not official city figures.)

**Tip:** check your lead certificate the moment you get your license renewal email. A new inspection, lab results, and filing can take time, especially if your tenant needs notice or a unit needs work.

Learn more: [Philadelphia Lead-Safe Certificate: A Landlord's Guide](https://keptlegal.co/blog/philadelphia-lead-safe-certificate)

## What else do I need to give my tenants?

Your license is only part of the picture. Philadelphia landlords also have paperwork to give tenants, including a **Certificate of Rental Suitability** and the city's **Partners for Good Housing** handbook. The city's Partners in Good Housing guide explains these obligations in detail.

Official guide: [Partners in Good Housing (phila.gov)](https://www.phila.gov/media/20221110134727/Partners-in-Good-Housing-FINAL-2022.pdf)

## Bought a property? Your old owner's license doesn't transfer

Rental licenses are not transferable. If you buy a rental property, the previous owner's license must be closed, and you need to apply for your own.

## Common questions

**How often do I renew my Philadelphia rental license?**
Every year. The license is valid for one year.

**How much is the Philadelphia rental license fee?**
$${rentalLicenseTerms.feePerUnit} per unit as of November 2026, with no fee for owner-occupied units. Check the city's site for the current amount.

**Will the city remind me to renew?**
Yes, for the rental license: L&I emails about ${rentalLicenseTerms.emailNoticeDays} days before expiration and mails a notice about ${rentalLicenseTerms.mailNoticeDays} days before. The city does **not** send reminders for your lead certificate.

**What can block my renewal?**
Unpaid city taxes or fines, open L&I violations, or a missing or expired lead certificate.

**What if I renew late?**
After ${rentalLicenseTerms.lateGraceDays} days past the due date, the city charges a late fee of ${rentalLicenseTerms.monthlyLateFeePercent}% of the license fee for each month since it expired.

## Get your renewal ready before the deadline

Not sure if your lead certificate or other records are in order? **Kept will check every property you own for free.** If your lead certificate needs renewing, we book a certified inspector, coordinate with your tenant, file with the city, and track your next deadline so it never sneaks up on you again. Nothing upfront; you pay when your results are in.

**[Request a free check at keptlegal.co](https://keptlegal.co)**

*General information, not legal advice. Confirm current requirements with the City of Philadelphia.*`,
  sections: [],
  sources: [],
  faqs: [
    ["How often do I renew my Philadelphia rental license?", `Every year. The license is valid for one year.`],
    ["How much is the Philadelphia rental license fee?", `$${rentalLicenseTerms.feePerUnit} per unit as of November 2026, with no fee for owner-occupied units. Check the city's site for the current amount.`],
    ["Will the city remind me to renew?", `Yes, for the rental license: L&I emails about ${rentalLicenseTerms.emailNoticeDays} days before expiration and mails a notice about ${rentalLicenseTerms.mailNoticeDays} days before. The city does not send reminders for your lead certificate.`],
    ["What can block my renewal?", `Unpaid city taxes or fines, open L&I violations, or a missing or expired lead certificate.`],
    ["What if I renew late?", `After ${rentalLicenseTerms.lateGraceDays} days past the due date, the city charges a late fee of ${rentalLicenseTerms.monthlyLateFeePercent}% of the license fee for each month since it expired.`],
  ],
};
