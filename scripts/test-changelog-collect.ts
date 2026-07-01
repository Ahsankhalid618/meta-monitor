import { changelogCollector } from "../src/collectors/changelog/index.js";
import { prisma, disconnectPrisma } from "../src/database/client.js";

async function main(): Promise<void> {
  const source = await prisma.source.findFirst({
    where: { name: "Graph API Changelog" },
  });
  if (!source) throw new Error("Graph API Changelog source not found");

  const articles = await changelogCollector.collect(source);
  console.log(`Collected ${articles.length} changelog sections`);
  for (const a of articles.slice(0, 5)) {
    console.log(`- ${a.title} (${a.rawContent?.length ?? 0} chars)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void disconnectPrisma());
