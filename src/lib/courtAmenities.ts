export const COURT_AMENITIES = [
  { key: "air_conditioning", label: "에어컨" },
  { key: "parking", label: "주차" },
  { key: "restroom", label: "화장실" },
  { key: "shower", label: "샤워실" },
  { key: "changing_room", label: "탈의실" },
  { key: "drinking_water", label: "정수기" },
  { key: "rest_area", label: "휴식 공간" },
  { key: "shade", label: "그늘막" },
] as const;

export const AMENITY_STATUSES = [
  { value: "present", label: "있음" },
  { value: "absent", label: "없음" },
  { value: "unknown", label: "미확인" },
] as const;

export type CourtAmenityKey = (typeof COURT_AMENITIES)[number]["key"];
export type CourtAmenityStatus = (typeof AMENITY_STATUSES)[number]["value"];
export type CourtAmenity = {
  court_id?: string;
  amenity_key: CourtAmenityKey;
  status: CourtAmenityStatus;
  checked_at?: string | null;
};

/** Missing information is unknown, never absent. Only editable status is copied. */
export function amenityFormRows(rows: CourtAmenity[] = []): CourtAmenity[] {
  return COURT_AMENITIES.map(({ key }) => ({
    amenity_key: key,
    status: rows.find((row) => row.amenity_key === key)?.status ?? "unknown",
  }));
}

export class CourtAmenityValidationError extends Error {}

/** Reject malformed selections before any court data is changed. */
export function parseCourtAmenities(input: unknown): CourtAmenity[] | undefined {
  if (input === undefined) return undefined; // Older admin clients leave selections intact.
  if (!Array.isArray(input) || input.length !== COURT_AMENITIES.length) {
    throw new CourtAmenityValidationError("편의시설 8개 항목을 모두 선택해주세요.");
  }
  const keys = new Set<string>(COURT_AMENITIES.map(({ key }) => key));
  const statuses = new Set<string>(AMENITY_STATUSES.map(({ value }) => value));
  const seen = new Set<string>();
  return input.map((item: unknown) => {
    if (!item || typeof item !== "object") {
      throw new CourtAmenityValidationError("편의시설 형식이 올바르지 않습니다.");
    }
    const { amenity_key, status } = item as Record<string, unknown>;
    if (typeof amenity_key !== "string" || !keys.has(amenity_key) || seen.has(amenity_key) ||
        typeof status !== "string" || !statuses.has(status)) {
      throw new CourtAmenityValidationError("편의시설 항목 또는 상태가 올바르지 않습니다.");
    }
    seen.add(amenity_key);
    return { amenity_key: amenity_key as CourtAmenityKey, status: status as CourtAmenityStatus };
  });
}
