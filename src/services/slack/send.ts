import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { formatSlackMessage } from "./format.js";
import type { AlertNotification } from "../../processors/formatter/alert.js";

export function isSlackConfigured(): boolean {
  return Boolean(config.SLACK_WEBHOOK_URL);
}

export async function sendSlackAlert(
  alert: AlertNotification,
): Promise<void> {
  if (!config.SLACK_WEBHOOK_URL) {
    throw new Error("SLACK_WEBHOOK_URL is not configured");
  }

  const text = formatSlackMessage(alert);
  const res = await fetch(config.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Slack webhook failed: HTTP ${res.status} ${body.slice(0, 200)}`,
    );
  }

  logger.debug({ category: alert.category }, "Slack alert delivered");
}
