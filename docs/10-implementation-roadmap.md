# 10 · Implementation Roadmap

## Milestones at a glance

| # | Milestone | Status | Outcome |
|---|-----------|--------|---------|
| M1 | **Setup** — TS + Node 22 + Express, Prisma, Pino | ✅ | `/health` returns 200 |
| M2 | **Collect** — RSS collector + cron + seed | ✅ | Articles land in DB |
| M3 | **Dedup L1** — URL + content hash | ✅ | Re-poll inserts 0 duplicates |
| M4 | **Extract** — Readability + JSDOM | ✅ | Clean text stored |
| M5 | **Classify** — Groq + Zod JSON | ✅ | Relevant → Alert rows |
| M6 | **Dedup L2** — merge > 90% similar | ✅ | Multi-source → 1 event |
| M7 | **Notify** — Slack (+ Email code) | ✅ | Slack alerts delivered |
| M8 | **Deploy** — Railway production | ✅ | Runs 24/7 unattended |

**v1 is complete and deployed.**

Production URL: `https://meta-monitor-production-20bd.up.railway.app`

---

## Post-v1 enhancements (backlog)

### P1 — High value
- [ ] Instagram Platform changelog collector (`/docs/instagram-platform/changelog`)
- [ ] Reduce noisy "Email delivery disabled" log on every cron tick
- [ ] Return `skipped: true` when poll lock blocks concurrent `/poll`

### P2 — Medium value
- [ ] Email alerts (verified domain on Resend)
- [ ] Reddit collector with keyword filter
- [ ] GitHub Issues collector for Meta SDK repos
- [ ] Retries/backoff on RSS fetch and Slack delivery failures

### P3 — v2
- [ ] BullMQ + Redis queue (if Groq volume grows)
- [ ] Next.js alert history dashboard
- [ ] Admin UI for source management
- [ ] Embedding-based event dedup (if string similarity insufficient)

---

## Definition of done (v1) ✅

- [x] Sources configurable via DB without redeploy
- [x] No article analyzed twice (L1 dedup)
- [x] Multi-source announcements merge (L2 dedup)
- [x] Groq returns strict JSON; only relevant items become alerts
- [x] Relevant alerts reach Slack with severity formatting
- [x] Structured logs at every stage
- [x] Deployed on Railway with managed Postgres

---

## Milestone sequence

```
M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8  ✅ COMPLETE
                              ↓
                         v2 backlog
```

See [11 · Team Handbook](./11-team-handbook.md) for operational details.
