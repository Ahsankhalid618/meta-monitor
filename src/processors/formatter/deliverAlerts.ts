import {
  getAlertsPendingDelivery,
  markAlertSentSlack,
  markAlertSentEmail,
  toAlertNotification,
} from "../../database/alerts.js";
import { sendSlackAlert, isSlackConfigured } from "../../services/slack/send.js";
import { sendEmailAlert, isEmailConfigured } from "../../services/email/send.js";
import { logger } from "../../utils/logger.js";

export interface DeliveryResult {
  attempted: number;
  slackSent: number;
  emailSent: number;
  slackSkipped: boolean;
  emailSkipped: boolean;
}

/**
 * Delivers pending alerts to Slack and Email. Only sends to channels still
 * marked false; merged events are not re-notified (M6 keeps sent flags on the
 * original alert). See docs/06-notifications.md.
 */
export async function deliverPendingAlerts(): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    attempted: 0,
    slackSent: 0,
    emailSent: 0,
    slackSkipped: !isSlackConfigured(),
    emailSkipped: !isEmailConfigured(),
  };

  if (result.slackSkipped) {
    logger.warn("SLACK_WEBHOOK_URL not set; skipping Slack delivery");
  }
  if (result.emailSkipped) {
    logger.warn("RESEND_API_KEY or ALERT_EMAIL_TO not set; skipping email");
  }

  const pending = await getAlertsPendingDelivery();
  result.attempted = pending.length;

  if (pending.length === 0) return result;

  logger.info({ count: pending.length }, "Delivering pending alerts");

  for (const alert of pending) {
    const payload = toAlertNotification(alert);

    if (!alert.sentSlack && !result.slackSkipped) {
      try {
        await sendSlackAlert(payload);
        await markAlertSentSlack(alert.id);
        result.slackSent += 1;
      } catch (err) {
        logger.error({ err, alertId: alert.id }, "Failed to send Slack alert");
      }
    }

    if (!alert.sentEmail && !result.emailSkipped) {
      try {
        await sendEmailAlert(payload);
        await markAlertSentEmail(alert.id);
        result.emailSent += 1;
      } catch (err) {
        logger.error({ err, alertId: alert.id }, "Failed to send email alert");
      }
    }
  }

  logger.info(result, "Alert delivery complete");
  return result;
}
