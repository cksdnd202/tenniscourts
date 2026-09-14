import Link from "next/link";
import type { Court, CourtBookingRule } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
import { formatTime } from "./styles";
import { HorizontalScrollArea } from "./detail/HorizontalScrollArea";
import { type BookingOpenLabelTone } from "./detail/detailLayoutStyles";
import { getBookingRuleTargetText, getBookingRuleDisplayContext } from "@/lib/bookingRuleDisplay";

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

export function hasActiveBookingRules(court: Court) {
  return sortActiveBookingRules(court.court_booking_rules).length > 0;
}

export function formatBookingRuleEligibility(value: string | null | undefined) {
  const map: Record<string, string> = {
    resident: "구민",
    citizen: "시민",
    inhabitant: "주민",
    non_resident: "타지역",
    normal: "전체",
    none: "없음",
  };
  const key = value?.trim();
  return key ? map[key] ?? key : "전체";
}

function getBookingRuleLabelTone(value: string | null | undefined): BookingOpenLabelTone {
  const key = value?.trim();
  if (key === "citizen" || key === "resident" || key === "inhabitant" || key === "none") {
    return key;
  }
  return key === "normal" || !key ? "normal" : "priority";
}

function formatRuleWeekOfMonth(value: number | null | undefined) {
  if (value == null) return "";
  if (value === -1) return "마지막주";
  const map: Record<number, string> = {
    1: "첫째주",
    2: "둘째주",
    3: "셋째주",
    4: "넷째주",
    5: "다섯째주",
  };
  return map[value] ?? `${value}주차`;
}

function formatRuleDaySchedule(value: number | null | undefined) {
  if (value == null) return "";
  if (value === -1) return "말일";
  return `${value}일`;
}

function formatRuleOrdinal(value: number | null | undefined) {
  if (value == null) return "";
  if (value === -1) return "마지막";
  if (value === -2) return "첫번째 영업일";
  const map: Record<number, string> = {
    1: "첫번째",
    2: "두번째",
    3: "세번째",
    4: "네번째",
    5: "다섯번째",
  };
  return map[value] ?? `${value}번째`;
}

function formatRuleWeekday(value: number | null | undefined) {
  if (value == null) return "";
  const map: Record<number, string> = {
    0: "일요일",
    1: "월요일",
    2: "화요일",
    3: "수요일",
    4: "목요일",
    5: "금요일",
    6: "토요일",
    7: "일요일",
  };
  return map[value] ?? "";
}

function appendOpenDateAdjustment(text: string, rule: CourtBookingRule) {
  return rule.open_date_adjustment === "next_weekday" ? `${text} (주말이면 다음 평일)` : text;
}

export function formatBookingRuleCardText(rule: CourtBookingRule) {
  if (rule.rule_type === "phone") return "전화 예약";
  if (rule.rule_type === "on_site") return "현장 예약";
  if (rule.rule_type === "irregular") return "비정기 예약";
  if (rule.rule_type === "checking") return "예약 정보 확인 중";

  if (rule.rule_type === "rolling") {
    const time = formatTime(rule.open_time);
    const offset = rule.open_offset?.trim();
    return `매일 ${time ? `${time}, ` : ""}${offset ? `+${offset}일 ` : ""}예약 오픈`.trim();
  }

  if (rule.rule_type === "interval_weekly") {
    const interval = rule.interval_weeks && rule.interval_weeks > 1 ? `${rule.interval_weeks}주마다` : "매주";
    const weekday = formatRuleWeekday(rule.open_day_of_week);
    const time = formatTime(rule.open_time);
    const offset = rule.open_offset?.trim();
    return `${[interval, weekday, time].filter(Boolean).join(" ")}${offset ? `, ${offset}` : ""} 예약 오픈`.trim();
  }

  if (rule.rule_type === "monthly_relative") {
    const daysBefore = rule.open_offset?.trim();
    const time = formatTime(rule.open_time);
    return `다음 달 ${daysBefore ? `${daysBefore}일 전` : "이전"}${time ? `, ${time}` : ""} 예약 오픈`;
  }

  if (rule.rule_type === "lottery" && rule.lottery_desc?.trim()) {
    return rule.lottery_desc.trim();
  }

  const time = formatTime(rule.open_time);
  const offset = rule.open_offset?.trim();

  if (rule.rule_type === "ordinal") {
    const ordinal = formatRuleOrdinal(rule.open_ordinal);
    const weekday = formatRuleWeekday(rule.open_day_of_week);
    const prefix = [ordinal, weekday].filter(Boolean).join(" ");
    return appendOpenDateAdjustment(
      `${[prefix, time].filter(Boolean).join(" ")}${offset ? `, ${offset}` : ""} 예약 오픈`.trim(),
      rule
    );
  }

  if (rule.open_type === "week") {
    const week = formatRuleWeekOfMonth(rule.open_day_of_month);
    const weekday = formatRuleWeekday(rule.open_day_of_week);
    const prefix = [week, weekday].filter(Boolean).join(" ");
    return appendOpenDateAdjustment(
      `${[prefix, time].filter(Boolean).join(" ")}${offset ? `, ${offset}` : ""} 예약 오픈`.trim(),
      rule
    );
  }

  const day = formatRuleDaySchedule(rule.open_day_of_month);
  return appendOpenDateAdjustment(
    `${[day, time].filter(Boolean).join(" ")}${offset ? `, ${offset}` : ""} 예약 오픈`.trim(),
    rule
  );
}

export function BookingRulesCompactContent({ court }: { court: Court }) {
  const rules = sortActiveBookingRules(court.court_booking_rules);
  const visibleRules = rules.slice(0, 2);
  const hiddenCount = Math.max(rules.length - visibleRules.length, 0);
  const detailHref = getCourtDetailPath(court);

  if (rules.length === 0) return null;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-[#a7a7a7]">예약 오픈 정보 {rules.length}개</p>
      {visibleRules.map((rule) => (
        <div key={rule.id} className="flex min-w-0 items-baseline gap-2">
          <span className="max-w-full shrink-0 break-keep text-sm font-bold text-[#6FCF97]">
            {getBookingRuleTargetText(rule)} :
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-white">
            {formatBookingRuleCardText(rule)}
          </span>
        </div>
      ))}
      {hiddenCount > 0 ? (
        <Link
          href={detailHref}
          className="w-fit text-xs font-semibold text-[#a7a7a7] underline decoration-[#5f5f5f] underline-offset-4 transition-colors hover:text-white"
        >
          +{hiddenCount} 상세페이지에서 확인
        </Link>
      ) : null}
    </div>
  );
}

export function BookingRulesDetailBlock({ court }: { court: Court }) {
  const rules = sortActiveBookingRules(court.court_booking_rules);
  if (!rules.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-white">예약 오픈 정보</h2>
      <HorizontalScrollArea className="flex snap-x snap-proximity items-stretch gap-3 overflow-x-auto pb-2">
        {rules.map((rule) => (
          <div key={rule.id} className={`flex min-w-0 snap-start flex-col gap-5 rounded-xl border border-[#35383D] bg-[#111214] px-5 py-5 ${rules.length === 1 ? "w-full" : "w-[280px] max-w-[85%] shrink-0 sm:max-w-none sm:flex-[1_0_280px]"}`}>
            <div className="min-w-0">
              <p className={getBookingRuleLabelTone(rule.eligibility) === "normal" ? "break-keep text-base font-semibold text-white" : "break-keep text-base font-semibold text-[#6FCF97]"}>
                {getBookingRuleTargetText(rule)}
              </p>
              {getBookingRuleDisplayContext(rule).length > 0 ? (
                <p className="mt-2 break-keep text-sm leading-relaxed text-[#A7A7A7]">{getBookingRuleDisplayContext(rule).join(" · ")}</p>
              ) : null}
            </div>
            <p className="mt-auto break-keep text-base font-bold leading-relaxed text-white">{formatBookingRuleCardText(rule)}</p>
          </div>
        ))}
      </HorizontalScrollArea>
    </div>
  );
}
