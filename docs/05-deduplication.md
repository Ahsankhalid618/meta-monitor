# 05 · Deduplication

Deduplication happens at **two levels**: per-article (before analysis) and per-event
(after classification).

## Level 1 — Article deduplication (pre-analysis)

**Goal:** never analyze the same article twice; minimize Gemini cost.

For every collected `RawArticle`:

1. Compute a **content hash** of the normalized content.
2. Look up the article in the `Articles` table by **URL** and by **content hash**.
3. If a match exists → **drop** the article (already seen).
4. If new → insert it (`processed = false`) and continue down the pipeline.

This directly satisfies the requirement:

> It stores every processed article URL and content hash in the database to guarantee that
> the same event is never analyzed twice.

## Level 2 — Event deduplication / merging (post-analysis)

**Problem:** many websites report the same Meta announcement. We don't want to fire five
alerts for one event.

After Gemini marks an article **relevant**, compare it against recent relevant events using:

- **Article title similarity**
- **Gemini summary similarity**
- **Source URL overlap**

### Merge rule

> If similarity **> 90%** → **merge into one event.**

The merged event records **all reporting sources** rather than duplicating the alert.

### Example merged event

```
One Meta Event

Reported by
  Facebook Developers
  Engineering at Meta
  360dialog
  Reddit

Confidence
  99%
```

## Similarity computation (suggested)

| Signal | Method |
|--------|--------|
| Title similarity | Normalized string similarity (e.g. token-set / Jaccard / cosine). |
| Summary similarity | Embedding cosine similarity or text-similarity on Gemini `summary`. |
| URL overlap | Canonical host/path comparison; same canonical URL = strong match. |

Combine the signals into a single score; if the score exceeds the **0.90** threshold,
treat the new article as another report of an existing event.

## Outcomes

- **New event** → create `Alert`, then notify (Slack + Email).
- **Merge** → attach the new source to the existing event; do **not** re-notify (or send a
  lightweight "also reported by …" update, per team preference).

## Implementation notes

- Lives in `src/services/deduplication/`.
- Level 1 runs in the collection path; Level 2 runs right before notification.
- Keep a configurable similarity threshold (default `0.90`).
- Store the list of reporting sources with the alert for the "Reported by" section.
