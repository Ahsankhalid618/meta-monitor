import {
  getArticlesMissingContent,
  setArticleContent,
} from "../../database/articles.js";
import { extractContent } from "./index.js";
import { logger } from "../../utils/logger.js";

/** Default cap on how many articles to extract per invocation. */
const DEFAULT_BATCH = 25;

export interface ExtractionResult {
  attempted: number;
  extracted: number;
}

/**
 * Fills in `content` for articles that don't have it yet. Each article is
 * isolated so one failure does not abort the batch.
 */
export async function extractPendingArticles(
  limit: number = DEFAULT_BATCH,
): Promise<ExtractionResult> {
  const pending = await getArticlesMissingContent(limit);
  const result: ExtractionResult = { attempted: pending.length, extracted: 0 };

  if (pending.length === 0) return result;

  logger.info({ count: pending.length }, "Extracting content for articles");

  for (const article of pending) {
    try {
      const content = await extractContent({
        url: article.url,
        title: article.title,
        rawContent: article.rawContent,
      });
      await setArticleContent(article.id, content);
      result.extracted += 1;
      logger.debug(
        { url: article.url, length: content.length },
        "Extracted content",
      );
    } catch (err) {
      logger.error(
        { err, url: article.url },
        "Failed to extract article content",
      );
    }
  }

  logger.info(result, "Extraction batch complete");
  return result;
}
