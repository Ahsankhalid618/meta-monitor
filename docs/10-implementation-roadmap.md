# 10 · Implementation Roadmap

A phased plan to build the Meta Intelligence Monitor. Each phase is independently testable.

## Milestones at a glance

Eight milestones, each independently testable and shippable. Treat **M1–M7 as v1** and
**M8 as the production cutover**. A frontend would be a separate **v2** track.

| # | Milestone | Outcome you can verify |
|---|-----------|------------------------|
| M1 | **Setup** — TS + Node 22 + Express skeleton, Prisma + Postgres, Pino, env config | App boots, DB migrates, `/health` returns 200 |
| M2 | **Collect** — generic RSS collector + node-cron + seed Sources | Articles land in DB every cycle |
| M3 | **Dedup L1** — content hash + URL uniqueness | Re-running a cycle inserts **0** duplicates |
| M4 | **Extract** — RSS body or readability + JSDOM, normalize | Clean text stored for each article |
| M5 | **Classify** — Gemini client + prompt + **Zod-validated** JSON | Relevant articles become `Alert` rows |
| M6 | **Dedup L2** — merge similar events (> 90%) | 3 sources, 1 announcement → **1** event |
| M7 | **Notify** — Slack + Resend, idempotent `sentSlack` / `sentEmail` | Real alert hits Slack + Email within one cycle |
| M8 | **Harden + deploy** — retries/backoff, deploy to Railway | Runs unattended in production |

The phases below expand each milestone into concrete tasks.

## Phase 0 (M1) — Project setup
- [ ] Initialize TypeScript + Node.js 22 project.
- [ ] Scaffold a lean **Express** app (`/health` + admin endpoints) per the
      [folder structure](./09-folder-structure.md). *(NestJS intentionally not used — see
      [08 · Tech Stack](./08-tech-stack.md).)*
- [ ] Add Pino logging, config loading, and `.env` handling.
- [ ] Set up Prisma + PostgreSQL and run the initial migration for
      [Sources / Articles / Alerts](./07-database-schema.md).

## Phase 1 (M2) — Collection
- [ ] Implement the generic `rss/` collector with `rss-parser`.
- [ ] Seed the `Sources` table with Meta docs, blog, status, and Feedly feeds.
- [ ] Implement the `cron/` scheduler (~5 min) honoring per-source `pollInterval`.
- [ ] Emit the common `RawArticle` shape from every collector.

## Phase 2 (M3) — Article deduplication (Level 1)
- [ ] Compute content hashes and persist articles.
- [ ] Drop articles already present by URL or content hash.
- [ ] Verify: re-running a cycle inserts **zero** duplicates.

## Phase 3 (M4) — Content extraction
- [ ] Use RSS summary when full body is present.
- [ ] Otherwise fetch HTML and extract with `@mozilla/readability` + `JSDOM`.
- [ ] Normalize whitespace / strip boilerplate to produce clean text.

## Phase 4 (M5) — Gemini classification
- [ ] Build the `gemini/` client and the Senior Platform Engineer prompt.
- [ ] Enforce **JSON-only** output; parse and validate with **Zod** against the schema.
- [ ] Apply the ignore-list and trigger-list rules from
      [04 · Gemini Classification](./04-gemini-classification.md).
- [ ] Persist classifications; create `Alert` rows for `relevant: true`.

## Phase 5 (M6) — Event deduplication (Level 2)
- [ ] Compare title + summary similarity and URL overlap.
- [ ] Merge events when similarity > `0.90`; record reporting sources.
- [ ] Verify: the same announcement from 3 sources yields **one** event.

## Phase 6 (M7) — Notifications
- [ ] Slack Incoming Webhook formatter + sender (severity emoji, all fields).
- [ ] Resend HTML email formatter + sender (severity color, deadline, source).
- [ ] Track `sentSlack` / `sentEmail`; make retries idempotent.

## Phase 7 (M8) — Hardening & deployment
- [ ] Add retries/backoff for source fetches, Gemini calls, and deliveries.
- [ ] Add health-check endpoint(s) under `api/`.
- [ ] Deploy to **Railway** with managed Postgres and required env secrets.
- [ ] Confirm end-to-end: new relevant article → Slack + Email within one cycle.
- [ ] *(v2, only if needed)* Move classification + delivery onto a **BullMQ** queue.

## Definition of done

- Sources are configurable via the DB without redeploy.
- No article is ever analyzed twice (Level 1 dedup proven).
- Multi-source announcements are merged into a single event (Level 2 dedup proven).
- Gemini returns strict JSON and only relevant items become alerts.
- Relevant alerts reliably reach Slack and Email with correct severity formatting.
- All stages emit structured logs.

## Milestone sequence (at a glance)

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8
setup collect dedup extract  AI  merge  notify  ship
```
