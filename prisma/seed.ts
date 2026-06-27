import { SourceType } from "../src/generated/prisma/client.js";
import { prisma, disconnectPrisma } from "../src/database/client.js";

const sources: Array<{
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  pollInterval?: number;
}> = [
  // Valid RSS feed — actively polled.
  {
    name: "Engineering at Meta",
    url: "https://engineering.fb.com/feed/",
    type: SourceType.rss,
    enabled: true,
  },
  // The Graph API changelog is an HTML page, not an RSS feed. Disabled until a
  // dedicated changelog/HTML collector exists (later milestone).
  {
    name: "Meta for Developers — Changelog",
    url: "https://developers.facebook.com/docs/graph-api/changelog",
    type: SourceType.rss,
    enabled: false,
  },
  // No collector for `status` sources yet. Disabled until the status collector
  // is implemented (later milestone).
  {
    name: "Meta Status",
    url: "https://metastatus.com/",
    type: SourceType.status,
    enabled: false,
  },
];

async function main(): Promise<void> {
  for (const source of sources) {
    await prisma.source.upsert({
      where: { type_url: { type: source.type, url: source.url } },
      update: { name: source.name, enabled: source.enabled },
      create: source,
    });
  }
  console.log(`Seeded ${sources.length} sources.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void disconnectPrisma());
