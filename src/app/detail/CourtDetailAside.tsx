import type { Court, CourtBookingRule } from "../types";
import {
  getNextBookingRuleOpen,
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
  type NextOpenResult,
} from "@/lib/nextBookingOpen";
import {
  getBookingOpenLabelTextClass,
  type BookingOpenLabelTone,
} from "./detailLayoutStyles";
import type { CalendarAndroidEventPayload } from "./calendarAndroidPayload";
import { CalendarRegisterButton } from "./CalendarRegisterButton";
import { MobileScrollHideBar } from "./MobileScrollHideBar";
import { getReservationHref } from "@/lib/reservationLink";
import {
  getActivePhoneBookingRule,
  getPhoneReservationHref,
  isPhoneReservationCourt,
} from "@/lib/phoneReservation";
import { formatBookingRuleEligibility } from "../BookingRulesContent";

const DEFAULT_CAL_DURATION_MIN = 10;

type NextOpenPreview = {
  key: string;
  badge: string;
  badgeTone: BookingOpenLabelTone;
  open: NextOpenResult;
  rule?: CourtBookingRule;
};

function PhoneCallIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8 9.71a16 16 0 0 0 6.29 6.29l1.25-1.25a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function hasRuleSpecificReservation(rule: CourtBookingRule | null | undefined) {
  return Boolean(
    rule?.reservation_url?.trim() ||
      rule?.booking_round_label?.trim() ||
      rule?.usage_period_label?.trim()
  );
}

function getRuleReservationUrl(rule: CourtBookingRule | null | undefined) {
  return rule?.reservation_url?.trim() || "";
}

function sortActiveBookingRules(court: Court) {
  return (court.court_booking_rules ?? [])
    .filter((rule) => rule.is_active)
    .slice()
    .sort((a, b) => {
      const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.label ?? "").localeCompare(b.label ?? "", "ko");
    });
}

function getNextOpenPreviews(court: Court): NextOpenPreview[] {
  const activeRules = sortActiveBookingRules(court);

  if (activeRules.length > 0) {
    const previews = activeRules
      .map<NextOpenPreview | null>((rule) => {
        const open = getNextBookingRuleOpen(court, rule);
        if (!open) return null;
        const badge = formatBookingRuleEligibility(rule.eligibility);
        return {
          key: rule.id,
          badge,
          badgeTone: getBookingRuleBadgeTone(rule.eligibility),
          open,
          rule,
        };
      })
      .filter((item): item is NextOpenPreview => Boolean(item));

    return previews;
  }

  const priorityLabel = getPriorityBookingLabel(court);
  const ownerOpen = priorityLabel ? getNextOwnerBookingOpen(court) : null;
  const normalOpen = getNextNormalBookingOpen(court);

  const fallbackPreviews: Array<NextOpenPreview | null> = [
    ownerOpen && priorityLabel
      ? { key: "priority", badge: priorityLabel, badgeTone: "priority" as const, open: ownerOpen }
      : null,
    normalOpen ? { key: "normal", badge: "전체", badgeTone: "general" as const, open: normalOpen } : null,
  ];

  return fallbackPreviews.filter((item): item is NextOpenPreview => Boolean(item));
}

function getBookingRuleBadgeTone(value: string | null | undefined): BookingOpenLabelTone {
  const key = value?.trim();
  if (key === "citizen" || key === "resident" || key === "inhabitant" || key === "none") {
    return key;
  }
  return key === "normal" || !key ? "normal" : "priority";
}

function buildDeviceCalendarUrl(params: {
  courtName: string;
  badge: string;
  start: Date;
  address?: string | null;
}): string {
  const { courtName, badge, start, address } = params;
  const title = `[${badge}] ${courtName} 예약 오픈`;
  const details = `${courtName} 예약 오픈 시간입니다.`;
  const q = new URLSearchParams({
    title,
    description: details,
    start: start.toISOString(),
    durationMin: String(DEFAULT_CAL_DURATION_MIN),
  });
  if (address && address.trim()) {
    q.set("location", address.trim());
  }
  return `/api/calendar-event?${q.toString()}`;
}

function toGoogleCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** 안드로이드: 인텐트 실패 시 Chrome 폴백용 구글 캘린더 웹 */
function buildGoogleCalendarAddUrl(params: {
  courtName: string;
  badge: string;
  start: Date;
  address?: string | null;
}): string {
  const { courtName, badge, start, address } = params;
  const end = new Date(start.getTime() + DEFAULT_CAL_DURATION_MIN * 60 * 1000);
  const title = `[${badge}] ${courtName} 예약 오픈`;
  const details = `${courtName} 예약 오픈 시간입니다.`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleCalendarUtc(start)}/${toGoogleCalendarUtc(end)}`,
    details,
  });
  if (address && address.trim()) {
    q.set("location", address.trim());
  }
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function buildCalendarLinks(params: {
  courtName: string;
  badge: string;
  start: Date;
  address?: string | null;
}): { ics: string; google: string; androidEvent: CalendarAndroidEventPayload } {
  const { courtName, badge, start, address } = params;
  const end = new Date(start.getTime() + DEFAULT_CAL_DURATION_MIN * 60 * 1000);
  const title = `[${badge}] ${courtName} 예약 오픈`;
  const description = `${courtName} 예약 오픈 시간입니다.`;
  return {
    ics: buildDeviceCalendarUrl(params),
    google: buildGoogleCalendarAddUrl(params),
    androidEvent: {
      title,
      description,
      location: address?.trim() || undefined,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    },
  };
}

/** 다음 예약 오픈: 뱃지(구민·시민·일반) + 제목 한 줄, 날짜(좌)·시간(우) 한 줄 */
function NextOpenPreviewCard({
  badge,
  badgeTone,
  title = "다음 예약 오픈 일",
  dateLabel,
  timeLabel,
  calendarLinks,
  reservationUrl,
  reservationUnavailableText,
  compact = false,
  courtId,
  courtName,
}: {
  badge: string;
  badgeTone: BookingOpenLabelTone;
  title?: string;
  dateLabel: string;
  timeLabel: string;
  calendarLinks?: { ics: string; google: string; androidEvent: CalendarAndroidEventPayload };
  reservationUrl?: string;
  reservationUnavailableText?: string;
  compact?: boolean;
  courtId?: string;
  courtName?: string | null;
}) {
  const badgeTextClass = getBookingOpenLabelTextClass(badgeTone, badge);

  return (
    <div
      className={`rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] ${
        compact ? "px-4 pt-4 pb-3" : "px-4 py-4"
      }`}
    >
      <div className={`flex items-center justify-between gap-2 ${compact ? "mb-3" : "mb-4"}`}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`shrink-0 rounded-md bg-[#0D0D0F] font-medium ring-1 ring-white/5 ${badgeTextClass} ${
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
            }`}
          >
            {badge}
          </span>
          <span className={compact ? "text-xs text-white" : "text-sm text-white"}>
            {title}
          </span>
        </div>
        {calendarLinks ? (
          <CalendarRegisterButton
            icsPath={calendarLinks.ics}
            googleCalendarUrl={calendarLinks.google}
            androidEvent={calendarLinks.androidEvent}
            compact={compact}
            gtmAction={badge === "전체" ? "calendar_register_general_click" : "calendar_register_priority_click"}
            courtId={courtId}
            courtName={courtName ?? undefined}
            badge={badge}
          />
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-nowrap items-baseline justify-between gap-3">
        <span
          className={`min-w-0 shrink font-bold tracking-tight text-[#4ADE80] ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          {dateLabel}
        </span>
        <span
          className={`shrink-0 text-right font-bold tracking-tight text-[#4ADE80] ${
            compact ? "text-lg" : "text-xl"
          }`}
        >
          {timeLabel}
        </span>
      </div>
      {reservationUrl ? (
        <a
          href={reservationUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-gtm="reserve_click"
          data-court-id={courtId}
          data-court-name={courtName ?? undefined}
          className={`mt-4 flex w-full items-center justify-center rounded-lg bg-[#4ADE80] text-center font-semibold text-black transition hover:bg-[#3fcf6f] ${
            compact ? "py-2.5 text-xs" : "py-3 text-sm"
          }`}
        >
          예약하러가기
        </a>
      ) : reservationUnavailableText ? (
        <span
          className={`mt-4 flex w-full items-center justify-center rounded-lg bg-[#252525] text-center font-medium text-[#8A8F98] ${
            compact ? "px-3 py-2.5 text-[11px]" : "px-4 py-3 text-xs"
          }`}
        >
          {reservationUnavailableText}
        </span>
      ) : null}
    </div>
  );
}

/** PC 우측 사이드: 다음 오픈 일 + 예약 CTA */
export function CourtDetailAside({ court }: { court: Court }) {
  const previews = getNextOpenPreviews(court);
  const reservationHref = getReservationHref(court);
  const phoneRule = getActivePhoneBookingRule(court);
  const isPhoneReservation = isPhoneReservationCourt(court);
  const phoneHref = getPhoneReservationHref(court, phoneRule);
  const useRuleReservationActions = previews.some((preview) =>
    hasRuleSpecificReservation(preview.rule)
  );

  return (
    <div className="sticky top-[calc(73px+0.75rem)] z-20 w-full min-w-0 max-h-[calc(100vh-96px)] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <aside className="flex flex-col gap-4 w-full">
        {previews.map((preview) => (
          <NextOpenPreviewCard
            key={preview.key}
            badge={preview.badge}
            badgeTone={preview.badgeTone}
            title={preview.rule?.usage_period_label?.trim() || "다음 예약 오픈 일"}
            dateLabel={preview.open.dateLabel}
            timeLabel={preview.open.timeLabel}
            reservationUrl={
              useRuleReservationActions ? getRuleReservationUrl(preview.rule) : undefined
            }
            reservationUnavailableText={
              useRuleReservationActions && !getRuleReservationUrl(preview.rule)
                ? "아직 다음 예약 링크가 열리지 않았습니다."
                : undefined
            }
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: preview.badge,
              start: preview.open.instant,
              address: court.basic_address,
            })}
            courtId={court.id}
            courtName={court.basic_court_name}
          />
        ))}

        {!useRuleReservationActions && isPhoneReservation && phoneHref ? (
          <a
            href={phoneHref}
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4ADE80] px-5 py-3.5 text-center text-sm font-semibold text-black hover:bg-[#3fcf6f] transition"
          >
            <PhoneCallIcon className="h-4 w-4" />
            전화하기
          </a>
        ) : !useRuleReservationActions && isPhoneReservation ? (
          <span className="flex w-full items-center justify-center rounded-xl bg-[#2C2C2C] px-5 py-3.5 text-center text-sm text-[#6B7280]">
            전화번호 없음
          </span>
        ) : !useRuleReservationActions && court.booking_site_link ? (
          <a
            href={reservationHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex w-full items-center justify-center rounded-xl bg-[#4ADE80] px-5 py-3.5 text-center text-sm font-semibold text-black hover:bg-[#3fcf6f] transition"
          >
            예약하러가기
          </a>
        ) : !useRuleReservationActions ? (
          <span className="flex w-full items-center justify-center rounded-xl bg-[#2C2C2C] px-5 py-3.5 text-center text-sm text-[#6B7280]">
            예약 링크 없음
          </span>
        ) : null}
      </aside>
    </div>
  );
}

/** 모바일 하단 고정: 다음 오픈 + 예약 CTA */
export function CourtDetailMobileBookBar({ court }: { court: Court }) {
  const previews = getNextOpenPreviews(court);
  const reservationHref = getReservationHref(court);
  const phoneRule = getActivePhoneBookingRule(court);
  const isPhoneReservation = isPhoneReservationCourt(court);
  const phoneHref = getPhoneReservationHref(court, phoneRule);
  const hasMultiplePreviews = previews.length > 1;
  const useRuleReservationActions = previews.some((preview) =>
    hasRuleSpecificReservation(preview.rule)
  );

  const previewBlocks =
    previews.length > 0 ? (
      <div className={hasMultiplePreviews ? "" : "space-y-3"}>
        {hasMultiplePreviews ? (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {previews.map((preview) => (
              <div key={preview.key} className="w-[86%] min-w-[86%] snap-start">
                <NextOpenPreviewCard
                  badge={preview.badge}
                  badgeTone={preview.badgeTone}
                  title={preview.rule?.usage_period_label?.trim() || "다음 예약 오픈 일"}
                  dateLabel={preview.open.dateLabel}
                  timeLabel={preview.open.timeLabel}
                  reservationUrl={
                    useRuleReservationActions ? getRuleReservationUrl(preview.rule) : undefined
                  }
                  reservationUnavailableText={
                    useRuleReservationActions && !getRuleReservationUrl(preview.rule)
                      ? "아직 다음 예약 링크가 열리지 않았습니다."
                      : undefined
                  }
                  calendarLinks={buildCalendarLinks({
                    courtName: court.basic_court_name ?? "테니스장",
                    badge: preview.badge,
                    start: preview.open.instant,
                    address: court.basic_address,
                  })}
                  courtId={court.id}
                  courtName={court.basic_court_name}
                  compact
                />
              </div>
            ))}
          </div>
        ) : null}
        {!hasMultiplePreviews && previews[0] ? (
          <NextOpenPreviewCard
            badge={previews[0].badge}
            badgeTone={previews[0].badgeTone}
            title={previews[0].rule?.usage_period_label?.trim() || "다음 예약 오픈 일"}
            dateLabel={previews[0].open.dateLabel}
            timeLabel={previews[0].open.timeLabel}
            reservationUrl={
              useRuleReservationActions ? getRuleReservationUrl(previews[0].rule) : undefined
            }
            reservationUnavailableText={
              useRuleReservationActions && !getRuleReservationUrl(previews[0].rule)
                ? "아직 다음 예약 링크가 열리지 않았습니다."
                : undefined
            }
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: previews[0].badge,
              start: previews[0].open.instant,
              address: court.basic_address,
            })}
            courtId={court.id}
            courtName={court.basic_court_name}
            compact
          />
        ) : null}
      </div>
    ) : null;

  return (
    <MobileScrollHideBar>
      <div className="border-t border-[#2C2C2C] bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {previewBlocks ? (
        <div className="bg-[#000000] px-4 pt-3">
          {previewBlocks}
        </div>
      ) : null}
      {!useRuleReservationActions ? (
      <div className="px-4 pt-3">
        {isPhoneReservation && phoneHref ? (
          <a
            href={phoneHref}
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C8B56] py-3.5 text-sm font-medium text-white hover:bg-[#53A978] transition"
          >
            <PhoneCallIcon className="h-4 w-4" />
            전화하기
          </a>
        ) : isPhoneReservation ? (
          <span className="flex w-full items-center justify-center rounded-xl bg-[#2C2C2C] py-3.5 text-sm text-[#6B7280]">
            전화번호 없음
          </span>
        ) : court.booking_site_link ? (
          <a
            href={reservationHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex w-full items-center justify-center rounded-xl bg-[#2C8B56] py-3.5 text-sm font-medium text-white hover:bg-[#53A978] transition"
          >
            예약하러가기
          </a>
        ) : (
          <span className="flex w-full items-center justify-center rounded-xl bg-[#2C2C2C] py-3.5 text-sm text-[#6B7280]">
            예약 링크 없음
          </span>
        )}
      </div>
      ) : null}
      </div>
    </MobileScrollHideBar>
  );
}
