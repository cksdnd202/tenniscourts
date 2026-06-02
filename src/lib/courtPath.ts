type CourtPathTarget = {
  id: string;
  slug?: string | null;
};

export function getCourtDetailPath(court: CourtPathTarget): string {
  const slug = court.slug?.trim();
  if (slug) return `/courts/${slug}`;
  return `/courts/${court.id}`;
}
