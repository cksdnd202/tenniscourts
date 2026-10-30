/**
 * Plain-text facility notices, including legacy imports whose angle brackets
 * were stripped before their style/script contents were removed.
 * Keep meaningful Korean spacing; collapse only redundant whitespace.
 */
export function normalizeCourtDescription(value: string | null | undefined): string {
  let text = value ?? "";
  for (let pass = 0; pass < 3; pass++) {
    text = text
      .replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
      .replace(/&amp;/gi, "&");
  }
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "\n")
    .replace(/\b(style|script)\s+type\s*=\s*["'][^"']*["'][\s\S]*?\/\1\b/gi, "\n")
    .replace(/\bmeta\s+(?:charset|name|http-equiv)\s*=\s*["'][^"']*["'](?:[^\r\n<>]*?)\s*\/(?=\s*(?:meta\b|style\b|\r?\n|$))/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:p|div|section|article|header|footer|main|h[1-6]|li|tr|ul|ol)\b[^>]*>|<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, "")
    .replace(/^\s*\/?(?:main|style|script|html|head|body)\s*$/gim, "")
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/[\u200b\ufeff]/g, "")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
