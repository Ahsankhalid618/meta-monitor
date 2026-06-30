import { prisma, disconnectPrisma } from "../src/database/client.js";

async function main(): Promise<void> {
  const pending = await prisma.article.findMany({
    where: { processed: false, content: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, title: true, createdAt: true },
  });
  console.log("Pending classification:", pending.length);
  for (const a of pending) console.log(`  - ${a.url}`);

  const test = await prisma.article.findUnique({
    where: { url: "https://developers.facebook.com/docs/graph-api/manual-test-2026" },
    include: { alerts: true },
  });
  console.log("\nTest article:", {
    processed: test?.processed,
    alerts: test?.alerts.length,
  });
}

main()
  .finally(() => void disconnectPrisma());
