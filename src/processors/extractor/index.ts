import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

/** Minimum length for extracted text to be considered "full content". */
const MIN_CONTENT_LENGTH = 200;

const USER_AGENT =
  "MetaIntelligenceMonitor/0.1 (+https://github.com/meta-intelligence-monitor)";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function htmlToText(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  return dom.window.document.body?.textContent ?? "";
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

function extractReadable(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const parsed = new Readability(dom.window.document).parse();
  return normalize(
    parsed?.textContent ?? dom.window.document.body?.textContent ?? "",
  );
}

export interface ExtractInput {
  url: string;
  title: string;
  rawContent?: string | null;
}

/**
 * Produces clean, normalized article text (see docs/01-architecture.md, stage 4).
 *
 * Prefers the source-provided body when it is substantial; otherwise downloads
 * the page and extracts the readable article text with Readability. Falls back
 * to the title so a result is always returned.
 */
export async function extractContent(input: ExtractInput): Promise<string> {
  const raw = input.rawContent?.trim();
  if (raw) {
    const text = normalize(looksLikeHtml(raw) ? htmlToText(raw) : raw);
    if (text.length >= MIN_CONTENT_LENGTH) return text;
  }

  try {
    const html = await fetchHtml(input.url);
    const text = extractReadable(html, input.url);
    if (text.length > 0) return text;
  } catch {
    // Fall through to the best available fallback below.
  }

  if (raw) {
    const text = normalize(looksLikeHtml(raw) ? htmlToText(raw) : raw);
    if (text.length > 0) return text;
  }
  return normalize(input.title);
}
