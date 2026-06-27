# 02 · Requirements

## Product summary

Instead of a generic RSS application, build a **Meta Intelligence Monitor** specifically for
engineering teams maintaining **Instagram Graph API integrations**.

The application continuously monitors official Meta documentation, changelogs, engineering
blogs, Meta Status, Feedly feeds, Reddit developer communities, Stack Overflow, GitHub
discussions, and any RSS sources configured by the administrator.

## Functional requirements

### FR-1 · Continuous monitoring
- Every few minutes (~5) the service checks **all configured sources** for newly published
  content.
- Sources are configurable by the administrator (add/remove/enable/disable, set
  `pollInterval`).

### FR-2 · Guaranteed single processing
- The service stores **every processed article URL and content hash** in the database.
- This guarantees the **same event is never analyzed twice**.

### FR-3 · Full content extraction
- When a new article is found, download the **complete content**:
  - Use the RSS summary if it contains the full body.
  - Otherwise extract readable article text from the HTML.
- Normalize the content before sending it to Gemini.

### FR-4 · AI classification (not summarization)
- Send normalized content to **Gemini**.
- Gemini acts as **AutoSetter's Senior Platform Engineer**.
- Its only responsibility is deciding whether the article affects an **Instagram DM
  automation platform**.
- Gemini returns **only JSON** — nothing else.

### FR-5 · Structured alerts
- Relevant content produces a structured alert with severity, category, summary, impact,
  required action, deadline, confidence, reasoning, and tags.

### FR-6 · Event deduplication / merging
- Detect when multiple sources report the **same** Meta announcement.
- If similarity > 90%, merge into a **single event** that lists all reporting sources.

### FR-7 · Multi-channel delivery
- Deliver relevant alerts to **Slack** (Incoming Webhook) and **Email** (Resend / HTML).
- Track delivery per channel for idempotent retries.

## Non-functional requirements

| Area | Requirement |
|------|-------------|
| **Reliability** | No missed announcements; safe retries; idempotent delivery. |
| **Idempotency** | Re-running the pipeline must never produce duplicate alerts. |
| **Cost control** | Skip dedup'd articles *before* calling Gemini to limit token spend. |
| **Latency** | New relevant content should reach Slack/Email within one poll cycle (~5 min). |
| **Observability** | Structured logging (Pino) at every pipeline stage. |
| **Configurability** | Sources, intervals, severity thresholds editable without redeploy. |
| **Security** | API keys (Gemini, Resend, Slack webhook) stored as env secrets. |

## Out of scope (v1)

- **Frontend / web dashboard** — the product is **push-based**; all value is delivered to
  Slack + Email. Source config is handled via a seed file, Prisma Studio, or a few Express
  admin endpoints. A Next.js dashboard is a **v2** consideration. See
  [08 · Tech Stack](./08-tech-stack.md#why-no-frontend-in-v1).
- User accounts / multi-tenant configuration.
- Historical analytics beyond what's stored in the DB.
- Message queue (BullMQ/Redis) — deferred to v2; not needed at ~5-min polling of a few sources.
