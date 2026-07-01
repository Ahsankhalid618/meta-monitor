# 06 · Notifications

Relevant alerts are delivered to **Slack** (primary in v1). **Email** is supported in code
but disabled in production until a verified Resend domain is configured.

Delivery state is tracked per channel (`sentSlack`, `sentEmail`) for idempotent retries.

## Slack (v1 — active)

Delivered via **Incoming Webhooks**.

```
🚨 META WATCH

Severity
🔴 HIGH

Category
Instagram Graph API

Source
Meta for Developers Blog

Summary
Meta introduced Embedded Signup v4 with a migration deadline.

Why it matters
OAuth onboarding for Instagram accounts may break without migration.

Required Action
Upgrade to Embedded Signup v4 before October 15, 2026.

Confidence
92%

Source
https://developers.facebook.com/blog/post/2026/05/14/embedded-signup-v4/
```

### Severity → emoji

| Severity | Emoji |
|----------|-------|
| HIGH | 🔴 |
| MEDIUM | 🟠 |
| LOW | 🟡 |

Implementation: `src/services/slack/`

## Email (optional — disabled in v1)

Sent via **Resend** as HTML when configured.

**Requirements:**
- `RESEND_API_KEY`
- `ALERT_EMAIL_TO`
- `ALERT_EMAIL_FROM` on a **verified custom domain** (not `@gmail.com`)

If Resend is misconfigured, email is silently skipped (`emailSkipped: true`).

Implementation: `src/services/email/`

## Merged events

Notifications list all `reportedBy` sources and show combined confidence.

## Delivery & idempotency

- `Alerts.sentSlack` / `sentEmail` start `false`.
- After successful send → set `true`.
- Retries only send to channels still `false`.
- Pending delivery filters out channels that are globally disabled.

Implementation: `src/processors/formatter/deliverAlerts.ts`

## When Slack fires

Slack sends at the **end of each poll cycle** when:
1. A new relevant `Alert` exists with `sentSlack: false`
2. `SLACK_WEBHOOK_URL` is set

Typical latency: within **1–5 minutes** of ingestion (changelog polls can take ~2 min).
