import type { Court, CourtBookingRule } from "@/app/types";
import { getReservationHref } from "./reservationLink";

export function getBasketballRules(court: Court) {
  return (court.court_booking_rules ?? []).filter((rule) => rule.is_active)
    .slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function isBasketballFreeUse(court: Court) {
  const rules = getBasketballRules(court);
  return rules.length ? rules.every((rule) => rule.rule_type === "outdoor_open")
    : court.booking_rule_type === "outdoor_open";
}

/** Information links never imply online booking; only confirmed methods get that label. */
export function getBasketballAction(court: Court, rule?: CourtBookingRule) {
  if (rule?.rule_type === "outdoor_open" || (!rule && isBasketballFreeUse(court))) {
    return { label: "예약 없이 자유이용", href: null };
  }
  const selected = rule ?? getBasketballRules(court).find((item) => item.rule_type !== "outdoor_open");
  const type = selected?.rule_type ?? court.booking_rule_type;
  const url = selected?.reservation_url?.trim() || court.booking_site_link?.trim() || "";
  if (type === "phone") {
    const validPhone = /^(?:tel:)?[+\d][\d\s()-]+$/i.test(url);
    return { label: validPhone ? "전화하기" : "전화번호 확인 중", href: validPhone ? `tel:${url.replace(/^tel:/i, "").replace(/[^\d+]/g, "")}` : null };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { label: type === "on_site" ? "현장 접수" : "예약 방법 확인중", href: null };
  }
  const online = type !== "on_site" && (court.booking_online_reserve_possible === true
    || ["rolling", "fixed_schedule", "ordinal", "lottery"].includes(type ?? ""));
  return {
    label: online ? "예약하러가기" : "이용안내",
    href: selected?.reservation_url?.trim() ? url : getReservationHref(court),
  };
}
