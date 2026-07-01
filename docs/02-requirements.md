# 02 · Requirements

## Product summary

Build a **Meta Intelligence Monitor** for engineering teams maintaining **Instagram Graph
API / Messaging integrations** (AutoSetter).

The application continuously monitors official Meta developer sources configured in the
database. **v1 sources:** Meta for Developers blog, Meta Status RSS feeds, Graph API
changelog (HTML). **v2:** Reddit, GitHub, Stack Overflow, Feedly.

## Functional requirements

### FR-1 · Continuous monitoring
- The scheduler ticks every minute; each source polls per its `pollInterval`.
- Sources are configurable via DB seed / Prisma Studio (add/remove/enable/disable).

### FR-2 · Guaranteed single processing
- Store every article **URL** and **content hash**.
- The same article is never analyzed twice (Level 1 dedup).

### FR-3 · Full content extraction
- Use collector-provided body when available (RSS, changelog sections).
- Otherwise fetch HTML and extract readable text.
- Normalize before classification.

### FR-4 · AI classification (not summarization)
- Send normalized content to **Groq** (Senior Platform Engineer prompt).
- Decide whether content affects **Instagram DM automation** via Graph/Messaging APIs.
- Return **JSON only**, validated with Zod.

### FR-5 · Structured alerts
- Relevant content produces severity, category, summary, impact, action, deadline,
  confidence, reasoning, tags.

### FR-6 · Event deduplication / merging
- Detect duplicate announcements across sources.
- Merge when similarity > 90%; record all `reportedBy` sources.

### FR-7 · Multi-channel delivery
- **Slack** (required in v1).
- **Email** (optional — Resend with verified domain).
- Idempotent delivery flags per channel.

## Non-functional requirements

| Area | Requirement |
|------|-------------|
| **Reliability** | Safe retries; idempotent Slack delivery. |
| **Idempotency** | Re-running pipeline never double-notifies. |
| **Cost control** | L1 dedup + keyword gate before Groq; batch=1, 5-min classify interval. |
| **Latency** | Relevant content → Slack within one poll cycle. |
| **Observability** | Structured Pino logs at every stage. |
| **Configurability** | Sources/intervals editable in DB without redeploy. |
| **Security** | API keys as Railway/env secrets only. |

## Out of scope (v1)

- Frontend / web dashboard (v2)
- User accounts / multi-tenant
- Email without verified domain
- BullMQ/Redis queue
- Reddit / GitHub collectors (v2)

## v1 status

All functional requirements **FR-1 through FR-7** are implemented. Email is implemented
in code but **disabled in production** (Slack-only). Deployed on Railway.
