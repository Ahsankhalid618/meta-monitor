import type { RawArticle } from "../../types/index.js";
import type { Collector } from "../types.js";
import {
  discoverGraphApiVersionUrls,
  discoverOutOfCycleUrls,
  fetchMetaDocsHtml,
  isGraphApiChangelogIndex,
  isGraphApiVersionPage,
  isOutOfCycleDetailPage,
  isOutOfCycleIndex,
  parseGraphApiVersionPage,
  parseOutOfCyclePage,
  type ChangelogSection,
} from "./parse.js";
import { logger } from "../../utils/logger.js";

/** How many recent Graph API version pages to poll from the index. */
const MAX_VERSION_PAGES = 3;

/** How many recent out-of-cycle pages to poll from the index. */
const MAX_OUT_OF_CYCLE_PAGES = 5;

function toRawArticles(
  sections: ChangelogSection[],
  sourceId: string,
): RawArticle[] {
  return sections.map((s) => ({
    url: s.url,
    title: s.title,
    publishedAt: s.publishedAt,
    rawContent: s.rawContent,
    sourceId,
  }));
}

async function collectFromIndex(
  source: { id: string; url: string },
): Promise<RawArticle[]> {
  const html = await fetchMetaDocsHtml(source.url);
  const versionUrls = discoverGraphApiVersionUrls(
    html,
    source.url,
    MAX_VERSION_PAGES,
  );

  logger.debug(
    { source: source.url, versionUrls },
    "Discovered Graph API version pages",
  );

  const articles: RawArticle[] = [];
  for (const versionUrl of versionUrls) {
    try {
      const pageHtml = await fetchMetaDocsHtml(versionUrl);
      const sections = parseGraphApiVersionPage(pageHtml, versionUrl);
      articles.push(...toRawArticles(sections, source.id));
    } catch (err) {
      logger.error({ err, versionUrl }, "Failed to fetch version changelog");
    }
  }
  return articles;
}

async function collectFromOutOfCycleIndex(
  source: { id: string; url: string },
): Promise<RawArticle[]> {
  const html = await fetchMetaDocsHtml(source.url);
  const detailUrls = discoverOutOfCycleUrls(
    html,
    source.url,
    MAX_OUT_OF_CYCLE_PAGES,
  );

  const articles: RawArticle[] = [];
  for (const detailUrl of detailUrls) {
    try {
      const pageHtml = await fetchMetaDocsHtml(detailUrl);
      const section = parseOutOfCyclePage(pageHtml, detailUrl);
      if (section) {
        articles.push(...toRawArticles([section], source.id));
      }
    } catch (err) {
      logger.error({ err, detailUrl }, "Failed to fetch out-of-cycle page");
    }
  }
  return articles;
}

async function collectFromVersionPage(
  source: { id: string; url: string },
): Promise<RawArticle[]> {
  const html = await fetchMetaDocsHtml(source.url);
  const sections = parseGraphApiVersionPage(html, source.url);
  return toRawArticles(sections, source.id);
}

async function collectFromOutOfCycleDetail(
  source: { id: string; url: string },
): Promise<RawArticle[]> {
  const html = await fetchMetaDocsHtml(source.url);
  const section = parseOutOfCyclePage(html, source.url);
  return section ? toRawArticles([section], source.id) : [];
}

/**
 * Collects structured changelog entries from Meta developer docs HTML pages.
 * Index sources discover child version/out-of-cycle URLs automatically.
 */
export const changelogCollector: Collector = {
  async collect(source) {
    const url = source.url.replace(/#.*$/, "");

    if (isGraphApiChangelogIndex(url)) {
      return collectFromIndex({ id: source.id, url });
    }
    if (isOutOfCycleIndex(url)) {
      return collectFromOutOfCycleIndex({ id: source.id, url });
    }
    if (isGraphApiVersionPage(url)) {
      return collectFromVersionPage({ id: source.id, url });
    }
    if (isOutOfCycleDetailPage(url)) {
      return collectFromOutOfCycleDetail({ id: source.id, url });
    }

    logger.warn({ url }, "Unknown changelog URL pattern; treating as version page");
    return collectFromVersionPage({ id: source.id, url });
  },
};
