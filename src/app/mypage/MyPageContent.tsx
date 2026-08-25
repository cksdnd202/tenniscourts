"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getCourtDetailPath } from "@/lib/courtPath";
import {
  getNextBookingRuleOpen,
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
  type NextOpenResult,
} from "@/lib/nextBookingOpen";
import type { Court, CourtBookingRule } from "../types";
import { CheckingContent } from "../CheckingContent";
import { FixedScheduleContent } from "../FixedScheduleContent";
import { IrregularContent } from "../IrregularContent";
import { LotteryContent } from "../LotteryContent";
import { OnSiteContent } from "../OnSiteContent";
import { OrdinalContent } from "../ordinal";
import { PhoneContent } from "../PhoneContent";
import { RollingContent } from "../RollingContent";
import { formatBookingRuleEligibility, hasActiveBookingRules } from "../BookingRulesContent";

type MyPageTab = "favorites" | "recent" | "profile";
type FavoriteViewMode = "card" | "date" | "calendar";
type CalendarEvent = {
  courtId: string;
  href: string;
  courtName: string;
  badge: string;
  timeLabel: string;
};
type FavoriteOpenItem = {
  key: string;
  badge: string;
  open: NextOpenResult;
};
type FavoriteOpenGroup = {
  title: string;
  items: FavoriteOpenItem[];
};
type CalendarDay = {
  date: Date;
  dayNumber: number;
  key: string;
  isCurrentMonth: boolean;
};
type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  home_region?: string | null;
  home_city?: string | null;
};

const menuItems: Array<{ id: MyPageTab; label: string }> = [
  { id: "favorites", label: "찜한 테니스장" },
  { id: "recent", label: "최근 본 테니스장" },
  { id: "profile", label: "내 프로필" },
];

const courtCardClass =
  "grid min-h-[380px] content-start overflow-hidden rounded-xl border border-transparent bg-[#191B1E] p-5 gap-2 min-w-0 transition duration-300 ease-in-out hover:-translate-y-1 hover:bg-[#2C2C2C]";
const favoriteViewTabs: Array<{ id: FavoriteViewMode; label: string }> = [
  { id: "card", label: "카드형" },
  { id: "date", label: "날짜형" },
  { id: "calendar", label: "캘린더형" },
];
const calendarWeekdays = ["일", "월", "화", "수", "목", "금", "토"];
const favoriteBadgeColorClass: Record<string, string> = {
  전체: "text-[#3896FB]",
  구민: "text-[#FD844C]",
  시민: "text-[#FD844C]",
  주민: "text-[#FD844C]",
};
const regionCityOptions: Record<string, string[]> = {
  서울: [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구",
    "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구",
    "용산구", "은평구", "종로구", "중구", "중랑구",
  ],
  부산: [
    "강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구",
    "서구", "수영구", "연제구", "영도구", "중구", "해운대구",
  ],
  대구: ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  인천: ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  광주: ["광산구", "남구", "동구", "북구", "서구"],
  대전: ["대덕구", "동구", "서구", "유성구", "중구"],
  울산: ["남구", "동구", "북구", "울주군", "중구"],
  세종: ["세종시"],
  경기: [
    "가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시",
    "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시",
    "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시",
    "화성시",
  ],
  강원: [
    "강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군",
    "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군",
  ],
  충북: [
    "괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시",
    "충주시",
  ],
  충남: [
    "계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시",
    "예산군", "천안시", "청양군", "태안군", "홍성군",
  ],
  전북: [
    "고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군",
    "장수군", "전주시", "정읍시", "진안군",
  ],
  전남: [
    "강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군",
    "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군",
    "해남군", "화순군",
  ],
  경북: [
    "경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시",
    "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군",
    "칠곡군", "포항시",
  ],
  경남: [
    "거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군",
    "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군",
  ],
  제주: ["서귀포시", "제주시"],
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProfileImageUrl(user: User | null) {
  const metadata = user?.user_metadata ?? {};
  return (
    metadata.avatar_url ??
    metadata.picture ??
    metadata.profile_image_url ??
    metadata.provider_avatar_url ??
    null
  );
}

function getNickname(user: User | null) {
  const metadata = user?.user_metadata ?? {};
  return metadata.name ?? metadata.full_name ?? metadata.nickname ?? "이름 없음";
}

function getProvider(user: User | null) {
  return user?.app_metadata?.provider === "kakao" ? "카카오" : (user?.app_metadata?.provider ?? "-");
}

function renderCourtContent(court: Court) {
  if (hasActiveBookingRules(court)) {
    return <FixedScheduleContent court={court} />;
  }

  switch (court.booking_rule_type) {
    case "rolling":
      return <RollingContent court={court} />;
    case "ordinal":
      return <OrdinalContent court={court} />;
    case "lottery":
      return <LotteryContent court={court} />;
    case "phone":
      return <PhoneContent court={court} />;
    case "on_site":
      return <OnSiteContent court={court} />;
    case "irregular":
      return <IrregularContent court={court} />;
    case "checking":
      return <CheckingContent court={court} />;
    case "fixed_schedule":
    default:
      return <FixedScheduleContent court={court} />;
  }
}

function sortActiveBookingRules(rules: CourtBookingRule[] | null | undefined) {
  return (rules ?? [])
    .filter((rule) => rule.is_active)
    .slice()
    .sort((a, b) => {
      const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.label ?? "").localeCompare(b.label ?? "", "ko");
    });
}

function getNextFavoriteOpens(court: Court): FavoriteOpenItem[] {
  const activeRules = sortActiveBookingRules(court.court_booking_rules);

  if (activeRules.length > 0) {
    return activeRules
      .map((rule) => {
        const open = getNextBookingRuleOpen(court, rule);

        return open
          ? {
              key: rule.id,
              badge: formatBookingRuleEligibility(rule.eligibility),
              open,
            }
          : null;
      })
      .filter((item): item is { key: string; badge: string; open: NextOpenResult } =>
        Boolean(item)
      )
      .sort((a, b) => a.open.instant.getTime() - b.open.instant.getTime());
  }

  const priorityLabel = getPriorityBookingLabel(court);
  const ownerOpen = priorityLabel ? getNextOwnerBookingOpen(court) : null;
  const normalOpen = getNextNormalBookingOpen(court);
  const candidates = [
    ownerOpen && priorityLabel ? { key: "priority", badge: priorityLabel, open: ownerOpen } : null,
    normalOpen ? { key: "normal", badge: "전체", open: normalOpen } : null,
  ].filter((item): item is { key: string; badge: string; open: NextOpenResult } =>
    Boolean(item)
  );

  return candidates.sort((a, b) => a.open.instant.getTime() - b.open.instant.getTime());
}

function groupFavoriteOpens(items: FavoriteOpenItem[]): FavoriteOpenGroup[] {
  if (items.length === 0) return [];

  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.badge] = (acc[item.badge] ?? 0) + 1;
    return acc;
  }, {});
  const hasRepeatedBadge = Object.values(counts).some((count) => count > 1);

  if (hasRepeatedBadge) {
    const seenByBadge: Record<string, number> = {};
    const groups = new Map<number, FavoriteOpenItem[]>();

    for (const item of items) {
      const phase = (seenByBadge[item.badge] ?? 0) + 1;
      seenByBadge[item.badge] = phase;

      const current = groups.get(phase) ?? [];
      current.push(item);
      groups.set(phase, current);
    }

    return Array.from(groups.entries()).map(([phase, groupItems]) => ({
      title: `${phase}차 예약`,
      items: groupItems,
    }));
  }

  if (items.length > 1) {
    const priorityItems = items.filter((item) => item.badge !== "전체");
    const normalItems = items.filter((item) => item.badge === "전체");
    const groups: FavoriteOpenGroup[] = [];

    if (priorityItems.length > 0) groups.push({ title: "우선 예약", items: priorityItems });
    if (normalItems.length > 0) groups.push({ title: "전체 예약", items: normalItems });

    return groups;
  }

  return [{ title: items[0]?.badge === "전체" ? "전체 예약" : "우선 예약", items }];
}

function getCalendarMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatCalendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCalendarMonthTitle(monthStart: Date) {
  return `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`;
}

function formatCalendarDayTitle(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getMonthCalendarDays(monthStart: Date): CalendarDay[] {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date,
      dayNumber: date.getDate(),
      key: formatCalendarDateKey(date),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
    };
  });
}

function getCalendarEventMap(courts: Court[], monthStarts: Date[]) {
  const allowedMonths = new Set(
    monthStarts.map((monthStart) => `${monthStart.getFullYear()}-${monthStart.getMonth()}`)
  );
  const eventMap = new Map<string, CalendarEvent[]>();

  courts.forEach((court) => {
    getNextFavoriteOpens(court).forEach((nextOpen) => {
      const openDate = nextOpen.open.instant;
      const monthKey = `${openDate.getFullYear()}-${openDate.getMonth()}`;
      if (!allowedMonths.has(monthKey)) return;

      const dateKey = formatCalendarDateKey(openDate);
      const events = eventMap.get(dateKey) ?? [];
      events.push({
        courtId: `${court.id}-${nextOpen.key}`,
        href: getCourtDetailPath(court),
        courtName: court.basic_court_name ?? "(이름 없음)",
        badge: nextOpen.badge,
        timeLabel: nextOpen.open.timeLabel,
      });
      eventMap.set(dateKey, events);
    });
  });

  eventMap.forEach((events) => {
    events.sort((a, b) => {
      if (a.timeLabel !== b.timeLabel) return a.timeLabel.localeCompare(b.timeLabel);
      return a.courtName.localeCompare(b.courtName, "ko-KR");
    });
  });

  return eventMap;
}

function FavoriteDateList({ courts }: { courts: Court[] }) {
  return (
    <ul className="divide-y divide-[#2C2C2C] overflow-hidden rounded-xl border border-[#2C2C2C] bg-[#191B1E]">
      {courts.map((court) => {
        const nextOpenGroups = groupFavoriteOpens(getNextFavoriteOpens(court));

        return (
          <li key={court.id}>
            <Link
              href={getCourtDetailPath(court)}
              className="block px-5 py-5 transition-colors hover:bg-[#202326]"
            >
              <div className="flex min-w-0 items-start justify-between gap-4">
                <p className="truncate text-lg font-semibold text-white">
                  {court.basic_court_name ?? "(이름 없음)"}
                </p>
                <p className="shrink-0 text-right text-sm text-[#8A8F98]">
                  {[court.basic_region, court.basic_city].filter(Boolean).join(" ") || "지역 정보 없음"}
                </p>
              </div>

              {nextOpenGroups.length > 0 ? (
                <div className="mt-4 grid gap-3 min-[900px]:grid-cols-2">
                  {nextOpenGroups.map((group) => (
                    <div
                      key={group.title}
                      className="rounded-lg border border-[#2C2C2C] bg-[#111214] px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                        <p className="text-sm font-semibold text-white">{group.title}</p>
                        <span className="shrink-0 text-xs font-medium text-[#8A8F98]">
                          {group.items.length}개
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {group.items.map((nextOpen) => (
                          <div key={nextOpen.key} className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 rounded-md bg-[#0D0D0F] px-2.5 py-1 text-xs font-semibold ${
                                favoriteBadgeColorClass[nextOpen.badge] ?? "text-[#6FCF97]"
                              }`}
                            >
                              {nextOpen.badge}
                            </span>
                            <span className="min-w-0 truncate text-sm font-semibold text-[#6FCF97]">
                              {nextOpen.open.dateLabel} {nextOpen.open.timeLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <span className="text-sm text-[#8A8F98]">다음 예약 오픈일 확인중</span>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FavoriteCalendarMonth({
  monthStart,
  eventMap,
  mobileNavLabel,
  onMobileNavClick,
  mobileNavPosition = "right",
  onMobileDayClick,
}: {
  monthStart: Date;
  eventMap: Map<string, CalendarEvent[]>;
  mobileNavLabel?: string;
  onMobileNavClick?: () => void;
  mobileNavPosition?: "left" | "right";
  onMobileDayClick?: (date: Date, events: CalendarEvent[]) => void;
}) {
  const days = getMonthCalendarDays(monthStart);
  const mobileNavButton =
    mobileNavLabel && onMobileNavClick ? (
      <button
        type="button"
        onClick={onMobileNavClick}
        className="text-sm font-semibold text-[#8A8F98] transition-colors hover:text-white min-[1032px]:hidden"
      >
        {mobileNavLabel}
      </button>
    ) : null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        {mobileNavPosition === "left" ? mobileNavButton : null}
        <h3 className="text-2xl font-bold text-white">{formatCalendarMonthTitle(monthStart)}</h3>
        {mobileNavPosition === "right" ? mobileNavButton : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#2C2C2C] bg-[#191B1E]">
        <div className="grid grid-cols-7 border-b border-[#2C2C2C] bg-[#111214]">
          {calendarWeekdays.map((weekday) => (
            <div key={weekday} className="px-2 py-3 text-center text-sm font-bold text-[#B0B0B0]">
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const events = eventMap.get(day.key) ?? [];
            const desktopVisibleEvents = events.length > 3 ? events.slice(0, 2) : events.slice(0, 3);
            const hiddenEventCount = events.length > 3 ? events.length - 2 : 0;

            return (
              <div
                key={day.key}
                onClick={() => {
                  if (events.length === 0 || window.innerWidth >= 1032) return;
                  onMobileDayClick?.(day.date, events);
                }}
                className={`min-h-[76px] border-r border-b border-[#2C2C2C] p-2 last:border-r-0 min-[1032px]:min-h-[118px] ${
                  day.isCurrentMonth ? "bg-[#191B1E]" : "bg-[#141517]"
                } ${events.length > 0 ? "cursor-pointer min-[1032px]:cursor-default" : ""}`}
              >
                <div
                  className={`mb-2 text-right text-sm font-bold ${
                    day.isCurrentMonth ? "text-[#D8D8D8]" : "text-[#5F6368]"
                  }`}
                >
                  {day.dayNumber}
                </div>
                <div className="space-y-1">
                  {events.length > 0 ? (
                    <div
                      className="block w-full rounded bg-[#6FCF97]/15 px-2 py-1 text-left text-xs font-semibold text-[#6FCF97] min-[1032px]:hidden"
                    >
                      {events.length}개
                    </div>
                  ) : null}
                  <div className="hidden space-y-1 min-[1032px]:block">
                  {desktopVisibleEvents.map((event) => (
                    <Link
                      key={`${event.courtId}-${event.badge}`}
                      href={event.href}
                      title={`${event.badge} ${event.courtName} ${event.timeLabel}`}
                      className="flex min-w-0 items-center justify-between gap-1 rounded bg-[#6FCF97]/15 px-2 py-1 text-xs font-semibold text-[#6FCF97] hover:bg-[#6FCF97]/25"
                    >
                      <span className="min-w-0 truncate">{event.courtName}</span>
                      <span
                        className={`shrink-0 text-[10px] ${
                          favoriteBadgeColorClass[event.badge] ?? "text-[#6FCF97]"
                        }`}
                      >
                        {event.badge}
                      </span>
                    </Link>
                  ))}
                  {hiddenEventCount > 0 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMobileDayClick?.(day.date, events);
                      }}
                      className="w-full rounded bg-[#2C2C2C] px-2 py-1 text-left text-xs font-semibold text-[#8A8F98] transition-colors hover:bg-[#3C3C3C] hover:text-white"
                    >
                      +{hiddenEventCount}
                    </button>
                  ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FavoriteCalendarBottomSheet({
  date,
  events,
  onClose,
}: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 min-[1032px]:flex min-[1032px]:items-center min-[1032px]:justify-center min-[1032px]:px-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-2xl border border-[#2C2C2C] bg-[#191B1E] shadow-2xl min-[1032px]:static min-[1032px]:w-full min-[1032px]:max-w-lg min-[1032px]:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[#2C2C2C] p-5">
          <h3 className="text-lg font-bold text-white">{formatCalendarDayTitle(date)}</h3>
          <p className="mt-1 text-sm text-[#8A8F98]">예약 오픈 {events.length}개</p>
        </div>

        <ul className="mx-5 mt-5 min-h-0 flex-1 divide-y divide-[#2C2C2C] overflow-y-auto rounded-xl border border-[#2C2C2C] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {events.map((event) => (
            <li key={`${event.courtId}-${event.badge}`}>
              <Link
                href={event.href}
                onClick={onClose}
                className="block px-4 py-4 transition-colors hover:bg-[#202326]"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-base font-semibold text-white">{event.courtName}</p>
                  <span
                    className={`shrink-0 rounded-md bg-[#0D0D0F] px-2.5 py-1 text-xs font-semibold ${
                      favoriteBadgeColorClass[event.badge] ?? "text-[#6FCF97]"
                    }`}
                  >
                    {event.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#6FCF97]">{event.timeLabel}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="shrink-0 p-5 pt-12">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#2C2C2C] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3C3C3C]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function FavoriteCalendarView({ courts }: { courts: Court[] }) {
  const thisMonth = getCalendarMonthStart(new Date());
  const nextMonth = addMonths(thisMonth, 1);
  const eventMap = getCalendarEventMap(courts, [thisMonth, nextMonth]);
  const thisMonthRef = useRef<HTMLDivElement | null>(null);
  const nextMonthRef = useRef<HTMLDivElement | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{
    date: Date;
    events: CalendarEvent[];
  } | null>(null);

  const scrollToMonth = (target: HTMLDivElement | null) => {
    target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <>
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden min-[1032px]:block min-[1032px]:space-y-10 min-[1032px]:gap-0 min-[1032px]:overflow-visible min-[1032px]:pb-0">
      <div ref={thisMonthRef} className="w-full shrink-0 snap-start snap-always">
        <FavoriteCalendarMonth
          monthStart={thisMonth}
          eventMap={eventMap}
          mobileNavLabel="다음달 >"
          onMobileNavClick={() => scrollToMonth(nextMonthRef.current)}
          onMobileDayClick={(date, events) => setSelectedCalendarDay({ date, events })}
        />
      </div>
      <div ref={nextMonthRef} className="w-full shrink-0 snap-start snap-always">
        <FavoriteCalendarMonth
          monthStart={nextMonth}
          eventMap={eventMap}
          mobileNavLabel="< 이번달"
          mobileNavPosition="left"
          onMobileNavClick={() => scrollToMonth(thisMonthRef.current)}
          onMobileDayClick={(date, events) => setSelectedCalendarDay({ date, events })}
        />
      </div>
    </div>
      {selectedCalendarDay ? (
        <FavoriteCalendarBottomSheet
          date={selectedCalendarDay.date}
          events={selectedCalendarDay.events}
          onClose={() => setSelectedCalendarDay(null)}
        />
      ) : null}
    </>
  );
}

function FavoriteCourtsPanel() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("찜한 테니스장을 불러오는 중입니다.");
  const [viewMode, setViewMode] = useState<FavoriteViewMode>("card");

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteCourts() {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setCourts([]);
          setMessage("로그인하면 찜한 테니스장을 확인할 수 있습니다.");
          setIsLoading(false);
        }
        return;
      }

      const favoriteCourts = supabase.from("favorite_courts" as never) as any;
      const { data: favoriteRows, error: favoriteError } = await favoriteCourts
        .select("court_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (favoriteError) {
        if (isMounted) {
          setCourts([]);
          setMessage("찜한 테니스장을 불러오지 못했습니다.");
          setIsLoading(false);
        }
        return;
      }

      const courtIds: string[] =
        favoriteRows
          ?.map((row: { court_id?: string | null }) => row.court_id)
          .filter((courtId: string | null | undefined): courtId is string => Boolean(courtId)) ??
        [];

      if (courtIds.length === 0) {
        if (isMounted) {
          setCourts([]);
          setMessage("아직 찜한 테니스장이 없습니다.");
          setIsLoading(false);
        }
        return;
      }

      const response = await fetch("/api/courts/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: courtIds }),
      });

      if (!response.ok) {
        if (isMounted) {
          setCourts([]);
          setMessage("테니스장 정보를 불러오지 못했습니다.");
          setIsLoading(false);
        }
        return;
      }

      const body = (await response.json()) as { courts?: Court[] };
      const loadedCourts = body.courts ?? [];
      const courtById = new Map(loadedCourts.map((court) => [court.id, court]));
      const orderedCourts = courtIds
        .map((courtId) => courtById.get(courtId))
        .filter((court): court is Court => Boolean(court));

      if (isMounted) {
        setCourts(orderedCourts);
        setMessage(orderedCourts.length === 0 ? "표시할 수 있는 찜한 테니스장이 없습니다." : "");
        setIsLoading(false);
      }
    }

    loadFavoriteCourts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    capturePostHogEvent("mypage_favorites_viewed", {
      viewMode,
      favoriteCount: courts.length,
    });
  }, [courts.length, isLoading, viewMode]);

  return (
    <section>
      <div className="mb-6">
        <div className="flex items-end justify-between gap-4 border-b border-[#2C2C2C]">
          <div className="flex min-w-0 flex-1 items-end gap-8">
          {favoriteViewTabs.map((tab) => {
            const isActive = viewMode === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                  className={`relative shrink-0 px-1 pb-4 pt-2 text-xl font-bold transition-colors ${
                  isActive
                      ? "text-white after:absolute after:bottom-[-1px] after:left-0 after:h-0.5 after:w-full after:bg-white"
                      : "text-[#6F6F6F] hover:text-[#B0B0B0]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
          {courts.length > 0 ? (
            <span className="shrink-0 pb-4 text-sm text-[#8A8F98]">{courts.length}개</span>
          ) : null}
        </div>
      </div>

      {isLoading || courts.length === 0 ? (
        <div className="rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-6">
          <p className="text-sm leading-6 text-[#B0B0B0]">{message}</p>
        </div>
      ) : viewMode === "date" ? (
        <FavoriteDateList courts={courts} />
      ) : viewMode === "calendar" ? (
        <FavoriteCalendarView courts={courts} />
      ) : (
      <ul className="grid grid-cols-1 gap-4 max-[768px]:grid-cols-1 min-[769px]:max-[1275px]:grid-cols-2 min-[1276px]:sm:grid-cols-2 min-[1276px]:lg:grid-cols-3 min-[1276px]:2xl:grid-cols-4">
        {courts.map((court) => (
          <li key={court.id} className={courtCardClass}>
            {renderCourtContent(court)}
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}

function RecentCourtsPanel() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("최근 본 테니스장을 불러오는 중입니다.");

  useEffect(() => {
    let isMounted = true;

    async function loadRecentCourts() {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setCourts([]);
          setMessage("로그인하면 최근 본 테니스장을 확인할 수 있습니다.");
          setIsLoading(false);
        }
        return;
      }

      const recentViews = supabase.from("recent_viewed_courts" as never) as any;
      const { data: recentRows, error: recentError } = await recentViews
        .select("court_id, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(20);

      if (recentError) {
        if (isMounted) {
          setCourts([]);
          setMessage("최근 본 테니스장을 불러오지 못했습니다.");
          setIsLoading(false);
        }
        return;
      }

      const courtIds: string[] =
        recentRows
          ?.map((row: { court_id?: string | null }) => row.court_id)
          .filter((courtId: string | null | undefined): courtId is string => Boolean(courtId)) ??
        [];
      if (courtIds.length === 0) {
        if (isMounted) {
          setCourts([]);
          setMessage("아직 최근 본 테니스장이 없습니다.");
          setIsLoading(false);
        }
        return;
      }

      const response = await fetch("/api/courts/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: courtIds }),
      });

      if (!response.ok) {
        if (isMounted) {
          setCourts([]);
          setMessage("테니스장 정보를 불러오지 못했습니다.");
          setIsLoading(false);
        }
        return;
      }

      const body = (await response.json()) as { courts?: Court[] };
      const loadedCourts = body.courts ?? [];
      const courtById = new Map(loadedCourts.map((court) => [court.id, court]));
      const orderedCourts = courtIds
        .map((courtId) => courtById.get(courtId))
        .filter((court): court is Court => Boolean(court));

      if (isMounted) {
        setCourts(orderedCourts);
        setMessage(orderedCourts.length === 0 ? "표시할 수 있는 최근 본 테니스장이 없습니다." : "");
        setIsLoading(false);
      }
    }

    loadRecentCourts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || courts.length === 0) {
    return (
      <section className="rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-6">
        <h2 className="text-xl font-semibold">최근 본 테니스장</h2>
        <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">{message}</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">최근 본 테니스장</h2>
        <span className="text-sm text-[#8A8F98]">최대 20개</span>
      </div>
      <ul className="grid grid-cols-1 gap-4 max-[768px]:grid-cols-1 min-[769px]:max-[1275px]:grid-cols-2 min-[1276px]:sm:grid-cols-2 min-[1276px]:lg:grid-cols-3 min-[1276px]:2xl:grid-cols-4">
        {courts.map((court) => (
          <li key={court.id} className={courtCardClass}>
            {renderCourtContent(court)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfilePanel({
  user,
  profile,
  isSigningOut,
  onSignOut,
  onProfileChange,
  onDeleteAccount,
}: {
  user: User | null;
  profile: UserProfile | null;
  isSigningOut: boolean;
  onSignOut: () => void;
  onProfileChange: (profile: UserProfile) => void;
  onDeleteAccount: () => Promise<void>;
}) {
  const profileImageUrl = getProfileImageUrl(user);
  const nickname = profile?.display_name ?? getNickname(user);
  const homeRegionLabel = [profile?.home_region, profile?.home_city].filter(Boolean).join(" ") || "설정 안 됨";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRegionEditOpen, setIsRegionEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(nickname);
  const [draftRegion, setDraftRegion] = useState(profile?.home_region ?? "");
  const [draftCity, setDraftCity] = useState(profile?.home_city ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [regionMessage, setRegionMessage] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(nickname);
  }, [nickname]);

  useEffect(() => {
    setDraftRegion(profile?.home_region ?? "");
    setDraftCity(profile?.home_city ?? "");
  }, [profile?.home_region, profile?.home_city]);

  const saveDisplayName = async () => {
    const nextName = draftName.trim();

    if (!user) {
      setNameError("로그인 정보가 없습니다.");
      return;
    }

    if (nextName.length < 2) {
      setNameError("닉네임은 2자 이상 입력해주세요.");
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    const profiles = supabase.from("profiles" as never) as any;
    const { data, error } = await profiles
      .upsert(
        {
          id: user.id,
          display_name: nextName,
          avatar_url: profileImageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, display_name, avatar_url")
      .single();

    setIsSavingName(false);

    if (error) {
      setNameError("닉네임을 저장하지 못했습니다.");
      return;
    }

    onProfileChange({ ...(profile ?? {}), ...(data as UserProfile) });
    setIsEditOpen(false);
  };

  const saveHomeRegion = async () => {
    const nextRegion = draftRegion.trim();
    const nextCity = draftCity.trim();

    if (!user) {
      setRegionMessage("로그인 정보가 없습니다.");
      return;
    }

    if (!nextRegion) {
      setRegionMessage("시/도를 입력해주세요.");
      return;
    }

    setIsSavingRegion(true);
    setRegionMessage(null);

    const profiles = supabase.from("profiles" as never) as any;
    const { data, error } = await profiles
      .upsert(
        {
          id: user.id,
          display_name: nickname,
          avatar_url: profileImageUrl,
          home_region: nextRegion,
          home_city: nextCity || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, display_name, avatar_url, home_region, home_city")
      .single();

    setIsSavingRegion(false);

    if (error) {
      setRegionMessage("지역을 저장하지 못했습니다. profiles 테이블에 home_region, home_city 컬럼이 있는지 확인해주세요.");
      return;
    }

    onProfileChange(data as UserProfile);
    setRegionMessage("내 지역이 저장됐어요.");
    setIsRegionEditOpen(false);
  };

  const openRegionEdit = () => {
    setDraftRegion(profile?.home_region ?? "");
    setDraftCity(profile?.home_city ?? "");
    setRegionMessage(null);
    setIsRegionEditOpen(true);
  };

  const handleDraftRegionChange = (nextRegion: string) => {
    setDraftRegion(nextRegion);
    setDraftCity("");
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      await onDeleteAccount();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "회원 탈퇴를 처리하지 못했습니다.");
      setIsDeletingAccount(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileImageUrl}
            alt=""
            className="h-20 w-20 rounded-full bg-[#2C2C2C] object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2C2C2C] text-xl font-semibold text-[#B0B0B0]">
            {nickname.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{getNickname(user)}</h2>
          <p className="mt-1 truncate text-sm text-[#B0B0B0]">{user?.email ?? "-"}</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-[#2C2C2C] pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#8A8F98]">닉네임</dt>
          <dd className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white">
            <span className="truncate">{nickname}</span>
            <button
              type="button"
              onClick={() => {
                setDraftName(nickname);
                setNameError(null);
                setIsEditOpen(true);
              }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A8F98] hover:bg-[#2C2C2C] hover:text-white"
              aria-label="닉네임 수정"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M4 20H8.5L19 9.5C20.2 8.3 20.2 6.4 19 5.2C17.8 4 15.9 4 14.7 5.2L4 15.9V20Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 6.5L17.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#8A8F98]">가입일</dt>
          <dd className="mt-1 text-sm text-white">{formatDateTime(user?.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#8A8F98]">로그인 방식</dt>
          <dd className="mt-1 text-sm text-white">{getProvider(user)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#8A8F98]">내 지역</dt>
          <dd className="mt-1 flex min-w-0 items-center gap-2 text-sm text-white">
            <span className={homeRegionLabel === "설정 안 됨" ? "text-[#8A8F98]" : "truncate"}>
              {homeRegionLabel}
            </span>
            <button
              type="button"
              onClick={openRegionEdit}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A8F98] hover:bg-[#2C2C2C] hover:text-white"
              aria-label="내 지역 수정"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M4 20H8.5L19 9.5C20.2 8.3 20.2 6.4 19 5.2C17.8 4 15.9 4 14.7 5.2L4 15.9V20Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 6.5L17.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </dd>
        </div>
      </dl>

      {regionMessage && !isRegionEditOpen ? (
        <p className="mt-4 text-sm text-[#8A8F98]">{regionMessage}</p>
      ) : null}

      <button
        type="button"
        onClick={onSignOut}
        disabled={isSigningOut}
        className="mt-8 rounded-lg bg-[#2C2C2C] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3C3C3C] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "로그아웃 중..." : "로그아웃"}
      </button>

      <div className="mt-8 border-t border-[#2C2C2C] pt-6">
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setIsDeleteOpen(true);
          }}
          className="text-sm font-medium text-[#8A8F98] transition-colors hover:text-[#ff9b9b]"
        >
          회원 탈퇴
        </button>
      </div>

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">닉네임 수정</h3>
            <label className="mt-5 block">
              <span className="text-xs text-[#8A8F98]">닉네임</span>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#3C3C3C] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#2C8B56]"
                maxLength={24}
                autoFocus
              />
            </label>
            {nameError ? <p className="mt-3 text-sm text-[#ff9b9b]">{nameError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveDisplayName}
                disabled={isSavingName}
                className="rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingName ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isRegionEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">내 지역 수정</h3>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-xs text-[#8A8F98]">시/도</span>
                <select
                  value={draftRegion}
                  onChange={(event) => handleDraftRegionChange(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[#3C3C3C] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#2C8B56]"
                  autoFocus
                >
                  <option value="">시/도 선택</option>
                  {Object.keys(regionCityOptions).map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs text-[#8A8F98]">시/군/구</span>
                <select
                  value={draftCity}
                  onChange={(event) => setDraftCity(event.target.value)}
                  disabled={!draftRegion}
                  className="mt-2 w-full rounded-lg border border-[#3C3C3C] bg-black px-3 py-3 text-sm text-white outline-none focus:border-[#2C8B56] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">시/군/구 선택</option>
                  {(regionCityOptions[draftRegion] ?? []).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {regionMessage ? <p className="mt-3 text-sm text-[#ff9b9b]">{regionMessage}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRegionEditOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveHomeRegion}
                disabled={isSavingRegion}
                className="rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingRegion ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">탈퇴하시겠습니까?</h3>
            <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
              탈퇴하면 계정과 저장된 프로필, 찜한 테니스장, 최근 본 테니스장 정보가 삭제됩니다.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-[#ff9b9b]">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeletingAccount}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="rounded-lg bg-[#FCA5A5] px-4 py-2 text-sm font-medium text-[#3B0A0A] hover:bg-[#F87171] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingAccount ? "탈퇴 처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MyPagePanel({
  activeTab,
  user,
  profile,
  isSigningOut,
  onSignOut,
  onProfileChange,
  onDeleteAccount,
}: {
  activeTab: MyPageTab;
  user: User | null;
  profile: UserProfile | null;
  isSigningOut: boolean;
  onSignOut: () => void;
  onProfileChange: (profile: UserProfile) => void;
  onDeleteAccount: () => Promise<void>;
}) {
  if (activeTab === "recent") {
    return <RecentCourtsPanel />;
  }

  if (activeTab === "profile") {
    return (
      <ProfilePanel
        user={user}
        profile={profile}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
        onProfileChange={onProfileChange}
        onDeleteAccount={onDeleteAccount}
      />
    );
  }

  return <FavoriteCourtsPanel />;
}

export function MyPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MyPageTab>("favorites");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function ensureProfile(nextUser: User | null) {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const profiles = supabase.from("profiles" as never) as any;
    let { data: existingProfile, error: existingProfileError } = await profiles
      .select("id, display_name, avatar_url, home_region, home_city")
      .eq("id", nextUser.id)
      .maybeSingle();

    if (existingProfileError) {
      const fallback = await profiles
        .select("id, display_name, avatar_url")
        .eq("id", nextUser.id)
        .maybeSingle();
      existingProfile = fallback.data;
    }

    if (existingProfile) {
      setProfile(existingProfile as UserProfile);
      return;
    }

    const initialProfile = {
      id: nextUser.id,
      display_name: getNickname(nextUser),
      avatar_url: getProfileImageUrl(nextUser),
    };

    const { data: createdProfile, error } = await profiles
      .upsert(initialProfile, { onConflict: "id" })
      .select("id, display_name, avatar_url")
      .single();

    if (!error && createdProfile) {
      setProfile(createdProfile as UserProfile);
    } else {
      setProfile(initialProfile);
    }
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setUser(data.user);
        ensureProfile(data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      ensureProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const applyTabFromUrl = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "favorites" || tab === "recent" || tab === "profile") {
        setActiveTab(tab);
      }
    };

    const handleTabEvent = (event: Event) => {
      const tab = (event as CustomEvent<string | null>).detail;
      if (tab === "favorites" || tab === "recent" || tab === "profile") {
        setActiveTab(tab);
      }
    };

    applyTabFromUrl();
    window.addEventListener("popstate", applyTabFromUrl);
    window.addEventListener("courtskorea:mypage-tab", handleTabEvent);

    return () => {
      window.removeEventListener("popstate", applyTabFromUrl);
      window.removeEventListener("courtskorea:mypage-tab", handleTabEvent);
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("로그인 정보가 없습니다.");
    }

    const response = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "회원 탈퇴를 처리하지 못했습니다.");
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="hidden min-[1032px]:flex w-full max-w-2xs h-[calc(100vh-73px-40px)] flex-col overflow-hidden rounded-[10px] bg-[#000000] p-7.5 ml-5 mt-5">
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-3 text-left text-lg font-bold transition-colors duration-200 ${
                  isActive ? "text-white" : "text-[#7A7A7A] hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

      </aside>

      <section className="flex-1 h-full overflow-y-auto px-4 py-6 min-[1032px]:p-7.5 ml-0 min-[1032px]:ml-4">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            {menuItems.find((item) => item.id === activeTab)?.label}
          </h1>
        </div>

        <MyPagePanel
          activeTab={activeTab}
          user={user}
          profile={profile}
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
          onProfileChange={setProfile}
          onDeleteAccount={handleDeleteAccount}
        />
      </section>
    </div>
  );
}
