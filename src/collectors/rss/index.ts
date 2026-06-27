import Parser from "rss-parser";
import type { RawArticle } from "../../types/index.js";
import type { Collector } from "../types.js";

type FeedItem = {
  link?: string;
  guid?: string;
  title?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  ["content:encoded"]?: string;
};

const parser: Parser<unknown, FeedItem> = new Parser({
  customFields: { item: [["content:encoded", "content:encoded"]] },
});

function parseDate(item: FeedItem): Date {
  const raw = item.isoDate ?? item.pubDate;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Generic RSS/Atom collector driven by the Sources table. Handles Meta docs,
 * blog, Feedly, and engineering-blog feeds.
 */
export const rssCollector: Collector = {
  async collect(source) {
    const feed = await parser.parseURL(source.url);
    const articles: RawArticle[] = [];

    for (const item of feed.items) {
      const url = (item.link ?? item.guid)?.trim();
      if (!url) continue;

      articles.push({
        url,
        title: item.title?.trim() ?? "(untitled)",
        publishedAt: parseDate(item),
        rawContent:
          item["content:encoded"] ?? item.content ?? item.contentSnippet,
        sourceId: source.id,
      });
    }

    return articles;
  },
};
