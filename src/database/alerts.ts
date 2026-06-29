import { prisma } from "./client.js";
import type { RelevantClassification } from "../types/index.js";
import { Severity } from "../generated/prisma/client.js";
import type { AlertNotification } from "../processors/formatter/alert.js";

export type AlertWithArticle = Awaited<ReturnType<typeof getAlertsPendingDelivery>>[number];

export function toAlertNotification(
  alert: AlertWithArticle,
): AlertNotification {
  return {
    severity: alert.severity,
    category: alert.category,
    summary: alert.summary,
    impact: alert.impact,
    actionRequired: alert.actionRequired,
    deadline: alert.deadline,
    confidence: alert.confidence,
    reportedBy: alert.reportedBy,
    sourceUrl: alert.article.url,
  };
}

/** Alerts that still need delivery on at least one channel. */
export async function getAlertsPendingDelivery() {
  return prisma.alert.findMany({
    where: {
      OR: [{ sentSlack: false }, { sentEmail: false }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      article: { select: { url: true } },
    },
  });
}

export async function markAlertSentSlack(id: string): Promise<void> {
  await prisma.alert.update({
    where: { id },
    data: { sentSlack: true },
  });
}

export async function markAlertSentEmail(id: string): Promise<void> {
  await prisma.alert.update({
    where: { id },
    data: { sentEmail: true },
  });
}

export async function createAlertFromClassification(
  articleId: string,
  classification: RelevantClassification,
  reportedBy: string,
): Promise<string> {
  const alert = await prisma.alert.create({
    data: {
      articleId,
      severity: classification.severity as Severity,
      category: classification.category,
      summary: classification.summary,
      impact: classification.impact,
      actionRequired: classification.action_required,
      deadline: classification.deadline ?? null,
      confidence: Math.round(classification.confidence),
      reasoning: classification.reasoning,
      tags: classification.tags,
      reportedBy: [reportedBy],
    },
  });
  return alert.id;
}

/** Recent alerts with article metadata for Level 2 event deduplication. */
export async function getRecentAlerts(since: Date) {
  return prisma.alert.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    include: {
      article: { select: { url: true, title: true } },
    },
  });
}

/** Attach another reporting source to an existing merged event. */
export async function appendReporterToAlert(
  alertId: string,
  sourceName: string,
  confidence?: number,
): Promise<void> {
  const alert = await prisma.alert.findUniqueOrThrow({ where: { id: alertId } });

  const reportedBy = alert.reportedBy.includes(sourceName)
    ? alert.reportedBy
    : [...alert.reportedBy, sourceName];

  const newConfidence =
    confidence != null
      ? Math.max(alert.confidence ?? 0, confidence)
      : alert.confidence;

  await prisma.alert.update({
    where: { id: alertId },
    data: { reportedBy, confidence: newConfidence },
  });
}
