import { config } from "../../config/index.js";
import {
  createAlertFromClassification,
  getRecentAlerts,
  appendReporterToAlert,
} from "../../database/alerts.js";
import type { RelevantClassification } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { computeEventSimilarity } from "./similarity.js";

/** How far back to search for merge candidates. */
const LOOKBACK_DAYS = 14;

export interface CreateOrMergeResult {
  alertId: string;
  merged: boolean;
  similarity?: number;
}

/**
 * Level 2 deduplication (see docs/05-deduplication.md).
 *
 * After a relevant classification, compare against recent alerts. If
 * similarity exceeds the threshold, merge into the existing event instead of
 * creating a duplicate alert.
 */
export async function createOrMergeAlert(
  articleId: string,
  articleTitle: string,
  articleUrl: string,
  classification: RelevantClassification,
  reportedBy: string,
): Promise<CreateOrMergeResult> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const recent = await getRecentAlerts(since);
  const threshold = config.SIMILARITY_THRESHOLD;

  let bestMatch: { id: string; score: number } | undefined;

  for (const alert of recent) {
    const score = computeEventSimilarity(
      {
        articleTitle,
        articleUrl,
        summary: classification.summary,
      },
      {
        articleTitle: alert.article.title,
        articleUrl: alert.article.url,
        summary: alert.summary,
      },
    );

    if (score > threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: alert.id, score };
    }
  }

  if (bestMatch) {
    await appendReporterToAlert(
      bestMatch.id,
      reportedBy,
      Math.round(classification.confidence),
    );
    logger.info(
      {
        alertId: bestMatch.id,
        similarity: bestMatch.score,
        reportedBy,
      },
      "Merged article into existing alert",
    );
    return {
      alertId: bestMatch.id,
      merged: true,
      similarity: bestMatch.score,
    };
  }

  const alertId = await createAlertFromClassification(
    articleId,
    classification,
    reportedBy,
  );
  return { alertId, merged: false };
}
