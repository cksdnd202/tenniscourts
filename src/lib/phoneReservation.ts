import type { Court, CourtBookingRule } from "@/app/types";

export function isPhoneBookingRule(rule: CourtBookingRule | null | undefined) {
  return rule?.rule_type === "phone";
}

export function getActivePhoneBookingRule(court: Court) {
  return (court.court_booking_rules ?? []).find(
    (rule) => rule.is_active && isPhoneBookingRule(rule)
  );
}

export function isPhoneReservationCourt(court: Court) {
  return court.booking_rule_type === "phone" || Boolean(getActivePhoneBookingRule(court));
}

export function getPhoneHref(phoneNumber: string | null | undefined) {
  const raw = phoneNumber?.trim();
  if (!raw) return "";
  if (/^tel:/i.test(raw)) return raw;

  const normalized = raw.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "";
}

export function getPhoneReservationHref(
  court: Court,
  rule?: CourtBookingRule | null
) {
  return getPhoneHref(rule?.reservation_url || court.booking_site_link);
}
