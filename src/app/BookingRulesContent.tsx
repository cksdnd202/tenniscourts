import Link from "next/link";
import type { Court, CourtBookingRule } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
import { formatTime } from "./styles";
import { BookingOpenCardRow } from "./detail/BookingOpenCardRow";
import { HorizontalScrollArea } from "./detail/HorizontalScrollArea";
import {
  bookingOpenLabelTextClass,
  detailCard,
  type BookingOpenLabelTone,
} from "./detail/detailLayoutStyles";

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

function isNormalEligibility(value: string | null | undefined) {
  return value === "normal";
}

const detailBookingRulesLayoutClass =
  "flex snap-x gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1032px]:grid min-[1032px]:grid-cols-2 min-[1032px]:gap-4 min-[1032px]:overflow-visible min-[1032px]:pb-0";

const detailBookingRuleCardClass =
  "w-[44%] min-w-[44%] snap-start min-[1032px]:w-auto min-[1032px]:min-w-0";

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
          <span className="shrink-0 text-sm font-bold text-[#6FCF97]">
            {formatBookingRuleEligibility(rule.eligibility)} :
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

  if (rules.length === 0) return null;

  const eligibilityCounts = rules.reduce<Record<string, number>>((counts, rule) => {
    const key = rule.eligibility?.trim() || "normal";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const hasRepeatedEligibility = Object.values(eligibilityCounts).some((count) => count > 1);

  if (hasRepeatedEligibility) {
    const seenByEligibility: Record<string, number> = {};
    const phaseGroups = new Map<number, CourtBookingRule[]>();

    for (const rule of rules) {
      const key = rule.eligibility?.trim() || "normal";
      const phase = (seenByEligibility[key] ?? 0) + 1;
      seenByEligibility[key] = phase;

      const current = phaseGroups.get(phase) ?? [];
      current.push(rule);
      phaseGroups.set(phase, current);
    }

    return (
      <HorizontalScrollArea className={detailBookingRulesLayoutClass}>
        {Array.from(phaseGroups.entries()).map(([phase, groupRules]) => (
          <BookingRulesGroupCard
            key={phase}
            title={`${phase}차 예약`}
            rules={groupRules}
          />
        ))}
      </HorizontalScrollArea>
    );
  }

  if (rules.length > 1) {
    const priorityRules = rules.filter((rule) => !isNormalEligibility(rule.eligibility));
    const normalRules = rules.filter((rule) => isNormalEligibility(rule.eligibility));

    return (
      <HorizontalScrollArea className={detailBookingRulesLayoutClass}>
        {priorityRules.length > 0 ? (
          <BookingRulesGroupCard title="우선 예약" rules={priorityRules} />
        ) : null}
        {normalRules.length > 0 ? (
          <BookingRulesGroupCard title="전체 예약" rules={normalRules} />
        ) : null}
      </HorizontalScrollArea>
    );
  }

  return (
    <HorizontalScrollArea className={detailBookingRulesLayoutClass}>
      {rules.map((rule) => (
        <div key={rule.id} className={detailBookingRuleCardClass}>
          <div className={detailCard}>
            <BookingOpenCardRow
              label={formatBookingRuleEligibility(rule.eligibility)}
              labelTone={getBookingRuleLabelTone(rule.eligibility)}
            >
              <span className="font-bold">{formatBookingRuleCardText(rule)}</span>
            </BookingOpenCardRow>
          </div>
        </div>
      ))}
    </HorizontalScrollArea>
  );
}

function BookingRulesGroupCard({
  title,
  rules,
}: {
  title: string;
  rules: CourtBookingRule[];
}) {
  return (
    <div className={`${detailBookingRuleCardClass} min-h-[124px] rounded-xl border border-[#35383D] bg-[#111214] px-4 py-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] min-[1032px]:min-h-0`}>
      <div className="flex min-h-[92px] flex-col min-[1032px]:hidden">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          {rules.length === 1 && rules[0] ? (
            <span
              className={`shrink-0 rounded-md bg-[#0D0D0F] px-2.5 py-1 text-xs font-medium leading-none ring-1 ring-white/5 ${bookingOpenLabelTextClass[getBookingRuleLabelTone(rules[0].eligibility)]}`}
            >
              {formatBookingRuleEligibility(rules[0].eligibility)}
            </span>
          ) : null}
        </div>
        <div className="mt-auto grid gap-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={rules.length > 1 ? "grid gap-2 border-t border-white/[0.1] pt-3 first:border-t-0 first:pt-0" : ""}
            >
              {rules.length > 1 ? (
                <span
                  className={`w-fit rounded-md bg-[#0D0D0F] px-2.5 py-1 text-xs font-medium leading-none ring-1 ring-white/5 ${bookingOpenLabelTextClass[getBookingRuleLabelTone(rule.eligibility)]}`}
                >
                  {formatBookingRuleEligibility(rule.eligibility)}
                </span>
              ) : null}
              <p className="text-sm font-bold leading-snug text-white break-keep">
                {formatBookingRuleCardText(rule)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden min-[1032px]:block">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.14] pb-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="grid gap-1">
          {rules.map((rule) => (
            <BookingOpenCardRow
              key={rule.id}
              label={formatBookingRuleEligibility(rule.eligibility)}
              labelTone={getBookingRuleLabelTone(rule.eligibility)}
              compact
            >
              <span className="font-bold">{formatBookingRuleCardText(rule)}</span>
            </BookingOpenCardRow>
          ))}
        </div>
      </div>
    </div>
  );
}
