import { compareTwoStrings } from "string-similarity";

/** Normalize text for similarity comparison. */
export function normalizeForComparison(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Strip tracking params and trailing slashes for URL overlap checks.
 */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.host}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function textSimilarity(a: string, b: string): number {
  const left = normalizeForComparison(a);
  const right = normalizeForComparison(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  return compareTwoStrings(left, right);
}

export interface EventSimilarityInput {
  articleTitle: string;
  articleUrl: string;
  summary: string;
}

export interface ExistingEventInput {
  articleTitle: string;
  articleUrl: string;
  summary: string;
}

/**
 * Combines title, summary, and URL signals into a single score (0–1).
 * Identical canonical URLs score 1.0 immediately.
 */
export function computeEventSimilarity(
  candidate: EventSimilarityInput,
  existing: ExistingEventInput,
): number {
  const urlScore =
    canonicalUrl(candidate.articleUrl) === canonicalUrl(existing.articleUrl)
      ? 1
      : 0;

  const titleScore = textSimilarity(
    candidate.articleTitle,
    existing.articleTitle,
  );
  const summaryScore = textSimilarity(candidate.summary, existing.summary);

  if (urlScore === 1) return 1;

  return titleScore * 0.5 + summaryScore * 0.5;
}
