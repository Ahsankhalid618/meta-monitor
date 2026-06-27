# 07 · Database Schema

**Database:** PostgreSQL · **ORM:** Prisma

Three core tables drive the system: `Sources`, `Articles`, and `Alerts`.

## Tables

### Sources

Configured feeds the service monitors. Managed by the administrator.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string / uuid | Primary key |
| `name` | string | Human-readable source name (e.g. "Facebook Developers") |
| `url` | string | Feed / endpoint URL |
| `type` | enum | `rss` \| `reddit` \| `github` \| `feedly` \| `status` |
| `enabled` | boolean | Skip source when `false` |
| `pollInterval` | int | Seconds/minutes between polls for this source |

### Articles

Every article the service has seen. Used for **Level 1 deduplication**.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string / uuid | Primary key |
| `url` | string | Canonical article URL (unique) |
| `title` | string | Article title |
| `publishedAt` | datetime | Publish timestamp |
| `contentHash` | string | Hash of normalized content (dedup key) |
| `sourceId` | string | FK → `Sources.id` |
| `processed` | boolean | `true` once classified |

### Alerts

Structured, relevant alerts produced by Gemini classification.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string / uuid | Primary key |
| `articleId` | string | FK → `Articles.id` |
| `severity` | enum | `HIGH` \| `MEDIUM` \| `LOW` |
| `category` | string | Affected area (e.g. "Instagram Graph API") |
| `summary` | string | What changed |
| `impact` | string | Why it matters |
| `actionRequired` | string | What the team must do |
| `sentSlack` | boolean | Slack delivery flag |
| `sentEmail` | boolean | Email delivery flag |

## Relationships

```
Sources (1) ──────< (many) Articles (1) ──────< (many) Alerts
```

- A `Source` has many `Articles`.
- An `Article` has zero or one (or many, on merge) `Alerts`.

## Suggested Prisma schema

> Extend as needed (e.g. store `confidence`, `reasoning`, `tags`, `deadline`, and the list
> of reporting sources for merged events).

```prisma
enum SourceType {
  rss
  reddit
  github
  feedly
  status
}

enum Severity {
  HIGH
  MEDIUM
  LOW
}

model Source {
  id           String     @id @default(uuid())
  name         String
  url          String
  type         SourceType
  enabled      Boolean    @default(true)
  pollInterval Int        @default(300)
  articles     Article[]
}

model Article {
  id          String   @id @default(uuid())
  url         String   @unique
  title       String
  publishedAt DateTime
  contentHash String
  sourceId    String
  source      Source   @relation(fields: [sourceId], references: [id])
  processed   Boolean  @default(false)
  alerts      Alert[]

  @@index([contentHash])
}

model Alert {
  id             String   @id @default(uuid())
  articleId      String
  article        Article  @relation(fields: [articleId], references: [id])
  severity       Severity
  category       String
  summary        String
  impact         String
  actionRequired String
  sentSlack      Boolean  @default(false)
  sentEmail      Boolean  @default(false)
  createdAt      DateTime @default(now())
}
```

## Indexing notes

- Unique index on `Articles.url` — fast Level 1 dedup by URL.
- Index on `Articles.contentHash` — fast dedup by content hash.
- Consider an index on `Alerts.createdAt` for the event-merge lookback window.
