import {
  type AlertNotification,
  formatConfidence,
  formatDeadline,
  formatReportedBy,
  severityEmoji,
} from "../../processors/formatter/alert.js";

/**
 * Formats a META WATCH alert for Slack Incoming Webhooks.
 * See docs/06-notifications.md.
 */
export function formatSlackMessage(alert: AlertNotification): string {
  const emoji = severityEmoji(alert.severity);

  return [
    "🚨 META WATCH",
    "",
    "Severity",
    `${emoji} ${alert.severity}`,
    "",
    "Category",
    alert.category,
    "",
    "Source",
    formatReportedBy(alert.reportedBy),
    "",
    "Summary",
    alert.summary,
    "",
    "Why it matters",
    alert.impact,
    "",
    "Impact",
    alert.severity,
    "",
    "Required Action",
    alert.actionRequired,
    "",
    "Confidence",
    formatConfidence(alert.confidence),
    "",
    "Source",
    alert.sourceUrl,
  ].join("\n");
}
