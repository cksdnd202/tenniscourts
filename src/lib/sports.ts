import type { Court, CourtSurfaceType, SportType } from "@/app/types";

export const DEFAULT_SPORT_TYPE: SportType = "tennis";

export const SPORT_LABELS: Record<SportType, string> = {
  tennis: "테니스",
  badminton: "배드민턴",
};

export const SPORT_VENUE_LABELS: Record<SportType, string> = {
  tennis: "테니스장",
  badminton: "배드민턴장",
};

/**
 * Card accent colors live here so each sport can keep its own visual identity.
 * Add the next sport to this map when its SportType is introduced.
 */
export const SPORT_CARD_THEMES: Record<
  SportType,
  {
    accent: string;
    bookmark: string;
    primary: string;
    primaryHover: string;
  }
> = {
  tennis: {
    accent: "#6FCF97",
    bookmark: "#D8D8D8",
    primary: "#2C8B56",
    primaryHover: "#53A978",
  },
  badminton: {
    accent: "#337DFF",
    bookmark: "#D8D8D8",
    primary: "#375AE6",
    primaryHover: "#4768EA",
  },
};

export const SPORT_SURFACES: Record<
  SportType,
  Array<{ value: CourtSurfaceType; label: string }>
> = {
  tennis: [
    { value: "hard", label: "하드" },
    { value: "grass", label: "잔디" },
    { value: "clay", label: "클레이" },
  ],
  badminton: [
    { value: "wood", label: "목재 마루" },
    { value: "synthetic", label: "PVC·전용 매트" },
    { value: "urethane", label: "우레탄·탄성 포장" },
    { value: "artificial_grass", label: "인조잔디" },
    { value: "clay_soil", label: "흙·클레이" },
    { value: "modular", label: "모듈형 스포츠 바닥" },
    { value: "concrete", label: "콘크리트·시멘트" },
    { value: "other", label: "기타" },
    { value: "pending", label: "확인중" },
  ],
};

export const SURFACE_LABELS: Record<CourtSurfaceType, string> = {
  hard: "하드",
  grass: "잔디",
  clay: "클레이",
  wood: "목재 마루",
  synthetic: "PVC·전용 매트",
  urethane: "우레탄·탄성 포장",
  artificial_grass: "인조잔디",
  clay_soil: "흙·클레이",
  modular: "모듈형 스포츠 바닥",
  concrete: "콘크리트·시멘트",
  other: "기타",
  pending: "확인중",
};

export type CourtSurfaceRow = {
  key: CourtSurfaceType;
  label: string;
  icon: string | null;
  indoor: number | null;
  outdoor: number | null;
};

export function getCourtSurfaceRows(court: Court): CourtSurfaceRow[] {
  const sportType = normalizeSportType(court.sport_type);
  if (sportType === "badminton") {
    const counts = new Map(
      (court.court_surface_counts ?? []).map((row) => [row.surface_type, row] as const)
    );
    return SPORT_SURFACES.badminton
      .map(({ value, label }) => ({
        key: value,
        label,
        icon: null,
        indoor: counts.get(value)?.indoor_count ?? 0,
        outdoor: counts.get(value)?.outdoor_count ?? 0,
      }))
      .filter((row) => (row.indoor ?? 0) + (row.outdoor ?? 0) > 0);
  }

  return [
    {
      key: "hard" as const,
      label: SURFACE_LABELS.hard,
      icon: "/icon/icon_hard_court.svg",
      indoor: court.court_count_hard_indoor,
      outdoor: court.court_count_hard_outdoor,
    },
    {
      key: "grass" as const,
      label: SURFACE_LABELS.grass,
      icon: "/icon/icon_grass_court.svg",
      indoor: court.court_count_grass_indoor,
      outdoor: court.court_count_grass_outdoor,
    },
    {
      key: "clay" as const,
      label: SURFACE_LABELS.clay,
      icon: "/icon/icon_clay_court.svg",
      indoor: court.court_count_clay_indoor,
      outdoor: court.court_count_clay_outdoor,
    },
  ];
}

export function normalizeSportType(value: unknown): SportType {
  return value === "badminton" ? "badminton" : DEFAULT_SPORT_TYPE;
}

export function getSportVenueLabel(value: unknown) {
  return SPORT_VENUE_LABELS[normalizeSportType(value)];
}
