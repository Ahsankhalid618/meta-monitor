# Meta Intelligence Monitor

> A specialized monitoring service that watches official Meta documentation, changelogs,
> engineering blogs, status pages, and developer communities, and alerts engineering teams
> the moment something changes that could break an **Instagram DM automation platform**
> (AutoSetter).

This is **not** a generic RSS reader. It is a domain-specific intelligence system whose
single job is to answer one question for every piece of Meta-related content it sees:

> **"Does this affect our Instagram Graph API / Messaging integrations?"**

If the answer is yes, it produces a structured, severity-rated alert and delivers it to
Slack and Email. If the answer is no, it silently ignores it.

---

## Why this exists

Teams building on the Instagram Graph API and Messaging API live in constant fear of:

- Silent **breaking changes** to the Graph API
- New **required permissions** that block automated DMs
- **App Review** policy changes
- **Rate limit** changes
- **Webhook** payload / subscription changes
- **OAuth / Business Login** flow changes
- New **anti-abuse / automation detection** systems

Meta announces these across many channels (official docs, blogs, status pages, partner
changelogs) and the community often reports them on Reddit / Stack Overflow / GitHub
*before* the official announcement. Missing one of these can take an automation product
offline. This service ensures **nothing slips through**.

---

## How it works (one paragraph)

Source collectors poll a configured set of feeds every ~5 minutes. Each new article is
deduplicated (by URL + content hash), its full content is extracted, and it is sent to
Gemini acting as a **Senior Platform Engineer**. Gemini returns strict JSON deciding
whether the article is relevant and, if so, its severity, category, impact, and required
action. Relevant alerts are deduplicated across sources (similar articles are merged into a
single event) and delivered to Slack and Email.

---

## Documentation index

| # | Document | Description |
|---|----------|-------------|
| 00 | [README](./README.md) | This overview |
| 01 | [Architecture](./01-architecture.md) | System diagram & data flow |
| 02 | [Requirements](./02-requirements.md) | Functional & non-functional requirements |
| 03 | [Source Collectors](./03-collectors.md) | RSS, Reddit, GitHub, Feedly, Status |
| 04 | [Gemini Classification](./04-gemini-classification.md) | The AI engineer, prompt rules, JSON schema |
| 05 | [Deduplication](./05-deduplication.md) | Article + event de-dup and merging |
| 06 | [Notifications](./06-notifications.md) | Slack & Email alert formats |
| 07 | [Database Schema](./07-database-schema.md) | Tables, columns, relationships |
| 08 | [Tech Stack](./08-tech-stack.md) | Languages, libraries, services |
| 09 | [Folder Structure](./09-folder-structure.md) | Source code layout |
| 10 | [Implementation Roadmap](./10-implementation-roadmap.md) | Phased build plan & milestones |

---

## Quick reference

- **Polling interval:** every ~5 minutes (configurable per source)
- **AI model:** Gemini API (acts as classifier, *not* summarizer)
- **Output:** strict JSON → structured alert → Slack + Email
- **Dedup rule:** merge events when similarity > 90%
- **Stack:** TypeScript, Node.js 22, Express, PostgreSQL + Prisma, node-cron
- **Frontend:** none in v1 — the product is push-based (Slack + Email). See [Tech Stack](./08-tech-stack.md#why-no-frontend-in-v1).
- **Deployment:** Railway
