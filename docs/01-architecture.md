# 01 · Architecture

## High-level diagram

```
                ┌──────────────────────────────┐
                │      Source Collectors       │
                └──────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  Meta Official Docs     Feedly RSS           Reddit / StackOverflow
  Meta Blog              Engineering Blogs    Community Reports
  Meta Status            Changelogs           GitHub Issues
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                     Poll every 5 minutes
                               │
                     Deduplicate Articles
                               │
                     Extract Full Content
                               │
                        Gemini Analysis
                               │
              Relevant? ───────┴──────── Ignore
                    │
                    ▼
             Structured Alert JSON
                    │
       ┌────────────┴────────────┐
       │                         │
    Slack Channel            Email
```

## Pipeline stages

The system is a **linear processing pipeline** triggered on a schedule.

### 1. Collect
Source collectors fetch content from all enabled sources. Each collector type
(RSS, Reddit, GitHub, Feedly, Status) knows how to talk to its source and normalize the
output into a common `RawArticle` shape (`url`, `title`, `publishedAt`, `rawContent`,
`sourceId`).

### 2. Poll (schedule)
A scheduler (`node-cron`) runs the collection cycle every ~5 minutes. The interval is
configurable globally and **per source** via the `pollInterval` column.

### 3. Deduplicate articles
Before doing any expensive work, every article is checked against the `Articles` table by
**URL** and **content hash**. If we've already seen and processed this exact article, it is
dropped. This guarantees **the same event is never analyzed twice**.

### 4. Extract full content
For new articles:
- Use the RSS summary if it contains the full body.
- Otherwise, fetch the page HTML and extract readable article text using
  `@mozilla/readability` + `JSDOM`.
- Normalize whitespace, strip boilerplate, and produce clean text for the model.

### 5. Gemini analysis (classification)
The normalized content is sent to Gemini, which acts as **AutoSetter's Senior Platform
Engineer**. It decides relevance and returns **strict JSON only**. See
[04 · Gemini Classification](./04-gemini-classification.md).

### 6. Branch: relevant vs ignore
- **Irrelevant** → mark article processed, stop.
- **Relevant** → build a structured alert and continue.

### 7. Event deduplication / merge
Many sites report the same Meta announcement. Relevant alerts are compared (title
similarity, summary similarity, URL overlap). If similarity > 90%, they are **merged into a
single event** with multiple reporting sources. See
[05 · Deduplication](./05-deduplication.md).

### 8. Notify
The structured alert is delivered to:
- **Slack** via Incoming Webhook (formatted message)
- **Email** via Resend (HTML email with severity color)

Delivery state is recorded (`sentSlack`, `sentEmail`) so retries are safe and idempotent.

## Data flow summary

```
RawArticle → [dedup] → [extract] → CleanArticle → [Gemini] → Classification
   → (relevant) → Alert → [event merge] → Slack + Email
```

## Optional async processing

For scale or resilience, classification + notification can be pushed onto a **BullMQ** queue
so collection is decoupled from the (slower, rate-limited) Gemini and delivery steps. This
is optional for v1.
