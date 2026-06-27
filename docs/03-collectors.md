# 03 · Source Collectors

Collectors are responsible for fetching content from a source and normalizing it into a
common `RawArticle` shape. Each collector lives under `src/collectors/<type>/`.

## Common output shape

Every collector, regardless of source type, must output:

```ts
interface RawArticle {
  url: string;          // canonical article URL
  title: string;
  publishedAt: Date;
  rawContent?: string;  // RSS summary/body if available
  sourceId: string;     // FK → Sources.id
}
```

## Source categories

The monitored sources fall into three logical groups (see the architecture diagram):

### Group A — Official Meta
- **Meta Official Docs** (developer documentation pages / changelogs)
- **Meta Blog** (engineering and developer blog)
- **Meta Status** (platform incident / status feed)

### Group B — Curated feeds
- **Feedly RSS** (aggregated relevant feeds)
- **Engineering Blogs** (partner / third-party engineering blogs, e.g. 360dialog)
- **Changelogs** (API changelog feeds)

### Group C — Community
- **Reddit** (developer subreddits)
- **Stack Overflow** (relevant tags)
- **GitHub Issues / Discussions** (SDK repos, related projects)

## Collector types

### `collectors/rss/`
- Uses `rss-parser` to read RSS/Atom feeds.
- Handles Meta docs/blog/status feeds, Feedly, engineering blogs, changelogs.
- Generic: a single RSS collector is driven by the `Sources` table.

### `collectors/reddit/`
- Polls subreddit JSON / RSS endpoints for relevant posts.
- Filters by keywords (Instagram API, Graph API, webhook, app review, etc.).

### `collectors/github/`
- Watches GitHub Issues / Discussions / Releases for relevant repos.
- Useful for SDK changes and community-reported breakage.

### `collectors/feedly/`
- Pulls from Feedly's aggregated streams (RSS or API).
- Lets the administrator curate sources outside the app.

### `collectors/status/`
- Reads Meta Status / incident feeds.
- Surfaces outages and platform incidents affecting APIs.

## Polling behavior

- A scheduler (`node-cron`) triggers a collection cycle every ~5 minutes.
- Each source has its own `pollInterval`; a source is only polled when due.
- Disabled sources (`enabled = false`) are skipped.

## Administrator-configured sources

Any RSS source can be added by the administrator by inserting a row into the `Sources`
table:

```
id | name | url | type | enabled | pollInterval
```

See [07 · Database Schema](./07-database-schema.md) for the full schema.

## Normalization contract

After collection, each `RawArticle` is passed to the deduplication step. Collectors must:

1. Resolve the **canonical URL** (strip tracking params where possible).
2. Provide a stable `title`.
3. Provide `publishedAt` (fall back to fetch time if the feed omits it).
4. Include `rawContent` when the feed provides full text (saves an extraction fetch).
