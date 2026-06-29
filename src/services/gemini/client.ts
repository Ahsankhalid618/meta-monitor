import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "./prompt.js";
import {
  classificationSchema,
  type Classification,
} from "../../types/index.js";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!config.GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return client;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export interface ClassifyArticleInput {
  url: string;
  title: string;
  sourceName: string;
  publishedAt: Date;
  content: string;
}

/**
 * Sends article content to Gemini and returns a Zod-validated classification.
 * Throws if the API key is missing, the API fails, or JSON is invalid.
 */
export async function classifyArticle(
  input: ClassifyArticleInput,
): Promise<Classification> {
  const genAI = getClient();
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({
    model: config.GEMINI_MODEL,
    systemInstruction: CLASSIFIER_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent(
    buildClassifierUserPrompt(input),
  );
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (err) {
    logger.error({ text }, "Failed to parse Gemini JSON");
    throw new Error(
      `Invalid JSON from Gemini: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const validated = classificationSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error(
      { issues: validated.error.issues, parsed },
      "Gemini JSON failed schema validation",
    );
    throw new Error("Gemini response did not match classification schema");
  }

  return validated.data;
}

export function isGeminiConfigured(): boolean {
  return Boolean(config.GEMINI_API_KEY);
}
