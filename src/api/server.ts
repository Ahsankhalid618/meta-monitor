import express, { type Express, type Request, type Response } from "express";
import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { runPollCycle } from "../cron/pollCycle.js";
import { extractPendingArticles } from "../processors/extractor/runExtraction.js";

export function createServer(): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", db: "up" });
    } catch (err) {
      logger.error({ err }, "Health check failed: database unreachable");
      const detail =
        config.NODE_ENV === "development"
          ? { error: err instanceof Error ? err.message : String(err) }
          : {};
      res.status(503).json({ status: "degraded", db: "down", ...detail });
    }
  });

  // Manual trigger to run a poll cycle on demand. Pass ?force=true to poll all
  // enabled sources regardless of their pollInterval (useful for verifying dedup).
  app.post("/poll", async (req: Request, res: Response) => {
    try {
      const force = req.query.force === "true";
      const result = await runPollCycle({ force });
      res.status(200).json({ status: "ok", ...result });
    } catch (err) {
      logger.error({ err }, "Manual poll cycle failed");
      res.status(500).json({ status: "error" });
    }
  });

  // Manual trigger to extract content for articles missing it.
  app.post("/extract", async (_req: Request, res: Response) => {
    try {
      const result = await extractPendingArticles();
      res.status(200).json({ status: "ok", ...result });
    } catch (err) {
      logger.error({ err }, "Manual extraction failed");
      res.status(500).json({ status: "error" });
    }
  });

  return app;
}
