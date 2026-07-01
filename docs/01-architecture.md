# 01 · Architecture

## High-level diagram

```
                ┌──────────────────────────────┐
                │      Source Collectors       │
                │   RSS  ·  Changelog HTML     │
                └──────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  Meta Developers Blog   Meta Status RSS       Graph API Changelog
  (Atom feed)            (Graph/Login/Messenger)  (HTML scrape)
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                     Cron tick (every minute)
                               │
                     Deduplicate Articles (L1)
                               │
                     Extract Full Content
                               │
                     Keyword Gate (optional skip)
                               │
                        Groq Classification
                               │
              Relevant? ───────┴──────── Ignore
                    │
                    ▼
             Structured Alert JSON
                               │
                    Event Merge (L2)
                               │
                               ▼
                         Slack Channel
                    (Email optional v2)
```

## Pipeline stages

The system is a **linear processing pipeline** triggered on a schedule.

### 1. Collect
Source collectors fetch content from all **due** enabled sources. Each collector type
knows how to talk to its source and normalize output into a common `RawArticle` shape
(`url`, `title`, `publishedAt`, `rawContent`, `sourceId`).

**Implemented (v1):** `rss/`, `changelog/`  
**Planned (v2):** `reddit/`, `github/`, `feedly/`

### 2. Poll (schedule)
A scheduler (`node-cron`) ticks **every minute**. Each source's `pollInterval` (seconds)
determines when it is due. `POST /poll?force=true` polls all enabled sources immediately.

### 3. Deduplicate articles (L1)
Before expensive work, every article is checked against the `Articles` table by **URL**
and **content hash**. Duplicates are dropped. This guarantees the same article is never
analyzed twice.

### 4. Extract full content
For new articles:
- Use RSS/raw body from collector when substantial (changelog sections include `rawContent`).
- Otherwise fetch HTML and extract with `@mozilla/readability` + `JSDOM`.
- Normalize whitespace and produce clean text for the model.

### 5. Keyword gate (pre-filter)
Articles that clearly lack Instagram API signal are marked processed **without** calling
Groq. **Meta Status** and **Changelog** sources always pass through.

### 6. Groq classification
Normalized content is sent to Groq (`llama-3.3-70b-versatile`), acting as **AutoSetter's
Senior Platform Engineer**. It returns **strict JSON only**. See
[04 · LLM Classification](./04-llm-classification.md).

### 7. Branch: relevant vs ignore
- **Irrelevant** → mark article processed, stop.
- **Relevant** → create `Alert` and continue.

### 8. Event deduplication / merge (L2)
Multiple sources may report the same announcement. Relevant alerts are compared (title +
summary similarity). If similarity > 90%, they merge into one event with multiple
`reportedBy` sources. See [05 · Deduplication](./05-deduplication.md).

### 9. Notify
Structured alerts are delivered to:
- **Slack** via Incoming Webhook (**primary channel in v1**)
- **Email** via Resend (optional — requires verified domain; disabled in v1 production)

Delivery state (`sentSlack`, `sentEmail`) makes retries idempotent.

## Data flow summary

```
RawArticle → [L1 dedup] → [extract] → [keyword gate] → CleanArticle
   → [Groq] → Classification → (relevant) → Alert → [L2 merge] → Slack
```

## Optional async processing (v2)

Classification + notification can move onto **BullMQ + Redis** if volume or Groq rate limits
require decoupling. Not needed at current scale.
