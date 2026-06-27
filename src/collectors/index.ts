import { SourceType } from "../generated/prisma/client.js";
import type { Collector } from "./types.js";
import { rssCollector } from "./rss/index.js";

/**
 * Maps a source type to its collector. Types without a collector yet
 * (reddit, github, status) are added in later milestones.
 */
const registry: Partial<Record<SourceType, Collector>> = {
  [SourceType.rss]: rssCollector,
  [SourceType.feedly]: rssCollector,
};

export function getCollector(type: SourceType): Collector | undefined {
  return registry[type];
}
