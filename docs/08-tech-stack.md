# 08 · Tech Stack

## Chosen stack (v1 — shipped)

| Component | Technology |
|-----------|------------|
| Language | TypeScript |
| Runtime | Node.js 22 |
| Framework | **Express** (health + admin endpoints) |
| Scheduler | node-cron (every minute) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| HTTP fetching | Node fetch (undici) |
| RSS Parsing | rss-parser |
| Changelog | Custom HTML collector (regex + fetch) |
| HTML Extraction | @mozilla/readability + JSDOM |
| JSON validation | Zod |
| Dedup similarity | string-similarity |
| AI | **Groq API** (`llama-3.3-70b-versatile`) |
| Slack | Incoming Webhooks |
| Email | Resend (optional, disabled in v1 prod) |
| Deployment | **Railway** |
| Logging | Pino |

### Deferred to v2

| Component | Technology | Why deferred |
|-----------|------------|--------------|
| Queue | BullMQ + Redis | Current volume doesn't require it |
| Frontend | Next.js dashboard | Push-based product; Slack is the UI |
| Reddit/GitHub collectors | — | v1 focused on official Meta sources |
| Gemini | — | Replaced by Groq (free tier, no quota block) |

## Rationale

- **Express over NestJS** — cron worker with minimal HTTP surface.
- **Groq over Gemini** — reliable free-tier API; OpenAI-compatible JSON mode.
- **Keyword gate** — reduces Groq calls on noisy developer blog posts.
- **Changelog HTML collector** — Graph API breaking changes aren't in RSS.
- **Railway** — managed Postgres + always-on Node worker.

## Why no frontend in v1

The product is **push-based**. Value is Slack alerts, not a dashboard you log into.
Source config via seed file / Prisma Studio / DB rows.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | `true` for Railway/Heroku TLS |
| `GROQ_API_KEY` | Groq API authentication |
| `GROQ_MODEL` | Default `llama-3.3-70b-versatile` |
| `LLM_CLASSIFY_BATCH` | Max articles per classify run (default `1`) |
| `LLM_CLASSIFY_DELAY_MS` | Delay between Groq calls (default `2000`) |
| `LLM_CLASSIFY_INTERVAL_MS` | Backlog classify interval (default `300000`) |
| `LLM_MAX_CONTENT_CHARS` | Max chars per article (default `4000`) |
| `LLM_QUOTA_COOLDOWN_MS` | Pause after 429 (default `900000`) |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook |
| `RESEND_API_KEY` | Optional — email |
| `ALERT_EMAIL_TO` | Optional — email recipients |
| `ALERT_EMAIL_FROM` | Must be verified domain (not Gmail) |
| `SIMILARITY_THRESHOLD` | Event merge threshold (default `0.90`) |
| `PORT` | HTTP port (Railway injects automatically) |
| `NODE_ENV` | `production` on Railway |
| `LOG_LEVEL` | Pino level (default `info`) |
| `GITHUB_TOKEN` | Optional — future GitHub collector |

See `.env.example` for a template.

## Railway deploy commands

**Build:**
```bash
pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build
```

**Start:**
```bash
pnpm exec prisma migrate deploy && pnpm db:seed && pnpm start
```

## Versioning

Pin dependencies in `pnpm-lock.yaml`. All schema changes via Prisma migrations.
