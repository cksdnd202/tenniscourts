import type { Court } from "@/app/types";
import type { CourtAmenityKey } from "./courtAmenities";

export const COURT_BOOKING_METHODS = [
  { value: "online", label: "온라인 예약" },
  { value: "on_site", label: "현장 예약" },
  { value: "phone", label: "전화 예약" },
  { value: "outdoor_open", label: "실외 개방" },
] as const;
export type CourtBookingMethod = (typeof COURT_BOOKING_METHODS)[number]["value"];

/** Require every selected amenity to be confirmed present. Missing is unknown. */
export function matchesCourtAmenities(court: Court, selected: CourtAmenityKey[]) {
  return selected.every((key) =>
    court.court_amenities?.some((item) => item.amenity_key === key && item.status === "present")
  );
}

export function getCourtBookingMethods(court: Court): Set<CourtBookingMethod> {
  const methods = new Set<CourtBookingMethod>();
  const active = (court.court_booking_rules ?? []).filter((rule) => rule.is_active);
  const types = active.length ? active.map((rule) => rule.rule_type) : [court.booking_rule_type];
  for (const method of ["on_site", "phone", "outdoor_open"] as const) {
    if (types.includes(method)) methods.add(method);
  }
  // A link alone can point to an information page, so it is not proof of online booking.
  const scheduled = ["fixed_schedule", "rolling", "ordinal", "lottery"];
  if (court.booking_online_reserve_possible === true ||
      active.some((rule) => /^https?:\/\//i.test(rule.reservation_url ?? "")) ||
      (types.some((type) => scheduled.includes(type ?? "")) &&
       /^https?:\/\//i.test(court.booking_site_link ?? "") &&
       court.booking_online_reserve_possible !== false)) {
    methods.add("online");
  }
  return methods;
}

/** Alternatives within booking methods; different filter groups are intersected. */
export function matchesCourtBookingMethods(court: Court, selected: CourtBookingMethod[]) {
  if (!selected.length) return true;
  const methods = getCourtBookingMethods(court);
  return selected.some((method) => methods.has(method));
}
