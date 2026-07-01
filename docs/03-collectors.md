# 03 · Source Collectors

Collectors fetch content from a source and normalize it into a common `RawArticle` shape.
Each collector lives under `src/collectors/<type>/`.

## Common output shape

```ts
interface RawArticle {
  url: string;          // canonical article URL (may include #fragment for changelog sections)
  title: string;
  publishedAt: Date;
  rawContent?: string;  // body when available (saves an extraction fetch)
  sourceId: string;     // FK → Sources.id
}
```

## Active sources (v1 production seed)

| Source | Type | URL | Poll |
|--------|------|-----|------|
| Meta for Developers Blog | `rss` | `developers.facebook.com/blog/feed/` | 15 min |
| Meta Status — Graph API | `rss` | `metastatus.com/outage-events-feed-graph-api.rss` | 5 min |
| Meta Status — Facebook Login | `rss` | `metastatus.com/outage-events-feed-facebook-login.rss` | 5 min |
| Meta Status — Messenger Platform | `rss` | `metastatus.com/outage-events-feed-messenger.rss` | 5 min |
| Graph API Changelog | `changelog` | `developers.facebook.com/docs/graph-api/changelog` | 24 h |
| Graph API Out-of-Cycle | `changelog` | `.../changelog/out-of-cycle-changes` | 24 h |

**Disabled:** Engineering at Meta (`engineering.fb.com/feed/`) — mostly irrelevant to API integrations.

Configured in `prisma/seed.ts`. Run `pnpm db:seed` to upsert.

## Collector types

### `collectors/rss/` ✅
- Uses `rss-parser` for RSS/Atom feeds.
- Handles developer blog, Meta Status outage feeds.
- Generic: driven by the `Sources` table.

### `collectors/changelog/` ✅
- Fetches Meta developer docs **HTML** pages.
- **Index URLs** discover child pages automatically:
  - Graph API changelog index → latest 3 version pages (v25, v24, v23)
  - Out-of-cycle index → latest 5 non-versioned change pages
- **Version pages** → one `RawArticle` per **h3 section** under "Graph API" (skips Marketing API).
- Changelog sections include substantial `rawContent` (skips HTML re-fetch when possible).

### `collectors/reddit/` 🔜 v2
- Subreddit polling with keyword filter.

### `collectors/github/` 🔜 v2
- Issues / Discussions / Releases for Meta SDK repos.

### `collectors/feedly/` 🔜 v2
- Aggregated curated streams.

## Polling behavior

- Scheduler ticks **every minute** (`src/cron/scheduler.ts`).
- Each source has `pollInterval` (seconds); polled only when due.
- `POST /poll?force=true` ignores intervals (all enabled sources).
- Disabled sources (`enabled = false`) are skipped.

## Adding a source

1. Insert row into `Sources` (or add to `prisma/seed.ts`).
2. Choose `type`: `rss` or `changelog` (others when collectors exist).
3. Set `pollInterval` appropriately (status: 300s, blog: 900s, changelog: 86400s).
4. Run `pnpm db:seed` or insert via Prisma Studio.

## Normalization contract

Collectors must:

1. Provide a **stable canonical URL** (changelog uses `#graph-api-{section}` fragments).
2. Provide a stable `title`.
3. Provide `publishedAt` (version release date or fetch time).
4. Include `rawContent` when available.

See [07 · Database Schema](./07-database-schema.md).
