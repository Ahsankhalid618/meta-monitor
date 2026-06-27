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

  GEMINI_API_KEY: z.string().default(""),

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
