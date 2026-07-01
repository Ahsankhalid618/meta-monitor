# 09 · Folder Structure

## Layout (as implemented)

```
src/
  config/                 — Zod env parsing
  collectors/
    rss/                  — RSS/Atom (rss-parser)
    changelog/            — Meta docs HTML changelogs
  services/
    groq/                 — Groq API client
    llm/                  — Prompt, keyword gate, quota cooldown
    slack/                — Slack webhook + formatting
    email/                — Resend HTML email (optional)
    deduplication/        — L1 article + L2 event merge
  processors/
    extractor/            — Readability extraction
    classifier/           — Groq classification runner
    formatter/            — Alert delivery orchestration
  database/               — Prisma client + repository helpers
  cron/                   — Scheduler + poll cycle
  api/                    — Express server (/health, /poll, etc.)
  types/                  — RawArticle, Classification schema (Zod)
  utils/                  — Logger, hash, retry

prisma/
  schema.prisma
  seed.ts                 — Source configuration
  migrations/

scripts/
  seed-test-article.ts    — Manual test article
  test-changelog-*.ts     — Changelog collector tests

docs/                     — Project documentation
```

## Pipeline ↔ folder mapping

```
cron/scheduler
  → collectors/rss | collectors/changelog
  → services/deduplication (L1)
  → processors/extractor
  → processors/classifier (+ services/groq, services/llm)
  → services/deduplication/eventDedup (L2)
  → processors/formatter/deliverAlerts
  → services/slack (+ services/email when enabled)
```

## HTTP endpoints (`api/server.ts`)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | DB connectivity check |
| `POST /poll` | Manual poll cycle (`?force=true`) |
| `POST /extract` | Manual content extraction |
| `POST /classify` | Manual Groq classify (`?force=true&limit=N`) |
| `POST /notify` | Manual Slack/email delivery |

## Not yet implemented

```
collectors/reddit/
collectors/github/
collectors/feedly/
```

See [03 · Collectors](./03-collectors.md).
