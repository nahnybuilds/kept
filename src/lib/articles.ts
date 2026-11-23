import { renewalFaqs } from "./lead-renewal";
import { landlordGuide } from "./landlord-guide";
import { rentalLicenseRenewal } from "./rental-license-renewal";

export interface Article {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  markdown?: string;
  sections: { heading: string; paragraphs: string[] }[];
  faqs: [string, string][];
  sources: { title: string; url: string }[];
}

// Add approved articles here; listing, detail metadata and sitemap share this collection.
export const articles: Article[] = [rentalLicenseRenewal, landlordGuide, {
  slug: "philadelphia-lead-safe-certificate-renewal",
  title: "Philadelphia lead-safe certificate renewal",
  seoTitle: "Philadelphia Lead-Safe Certificate Renewal Guide | Kept",
  description: "Learn when to renew a Philadelphia lead-safe certificate, how inspection and city filing work, and how Kept coordinates tenant access and retesting.",
  sections: [
    { heading: "Check your certificate before it expires", paragraphs: ["Philadelphia landlords must test and certify applicable rental properties as lead-safe or lead-free to execute a new or renewed lease and get or renew a rental license.", "The City's landlord FAQ states that lead-safe certificates submitted after February 1, 2020 are valid for four years. Check the inspection date on your certificate and your City record. A lead-free certificate is different from a lead-safe certificate."] },
    { heading: "Arrange a certified inspection and tenant access", paragraphs: ["Use an approved, certified lead professional—not a home test kit. Arrange access with your tenant before the appointment and give any required notice. Kept coordinates the inspector and a suitable access time with you or your tenant."] },
    { heading: "If the unit needs work", paragraphs: ["If testing identifies a problem, the inspector's findings guide what needs addressing. Kept explains your options, helps coordinate a certified professional where required, and schedules a retest. A failed test is not a lead-safe certificate."] },
    { heading: "File the certificate and track the next renewal", paragraphs: ["After receiving the certificate and lab results, submit them through the City's Lead Certification Submission System. Kept handles that upload for you and tracks the next deadline.", "The City does not send lead-safe certificate renewal reminders. Keep your own record of the inspection and expiry dates rather than waiting for a notice."] },
    { heading: "Renew with Kept", paragraphs: ["Kept coordinates lead-safe certificate renewals for Philadelphia landlords: the certified inspection, tenant access, lab results, city filing, and future reminders. You can request a free property quote whether or not you received a letter. Nothing upfront. You pay when your results are in."] },
  ],
  faqs: renewalFaqs,
  sources: [
    { title: "City of Philadelphia: submit lead certification and inspection reports", url: "https://www.phila.gov/services/permits-violations-licenses/apply-for-a-permit/environmental-permits-and-approvals/submit-lead-certification-and-inspection-reports/" },
    { title: "Philadelphia Department of Public Health: landlord lead-law FAQ", url: "https://www.phila.gov/media/20201002153847/FAQ-Lead-Law-final.pdf" },
  ],
}];

export function findArticle(slug: string) { return articles.find((article) => article.slug === slug); }

export function articleStructuredData(article: Article) {
  return [
    { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, author: { "@type": "Organization", name: "Kept" }, mainEntityOfPage: `https://keptlegal.co/blog/${article.slug}` },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: article.faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) },
  ];
}