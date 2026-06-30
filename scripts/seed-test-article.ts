import { prisma, disconnectPrisma } from "../src/database/client.js";

const SOURCE_ID = "edf368bd-d5c7-47e9-afc4-25369678a7b5";

const TEST_ARTICLE = {
  url: "https://developers.facebook.com/docs/graph-api/manual-test-2026",
  title: "Instagram Messaging API breaking change — test alert",
  contentHash: "manual-test-hash-001",
  content: `Meta has announced a breaking change to the Instagram Messaging API and Instagram Graph API.

Effective March 1, 2027, all apps using the Instagram send message endpoint must migrate to Graph API v21.0. Apps without the pages_messaging permission will lose access to Instagram DM automation.

The OAuth Business Login flow is updated. Webhook subscriptions for messaging events require re-verification. Rate limits for messaging endpoints are reduced from 200 to 100 requests per hour.

Developer Policy: automated DM outreach without user opt-in will be blocked. App Review is required for new messaging permissions.`,
};

async function main(): Promise<void> {
  const source = await prisma.source.findUnique({ where: { id: SOURCE_ID } });
  if (!source) {
    throw new Error(`Source not found: ${SOURCE_ID}`);
  }

  const article = await prisma.article.upsert({
    where: { url: TEST_ARTICLE.url },
    update: {
      title: TEST_ARTICLE.title,
      content: TEST_ARTICLE.content,
      contentHash: TEST_ARTICLE.contentHash,
      processed: false,
      sourceId: SOURCE_ID,
      createdAt: new Date("2020-01-01"),
    },
    create: {
      ...TEST_ARTICLE,
      publishedAt: new Date(),
      createdAt: new Date("2020-01-01"),
      sourceId: SOURCE_ID,
      processed: false,
    },
  });

  console.log("Test article ready for classification:");
  console.log(`  id:    ${article.id}`);
  console.log(`  url:   ${article.url}`);
  console.log(`  title: ${article.title}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void disconnectPrisma());
