import type { Court, CourtBookingRule } from "@/app/types";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";

const SITE_NAME = "Courts Korea";

/** SEO용 코트 표기명 (예: 송도 달빛공원 → 송도 달빛공원 테니스장) */
export function formatCourtDisplayName(raw: string | null | undefined): string {
  const name = raw?.trim() || "테니스코트";
  if (/테니스\s*장|테니스코트/i.test(name)) return name;
  return `${name} 테니스장`;
}

function formatTimeForSeo(timeString: string | null | undefined): string {
  if (!timeString?.trim()) return "";
  const [hRaw, mRaw] = timeString.trim().split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (!Number.isFinite(h)) return "";
  if (m === 0) return `${h}시`;
  return `${h}시 ${m}분`;
}

const formatWeekOfMonth = (week: number | string | null | undefined): string => {
  if (week == null) return "";
  if (Number(week) === -1) return "마지막주";
  const weekMap: Record<number, string> = {
    1: "첫째주",
    2: "둘째주",
    3: "셋째주",
    4: "넷째주",
    5: "다섯째주",
  };
  return weekMap[Number(week)] ?? "";
};

const formatDayOfWeek = (day: number | null | undefined): string => {
  if (day == null) return "";
  const dayMap: Record<number, string> = {
    1: "월요일",
    2: "화요일",
    3: "수요일",
    4: "목요일",
    5: "금요일",
    6: "토요일",
    7: "일요일",
  };
  return dayMap[day] || "";
};

function formatEligibilityForSeo(value: string | null | undefined): string {
  switch (value) {
    case "resident":
      return "구민";
    case "citizen":
      return "시민";
    case "inhabitant":
      return "주민";
    case "normal":
      return "전체";
    default:
      return getPriorityEligibilityLabel(value) || "전체";
  }
}

function bookingRuleTargetLabel(rule: CourtBookingRule): string {
  const offset = rule.open_offset?.trim();
  if (offset === "당월" || offset === "해당월") return "당월";
  if (offset) return offset.replace(/\s*예약\s*$/u, "").trim() || offset;
  return "다음 달";
}

function buildBookingRuleReservationSentence(rule: CourtBookingRule): string | null {
  const label = formatEligibilityForSeo(rule.eligibility);
  const time = formatTimeForSeo(rule.open_time);
  const targetLabel = bookingRuleTargetLabel(rule);

  if (rule.rule_type === "lottery") {
    return rule.lottery_desc?.trim()
      ? `${label} 예약은 ${rule.lottery_desc.trim()} 방식으로 진행됩니다.`
      : `${label} 예약은 추첨 방식으로 진행됩니다.`;
  }

  if (rule.rule_type === "rolling") {
    if (!time) return `${label} 예약은 매일 새 예약이 오픈됩니다.`;
    return `${label} 예약은 매일 ${time}에 새 예약이 오픈됩니다.`;
  }

  if (rule.rule_type === "fixed_schedule" || rule.rule_type === "ordinal") {
    if (rule.open_type === "week") {
      const ordinal = rule.rule_type === "ordinal" ? rule.open_ordinal : rule.open_day_of_month;
      return `${label} 예약은 ${buildWeekOpenPhrase(
        ordinal,
        rule.open_day_of_week,
        time,
        targetLabel
      )}`;
    }

    return `${label} 예약은 ${buildDayOpenPhrase(rule.open_day_of_month, time, targetLabel)}`;
  }

  return null;
}

function buildBookingRulesSummary(court: Court): string | null {
  const rules = (court.court_booking_rules ?? [])
    .filter((rule) => rule.is_active)
    .sort((a, b) => {
      const sortOrderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (sortOrderDiff !== 0) return sortOrderDiff;
      return (a.label ?? "").localeCompare(b.label ?? "");
    });

  const sentences = rules
    .map(buildBookingRuleReservationSentence)
    .filter((sentence): sentence is string => Boolean(sentence))
    .slice(0, 3);

  return sentences.length > 0 ? sentences.join(" ") : null;
}

function bookingTargetLabel(court: Court, forNormal: boolean): string {
  if (forNormal) {
    if (court.booking_normal_iscurrentmonth === true) return "당월";
    const offset = court.booking_open_offset?.trim();
    if (offset) return offset.replace(/\s*예약\s*$/u, "").trim() || offset;
    return "다음 달";
  }
  const offset = court.booking_open_offset?.trim();
  if (offset) return offset.replace(/\s*예약\s*$/u, "").trim() || offset;
  return "해당";
}

function buildDayOpenPhrase(
  day: number | null | undefined,
  time: string,
  targetLabel: string
): string {
  const dayPart = day != null ? `매월 ${day}일` : "매월 정해진 날";
  const timePart = time ? ` ${time}` : "";
  return `${dayPart}${timePart}에 ${targetLabel} 예약이 오픈됩니다.`;
}

function buildWeekOpenPhrase(
  weekOrdinal: number | string | null | undefined,
  weekday: number | null | undefined,
  time: string,
  targetLabel: string
): string {
  const month = formatWeekOfMonth(weekOrdinal);
  const week = formatDayOfWeek(weekday);
  const schedule = [month, week, time].filter(Boolean).join(" ");
  if (!schedule) return `${targetLabel} 예약이 오픈됩니다.`;
  return `${schedule}에 ${targetLabel} 예약이 오픈됩니다.`;
}

function buildOwnerReservationSentence(court: Court): string | null {
  const label = getPriorityEligibilityLabel(court.booking_eligibility_first);
  if (!label || !court.booking_open_time_owner?.trim()) return null;

  const time = formatTimeForSeo(court.booking_open_time_owner);
  const targetLabel = bookingTargetLabel(court, false);
  const rt = court.booking_rule_type;

  if (rt === "rolling") {
    return `${label} 예약은 매일 ${time}에 새 예약이 오픈됩니다.`;
  }

  if (rt === "fixed_schedule" || rt === "ordinal") {
    if (court.booking_open_type === "day") {
      return `${label} 예약은 ${buildDayOpenPhrase(court.booking_open_day_owner, time, targetLabel)}`;
    }
    if (court.booking_open_type === "week") {
      const ordinal =
        rt === "ordinal" ? court.booking_open_ordinal : court.booking_open_day_of_month;
      return `${label} 예약은 ${buildWeekOpenPhrase(
        ordinal,
        court.booking_open_day_of_week,
        time,
        targetLabel
      )}`;
    }
    return `${label} 예약은 ${buildDayOpenPhrase(court.booking_open_day_owner, time, targetLabel)}`;
  }

  return null;
}

function buildNormalReservationSentence(court: Court): string | null {
  if (!court.booking_open_time_normal?.trim()) return null;

  const time = formatTimeForSeo(court.booking_open_time_normal);
  const targetLabel = bookingTargetLabel(court, true);
  const rt = court.booking_rule_type;

  if (rt === "rolling") {
    return `전체 예약은 매일 ${time}에 새 예약이 오픈됩니다.`;
  }

  if (rt === "fixed_schedule" || rt === "ordinal") {
    if (court.booking_open_type === "day") {
      return `전체 예약은 ${buildDayOpenPhrase(court.booking_open_day_normal, time, targetLabel)}`;
    }
    if (court.booking_open_type === "week") {
      const ordinal =
        rt === "ordinal" ? court.booking_open_ordinal : court.booking_open_day_of_month;
    return `전체 예약은 ${buildWeekOpenPhrase(
        ordinal,
        court.booking_open_day_of_week,
        time,
        targetLabel
      )}`;
    }
    return `전체 예약은 ${buildDayOpenPhrase(court.booking_open_day_normal, time, targetLabel)}`;
  }

  return null;
}

function buildRuleFallbackSentence(court: Court): string {
  switch (court.booking_rule_type) {
    case "phone":
      return "전화로 예약할 수 있습니다.";
    case "on_site":
      return "현장 접수로 예약할 수 있습니다.";
    case "lottery":
      return "추첨 방식으로 예약이 진행됩니다.";
    case "irregular":
      return "비정기적으로 예약이 오픈됩니다.";
    case "checking":
      return "예약 오픈 일정을 확인 중입니다.";
    default:
      return "예약 오픈 일정과 예약 방법을 확인할 수 있습니다.";
  }
}

/** description에 붙는 예약 요약 문장 */
export function buildReservationSummary(court: Court): string {
  const bookingRulesSummary = buildBookingRulesSummary(court);
  if (bookingRulesSummary) return bookingRulesSummary;

  const sentences = [
    buildOwnerReservationSentence(court),
    buildNormalReservationSentence(court),
  ].filter((s): s is string => Boolean(s));

  if (sentences.length > 0) return sentences.join(" ");
  return buildRuleFallbackSentence(court);
}

export function buildCourtDetailMetadata(court: Court) {
  const displayName = formatCourtDisplayName(court.basic_court_name);
  const reservationSummary = buildReservationSummary(court);

  const title = `${displayName} 예약 방법·오픈 시간 | ${SITE_NAME}`;
  const description = `${displayName}의 예약 오픈 시간, 주소, 코트 종류, 예약 사이트 정보를 확인하세요. ${reservationSummary}`;

  return { title, description, displayName, reservationSummary };
}
