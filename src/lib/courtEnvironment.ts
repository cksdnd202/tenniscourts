import type { Court } from "@/app/types";

export type CourtEnvironment = "indoor" | "outdoor";

const count = (value: number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function getCourtEnvironmentAvailability(court: Court) {
  const legacyIndoor =
    count(court.court_count_hard_indoor) +
    count(court.court_count_grass_indoor) +
    count(court.court_count_clay_indoor);
  const legacyOutdoor =
    count(court.court_count_hard_outdoor) +
    count(court.court_count_grass_outdoor) +
    count(court.court_count_clay_outdoor);

  const surfaceCounts = court.court_surface_counts ?? [];
  const surfaceIndoor = surfaceCounts.reduce(
    (total, surface) => total + count(surface.indoor_count),
    0
  );
  const surfaceOutdoor = surfaceCounts.reduce(
    (total, surface) => total + count(surface.outdoor_count),
    0
  );

  return {
    indoor: court.has_indoor_courts === true || legacyIndoor + surfaceIndoor > 0,
    outdoor: court.has_outdoor_courts === true || legacyOutdoor + surfaceOutdoor > 0,
  };
}

export function matchesCourtEnvironment(
  court: Court,
  selectedEnvironments: Iterable<CourtEnvironment>
) {
  const selected = new Set(selectedEnvironments);
  if (selected.size === 0) return true;

  const availability = getCourtEnvironmentAvailability(court);
  return (
    (selected.has("indoor") && availability.indoor) ||
    (selected.has("outdoor") && availability.outdoor)
  );
}
