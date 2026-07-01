import { Resend } from "resend";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import {
  formatEmailHtml,
  formatEmailSubject,
} from "./format.js";
import type { AlertNotification } from "../../processors/formatter/alert.js";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!config.RESEND_API_KEY) return null;
  if (!resend) {
    resend = new Resend(config.RESEND_API_KEY);
  }
  return resend;
}

/** Resend requires a verified custom domain — not @gmail.com etc. */
const UNVERIFIABLE_FROM_DOMAINS = [
  "@gmail.com",
  "@googlemail.com",
  "@yahoo.com",
  "@hotmail.com",
  "@outlook.com",
];

export function isEmailConfigured(): boolean {
  if (!config.RESEND_API_KEY || !config.ALERT_EMAIL_TO) return false;

  const from = config.ALERT_EMAIL_FROM.toLowerCase();
  if (
    !from.includes("@") ||
    UNVERIFIABLE_FROM_DOMAINS.some((d) => from.endsWith(d))
  ) {
    return false;
  }

  return true;
}

function parseRecipients(to: string): string[] {
  return to
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendEmailAlert(
  alert: AlertNotification,
): Promise<void> {
  const client = getResend();
  if (!client) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const to = parseRecipients(config.ALERT_EMAIL_TO);
  if (to.length === 0) {
    throw new Error("ALERT_EMAIL_TO is not configured");
  }

  const { error } = await client.emails.send({
    from: config.ALERT_EMAIL_FROM,
    to,
    subject: formatEmailSubject(alert),
    html: formatEmailHtml(alert),
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  logger.debug({ category: alert.category, to }, "Email alert delivered");
}
