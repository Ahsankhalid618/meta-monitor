import { prisma } from "../../database/client.js";
import { hashContent } from "../../utils/hash.js";
import type { RawArticle, DedupedArticle } from "../../types/index.js";

export interface DedupResult {
  /** Articles not seen before (by URL or content hash). */
  fresh: DedupedArticle[];
  /** How many candidates were dropped as duplicates. */
  duplicates: number;
}

/**
 * Level 1 deduplication (see docs/05-deduplication.md).
 *
 * Guarantees the same event is never analyzed twice by dropping any article
 * whose URL or content hash has already been seen — both within the incoming
 * batch and against what is already stored in the database.
 */
export async function dedupeArticles(
  raw: RawArticle[],
): Promise<DedupResult> {
  if (raw.length === 0) return { fresh: [], duplicates: 0 };

  const withHash: DedupedArticle[] = raw.map((a) => ({
    ...a,
    contentHash: hashContent(a.rawContent ?? a.title),
  }));

  // 1. De-dupe within this batch.
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();
  const batchUnique: DedupedArticle[] = [];
  for (const article of withHash) {
    if (seenUrls.has(article.url) || seenHashes.has(article.contentHash)) {
      continue;
    }
    seenUrls.add(article.url);
    seenHashes.add(article.contentHash);
    batchUnique.push(article);
  }

  // 2. De-dupe against the database (by URL or content hash).
  const existing = await prisma.article.findMany({
    where: {
      OR: [
        { url: { in: batchUnique.map((a) => a.url) } },
        { contentHash: { in: batchUnique.map((a) => a.contentHash) } },
      ],
    },
    select: { url: true, contentHash: true },
  });

  const existingUrls = new Set(existing.map((e) => e.url));
  const existingHashes = new Set(existing.map((e) => e.contentHash));

  const fresh = batchUnique.filter(
    (a) => !existingUrls.has(a.url) && !existingHashes.has(a.contentHash),
  );

  return { fresh, duplicates: raw.length - fresh.length };
}
