const MONTH_TOKEN_PATTERN = /-(?:0?[1-9]|1[0-2])wol(?=-|$)/g;

export function removeMonthlySlugToken(slug: string): string {
  return slug.replace(MONTH_TOKEN_PATTERN, "").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

export function getSlugRedirectCandidates(slug: string): string[] {
  const normalized = removeMonthlySlugToken(slug);
  if (!normalized || normalized === slug) return [];
  return [normalized];
}
