# 08 · Tech Stack

## Chosen stack (v1)

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Runtime | Node.js 22 |
| Framework | **Express** (lean — health check + a few admin endpoints) |
| Scheduler | node-cron |
| Database | PostgreSQL (Prisma ORM) |
| HTTP fetching | undici (built into Node) |
| RSS Parsing | rss-parser |
| GitHub source | @octokit/rest (Issues / Discussions / Releases) |
| HTML Extraction | @mozilla/readability + JSDOM |
| JSON validation | Zod (validate Gemini output) |
| Dedup similarity | string-similarity (titles/summaries) |
| AI | Gemini API |
| Slack | Incoming Webhooks |
| Email | Resend |
| Deployment | Railway |
| Logging | Pino |

### Deferred to v2 (not in v1)

| Component | Technology | Why deferred |
|-----------|------------|--------------|
| Queue | BullMQ + Redis | ~5-min polling of a few sources doesn't need a queue. Add only if Gemini rate limits or volume force decoupling. |
| Frontend | Next.js dashboard | Product is push-based (Slack + Email). See [decision below](#why-no-frontend-in-v1). |
| Embedding dedup | Gemini embeddings | Only if title/summary string similarity proves inaccurate. |

## Rationale

- **TypeScript + Node.js 22** — strong typing for the article/alert contracts; modern LTS runtime.
- **Express (not NestJS)** — this app is a **background worker driven by cron**, not an
  HTTP API. NestJS's modules/DI/decorators add a learning curve and ceremony that buy little
  here. Express gives us a `/health` check and a couple of admin endpoints with near-zero
  overhead; the cron worker remains the heart of the app. Migrating later is cheap if needed.
- **node-cron** — simple in-process scheduling for the ~5-minute poll cycle.
- **PostgreSQL + Prisma** — relational integrity for Sources → Articles → Alerts, with
  type-safe queries and migrations.
- **undici** — Node's built-in fetch client for downloading article HTML.
- **rss-parser** — robust RSS/Atom parsing for the bulk of sources.
- **@octokit/rest** — typed GitHub access for the `github/` collector.
- **@mozilla/readability + JSDOM** — extract clean, readable article text from HTML when the
  feed lacks full content.
- **Zod** — strictly validate Gemini's JSON output. The whole system depends on Gemini
  returning well-formed JSON, so we parse defensively and reject/repair anything off-schema.
- **string-similarity** — cheap title/summary comparison for event deduplication; upgrade to
  embeddings only if accuracy demands it.
- **Gemini API** — the classification engine (acts as Senior Platform Engineer).
- **Slack Incoming Webhooks** — zero-friction channel delivery.
- **Resend** — simple transactional HTML email.
- **Railway** — straightforward deployment with managed Postgres + always-on worker hosting.
- **Pino** — fast structured JSON logging for observability.

## Why no frontend in v1

This is intentional, not a shortcut:

- **The product is push-based.** Its entire value is delivering alerts to where engineers
  already are — **Slack and Email**. A dashboard you have to log into to "check for Meta
  changes" defeats the purpose.
- **Source config is low-frequency admin work.** Manage the `Sources` table via a seed file,
  Prisma Studio, or 2–3 tiny Express admin endpoints — no SPA required.
- **A frontend adds cost for little value now** — auth, hosting, and maintenance with almost
  no user benefit at this stage.

A frontend becomes worthwhile in **v2** if we want an alert-history/audit dashboard, a
source-management UI for non-technical admins, or a view into Gemini's `reasoning` /
`confidence` for tuning. At that point a lightweight **Next.js** app reading the same
Postgres DB is the natural choice — built *after* the core pipeline works.

## Environment variables (expected)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Gemini API authentication |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook endpoint |
| `RESEND_API_KEY` | Resend email API key |
| `ALERT_EMAIL_TO` | Destination email address(es) |
| `POLL_INTERVAL` | Default poll interval (seconds) |
| `SIMILARITY_THRESHOLD` | Event-merge threshold (default `0.90`) |
| `GITHUB_TOKEN` | (optional) raises GitHub API rate limits for the `github/` collector |
| `LOG_LEVEL` | Pino log level |
| `REDIS_URL` | **v2 only** — BullMQ / Redis connection (not used in v1) |

## Versioning

Pin dependencies in `package.json` and install latest stable via the package manager rather
than hand-writing versions. Use Prisma migrations for all schema changes.
