import { describe, expect, it } from "vitest";
import { findArticle, articleStructuredData } from "@/lib/articles";

describe("supplied landlord guide", () => {
  it("uses the five Common questions, not the publishing-note FAQs", () => {
    const article = findArticle("philadelphia-lead-safe-certificate");
    if (!article) throw new Error("Article missing");
    const schema = articleStructuredData(article)[1];
    expect(schema?.mainEntity?.map((question) => question.name)).toEqual([
      "How much does a lead dust-wipe test cost?",
      "How long does it take to renew?",
      "Does my tenant need to be home or sign the certificate?",
      "What if my tenant refuses entry?",
      "What if my unit fails the lead test?",
    ]);
  });
});