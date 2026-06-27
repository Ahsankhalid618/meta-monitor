import {
  getDueSources,
  getEnabledSources,
  markPolled,
} from "../database/sources.js";
import { insertArticles } from "../database/articles.js";
import { dedupeArticles } from "../services/deduplication/index.js";
import { extractPendingArticles } from "../processors/extractor/runExtraction.js";
import { getCollector } from "../collectors/index.js";
import { logger } from "../utils/logger.js";

let running = false;

export interface PollCycleResult {
  sourcesPolled: number;
  articlesFetched: number;
  articlesSaved: number;
  duplicatesSkipped: number;
  contentExtracted: number;
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
      return result;
    }

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

    // Extract clean content for any articles still missing it (new + backlog).
    const extraction = await extractPendingArticles();
    result.contentExtracted = extraction.extracted;

    return result;
  } finally {
    running = false;
  }
}
