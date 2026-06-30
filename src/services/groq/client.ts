import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "../llm/prompt.js";
import {
  classificationSchema,
  type Classification,
} from "../../types/index.js";
import { startLlmCooldown } from "../llm/quotaCooldown.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/**
 * Classifies an article via Groq (OpenAI-compatible chat completions).
 * See https://console.groq.com/docs/overview
 */
export async function classifyArticle(
  input: ClassifyArticleInput,
): Promise<Classification> {
  if (!config.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const body = {
    model: config.GROQ_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: CLASSIFIER_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: buildClassifierUserPrompt(input),
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Groq request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const data = (await res.json()) as GroqChatResponse;

  if (!res.ok) {
    const message =
      data.error?.message ?? `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(`Groq API error: ${message}`);
    if (res.status === 429) {
      (err as Error & { status: number }).status = 429;
      startLlmCooldown();
    }
    throw err;
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (err) {
    logger.error({ text }, "Failed to parse Groq JSON");
    throw new Error(
      `Invalid JSON from Groq: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const validated = classificationSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error(
      { issues: validated.error.issues, parsed },
      "Groq JSON failed schema validation",
    );
    throw new Error("Groq response did not match classification schema");
  }

  return validated.data;
}

export function isGroqConfigured(): boolean {
  return Boolean(config.GROQ_API_KEY);
}
