# 11 · Team Handbook — Meta Intelligence Monitor

> Share this document with engineering, product, and ops. It describes what the system is,
> how it works in production, and how to operate it.

---

## 1. What is this?

**Meta Intelligence Monitor** is a background service that watches official Meta developer
sources and alerts our team when something could affect **AutoSetter** — our Instagram DM
automation product built on the **Instagram Graph API** and **Instagram Messaging APIs**.

It is **not** a generic RSS reader. Every piece of content is filtered through one question:

> **"Can this break, rate-limit, restrict, deprecate, or change how we use Instagram Graph / Messaging APIs?"**

If yes → structured alert to **Slack**. If no → silently ignored.

---

## 2. Why we built it

Teams on Instagram API integrations risk missing:

- Silent **breaking changes** and **deprecations**
- New **permissions** or **App Review** requirements
- **Rate limit** changes
- **Webhook** / subscription changes
- **OAuth / Business Login / Embedded Signup** changes
- **Anti-abuse / automation detection** policy updates
- **Platform outages** affecting Graph API or messaging

Meta publishes across many channels. This service centralizes monitoring and pushes alerts
where we already work — **Slack**.

---

## 3. Production deployment (v1)

| Item | Value |
|------|-------|
| **Hosting** | [Railway](https://railway.app) |
| **Public URL** | `https://meta-monitor-production-20bd.up.railway.app` |
| **Database** | Railway PostgreSQL |
| **Repo** | `Ahsankhalid618/meta-monitor` (GitHub) |
| **Branch** | `main` (auto-deploy on push) |
| **Notifications** | Slack Incoming Webhook (**email disabled in v1**) |
| **AI** | Groq (`llama-3.3-70b-versatile`) |

There is **no web UI**. The product is push-based.

---

## 4. Monitored sources (6 enabled)

| Source | Type | Poll interval | Why |
|--------|------|---------------|-----|
| Meta for Developers Blog | RSS | 15 min | API releases, OAuth, Instagram API posts |
| Meta Status — Graph API | RSS | 5 min | Graph API outages |
| Meta Status — Facebook Login | RSS | 5 min | OAuth/login outages |
| Meta Status — Messenger Platform | RSS | 5 min | Instagram DM / messaging outages |
| Graph API Changelog | HTML | 24 hours | Breaking changes, deprecations, permissions |
| Graph API Out-of-Cycle Changes | HTML | 24 hours | Emergency / non-versioned API changes |

**Disabled:** Engineering at Meta (too much irrelevant AI/infra content).

Sources are seeded via `pnpm db:seed` and configurable in the `Sources` table.

---

## 5. Pipeline (how data flows)

```
Every minute (cron tick)
  │
  ├─ 1. COLLECT — poll due sources (RSS + changelog HTML)
  │
  ├─ 2. DEDUP L1 — drop duplicates by URL + content hash
  │
  ├─ 3. EXTRACT — normalize article text (RSS body or Readability)
  │
  ├─ 4. KEYWORD GATE — skip obvious non-API content (changelog/status always pass)
  │
  ├─ 5. CLASSIFY — Groq returns JSON: relevant true/false + severity/impact/action
  │
  ├─ 6. DEDUP L2 — merge similar alerts (>90% similarity) from multiple sources
  │
  └─ 7. NOTIFY — Slack (email skipped in v1)
```

**Typical latency:** relevant content → Slack within **one poll cycle** (~1–5 minutes after
ingestion; changelog fetch can take ~2 minutes).

---

## 6. Alert format (Slack)

Alerts appear as **META WATCH** messages with:

- Severity (🔴 HIGH / 🟠 MEDIUM / 🟡 LOW)
- Category (e.g. Instagram Graph API, OAuth)
- Summary, impact, required action
- Deadline (if any)
- Confidence score
- Source URL
- Reported-by sources (when merged from multiple feeds)

Example real alert: **Embedded Signup v4** (OAuth/login change affecting account connection).

---

## 7. HTTP endpoints (ops / debugging)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | App + DB status |
| `POST` | `/poll?force=true` | Manual poll all enabled sources |
| `POST` | `/extract` | Extract content for pending articles |
| `POST` | `/classify?force=true&limit=N` | Manual Groq classification |
| `POST` | `/notify` | Deliver pending alerts to Slack |

**Production health check:**

```powershell
curl.exe https://meta-monitor-production-20bd.up.railway.app/health
```

Expected: `{"status":"ok","db":"up"}`

---

## 8. Environment variables (Railway)

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (reference from Railway Postgres) |
| `DATABASE_SSL` | `true` for Railway |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook |
| `NODE_ENV` | `production` |

### Groq rate-limit safety (keep these)

| Variable | Recommended |
|----------|-------------|
| `LLM_CLASSIFY_BATCH` | `1` |
| `LLM_CLASSIFY_DELAY_MS` | `2000` |
| `LLM_CLASSIFY_INTERVAL_MS` | `300000` |
| `LLM_MAX_CONTENT_CHARS` | `4000` |

### Optional / disabled in v1

| Variable | Notes |
|----------|-------|
| `RESEND_API_KEY` | Leave empty — email disabled |
| `ALERT_EMAIL_TO` | Leave empty |
| `GITHUB_TOKEN` | For future GitHub collector |

---

## 9. Groq usage & cost control

- **1 Groq API call = 1 article classified** (keyword-skipped articles do not call Groq)
- Free tier: ~**1,000 requests/day**, ~**30/minute**
- Current config targets **~5–20 calls/day** in steady state
- Monitor usage: [console.groq.com](https://console.groq.com)
- On 429 rate limit: app pauses Groq for **15 minutes** automatically

---

## 10. Tech stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Runtime | Node.js 22 |
| HTTP | Express (health + admin endpoints) |
| Scheduler | node-cron (every minute) |
| Database | PostgreSQL + Prisma 7 |
| RSS | rss-parser |
| HTML changelog | Custom collector + regex HTML parsing |
| Extraction | @mozilla/readability + JSDOM |
| AI | Groq (OpenAI-compatible API) |
| Validation | Zod |
| Dedup | Content hash + string-similarity |
| Notifications | Slack Incoming Webhooks |
| Logging | Pino |
| Deploy | Railway |

---

## 11. Repository layout (key paths)

```
src/
  collectors/rss/          — RSS/Atom feeds
  collectors/changelog/    — Meta docs HTML changelogs
  processors/extractor/    — Content extraction
  processors/classifier/   — Groq classification runner
  processors/formatter/    — Alert delivery orchestration
  services/groq/           — Groq API client
  services/llm/            — Prompt, keyword gate, cooldown
  services/slack/          — Slack formatting + send
  services/deduplication/  — L1 article + L2 event dedup
  cron/                    — Scheduler + poll cycle
  api/                     — Express server
prisma/                    — Schema, migrations, seed
docs/                      — This documentation
```

---

## 12. Database (3 tables)

| Table | Purpose |
|-------|---------|
| `Sources` | Configured feeds (name, URL, type, pollInterval, enabled) |
| `Articles` | Every seen article (URL, hash, content, processed flag) |
| `Alerts` | Relevant events (severity, summary, impact, sentSlack, sentEmail) |

Inspect locally: `pnpm prisma:studio`

---

## 13. Operating the service

### Normal operation

- Railway runs 24/7; no manual intervention needed
- Watch **Slack channel** for alerts
- Watch **Railway deploy logs** for errors

### Do not run local dev against production DB

If `pnpm dev` uses the same `DATABASE_URL` as Railway, both will poll and may duplicate
Slack alerts. Use a separate local DB for development.

### After code changes

1. Push to `main` → Railway auto-deploys
2. Build: `pnpm install && pnpm prisma:generate && pnpm build`
3. Start: `prisma migrate deploy && db:seed && start`

### Adding a source

Insert into `Sources` table or update `prisma/seed.ts` and run `pnpm db:seed`.

---

## 14. Milestone status (v1 complete)

| Milestone | Status |
|-----------|--------|
| M1 Setup | ✅ Done |
| M2 Collect (RSS + cron) | ✅ Done |
| M3 Dedup L1 | ✅ Done |
| M4 Extract | ✅ Done |
| M5 Classify (Groq) | ✅ Done |
| M6 Event merge | ✅ Done |
| M7 Notify (Slack) | ✅ Done |
| M8 Deploy Railway | ✅ Done |

---

## 15. v2 roadmap (not started)

- Email alerts (requires verified domain on Resend)
- Instagram Platform changelog source
- Reddit / GitHub community collectors
- Poll lock UX improvement (clearer API response when busy)
- Optional Next.js alert history dashboard
- BullMQ queue if volume grows

---

## 16. Documentation index

| # | Document |
|---|----------|
| 00 | [README](./README.md) — Overview |
| 01 | [Architecture](./01-architecture.md) |
| 02 | [Requirements](./02-requirements.md) |
| 03 | [Collectors](./03-collectors.md) |
| 04 | [LLM Classification](./04-llm-classification.md) |
| 05 | [Deduplication](./05-deduplication.md) |
| 06 | [Notifications](./06-notifications.md) |
| 07 | [Database Schema](./07-database-schema.md) |
| 08 | [Tech Stack](./08-tech-stack.md) |
| 09 | [Folder Structure](./09-folder-structure.md) |
| 10 | [Implementation Roadmap](./10-implementation-roadmap.md) |
| 11 | [Team Handbook](./11-team-handbook.md) — **this document** |
