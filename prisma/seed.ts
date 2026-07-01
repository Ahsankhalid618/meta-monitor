import { SourceType } from "../src/generated/prisma/client.js";
import { prisma, disconnectPrisma } from "../src/database/client.js";

/**
 * Sources scoped to Instagram Graph API + Instagram Messaging API impact:
 * breakages, rate limits, restrictions, deprecations, policy/login changes.
 */
const sources: Array<{
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  pollInterval: number;
}> = [
  {
    name: "Engineering at Meta",
    url: "https://engineering.fb.com/feed/",
    type: SourceType.rss,
    enabled: false,
    pollInterval: 3600,
  },
  {
    name: "Meta for Developers Blog",
    url: "https://developers.facebook.com/blog/feed/",
    type: SourceType.rss,
    enabled: true,
    pollInterval: 900,
  },
  {
    name: "Meta Status - Graph API",
    url: "https://metastatus.com/outage-events-feed-graph-api.rss",
    type: SourceType.rss,
    enabled: true,
    pollInterval: 300,
  },
  {
    name: "Meta Status - Facebook Login",
    url: "https://metastatus.com/outage-events-feed-facebook-login.rss",
    type: SourceType.rss,
    enabled: true,
    pollInterval: 300,
  },
  {
    name: "Meta Status - Messenger Platform",
    url: "https://metastatus.com/outage-events-feed-messenger.rss",
    type: SourceType.rss,
    enabled: true,
    pollInterval: 300,
  },
  {
    name: "Graph API Changelog",
    url: "https://developers.facebook.com/docs/graph-api/changelog",
    type: SourceType.changelog,
    enabled: true,
    pollInterval: 86_400,
  },
  {
    name: "Graph API Out-of-Cycle Changes",
    url: "https://developers.facebook.com/docs/graph-api/changelog/out-of-cycle-changes",
    type: SourceType.changelog,
    enabled: true,
    pollInterval: 86_400,
  },
];

const LEGACY_CHANGELOG_URLS = [
  "https://developers.facebook.com/docs/graph-api/changelog",
  "https://developers.facebook.com/docs/graph-api/changelog/out-of-cycle-changes",
];

async function main(): Promise<void> {
  // Remove mis-typed rss rows for changelog URLs (replaced by type changelog).
  await prisma.source.deleteMany({
    where: {
      type: SourceType.rss,
      url: { in: LEGACY_CHANGELOG_URLS },
    },
  });

  for (const source of sources) {
    await prisma.source.upsert({
      where: { type_url: { type: source.type, url: source.url } },
      update: {
        name: source.name,
        enabled: source.enabled,
        pollInterval: source.pollInterval,
      },
      create: source,
    });
  }
  console.log(
    `Seeded ${sources.length} sources (${sources.filter((s) => s.enabled).length} enabled).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void disconnectPrisma());
