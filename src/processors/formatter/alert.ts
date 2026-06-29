import type { Severity } from "../../generated/prisma/client.js";

/** Payload shared by Slack and Email formatters. */
export interface AlertNotification {
  severity: Severity;
  category: string;
  summary: string;
  impact: string;
  actionRequired: string;
  deadline: string | null;
  confidence: number | null;
  reportedBy: string[];
  sourceUrl: string;
}

export function severityEmoji(severity: Severity): string {
  switch (severity) {
    case "HIGH":
      return "🔴";
    case "MEDIUM":
      return "🟠";
    case "LOW":
      return "🟡";
  }
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "HIGH":
      return "#d32f2f";
    case "MEDIUM":
      return "#f57c00";
    case "LOW":
      return "#fbc02d";
  }
}

export function formatReportedBy(reportedBy: string[]): string {
  return reportedBy.length > 0 ? reportedBy.join("\n") : "Unknown";
}

export function formatConfidence(confidence: number | null): string {
  return confidence != null ? `${confidence}%` : "N/A";
}

export function formatDeadline(deadline: string | null): string {
  return deadline?.trim() ? deadline : "None";
}
