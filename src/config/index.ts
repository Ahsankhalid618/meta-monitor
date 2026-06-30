import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Accept self-signed TLS certs (Railway/Heroku-style managed Postgres).
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  /** Pause between classify requests to avoid burst rate limits (ms). */
  LLM_CLASSIFY_DELAY_MS: z.coerce.number().int().nonnegative().default(2000),
  /** Max article chars sent to the LLM. */
  LLM_MAX_CONTENT_CHARS: z.coerce.number().int().positive().default(4000),
  /** Max articles per classify invocation. */
  LLM_CLASSIFY_BATCH: z.coerce.number().int().positive().default(1),
  /** After a 429, stop calling the LLM for this many ms. */
  LLM_QUOTA_COOLDOWN_MS: z.coerce.number().int().positive().default(900_000),
  /** Min ms between automatic backlog classify runs. */
  LLM_CLASSIFY_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),

  SLACK_WEBHOOK_URL: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),
  ALERT_EMAIL_TO: z.string().default(""),
  ALERT_EMAIL_FROM: z.string().default("alerts@example.com"),

  POLL_INTERVAL: z.coerce.number().int().positive().default(300),
  SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9),

  GITHUB_TOKEN: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // Logger isn't available yet at this point, so use console for the fatal exit.
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
