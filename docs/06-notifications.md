# 06 · Notifications

Relevant alerts are delivered to **Slack** and **Email**. Both render the same structured
information; only the formatting differs. Delivery state is tracked per channel
(`sentSlack`, `sentEmail`) for idempotent retries.

## Slack message

Delivered via **Incoming Webhooks**. Example layout for a relevant alert:

```
🚨 META WATCH

Severity
🔴 HIGH

Category
Instagram Graph API

Source
Facebook Developers

Summary
Meta introduced a new permission for Instagram Messaging API.

Why it matters
This may prevent newly connected accounts from sending automated DMs unless App Review is updated.

Impact
HIGH

Required Action
Review App Review permissions before September 30.

Confidence
97%

Source
https://...
```

### Field mapping (Slack)

| Slack field | Source |
|-------------|--------|
| Severity | `severity` (+ emoji 🔴/🟠/🟡) |
| Category | `category` |
| Source | reporting source name(s) |
| Summary | `summary` |
| Why it matters | `impact` |
| Impact | `severity` |
| Required Action | `action_required` |
| Confidence | `confidence` |
| Source (link) | article URL(s) |

### Severity → emoji

| Severity | Emoji |
|----------|-------|
| HIGH | 🔴 |
| MEDIUM | 🟠 |
| LOW | 🟡 |

## Email

Sent via **Resend** as **HTML**. The email must include:

- **Severity** (with a severity color)
- **Summary**
- **Impact**
- **Required Action**
- **Deadline**
- **Source**

### Severity → color

| Severity | Color |
|----------|-------|
| HIGH | Red (`#e01e5a` / `#d32f2f`) |
| MEDIUM | Orange (`#ed8936` / `#f57c00`) |
| LOW | Yellow (`#ecb22e` / `#fbc02d`) |

### Suggested HTML structure

```html
<div style="border-left: 6px solid {severityColor}; padding: 16px;">
  <h2>🚨 META WATCH — {severity}</h2>
  <p><strong>Summary:</strong> {summary}</p>
  <p><strong>Impact:</strong> {impact}</p>
  <p><strong>Required Action:</strong> {action_required}</p>
  <p><strong>Deadline:</strong> {deadline}</p>
  <p><strong>Source:</strong> <a href="{url}">{url}</a></p>
</div>
```

## Merged events

When an event is merged from multiple sources (see
[05 · Deduplication](./05-deduplication.md)), the notification lists all reporting sources
under a **"Reported by"** section and shows a combined confidence.

## Delivery & idempotency

- `Alerts.sentSlack` and `Alerts.sentEmail` start `false`.
- After a successful send, set the corresponding flag to `true`.
- A retry only sends to channels still marked `false`, so re-runs never double-notify.

## Implementation notes

- Slack formatter + sender: `src/services/slack/`.
- Email formatter + sender: `src/services/email/`.
- Shared message-building logic: `src/processors/formatter/`.
