# 04 · LLM Classification (Groq)

## The role

> **The LLM is not a summarizer.**
>
> It acts as **AutoSetter's Senior Platform Engineer**.

Its only responsibility is deciding whether content **can break, rate-limit, restrict,
deprecate, or change** how we use the **Instagram Graph API** and **Instagram Messaging
APIs** for our DM automation platform. It reads normalized article content and returns a
strict JSON verdict.

**Provider (v1):** [Groq Cloud](https://console.groq.com) — model `llama-3.3-70b-versatile`
via OpenAI-compatible chat completions API.

## Pre-filter (keyword gate)

Before calling Groq, articles pass a cheap **keyword gate** (`src/services/llm/keywordGate.ts`)
unless they come from **Meta Status** or **Changelog** sources (always sent to Groq).

This reduces Groq usage on obviously irrelevant developer blog posts (Ads CLI, Threads-only,
MCP tooling, etc.).

## Ignore completely

Mark **irrelevant** when content only affects:

- WhatsApp, Marketing API, Ads API, or Threads (unless it also affects Instagram Graph/Messaging)
- Instagram consumer/creator product news (Reels, Stories, feeds)
- Marketing, advertising, ad-buying policy
- Meta AI / MCP / developer tooling unrelated to Instagram DMs
- oEmbed-only changes with no messaging/login impact
- General engineering/infra posts with no API integration impact

## Only report if the content affects

| Category area | Examples |
|---------------|----------|
| **APIs** | Instagram Graph API, Instagram Messaging API, DM send/receive endpoints |
| **Auth** | OAuth, Business Login, Embedded Signup |
| **Access** | Permissions, App Review |
| **Limits** | Rate limits on Graph or messaging endpoints |
| **Events** | Webhooks for messaging events |
| **Policy** | Developer/Platform policies, anti-abuse, automation detection |
| **Stability** | API deprecations, breaking changes, login/security changes |
| **Outages** | Meta Status degradation for Graph API, Facebook Login, Messenger Platform |

## Output contract — JSON only

> **The LLM returns only JSON. Nothing else.**

### Relevant

```json
{
  "relevant": true,
  "severity": "HIGH",
  "category": "Instagram Graph API",
  "title": "...",
  "summary": "...",
  "impact": "...",
  "action_required": "...",
  "deadline": "...",
  "confidence": 97,
  "reasoning": "...",
  "tags": ["Graph API", "Permissions"]
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
| `severity` | enum | `HIGH` \| `MEDIUM` \| `LOW` (drives Slack emoji). |
| `category` | string | Primary affected area. |
| `title` | string | Concise event title. |
| `summary` | string | What changed. |
| `impact` | string | Why it matters to Instagram DM automation. |
| `action_required` | string | What the team must do. |
| `deadline` | string | Date/deadline if any (else null). |
| `confidence` | number | 0–100 confidence score. |
| `reasoning` | string | Why it was classified this way. |
| `tags` | string[] | Topic tags. |

## Rate-limit safeguards

| Setting | Default | Purpose |
|---------|---------|---------|
| `LLM_CLASSIFY_BATCH` | `1` | Max articles per classify run |
| `LLM_CLASSIFY_DELAY_MS` | `2000` | Pause between Groq calls |
| `LLM_CLASSIFY_INTERVAL_MS` | `300000` | Min interval for backlog classify (5 min) |
| `LLM_QUOTA_COOLDOWN_MS` | `900000` | Pause after 429 (15 min) |
| `LLM_MAX_CONTENT_CHARS` | `4000` | Max chars sent per article |

**Groq free tier** (`llama-3.3-70b-versatile`): ~30 RPM, ~1,000 RPD, ~12K TPM.
With current settings, expect **~5–20 Groq calls/day** in steady state.

## Implementation notes

- Classifier: `src/processors/classifier/runClassification.ts`
- Groq client: `src/services/groq/client.ts`
- Prompt: `src/services/llm/prompt.ts`
- Keyword gate: `src/services/llm/keywordGate.ts`
- Cooldown: `src/services/llm/quotaCooldown.ts`
- **Validate** parsed JSON with Zod (`src/types/index.ts`) before creating an `Alert`.
- Only `relevant: true` results proceed to event merge + notification.
