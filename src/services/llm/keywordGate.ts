/**
 * Cheap pre-filter before Groq. Sources aligned with Instagram Graph / Messaging
 * API monitoring — skips obvious non-matches to save quota.
 *
 * Meta Status feeds always pass (outages are always worth classifying).
 */
const KEYWORDS = [
  "instagram",
  "graph api",
  "messaging api",
  "instagram messaging",
  "messenger platform",
  "messenger api",
  "send api",
  "conversations api",
  "webhook",
  "oauth",
  "business login",
  "embedded signup",
  "app review",
  "pages_messaging",
  "pages messaging",
  "rate limit",
  "deprecat",
  "breaking change",
  "permission",
  "platform polic",
  "developer polic",
  "anti-abuse",
  "automation",
  "spam detection",
  "business verification",
  "instagram api",
  "dm ",
  "direct message",
];

export function isLikelyInstagramApiRelated(input: {
  title: string;
  content: string;
  url: string;
  sourceName: string;
}): boolean {
  if (input.sourceName.includes("Meta Status")) {
    return true;
  }
  if (input.sourceName.includes("Changelog")) {
    return true;
  }

  const haystack =
    `${input.title} ${input.content} ${input.url}`.toLowerCase();
  return KEYWORDS.some((kw) => haystack.includes(kw));
}
