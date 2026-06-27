import type { RawArticle } from "../types/index.js";

/**
 * Minimal source shape a collector needs. A Prisma `Source` is structurally
 * assignable to this.
 */
export interface CollectorSource {
  id: string;
  name: string;
  url: string;
}

/**
 * A collector fetches content from one source and returns the common
 * RawArticle shape. See docs/03-collectors.md.
 */
export interface Collector {
  collect(source: CollectorSource): Promise<RawArticle[]>;
}
