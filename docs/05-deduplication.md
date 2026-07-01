# 05 · Deduplication

Deduplication happens at **two levels**: per-article (before analysis) and per-event
(after classification).

## Level 1 — Article deduplication (pre-analysis)

**Goal:** never analyze the same article twice; minimize Groq cost.

For every collected `RawArticle`:

1. Compute a **content hash** of `rawContent ?? title`.
2. Look up by **URL** and **content hash** in `Articles`.
3. If match exists → **drop** (duplicate).
4. If new → insert (`processed = false`) and continue.

Implementation: `src/services/deduplication/index.ts`

## Level 2 — Event deduplication / merging (post-classification)

**Problem:** multiple sources report the same Meta announcement.

After Groq marks an article **relevant**, compare against recent alerts using title +
summary **string similarity**.

### Merge rule

> If similarity **> 90%** (`SIMILARITY_THRESHOLD`) → **merge into one event.**

Merged events append to `reportedBy[]` and do **not** re-notify Slack.

Implementation: `src/services/deduplication/eventDedup.ts`

### Example merged event

```
One Meta Event

Reported by
  Meta for Developers Blog
  Graph API Changelog

Confidence
  99%
```

## Outcomes

- **New event** → create `Alert`, notify Slack.
- **Merge** → attach source to existing alert; no duplicate Slack message.

## Implementation notes

- Level 1: collection path, before extract/classify.
- Level 2: after classification, before notification.
- Threshold configurable via `SIMILARITY_THRESHOLD` (default `0.90`).
