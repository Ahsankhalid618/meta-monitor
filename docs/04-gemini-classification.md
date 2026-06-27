# 04 · Gemini Classification

## The role

> **Gemini is not a summarizer.**
>
> Gemini acts as **AutoSetter's Senior Platform Engineer**.

Its only responsibility is deciding whether an article **affects an Instagram DM automation
platform**. It reads the normalized article content and returns a strict JSON verdict.

## Ignore completely

Gemini must mark these as **irrelevant**:

- Instagram creator news
- Marketing
- Advertising
- Threads
- Consumer features
- Reels
- Stories
- AI announcements unrelated to APIs
- Company financial news
- Product launches unrelated to developers

## Only report if the article affects

| Category area | Examples |
|---------------|----------|
| **APIs** | Instagram Graph API, Instagram Messaging API, Messenger API |
| **Auth** | OAuth, Business Login, Login Changes |
| **Access** | Permissions, App Review, New Required Permissions |
| **Limits** | Rate Limits |
| **Events** | Webhooks |
| **Policy** | Developer Policies, Platform Policies, Business Verification |
| **Abuse** | Automation Detection, Spam Detection, Anti-Abuse Systems |
| **Stability** | API Deprecations, Breaking Changes |
| **Security** | Security Changes |
| **SDKs** | SDK Changes affecting integrations |

Full list of trigger topics:

- Instagram Graph API
- Instagram Messaging API
- Messenger API
- OAuth
- Business Login
- Permissions
- App Review
- Rate Limits
- Webhooks
- Developer Policies
- Platform Policies
- Business Verification
- Automation Detection
- Spam Detection
- Anti-Abuse Systems
- API Deprecations
- Breaking Changes
- New Required Permissions
- Login Changes
- Security Changes
- SDK Changes affecting integrations

## Output contract — JSON only

> **Gemini returns only JSON. Nothing else.**

### Relevant

```json
{
  "relevant": true,
  "severity": "HIGH",
  "category": "Graph API",
  "title": "...",
  "summary": "...",
  "impact": "...",
  "action_required": "...",
  "deadline": "...",
  "confidence": 97,
  "reasoning": "...",
  "tags": [
    "Graph API",
    "Rate Limits",
    "Permissions"
  ]
}
```

### Irrelevant

```json
{
  "relevant": false
}
```

## Field reference

| Field | Type | Notes |
|-------|------|-------|
| `relevant` | boolean | The gate. If `false`, no other fields are present. |
| `severity` | enum | `HIGH` \| `MEDIUM` \| `LOW` (drives Slack/email color). |
| `category` | string | Primary affected area (e.g. "Instagram Graph API"). |
| `title` | string | Concise event title. |
| `summary` | string | What changed. |
| `impact` | string | Why it matters to the automation platform. |
| `action_required` | string | What the team must do. |
| `deadline` | string | Date/deadline if any (else empty/null). |
| `confidence` | number | 0–100 confidence score. |
| `reasoning` | string | Why Gemini classified it this way. |
| `tags` | string[] | Topic tags drawn from the trigger list above. |

## Implementation notes

- The classifier lives in `src/processors/classifier/` and calls `src/services/gemini/`.
- **Enforce JSON:** request JSON output and parse defensively; reject/repair non-JSON.
- **Validate** the parsed object against the schema before creating an `Alert`.
- Persist the full classification (including `reasoning`, `confidence`, `tags`) for audit.
- Only `relevant: true` results proceed to deduplication + notification.
