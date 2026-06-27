# 09 · Folder Structure

## Suggested layout

```
src/

  config/

  collectors/
      rss/
      reddit/
      github/
      feedly/
      status/

  services/
      gemini/
      slack/
      email/
      deduplication/

  processors/
      extractor/
      classifier/
      formatter/

  database/

  cron/

  api/

  types/

  utils/
```

## What each directory does

### `config/`
Environment parsing, source configuration loading, constants (poll interval, similarity
threshold, severity colors/emojis).

### `collectors/`
One subfolder per source type. Each collector fetches from its source and emits the common
`RawArticle` shape. See [03 · Source Collectors](./03-collectors.md).

- `rss/` — generic RSS/Atom (Meta docs, blog, status, Feedly, engineering blogs, changelogs)
- `reddit/` — developer subreddit posts
- `github/` — Issues / Discussions / Releases
- `feedly/` — Feedly aggregated streams
- `status/` — Meta Status / incident feeds

### `services/`
Integrations with external systems and cross-cutting logic.

- `gemini/` — Gemini API client and prompt wiring
- `slack/` — Slack Incoming Webhook delivery + formatting
- `email/` — Resend HTML email delivery + formatting
- `deduplication/` — article-level and event-level dedup/merge

### `processors/`
The transformation steps of the pipeline.

- `extractor/` — full-content extraction (readability + JSDOM), normalization, hashing
- `classifier/` — sends content to Gemini, validates the JSON verdict, builds alerts
- `formatter/` — shared logic for turning an alert into Slack/email payloads

### `database/`
Prisma client, schema, migrations, and repository helpers for `Sources` / `Articles` /
`Alerts`. See [07 · Database Schema](./07-database-schema.md).

### `cron/`
The `node-cron` scheduler that triggers the poll cycle every ~5 minutes and respects each
source's `pollInterval`.

### `api/`
Lean **Express** HTTP surface: a `/health` check plus a few admin endpoints (source CRUD,
manual re-run / test). This is *not* a full API — the app is a cron-driven worker, so this
layer stays minimal. No frontend ships in v1 (see
[08 · Tech Stack](./08-tech-stack.md#why-no-frontend-in-v1)).

### `types/`
Shared TypeScript types (`RawArticle`, `CleanArticle`, `Classification`, `Alert`, enums).

### `utils/`
Logging (Pino), hashing, string-similarity helpers, URL canonicalization, retry helpers.

## Pipeline ↔ folder mapping

```
cron → collectors/* → services/deduplication (L1)
     → processors/extractor → processors/classifier → services/gemini
     → services/deduplication (L2 merge)
     → processors/formatter → services/slack + services/email
```
