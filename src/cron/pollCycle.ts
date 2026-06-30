import {
  getDueSources,
  getEnabledSources,
  markPolled,
} from "../database/sources.js";
import { insertArticles } from "../database/articles.js";
import { dedupeArticles } from "../services/deduplication/index.js";
import { extractPendingArticles } from "../processors/extractor/runExtraction.js";
import {
  classifyPendingArticles,
  markAutoClassifyRan,
  shouldAutoClassify,
} from "../processors/classifier/runClassification.js";
import { deliverPendingAlerts } from "../processors/formatter/deliverAlerts.js";
import { getCollector } from "../collectors/index.js";
import { logger } from "../utils/logger.js";

let running = false;

export interface PollCycleResult {
  sourcesPolled: number;
  articlesFetched: number;
  articlesSaved: number;
  duplicatesSkipped: number;
  contentExtracted: number;
  articlesClassified: number;
  alertsCreated: number;
  alertsMerged: number;
  slackSent: number;
  emailSent: number;
}

export interface PollCycleOptions {
  /** Poll all enabled sources, ignoring each source's pollInterval. */
  force?: boolean;
}

/**
 * Runs one collection cycle: poll every due source, collect its articles,
 * and persist the new ones. Each source is isolated so one failure does not
 * abort the cycle. Overlapping runs are skipped via a simple in-process lock.
 */
export async function runPollCycle(
  options: PollCycleOptions = {},
): Promise<PollCycleResult> {
  const result: PollCycleResult = {
    sourcesPolled: 0,
    articlesFetched: 0,
    articlesSaved: 0,
    duplicatesSkipped: 0,
    contentExtracted: 0,
    articlesClassified: 0,
    alertsCreated: 0,
    alertsMerged: 0,
    slackSent: 0,
    emailSent: 0,
  };

  if (running) {
    logger.debug("Poll cycle already running; skipping this tick.");
    return result;
  }
  running = true;

  try {
    const sources = options.force
      ? await getEnabledSources()
      : await getDueSources();

    if (sources.length === 0) {
      logger.debug("No sources due for polling.");
    } else {
      logger.info(
        { count: sources.length, force: options.force ?? false },
        "Polling sources",
      );

      for (const source of sources) {
        const collector = getCollector(source.type);
        if (!collector) {
          logger.warn(
            { source: source.name, type: source.type },
            "No collector for source type; skipping",
          );
          continue;
        }

        try {
          const articles = await collector.collect(source);
          const { fresh, duplicates } = await dedupeArticles(articles);
          const saved = await insertArticles(fresh);
          await markPolled(source.id);

          result.sourcesPolled += 1;
          result.articlesFetched += articles.length;
          result.articlesSaved += saved;
          result.duplicatesSkipped += duplicates;

          logger.info(
            {
              source: source.name,
              fetched: articles.length,
              saved,
              duplicates,
            },
            "Polled source",
          );
        } catch (err) {
          logger.error({ err, source: source.name }, "Failed to poll source");
        }
      }
    }

    // Always run downstream stages (new articles + pending alerts).
    const extraction = await extractPendingArticles();
    result.contentExtracted = extraction.extracted;

    const newContent =
      result.articlesSaved > 0 || extraction.extracted > 0;

    if (shouldAutoClassify(newContent)) {
      markAutoClassifyRan();
      const classification = await classifyPendingArticles();
      result.articlesClassified = classification.processed;
      result.alertsCreated = classification.alertsCreated;
      result.alertsMerged = classification.alertsMerged;
    } else {
      logger.debug("Skipping auto-classify (interval/cooldown or no new content)");
    }

    const delivery = await deliverPendingAlerts();
    result.slackSent = delivery.slackSent;
    result.emailSent = delivery.emailSent;

    return result;
  } finally {
    running = false;
  }
}
