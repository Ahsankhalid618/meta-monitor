# 07 · Database Schema

**Database:** PostgreSQL · **ORM:** Prisma 7 (driver adapter `@prisma/adapter-pg`)

Three core tables: `Sources`, `Articles`, `Alerts`.

## Tables

### Sources

Configured feeds the service monitors.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `name` | string | Human-readable name |
| `url` | string | Feed or index URL |
| `type` | enum | `rss` \| `reddit` \| `github` \| `feedly` \| `status` \| `changelog` |
| `enabled` | boolean | Skip when `false` |
| `pollInterval` | int | Seconds between polls |
| `lastPolledAt` | datetime? | Last successful poll |

Unique: `(type, url)`

### Articles

Every article seen. Used for **Level 1 deduplication**.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `url` | string | Unique canonical URL |
| `title` | string | |
| `publishedAt` | datetime | |
| `contentHash` | string | Dedup key |
| `rawContent` | string? | From collector |
| `content` | string? | Extracted/normalized text |
| `sourceId` | string | FK → Sources |
| `processed` | boolean | `true` after classification |

### Alerts

Structured relevant events from Groq classification.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `articleId` | string | FK → Articles |
| `severity` | enum | `HIGH` \| `MEDIUM` \| `LOW` |
| `category` | string | |
| `summary` | string | |
| `impact` | string | |
| `actionRequired` | string | |
| `deadline` | string? | |
| `confidence` | int? | 0–100 |
| `reasoning` | string? | |
| `tags` | string[] | |
| `reportedBy` | string[] | Sources for merged events |
| `sentSlack` | boolean | |
| `sentEmail` | boolean | |
| `createdAt` | datetime | |

## Relationships

```
Sources (1) ──────< (many) Articles (1) ──────< (many) Alerts
```

## Migrations

```bash
pnpm exec prisma migrate deploy   # production
pnpm prisma:migrate               # local dev
pnpm db:seed                      # upsert sources
```

Schema file: `prisma/schema.prisma`

## Indexing

- Unique: `Articles.url`
- Index: `Articles.contentHash`, `Articles.sourceId`
- Index: `Alerts.createdAt`

## Inspect data

```bash
pnpm prisma:studio
```
