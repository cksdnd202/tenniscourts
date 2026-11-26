import Image from "next/image";
import Link from "next/link";
import type { Court } from "./types";
import { FavoriteButton } from "./FavoriteButton";
import { formatBookingRuleCardText } from "./BookingRulesContent";
import { getBookingRuleCondition, getBookingRuleTargetText } from "@/lib/bookingRuleDisplay";
import { getCourtDetailPath } from "@/lib/courtPath";
import { getReservationHref } from "@/lib/reservationLink";
import { getActivePhoneBookingRule, getPhoneReservationHref, isPhoneReservationCourt } from "@/lib/phoneReservation";

/** Basketball has no tennis surface grid; conditions remain visible for mixed use. */
export function BasketballCourtContent({ court }: { court: Court }) {
  const rules = (court.court_booking_rules ?? [])
    .filter((rule) => rule.is_active)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const visibleRules = rules.slice(0, 2);
  const detailHref = getCourtDetailPath(court);
  const freeOnly = rules.length > 0
    ? rules.every((rule) => rule.rule_type === "outdoor_open")
    : court.booking_rule_type === "outdoor_open";
  const isPhoneReservation = isPhoneReservationCourt(court);
  const phone = isPhoneReservation
    ? getPhoneReservationHref(court, getActivePhoneBookingRule(court)) : null;
  const ruleUrl = rules.find((rule) => rule.rule_type !== "outdoor_open" && /^https?:\/\//i.test(rule.reservation_url ?? ""))?.reservation_url;
  const reserveHref = phone || (court.booking_site_link ? getReservationHref(court) : ruleUrl);
  const hasCoordinates = typeof court.basic_latitude === "number" && Number.isFinite(court.basic_latitude)
    && typeof court.basic_longitude === "number" && Number.isFinite(court.basic_longitude);
  const mapHref = court.basic_map_link || (hasCoordinates
    ? `https://map.kakao.com/link/map/${encodeURIComponent(court.basic_court_name ?? "농구장")},${court.basic_latitude},${court.basic_longitude}`
    : court.basic_address ? `https://map.kakao.com/link/search/${encodeURIComponent(court.basic_address)}` : null);
  const actionClass = "flex min-h-11 flex-1 items-center justify-center rounded px-3 py-2.5 text-sm font-semibold text-white transition-colors";

  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate text-xl font-semibold text-white" title={court.basic_court_name ?? undefined}>
          {court.basic_court_name || "이름 없는 농구장"}
        </h2>
        <FavoriteButton courtId={court.id} accentColor="#E6611E" />
      </div>
      <div className="my-2 flex min-h-[112px] flex-col justify-center gap-2 rounded-lg bg-[#2C2C2C] px-3 py-3.5 text-sm">
        <p className="text-xs font-semibold text-[#a7a7a7]">
          {freeOnly ? "자유이용 안내" : rules.length ? `예약 오픈 정보 ${rules.length}개` : "예약·이용 안내"}
        </p>
        {visibleRules.length > 0 ? visibleRules.map((rule) => {
          const condition = getBookingRuleCondition(rule);
          // Put lengthy team and mixed-use conditions on their own line.
          const target = getBookingRuleTargetText({ ...rule, target_condition: "" });
          const text = rule.rule_type ? formatBookingRuleCardText(rule) : "예약 방법·오픈 정보 확인 필요";
          return (
            <div key={rule.id} className="min-w-0 break-words leading-relaxed">
              <p><span className="font-bold text-[#E6611E]">{target} : </span><span className="font-semibold text-white">{text}</span></p>
              {rule.rule_type === "rolling" && !rule.open_time ? <p className="text-xs text-[#B0B0B0]">정확한 오픈 시각 확인 필요</p> : null}
              {condition || rule.usage_period_label ? <p className="mt-0.5 text-xs text-[#B0B0B0]">{[rule.usage_period_label, condition].filter(Boolean).join(" · ")}</p> : null}
            </div>
          );
        }) : <p className="font-semibold text-white">{freeOnly ? "예약 없이 자유이용" : "예약 방법·오픈 정보 확인 필요"}</p>}
        {rules.length > visibleRules.length ? <Link href={detailHref} className="text-xs text-[#B0B0B0] underline underline-offset-4">+{rules.length - visibleRules.length}개 이용 조건 상세보기</Link> : null}
      </div>
      <div className="flex min-w-0 items-center gap-1 text-sm text-[#A4AAB4]">
        <Image src="/icon/icon_map.svg" alt="" width={16} height={16} />
        <span className="min-w-0 flex-1 truncate" title={court.basic_address ?? undefined}>
          {court.basic_address || "상세 주소 확인 필요"}
        </span>
        {mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className="shrink-0 underline underline-offset-4">위치보기</a> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={detailHref} data-gtm="detail_click" data-court-id={court.id} className={`${actionClass} bg-[#222222] hover:bg-[#333333]`}>상세보기</Link>
        {!freeOnly && reserveHref ? <a href={reserveHref} target={phone ? undefined : "_blank"} rel="noopener noreferrer" data-gtm="reserve_click" data-court-id={court.id} className={`${actionClass} bg-[#D1500F] hover:bg-[#B9440B]`}>{phone ? "전화하기" : court.booking_online_reserve_possible === true || rules.some((rule) => ["rolling", "fixed_schedule", "lottery", "ordinal"].includes(rule.rule_type ?? "")) ? "예약하러가기" : "이용안내"}</a>
          : !freeOnly ? <span className={`${actionClass} bg-[#333333] text-[#B0B0B0]`} aria-disabled="true">{isPhoneReservation ? "전화번호 확인 중" : rules.some((rule) => rule.rule_type === "on_site") ? "현장 접수" : "예약 링크 확인 중"}</span> : null}
      </div>
    </>
  );
}
