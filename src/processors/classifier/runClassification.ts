import { classifyArticle, isGroqConfigured } from "../../services/groq/client.js";
import { createOrMergeAlert } from "../../services/deduplication/eventDedup.js";
import {
  getArticlesPendingClassification,
  markArticleProcessed,
} from "../../database/articles.js";
import {
  getLlmCooldownRemainingMs,
  isLlmInCooldown,
  startLlmCooldown,
} from "../../services/llm/quotaCooldown.js";
import { logger } from "../../utils/logger.js";
import { isLlmRateLimitError, sleep } from "../../utils/retry.js";
import { config } from "../../config/index.js";

let classifying = false;

export interface ClassificationResult {
  attempted: number;
  processed: number;
  alertsCreated: number;
  alertsMerged: number;
  relevant: number;
  skipped: boolean;
  quotaExhausted: boolean;
}

export interface ClassifyOptions {
  /** Ignore quota cooldown (manual `/classify` only). */
  force?: boolean;
  /** Override batch size for this run. */
  limit?: number;
}

/**
 * Classifies unprocessed articles via Groq. Irrelevant articles are marked
 * processed without creating alerts. Relevant articles become Alert rows.
 */
export async function classifyPendingArticles(
  options: ClassifyOptions = {},
): Promise<ClassificationResult> {
  const result: ClassificationResult = {
    attempted: 0,
    processed: 0,
    alertsCreated: 0,
    alertsMerged: 0,
    relevant: 0,
    skipped: false,
    quotaExhausted: false,
  };

  if (!isGroqConfigured()) {
    logger.warn("GROQ_API_KEY not set; skipping classification");
    result.skipped = true;
    return result;
  }

  if (classifying) {
    logger.debug("Classification already running; skipping");
    return result;
  }

  if (!options.force && isLlmInCooldown()) {
    const remainingSec = Math.ceil(getLlmCooldownRemainingMs() / 1000);
    logger.warn(
      { remainingSec },
      "LLM quota cooldown active; skipping classification",
    );
    result.skipped = true;
    result.quotaExhausted = true;
    return result;
  }

  classifying = true;

  try {
    const limit = options.limit ?? config.LLM_CLASSIFY_BATCH;
    const pending = await getArticlesPendingClassification(limit);
    result.attempted = pending.length;

    if (pending.length === 0) return result;

    logger.info(
      { count: pending.length, model: config.GROQ_MODEL },
      "Classifying articles via Groq",
    );

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
          logger.info({ url: article.url }, "Article classified as irrelevant");
        }

        await markArticleProcessed(article.id);
        result.processed += 1;

        if (config.LLM_CLASSIFY_DELAY_MS > 0) {
          await sleep(config.LLM_CLASSIFY_DELAY_MS);
        }
      } catch (err) {
        if (isLlmRateLimitError(err)) {
          result.quotaExhausted = true;
          startLlmCooldown();
          logger.warn(
            { remaining: pending.length - result.processed },
            "Groq rate limit — stopping batch; cooldown started",
          );
          break;
        }
        logger.error(
          { err, url: article.url },
          "Failed to classify article",
        );
      }
    }

    logger.info(result, "Classification batch complete");
    return result;
  } finally {
    classifying = false;
  }
}

let lastAutoClassifyAt = 0;

export function shouldAutoClassify(newArticlesIngested: boolean): boolean {
  if (newArticlesIngested) return true;
  if (isLlmInCooldown()) return false;

  const elapsed = Date.now() - lastAutoClassifyAt;
  return elapsed >= config.LLM_CLASSIFY_INTERVAL_MS;
}

export function markAutoClassifyRan(): void {
  lastAutoClassifyAt = Date.now();
}
