import type { Court } from "@/app/types";

const knownBookingTypes = new Set([
  "rolling", "fixed_schedule", "ordinal", "interval_weekly", "monthly_relative",
  "lottery", "phone", "on_site", "outdoor_open", "irregular",
]);

/** Active rules take precedence over legacy fields, including explicit unknown rules. */
export function hasCourtBookingInformation(court: Court): boolean {
  const activeRules = (court.court_booking_rules ?? []).filter((rule) => rule.is_active);
  const types = activeRules.length > 0
    ? activeRules.map((rule) => rule.rule_type)
    : [court.booking_rule_type];
  return types.some((type) => knownBookingTypes.has(type?.trim() ?? ""));
}

function registrationTime(court: Court): number {
  const time = court.created_at ? Date.parse(court.created_at) : 0;
  return Number.isFinite(time) ? time : 0;
}

/** '전체': known booking information first, newest registration within each group. */
export function compareCourtsByBookingAndRecent(a: Court, b: Court): number {
  const informationOrder = Number(hasCourtBookingInformation(b)) - Number(hasCourtBookingInformation(a));
  if (informationOrder !== 0) return informationOrder;
  const recentOrder = registrationTime(b) - registrationTime(a);
  if (recentOrder !== 0) return recentOrder;
  return (a.basic_court_name ?? "").localeCompare(b.basic_court_name ?? "", "ko");
}
