import type { Court } from "../types";
import { formatBookingRuleCardText } from "../BookingRulesContent";
import { getBookingRuleCondition, getBookingRuleTargetText } from "@/lib/bookingRuleDisplay";
import { getBasketballAction, getBasketballRules, isBasketballFreeUse } from "@/lib/basketballBooking";
import { getNextBookingRuleOpen } from "@/lib/nextBookingOpen";
import { buildCalendarLinks } from "./CourtDetailAside";
import { CalendarRegisterButton } from "./CalendarRegisterButton";
import { MobileScrollHideBar } from "./MobileScrollHideBar";
import { detailDividerSectionStyle, detailSectionTitle, detailSectionTitleStyle } from "./detailLayoutStyles";

function BasketballAction({ court, compact = false }: { court: Court; compact?: boolean }) {
  const action = getBasketballAction(court);
  const className = `flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-center text-sm font-semibold ${compact ? "py-3" : "py-3.5"}`;
  return action.href ? (
    <a href={action.href} target={action.href.startsWith("tel:") ? undefined : "_blank"} rel="noopener noreferrer"
      data-gtm="reserve_click" data-court-id={court.id} data-court-name={court.basic_court_name}
      className={`${className} sport-detail-primary-action bg-[#D1500F] text-white transition hover:bg-[#B9440B]`}>{action.label}</a>
  ) : <p className={`${className} bg-[#252525] text-[#B0B0B0]`}>{action.label}</p>;
}

export function BasketballBookingSection({ court }: { court: Court }) {
  const rules = getBasketballRules(court);
  if (!rules.length) return <p className="rounded-xl border border-[#35383D] bg-[#1A1A1B] p-5 text-sm text-[#B0B0B0]">{isBasketballFreeUse(court) ? "예약 없이 자유이용" : "예약 방법 확인중"}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-basketball-booking-rules="true">
      {rules.map((rule) => {
        const target = getBookingRuleTargetText({ ...rule, target_condition: "" });
        const condition = getBookingRuleCondition(rule);
        const unknown = !rule.rule_type;
        const action = getBasketballAction(court, rule);
        return (
          <article key={rule.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#35383D] bg-[#1A1A1B] p-5">
            {!unknown || target !== "대상 미확인" ? <h3 className="break-words text-sm font-semibold text-[#E6611E]">{target}</h3> : null}
            <p className={`break-words text-base font-semibold ${unknown || rule.rule_type === "checking" ? "text-[#B0B0B0]" : "text-white"}`}>
              {unknown ? "예약 방법 확인중" : rule.rule_type === "checking" ? "예약 오픈 일시 확인중" : formatBookingRuleCardText(rule)}
            </p>
            {rule.rule_type === "rolling" && !rule.open_time ? <p className="text-sm text-[#B0B0B0]">예약 가능 기간은 확인됐으며, 정확한 오픈 시각은 확인중입니다.</p> : null}
            {rule.open_date_adjustment === "next_weekday" ? <p className="text-sm text-[#B0B0B0]">공휴일 일정은 운영기관 안내를 확인해주세요.</p> : null}
            {rule.usage_period_label ? <p className="break-words text-sm font-medium text-white">{rule.usage_period_label}</p> : null}
            {condition ? <p className="break-words text-sm leading-relaxed text-[#B0B0B0]">{condition}</p> : null}
            {rule.booking_round_label ? <p className="text-sm text-[#B0B0B0]">{rule.booking_round_label}</p> : null}
            {action.href ? <a href={action.href} target={action.href.startsWith("tel:") ? undefined : "_blank"} rel="noopener noreferrer"
              className="mt-auto w-fit text-sm font-semibold text-[#E6611E] underline underline-offset-4">{action.label}</a> : null}
          </article>
        );
      })}
    </div>
  );
}

function BasketballNextOpens({ court, compact = false }: { court: Court; compact?: boolean }) {
  const previews = getBasketballRules(court).flatMap((rule) => {
    // Unknown opening clocks and walk-in rules must not produce dates or calendar events.
    if (!rule.open_time || ["outdoor_open", "phone", "on_site", "checking"].includes(rule.rule_type ?? "")) return [];
    const open = getNextBookingRuleOpen(court, rule);
    return open ? [{ rule, open }] : [];
  });
  const visible = compact ? previews.slice(0, 1) : previews;
  if (!visible.length) return null;
  return <div className="grid gap-3">{visible.map(({ rule, open }) => {
    const badge = getBookingRuleTargetText(rule);
    const calendar = buildCalendarLinks({ courtName: court.basic_court_name || "농구장", badge, start: open.instant, address: court.basic_address });
    return <div key={rule.id} className="min-w-0 rounded-xl border border-[#35383D] bg-[#1A1A1B] p-4">
      <p className="break-words text-xs font-semibold text-[#E6611E]">{badge}</p>
      <p className="mt-2 text-sm text-[#B0B0B0]">다음 예약 오픈 일</p>
      <p className="mt-1 text-base font-bold text-white">{open.dateLabel} · {open.timeLabel}</p>
      <CalendarRegisterButton icsPath={calendar.ics} googleCalendarUrl={calendar.google} androidEvent={calendar.androidEvent}
        gtmAction={rule.eligibility === "normal" ? "calendar_register_general_click" : "calendar_register_priority_click"}
        courtId={court.id} courtName={court.basic_court_name || undefined} badge={badge} compact={compact} />
    </div>;
  })}{compact && previews.length > 1 ? <a href="#basketball-booking" className="text-xs text-[#B0B0B0] underline">다른 예약 조건 {previews.length - 1}개 보기</a> : null}</div>;
}

export function BasketballDetailAside({ court }: { court: Court }) {
  return <aside className="sticky top-[85px] grid max-h-[calc(100vh-100px)] gap-4 overflow-y-auto">
    <BasketballNextOpens court={court} />
    <BasketballAction court={court} />
    {isBasketballFreeUse(court) ? <p className="text-sm leading-relaxed text-[#B0B0B0]">현장 행사·강좌 및 시설 운영 수칙을 확인한 후 이용해주세요.</p> : null}
  </aside>;
}

export function BasketballMobileBookBar({ court }: { court: Court }) {
  return <MobileScrollHideBar><div data-courts-korea-book-bar-content="true" className="grid gap-3 border-t border-[#2C2C2C] bg-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <BasketballNextOpens court={court} compact />
    <BasketballAction court={court} compact />
  </div></MobileScrollHideBar>;
}

export function BasketballFacilityInfo({ court }: { court: Court }) {
  const environment = [court.has_indoor_courts ? "실내" : "", court.has_outdoor_courts || getBasketballRules(court).some((rule) => rule.rule_type === "outdoor_open") ? "실외" : ""].filter(Boolean).join(" · ");
  const timeRange = (from: string | null | undefined, to: string | null | undefined) => from && to ? `${from.slice(0, 5)} ~ ${to.slice(0, 5)}` : "확인중";
  const basis = court.map_coordinate_evidence?.basis;
  return <section data-basketball-facility="true" style={detailDividerSectionStyle}>
    <h2 className={detailSectionTitle} style={{ ...detailSectionTitleStyle, marginBottom: "24px" }}>시설 정보</h2>
    <dl className="grid gap-4 rounded-xl border border-[#35383D] bg-[#1A1A1B] p-5 text-sm">
      <div className="flex justify-between gap-4"><dt className="text-[#B0B0B0]">실내·실외</dt><dd className="text-white">{environment || "확인중"}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-[#B0B0B0]">평일 운영시간</dt><dd className="text-white">{timeRange(court.basic_time_of_use_weekday_from, court.basic_time_of_use_weekday_to)}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-[#B0B0B0]">주말 운영시간</dt><dd className="text-white">{timeRange(court.basic_time_of_use_weekend_from, court.basic_time_of_use_weekend_to)}</dd></div>
    </dl>
    {typeof basis === "string" && basis !== "facility_poi" ? <p className="mt-3 text-sm leading-relaxed text-[#B0B0B0]">지도는 시설·공원의 대표 위치입니다. 개별 코트와 출입구 위치는 다를 수 있습니다.</p> : null}
  </section>;
}
