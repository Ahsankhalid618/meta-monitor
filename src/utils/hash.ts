import { createHash } from "node:crypto";

/**
 * Stable SHA-256 hash of normalized text. Used as the content fingerprint for
 * Level 1 deduplication (see docs/05-deduplication.md).
 */
export function hashContent(input: string): string {
  const normalized = input.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
