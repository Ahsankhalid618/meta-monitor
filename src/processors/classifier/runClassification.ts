import { classifyArticle, isGeminiConfigured } from "../../services/gemini/client.js";
import { createOrMergeAlert } from "../../services/deduplication/eventDedup.js";
import {
  getArticlesPendingClassification,
  markArticleProcessed,
} from "../../database/articles.js";
import { logger } from "../../utils/logger.js";

const DEFAULT_BATCH = 10;

export interface ClassificationResult {
  attempted: number;
  processed: number;
  alertsCreated: number;
  alertsMerged: number;
  relevant: number;
  skipped: boolean;
}

/**
 * Classifies unprocessed articles via Gemini. Irrelevant articles are marked
 * processed without creating alerts. Relevant articles become Alert rows.
 */
export async function classifyPendingArticles(
  limit: number = DEFAULT_BATCH,
): Promise<ClassificationResult> {
  const result: ClassificationResult = {
    attempted: 0,
    processed: 0,
    alertsCreated: 0,
    alertsMerged: 0,
    relevant: 0,
    skipped: false,
  };

  if (!isGeminiConfigured()) {
    logger.warn("GEMINI_API_KEY not set; skipping classification");
    result.skipped = true;
    return result;
  }

  const pending = await getArticlesPendingClassification(limit);
  result.attempted = pending.length;

  if (pending.length === 0) return result;

  logger.info({ count: pending.length }, "Classifying articles");

  for (const article of pending) {
    const content = article.content;
    if (!content) continue;

    try {
      const classification = await classifyArticle({
        url: article.url,
        title: article.title,
        sourceName: article.source.name,
        publishedAt: article.publishedAt,
        content,
      });

      if (classification.relevant) {
        const { merged } = await createOrMergeAlert(
          article.id,
          article.title,
          article.url,
          classification,
          article.source.name,
        );
        if (merged) {
          result.alertsMerged += 1;
        } else {
          result.alertsCreated += 1;
        }
        result.relevant += 1;
        logger.info(
          {
            url: article.url,
            severity: classification.severity,
            category: classification.category,
            merged,
          },
          "Relevant article classified",
        );
      } else {
        logger.debug({ url: article.url }, "Article classified as irrelevant");
      }

      await markArticleProcessed(article.id);
      result.processed += 1;
    } catch (err) {
      logger.error(
        { err, url: article.url },
        "Failed to classify article",
      );
    }
  }

  logger.info(result, "Classification batch complete");
  return result;
}
