import {
  type AlertNotification,
  formatConfidence,
  formatDeadline,
  formatReportedBy,
  severityColor,
} from "../../processors/formatter/alert.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Formats a META WATCH alert as HTML email.
 * See docs/06-notifications.md.
 */
export function formatEmailHtml(alert: AlertNotification): string {
  const color = severityColor(alert.severity);
  const reportedBy = formatReportedBy(alert.reportedBy).replace(/\n/g, "<br>");

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px;">
  <div style="border-left: 6px solid ${color}; padding: 16px; background: #fafafa;">
    <h2 style="margin: 0 0 16px; color: ${color};">🚨 META WATCH — ${escapeHtml(alert.severity)}</h2>
    <p style="margin: 8px 0;"><strong>Category:</strong> ${escapeHtml(alert.category)}</p>
    <p style="margin: 8px 0;"><strong>Reported by:</strong><br>${reportedBy}</p>
    <p style="margin: 8px 0;"><strong>Summary:</strong> ${escapeHtml(alert.summary)}</p>
    <p style="margin: 8px 0;"><strong>Impact:</strong> ${escapeHtml(alert.impact)}</p>
    <p style="margin: 8px 0;"><strong>Required Action:</strong> ${escapeHtml(alert.actionRequired)}</p>
    <p style="margin: 8px 0;"><strong>Deadline:</strong> ${escapeHtml(formatDeadline(alert.deadline))}</p>
    <p style="margin: 8px 0;"><strong>Confidence:</strong> ${escapeHtml(formatConfidence(alert.confidence))}</p>
    <p style="margin: 8px 0;"><strong>Source:</strong> <a href="${escapeHtml(alert.sourceUrl)}">${escapeHtml(alert.sourceUrl)}</a></p>
  </div>
</div>`.trim();
}

export function formatEmailSubject(alert: AlertNotification): string {
  return `🚨 META WATCH — ${alert.severity}: ${alert.category}`;
}
