# Meta Intelligence Monitor

> A specialized monitoring service that watches official Meta documentation, changelogs,
> developer blogs, status pages, and (in v2) developer communities. It alerts engineering
> teams the moment something changes that could break an **Instagram DM automation platform**
> (AutoSetter).

This is **not** a generic RSS reader. It is a domain-specific intelligence system whose
single job is to answer one question for every piece of Meta-related content it sees:

> **"Does this affect our Instagram Graph API / Messaging integrations?"**

If the answer is yes, it produces a structured, severity-rated alert and delivers it to
**Slack** (Email optional in v2). If the answer is no, it silently ignores it.

---

## Why this exists

Teams building on the Instagram Graph API and Messaging API live in constant fear of:

- Silent **breaking changes** to the Graph API
- New **required permissions** that block automated DMs
- **App Review** policy changes
- **Rate limit** changes
- **Webhook** payload / subscription changes
- **OAuth / Business Login / Embedded Signup** flow changes
- New **anti-abuse / automation detection** systems
- **Platform outages** affecting Graph API or messaging

Meta announces these across many channels. Missing one can take an automation product
offline. This service ensures **nothing slips through**.

---

## How it works (one paragraph)

Source collectors poll configured feeds on a schedule. Each new article is deduplicated
(by URL + content hash), its content is extracted, filtered by a keyword gate, and sent to
**Groq** acting as a **Senior Platform Engineer**. Groq returns strict JSON deciding
whether the article is relevant and, if so, its severity, category, impact, and required
action. Relevant alerts are deduplicated across sources (similar articles merge into a
single event) and delivered to **Slack**.

---

## Production (v1)

| Item | Value |
|------|-------|
| **URL** | `https://meta-monitor-production-20bd.up.railway.app` |
| **Health** | `GET /health` → `{"status":"ok","db":"up"}` |
| **Alerts** | Slack Incoming Webhook |
| **AI** | Groq — `llama-3.3-70b-versatile` |
| **Repo** | GitHub → Railway auto-deploy on `main` |

See **[11 · Team Handbook](./11-team-handbook.md)** for the full shareable overview.

---

## Documentation index

| # | Document | Description |
|---|----------|-------------|
| 00 | [README](./README.md) | This overview |
| 01 | [Architecture](./01-architecture.md) | System diagram & data flow |
| 02 | [Requirements](./02-requirements.md) | Functional & non-functional requirements |
| 03 | [Source Collectors](./03-collectors.md) | RSS, Changelog, Status (+ v2 Reddit/GitHub) |
| 04 | [LLM Classification](./04-llm-classification.md) | Groq, prompt rules, JSON schema, rate limits |
| 05 | [Deduplication](./05-deduplication.md) | Article + event de-dup and merging |
| 06 | [Notifications](./06-notifications.md) | Slack (& Email when enabled) |
| 07 | [Database Schema](./07-database-schema.md) | Tables, columns, relationships |
| 08 | [Tech Stack](./08-tech-stack.md) | Languages, libraries, services |
| 09 | [Folder Structure](./09-folder-structure.md) | Source code layout |
| 10 | [Implementation Roadmap](./10-implementation-roadmap.md) | Milestones & v2 plan |
| 11 | [Team Handbook](./11-team-handbook.md) | **Share with your team** — ops, deploy, sources |

---

## Quick reference

- **Scheduler:** checks every minute; each source has its own `pollInterval`
- **AI model:** Groq `llama-3.3-70b-versatile` (classifier, *not* summarizer)
- **Output:** strict JSON → structured alert → Slack
- **Dedup rule:** merge events when similarity > 90%
- **Stack:** TypeScript, Node.js 22, Express, PostgreSQL + Prisma, node-cron
- **Frontend:** none in v1 — push-based (Slack)
- **Deployment:** Railway
