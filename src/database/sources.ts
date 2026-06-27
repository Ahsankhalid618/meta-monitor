import { prisma } from "./client.js";

/**
 * Enabled sources whose pollInterval has elapsed since lastPolledAt
 * (or that have never been polled).
 */
export async function getDueSources(now: Date = new Date()) {
  const sources = await prisma.source.findMany({ where: { enabled: true } });
  return sources.filter((s) => {
    if (!s.lastPolledAt) return true;
    const elapsedMs = now.getTime() - s.lastPolledAt.getTime();
    return elapsedMs >= s.pollInterval * 1000;
  });
}

/** All enabled sources, regardless of whether their pollInterval has elapsed. */
export async function getEnabledSources() {
  return prisma.source.findMany({ where: { enabled: true } });
}

export async function markPolled(
  id: string,
  when: Date = new Date(),
): Promise<void> {
  await prisma.source.update({
    where: { id },
    data: { lastPolledAt: when },
  });
}
