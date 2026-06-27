import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { createServer } from "./api/server.js";
import { disconnectPrisma } from "./database/client.js";
import { startScheduler } from "./cron/scheduler.js";

async function main(): Promise<void> {
  const app = createServer();

  const server = app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV },
      "Meta Intelligence Monitor started",
    );
  });

  startScheduler();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down...");
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
