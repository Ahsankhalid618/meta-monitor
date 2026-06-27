import cron from "node-cron";
import { runPollCycle } from "./pollCycle.js";
import { logger } from "../utils/logger.js";

/**
 * Starts the poll scheduler. We tick every minute and let each source's own
 * pollInterval decide whether it is due, so per-source intervals are honored
 * without a separate timer per source.
 */
export function startScheduler(): void {
  cron.schedule("* * * * *", () => {
    void runPollCycle();
  });
  logger.info("Scheduler started (checking for due sources every minute)");

  // Run an immediate cycle on boot rather than waiting for the first tick.
  void runPollCycle();
}
