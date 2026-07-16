type PreviewInput = {
  url: string;
  title?: string | null;
  description?: string | null;
  source?: string | null;
};

export type BlogPreview = {
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  source: string | null;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function readMetaTags(html: string) {
  const tags = new Map<string, string>();
  const metaTagRegex = /<meta\s+[^>]*>/gi;
  const attrRegex = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  const matches = html.match(metaTagRegex) ?? [];

  for (const tag of matches) {
    const attrs = new Map<string, string>();
    let attrMatch: RegExpExecArray | null;
    attrRegex.lastIndex = 0;

    while ((attrMatch = attrRegex.exec(tag))) {
      attrs.set(attrMatch[1].toLowerCase(), attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? "");
    }

    const key = attrs.get("property") ?? attrs.get("name");
    const content = attrs.get("content");
    if (key && content) {
      tags.set(key.toLowerCase(), decodeHtml(content));
    }
  }

  return tags;
}

function readTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(title) : null;
}

function readAttribute(tag: string, attrName: string) {
  const pattern = new RegExp(`${attrName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function readNaverMainFrameUrl(html: string, baseUrl: string) {
  const iframeTags = html.match(/<iframe\s+[^>]*>/gi) ?? [];

  for (const tag of iframeTags) {
    const id = readAttribute(tag, "id");
    const name = readAttribute(tag, "name");
    const src = readAttribute(tag, "src");

    if ((id === "mainFrame" || name === "mainFrame") && src) {
      return absolutizeUrl(src, baseUrl);
    }
  }

  return null;
}

function readFirstImage(html: string, baseUrl: string) {
  const imageTags = html.match(/<img\s+[^>]*>/gi) ?? [];

  for (const tag of imageTags) {
    const src =
      readAttribute(tag, "data-lazy-src") ??
      readAttribute(tag, "data-src") ??
      readAttribute(tag, "src");

    if (!src) continue;
    if (src.startsWith("data:")) continue;

    return absolutizeUrl(decodeHtml(src), baseUrl);
  }

  return null;
}

function hostnameSource(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function absolutizeUrl(url: string | null, baseUrl: string) {
  if (!url) return null;

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CourtsKoreaPreview/1.0; +https://courtskorea.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBlogPreview(input: PreviewInput): Promise<BlogPreview> {
  const fallback: BlogPreview = {
    url: input.url,
    title: input.title ? decodeHtml(input.title) : null,
    description: input.description ? decodeHtml(input.description) : null,
    thumbnail_url: null,
    source: input.source ?? hostnameSource(input.url),
  };

  try {
    const initialHtml = await fetchHtml(input.url);
    if (!initialHtml) return fallback;

    const naverMainFrameUrl = readNaverMainFrameUrl(initialHtml, input.url);
    const html = naverMainFrameUrl ? (await fetchHtml(naverMainFrameUrl)) ?? initialHtml : initialHtml;
    const baseUrl = naverMainFrameUrl ?? input.url;
    const tags = readMetaTags(html);
    const title = tags.get("og:title") ?? tags.get("twitter:title") ?? readTitle(html);
    const description =
      tags.get("og:description") ?? tags.get("description") ?? tags.get("twitter:description");
    const image =
      tags.get("og:image") ??
      tags.get("og:image:url") ??
      tags.get("twitter:image") ??
      readFirstImage(html, baseUrl);
    const siteName = tags.get("og:site_name");

    return {
      url: input.url,
      title: title ?? fallback.title,
      description: description ?? fallback.description,
      thumbnail_url: absolutizeUrl(image, baseUrl),
      source: siteName ?? fallback.source,
    };
  } catch {
    return fallback;
  }
}
