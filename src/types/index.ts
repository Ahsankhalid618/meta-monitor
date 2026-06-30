import { z } from "zod";

/**
 * The common shape every collector must emit. See docs/03-collectors.md.
 */
export interface RawArticle {
  url: string;
  title: string;
  publishedAt: Date;
  rawContent?: string;
  sourceId: string;
}

/**
 * A collected article with its computed content fingerprint, after Level 1
 * deduplication. See docs/05-deduplication.md.
 */
export interface DedupedArticle extends RawArticle {
  contentHash: string;
}

/**
 * An article after content extraction + normalization, ready for classification.
 */
export interface CleanArticle extends RawArticle {
  content: string;
  contentHash: string;
}

export const SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type SeverityLevel = (typeof SEVERITIES)[number];

/**
 * Strict schema for LLM JSON output. See docs/04-gemini-classification.md.
 * Gemini returns either { relevant: false } or the full relevant payload.
 */
export const classificationSchema = z.discriminatedUnion("relevant", [
  z.object({ relevant: z.literal(false) }),
  z.object({
    relevant: z.literal(true),
    severity: z.enum(SEVERITIES),
    category: z.string(),
    title: z.string(),
    summary: z.string(),
    impact: z.string(),
    action_required: z.string(),
    deadline: z.string().nullable().optional(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
    tags: z.array(z.string()).default([]),
  }),
]);

export type Classification = z.infer<typeof classificationSchema>;
export type RelevantClassification = Extract<Classification, { relevant: true }>;
