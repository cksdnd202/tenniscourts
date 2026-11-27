import type { Court } from "../types";
import { formatBookingRuleCardText } from "../BookingRulesContent";
import { getBookingRuleTargetText } from "@/lib/bookingRuleDisplay";
import { getBasketballAction, getBasketballRules, isBasketballFreeUse } from "@/lib/basketballBooking";
import { getNextBookingRuleOpen } from "@/lib/nextBookingOpen";
import { HorizontalScrollArea } from "./HorizontalScrollArea";
import { buildCalendarLinks, NextOpenPreviewCard } from "./CourtDetailAside";
import { MobileScrollHideBar } from "./MobileScrollHideBar";
import type { BookingOpenLabelTone } from "./detailLayoutStyles";

function BasketballAction({ court, compact = false }: { court: Court; compact?: boolean }) {
  const action = getBasketballAction(court);
  const className = `flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-center text-sm font-semibold ${compact ? "py-3" : "py-3.5"}`;
  return action.href ? (
    <a href={action.href} target={action.href.startsWith("tel:") ? undefined : "_blank"} rel="noopener noreferrer"
      data-gtm="reserve_click" data-court-id={court.id} data-court-name={court.basic_court_name}
      className={`${className} sport-detail-primary-action bg-[#D1500F] text-white transition hover:bg-[#B9440B]`}>{action.label}</a>
  ) : <p className={`${className} bg-[#252525] text-[#B0B0B0]`}>{action.label}</p>;
}

function bookingLabel(rule: ReturnType<typeof getBasketballRules>[number]) {
  const target = getBookingRuleTargetText({ ...rule, target_condition: "" });
  return [target, rule.usage_period_label].filter(Boolean).join(" · ");
}

export function BasketballBookingSection({ court }: { court: Court }) {
  const rules = getBasketballRules(court);
  if (!rules.length) return <p className="rounded-xl border border-[#35383D] bg-[#111214] p-5 text-sm text-[#B0B0B0]">{isBasketballFreeUse(court) ? "예약 없이 자유이용" : "예약 방법 확인중"}</p>;
  return (
    <div className="space-y-3" data-detail-booking-rules="true">
      <HorizontalScrollArea className="scrollbar-hide flex snap-x snap-proximity items-stretch gap-3 overflow-x-auto">
        {rules.map((rule) => {
          const unknown = !rule.rule_type;
          return <div data-detail-booking-rule-card="true" key={rule.id}
            className={`flex min-w-0 snap-start flex-col gap-5 rounded-xl border border-[#35383D] bg-[#111214] px-5 py-5 ${rules.length === 1 ? "w-full" : "w-[280px] max-w-[85%] shrink-0 sm:max-w-none sm:flex-[1_0_280px]"}`}>
            {!unknown ? <p className="break-keep text-base font-semibold" style={{ color: rule.eligibility === "normal" ? "#FFFFFF" : "#E6611E" }}>{bookingLabel(rule)}</p> : null}
            <p className={`mt-auto break-keep text-base font-bold leading-relaxed ${unknown || rule.rule_type === "checking" ? "text-[#B0B0B0]" : "text-white"}`}>
              {unknown ? "예약 방법 확인중" : rule.rule_type === "checking" ? "예약 오픈 일시 확인중" : formatBookingRuleCardText(rule)}
            </p>
          </div>;
        })}
      </HorizontalScrollArea>
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
    const badge = bookingLabel(rule);
    const badgeTone: BookingOpenLabelTone = rule.eligibility === "normal" ? "normal" : "priority";
    const calendar = buildCalendarLinks({ courtName: court.basic_court_name || "농구장", badge, start: open.instant, address: court.basic_address });
    return <NextOpenPreviewCard key={rule.id} badge={badge} badgeTone={badgeTone}
      dateLabel={open.dateLabel} timeLabel={open.timeLabel} calendarLinks={calendar}
      courtId={court.id} courtName={court.basic_court_name} compact={compact} isBasketball />;
  })}{compact && previews.length > 1 ? <a href="#basketball-booking" className="text-xs text-[#B0B0B0] underline">다른 예약 조건 {previews.length - 1}개 보기</a> : null}</div>;
}

export function BasketballDetailAside({ court }: { court: Court }) {
  return <aside className="sticky top-[85px] grid max-h-[calc(100vh-100px)] gap-4 overflow-y-auto">
    <BasketballNextOpens court={court} />
    <BasketballAction court={court} />
  </aside>;
}

export function BasketballMobileBookBar({ court }: { court: Court }) {
  return <MobileScrollHideBar><div data-courts-korea-book-bar-content="true" className="grid gap-3 border-t border-[#2C2C2C] bg-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <BasketballNextOpens court={court} compact />
    <BasketballAction court={court} compact />
  </div></MobileScrollHideBar>;
}
