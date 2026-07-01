const USER_AGENT =
  "MetaIntelligenceMonitor/0.1 (+https://github.com/meta-intelligence-monitor)";

const META_DOCS_ORIGIN = "https://developers.facebook.com";

export function resolveMetaDocsUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${META_DOCS_ORIGIN}${href}`;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

export async function fetchMetaDocsHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseReleasedDate(text: string): Date | null {
  const match = text.match(
    /Released\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/i,
  );
  if (!match) return null;
  const d = new Date(`${match[1]} ${match[2]}, ${match[3]}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function htmlBlockToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latest N Graph API version page URLs from the changelog index. */
export function discoverGraphApiVersionUrls(
  html: string,
  baseUrl: string,
  limit: number,
): string[] {
  const pattern =
    /href="(\/docs\/graph-api\/changelog\/version[^"#?]+)"/gi;
  const seen = new Set<string>();
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;
    const url = resolveMetaDocsUrl(href, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls.slice(0, limit);
}

/** Recent out-of-cycle / non-versioned change page URLs from the index. */
export function discoverOutOfCycleUrls(
  html: string,
  baseUrl: string,
  limit: number,
): string[] {
  const pattern =
    /href="(\/docs\/graph-api\/changelog\/(?:non-versioned-changes|out-of-cycle-changes)[^"#?]+)"/gi;
  const seen = new Set<string>();
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;
    let path = href;
    if (path.endsWith("/")) path = path.slice(0, -1);
    const url = resolveMetaDocsUrl(path, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls.slice(0, limit);
}

export interface ChangelogSection {
  url: string;
  title: string;
  publishedAt: Date;
  rawContent: string;
}

/**
 * Parses a Graph API version changelog page into one article per h3 section
 * under the "Graph API" h2 (skips Marketing API content).
 */
export function parseGraphApiVersionPage(
  html: string,
  pageUrl: string,
): ChangelogSection[] {
  const versionMatch = pageUrl.match(/version(\d+\.\d+)/i);
  const versionLabel = versionMatch ? `v${versionMatch[1]}` : "Graph API";

  const graphStart = html.search(/<h2[^>]*>\s*Graph API\s*<\/h2>/i);
  if (graphStart < 0) return [];

  const marketingStart = html.search(
    /<h2[^>]*>\s*Marketing API\s*<\/h2>/i,
  );
  const slice =
    marketingStart > graphStart
      ? html.slice(graphStart, marketingStart)
      : html.slice(graphStart, graphStart + 120_000);

  const releasedMatch = slice.match(
    /Released\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/i,
  );
  const publishedAt =
    (releasedMatch && parseReleasedDate(releasedMatch[0])) ?? new Date();

  const sections: ChangelogSection[] = [];
  const h3Pattern = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const h3Matches = [...slice.matchAll(h3Pattern)];

  for (let i = 0; i < h3Matches.length; i += 1) {
    const h3 = h3Matches[i];
    if (!h3?.[1]) continue;
    const heading = htmlBlockToText(h3[1]);
    if (!heading) continue;

    const bodyStart = (h3.index ?? 0) + h3[0].length;
    const bodyEnd =
      i + 1 < h3Matches.length
        ? (h3Matches[i + 1]?.index ?? slice.length)
        : slice.length;
    const bodyHtml = slice.slice(bodyStart, bodyEnd);
    const rawContent = htmlBlockToText(bodyHtml);
    if (rawContent.length < 40) continue;

    const slug = slugify(heading);
    sections.push({
      url: `${pageUrl.replace(/\/$/, "")}#graph-api-${slug}`,
      title: `Graph API ${versionLabel}: ${heading}`,
      publishedAt,
      rawContent: `${heading}\n\n${rawContent}`,
    });
  }

  if (sections.length === 0) {
    const intro = htmlBlockToText(
      slice.replace(/<h3[\s\S]*$/i, ""),
    );
    if (intro.length >= 80) {
      sections.push({
        url: `${pageUrl.replace(/\/$/, "")}#graph-api-overview`,
        title: `Graph API ${versionLabel} changelog`,
        publishedAt,
        rawContent: intro,
      });
    }
  }

  return sections;
}

/**
 * Parses an out-of-cycle / non-versioned changes detail page as a single article.
 */
export function parseOutOfCyclePage(
  html: string,
  pageUrl: string,
): ChangelogSection | null {
  const contentMatch = html.match(
    /<div class="_4-u3 _588p">([\s\S]*?)<\/div><\/div><div class="_4-u2 _57mb _1u44 _4-u8">/i,
  );
  const block = contentMatch?.[1] ?? html;
  const rawContent = htmlBlockToText(block);
  if (rawContent.length < 80) return null;

  const titleMatch = block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const titleText = htmlBlockToText(
    titleMatch?.[1] ?? h2Match?.[1] ?? "Graph API out-of-cycle change",
  );

  const dateMatch =
    rawContent.match(
      /([A-Za-z]+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2})/,
    ) ?? pageUrl.match(/(\d{4})/);
  let publishedAt = new Date();
  if (dateMatch?.[1]) {
    const parsed = new Date(
      dateMatch[1].length === 4 ? `${dateMatch[1]}-01-01` : dateMatch[1],
    );
    if (!Number.isNaN(parsed.getTime())) publishedAt = parsed;
  }

  return {
    url: pageUrl.replace(/\/$/, ""),
    title: `Graph API out-of-cycle: ${titleText}`,
    publishedAt,
    rawContent,
  };
}

export function isGraphApiChangelogIndex(url: string): boolean {
  return /\/docs\/graph-api\/changelog\/?$/i.test(url.replace(/#.*$/, ""));
}

export function isOutOfCycleIndex(url: string): boolean {
  return /\/docs\/graph-api\/changelog\/out-of-cycle-changes\/?$/i.test(
    url.replace(/#.*$/, ""),
  );
}

export function isGraphApiVersionPage(url: string): boolean {
  return /\/docs\/graph-api\/changelog\/version[\d.]+/i.test(url);
}

export function isOutOfCycleDetailPage(url: string): boolean {
  return /\/docs\/graph-api\/changelog\/(?:non-versioned-changes|out-of-cycle-changes)\/[^/]+/i.test(
    url,
  );
}
