import type { Court } from "../types";
import {
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
} from "@/lib/nextBookingOpen";
import {
  bookingOpenLabelTextClass,
  type BookingOpenLabelTone,
} from "./detailLayoutStyles";
import type { CalendarAndroidEventPayload } from "./calendarAndroidPayload";
import { CalendarRegisterButton } from "./CalendarRegisterButton";

const DEFAULT_CAL_DURATION_MIN = 10;

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
  dateLabel,
  timeLabel,
  calendarLinks,
  compact = false,
}: {
  badge: string;
  badgeTone: BookingOpenLabelTone;
  dateLabel: string;
  timeLabel: string;
  calendarLinks?: { ics: string; google: string; androidEvent: CalendarAndroidEventPayload };
  compact?: boolean;
}) {
  const badgeTextClass = bookingOpenLabelTextClass[badgeTone];

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
            다음 예약 오픈 일
          </span>
        </div>
        {calendarLinks ? (
          <CalendarRegisterButton
            icsPath={calendarLinks.ics}
            googleCalendarUrl={calendarLinks.google}
            androidEvent={calendarLinks.androidEvent}
            compact={compact}
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
    </div>
  );
}

/** PC 우측 사이드: 다음 오픈 일 + 예약 CTA */
export function CourtDetailAside({ court }: { court: Court }) {
  const ownerOpen = getNextOwnerBookingOpen(court);
  const normalOpen = getNextNormalBookingOpen(court);
  const priorityLabel = getPriorityBookingLabel(court);

  return (
    <div className="sticky top-[calc(73px+0.75rem)] z-20 w-full min-w-0">
      <aside className="flex flex-col gap-4 w-full">
        {ownerOpen && priorityLabel ? (
          <NextOpenPreviewCard
            badge={priorityLabel}
            badgeTone="priority"
            dateLabel={ownerOpen.dateLabel}
            timeLabel={ownerOpen.timeLabel}
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: priorityLabel,
              start: ownerOpen.instant,
              address: court.basic_address,
            })}
          />
        ) : null}

        {normalOpen ? (
          <NextOpenPreviewCard
            badge="일반"
            badgeTone="general"
            dateLabel={normalOpen.dateLabel}
            timeLabel={normalOpen.timeLabel}
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: "일반",
              start: normalOpen.instant,
              address: court.basic_address,
            })}
          />
        ) : null}

        {court.booking_site_link ? (
          <a
            href={court.booking_site_link}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex w-full items-center justify-center rounded-xl bg-[#4ADE80] px-5 py-3.5 text-center text-sm font-semibold text-black hover:bg-[#3fcf6f] transition"
          >
            예약하러가기
          </a>
        ) : (
          <span className="flex w-full items-center justify-center rounded-xl bg-[#2C2C2C] px-5 py-3.5 text-center text-sm text-[#6B7280]">
            예약 링크 없음
          </span>
        )}
      </aside>
    </div>
  );
}

/** 모바일 하단 고정: 다음 오픈 + 예약 CTA */
export function CourtDetailMobileBookBar({ court }: { court: Court }) {
  const ownerOpen = getNextOwnerBookingOpen(court);
  const normalOpen = getNextNormalBookingOpen(court);
  const priorityLabel = getPriorityBookingLabel(court);
  const hasPriorityPreview = Boolean(ownerOpen && priorityLabel);
  const hasNormalPreview = Boolean(normalOpen);
  const hasBothPreview = hasPriorityPreview && hasNormalPreview;

  const previewBlocks =
    hasPriorityPreview || hasNormalPreview ? (
      <div className={hasBothPreview ? "" : "space-y-3"}>
        {hasBothPreview ? (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {ownerOpen && priorityLabel ? (
              <div className="w-[86%] min-w-[86%] snap-start">
                <NextOpenPreviewCard
                  badge={priorityLabel}
                  badgeTone="priority"
                  dateLabel={ownerOpen.dateLabel}
                  timeLabel={ownerOpen.timeLabel}
                  calendarLinks={buildCalendarLinks({
                    courtName: court.basic_court_name ?? "테니스장",
                    badge: priorityLabel,
                    start: ownerOpen.instant,
                    address: court.basic_address,
                  })}
                  compact
                />
              </div>
            ) : null}
            {normalOpen ? (
              <div className="w-[86%] min-w-[86%] snap-start">
                <NextOpenPreviewCard
                  badge="일반"
                  badgeTone="general"
                  dateLabel={normalOpen.dateLabel}
                  timeLabel={normalOpen.timeLabel}
                  calendarLinks={buildCalendarLinks({
                    courtName: court.basic_court_name ?? "테니스장",
                    badge: "일반",
                    start: normalOpen.instant,
                    address: court.basic_address,
                  })}
                  compact
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {!hasBothPreview && ownerOpen && priorityLabel ? (
          <NextOpenPreviewCard
            badge={priorityLabel}
            badgeTone="priority"
            dateLabel={ownerOpen.dateLabel}
            timeLabel={ownerOpen.timeLabel}
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: priorityLabel,
              start: ownerOpen.instant,
              address: court.basic_address,
            })}
            compact
          />
        ) : null}
        {!hasBothPreview && normalOpen ? (
          <NextOpenPreviewCard
            badge="일반"
            badgeTone="general"
            dateLabel={normalOpen.dateLabel}
            timeLabel={normalOpen.timeLabel}
            calendarLinks={buildCalendarLinks({
              courtName: court.basic_court_name ?? "테니스장",
              badge: "일반",
              start: normalOpen.instant,
              address: court.basic_address,
            })}
            compact
          />
        ) : null}
      </div>
    ) : null;

  return (
    <div className="min-[1032px]:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-[#2C2C2C] bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {previewBlocks ? (
        <div className="rounded-t-2xl bg-[#000000] px-4 pt-3 border-x border-t border-[#2C2C2C] border-b-0">
          {previewBlocks}
        </div>
      ) : null}
      <div className="px-4 pt-3">
        {court.booking_site_link ? (
          <a
            href={court.booking_site_link}
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
    </div>
  );
}
