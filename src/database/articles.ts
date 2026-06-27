import { prisma } from "./client.js";
import type { DedupedArticle } from "../types/index.js";

/**
 * Inserts already-deduplicated articles (see services/deduplication). The
 * `skipDuplicates` flag remains a safety net against races between the dedup
 * read and this write. Returns the number of rows actually inserted.
 */
export async function insertArticles(
  articles: DedupedArticle[],
): Promise<number> {
  if (articles.length === 0) return 0;

  const result = await prisma.article.createMany({
    data: articles.map((a) => ({
      url: a.url,
      title: a.title,
      publishedAt: a.publishedAt,
      contentHash: a.contentHash,
      rawContent: a.rawContent ?? null,
      sourceId: a.sourceId,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/** Articles that still need their content extracted (oldest first). */
export async function getArticlesMissingContent(limit: number) {
  return prisma.article.findMany({
    where: { content: null },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, url: true, title: true, rawContent: true },
  });
}

export async function setArticleContent(
  id: string,
  content: string,
): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { content },
  });
}
