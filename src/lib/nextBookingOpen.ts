import type { Court, CourtBookingRule } from "@/app/types";
import {
  getPriorityEligibilityLabel,
  hasPriorityEligibility,
  type PriorityEligibilityLabel,
} from "@/lib/bookingEligibility";

const SEOUL_OFFSET_HOURS = 9;

export type NextOpenResult = {
  instant: Date;
  dateLabel: string;
  timeLabel: string;
};

/** 한국(고정 UTC+9) 벽시계 → UTC Date 인스턴트 */
function seoulWallToUtc(y: number, m: number, d: number, h: number, min: number, sec = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h - SEOUL_OFFSET_HOURS, min, sec));
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function getSeoulYMDFromInstant(inst: Date): { y: number; m: number; d: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const s = dtf.format(inst);
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

function addCalendarDaysSeoul(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
  const t = seoulWallToUtc(y, m, d, 12, 0, 0);
  t.setUTCDate(t.getUTCDate() + delta);
  return getSeoulYMDFromInstant(t);
}

/** 코트 DB: 1=월 … 7=일 → JS getUTCDay 호환 (0=일) */
function courtWeekdayToJs(courtW: number): number {
  return courtW === 7 ? 0 : courtW;
}

function getSeoulWeekday(y: number, month: number, day: number): number {
  const inst = seoulWallToUtc(y, month, day, 12, 0, 0);
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" });
  const s = dtf.format(inst);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const key = s.slice(0, 3);
  return map[key] ?? 0;
}

function parseTimeParts(timeString: string | null | undefined): { h: number; m: number } | null {
  if (!timeString || !timeString.trim()) return null;
  const parts = timeString.trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/** Supabase 등에서 number | string 으로 올 수 있는 값 정규화 */
function toFiniteInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** 해당 월의 n번째(1-based) 또는 마지막(-1) court 요일의 일자 */
function dayOfMonthForNthWeekday(
  y: number,
  m: number,
  courtWeekdayRaw: unknown,
  ordinalRaw: unknown
): number | null {
  const ordinal = toFiniteInt(ordinalRaw);
  if (ordinal == null) return null;
  const dim = daysInMonth(y, m);

  if (ordinal === -2) {
    for (let d = 1; d <= dim; d++) {
      const w = getSeoulWeekday(y, m, d);
      if (w >= 1 && w <= 5) return d;
    }
    return null;
  }

  const wd = toFiniteInt(courtWeekdayRaw);
  if (wd == null) return null;
  const want = courtWeekdayToJs(wd);

  if (ordinal === -1) {
    for (let d = dim; d >= 1; d--) {
      if (getSeoulWeekday(y, m, d) === want) return d;
    }
    return null;
  }
  if (ordinal < 1 || ordinal > 5) return null;
  let count = 0;
  for (let d = 1; d <= dim; d++) {
    if (getSeoulWeekday(y, m, d) === want) {
      count++;
      if (count === ordinal) return d;
    }
  }
  return null;
}

function nextRollingOpen(timeStr: string | null | undefined, from: Date): Date | null {
  const t = parseTimeParts(timeStr);
  if (!t) return null;
  const { y, m, d } = getSeoulYMDFromInstant(from);
  let cand = seoulWallToUtc(y, m, d, t.h, t.m, 0);
  if (cand.getTime() <= from.getTime()) {
    const next = addCalendarDaysSeoul(y, m, d, 1);
    cand = seoulWallToUtc(next.y, next.m, next.d, t.h, t.m, 0);
  }
  return cand;
}

function nextDayOfMonthOpen(
  dayOfMonthRaw: unknown,
  timeStr: string | null | undefined,
  from: Date
): Date | null {
  const dayOfMonth = toFiniteInt(dayOfMonthRaw);
  if (dayOfMonth == null || dayOfMonth < -1 || dayOfMonth === 0 || dayOfMonth > 31) return null;
  const t = parseTimeParts(timeStr);
  if (!t) return null;
  const { y, m, d } = getSeoulYMDFromInstant(from);
  const dim = daysInMonth(y, m);
  const dom = dayOfMonth === -1 ? dim : Math.min(dayOfMonth, dim);
  let cand = seoulWallToUtc(y, m, dom, t.h, t.m, 0);
  if (cand.getTime() > from.getTime()) return cand;
  let nm = m + 1;
  let ny = y;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const dim2 = daysInMonth(ny, nm);
  const dom2 = dayOfMonth === -1 ? dim2 : Math.min(dayOfMonth, dim2);
  return seoulWallToUtc(ny, nm, dom2, t.h, t.m, 0);
}

/** 일반 일자형: 당월 플래그가 false면 '이번 달 후보'가 아직 안 왔으면 이번 달, 지났으면 다음 달 — 모호하면 월 단위 순회로 다음 시각 */
function nextNormalDayOfMonthOpen(court: Court, from: Date): Date | null {
  const day = toFiniteInt(court.booking_open_day_normal);
  const timeStr = court.booking_open_time_normal;
  if (day == null || !timeStr?.trim()) return null;
  const t = parseTimeParts(timeStr);
  if (!t) return null;

  const { y, m } = getSeoulYMDFromInstant(from);
  const tryMonth = (yy: number, mm: number): Date | null => {
    const dim = daysInMonth(yy, mm);
    const dom = day === -1 ? dim : Math.min(day, dim);
    return seoulWallToUtc(yy, mm, dom, t.h, t.m, 0);
  };

  if (court.booking_normal_iscurrentmonth === true) {
    const c0 = tryMonth(y, m);
    if (c0 && c0.getTime() > from.getTime()) return c0;
    let nm = m + 1;
    let ny = y;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    return tryMonth(ny, nm);
  }

  let ny = y;
  let nm = m;
  for (let i = 0; i < 24; i++) {
    const c = tryMonth(ny, nm);
    if (c && c.getTime() > from.getTime()) return c;
    nm += 1;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
  }
  return null;
}

function nextWeekRuleOpen(
  weekOrdinalRaw: unknown,
  weekdayRaw: unknown,
  timeStr: string | null | undefined,
  from: Date
): Date | null {
  const weekOrdinal = toFiniteInt(weekOrdinalRaw);
  const weekday = toFiniteInt(weekdayRaw);
  if (weekOrdinal == null) return null;
  // 첫번째 영업일(-2)은 요일 값 없이도 계산 가능
  if (weekOrdinal !== -2 && weekday == null) return null;
  const t = parseTimeParts(timeStr);
  if (!t) return null;

  let ny = getSeoulYMDFromInstant(from).y;
  let nm = getSeoulYMDFromInstant(from).m;
  for (let step = 0; step < 36; step++) {
    const dom = dayOfMonthForNthWeekday(ny, nm, weekday, weekOrdinal);
    if (dom != null) {
      const cand = seoulWallToUtc(ny, nm, dom, t.h, t.m, 0);
      if (cand.getTime() > from.getTime()) return cand;
    }
    nm += 1;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
  }
  return null;
}

function toLabels(inst: Date): { dateLabel: string; timeLabel: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const s = dtf.format(inst);
  const [y, mo, da] = s.split("-");
  const dateLabel = `${y}.${mo}.${da}`;

  const hourFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const hp = hourFmt.formatToParts(inst);
  const gh: Record<string, string> = {};
  for (const p of hp) {
    if (p.type !== "literal") gh[p.type] = p.value;
  }
  const H = Number(gh.hour);
  const M = Number(gh.minute);
  if (H === 0 && M === 0) {
    return { dateLabel, timeLabel: "오전 00:00" };
  }
  const isPm = H >= 12;
  const h12 = H % 12 === 0 ? 12 : H % 12;
  const ap = isPm ? "오후" : "오전";
  const timeLabel = `${ap} ${String(h12).padStart(2, "0")}:${String(M).padStart(2, "0")}`;

  return { dateLabel, timeLabel };
}

function wrap(inst: Date | null): NextOpenResult | null {
  if (!inst) return null;
  const { dateLabel, timeLabel } = toLabels(inst);
  return { instant: inst, dateLabel, timeLabel };
}

const firstEligible = (court: Court) => hasPriorityEligibility(court.booking_eligibility_first);

function isNormalBookingRule(rule: CourtBookingRule) {
  return rule.eligibility === "normal";
}

function bookingRuleUsesCurrentMonth(rule: CourtBookingRule) {
  const offset = rule.open_offset?.trim();
  return offset === "당월" || offset === "해당월";
}

export function buildCourtFromBookingRule(court: Court, rule: CourtBookingRule): Court {
  const isNormal = isNormalBookingRule(rule);

  return {
    ...court,
    court_booking_rules: [],
    booking_rule_type: rule.rule_type,
    booking_open_type: rule.open_type,
    booking_lottery_desc: rule.lottery_desc,
    booking_eligibility_first: isNormal ? null : rule.eligibility,
    booking_eligibility_second: isNormal ? rule.eligibility : null,
    booking_open_day_owner: isNormal ? null : rule.open_day_of_month,
    booking_open_time_owner: isNormal ? null : rule.open_time,
    booking_open_day_normal: isNormal ? rule.open_day_of_month : null,
    booking_open_time_normal: isNormal ? rule.open_time : null,
    booking_normal_iscurrentmonth: isNormal ? bookingRuleUsesCurrentMonth(rule) : court.booking_normal_iscurrentmonth,
    booking_open_day_of_month: rule.open_day_of_month,
    booking_open_day_of_week: rule.open_day_of_week,
    booking_open_ordinal: rule.open_ordinal,
    booking_open_offset: rule.open_offset,
  };
}

export function getNextBookingRuleOpen(
  court: Court,
  rule: CourtBookingRule,
  from: Date = new Date()
): NextOpenResult | null {
  const ruleCourt = buildCourtFromBookingRule(court, rule);
  return isNormalBookingRule(rule)
    ? getNextNormalBookingOpen(ruleCourt, from)
    : getNextOwnerBookingOpen(ruleCourt, from);
}

function ownerOpenInstant(court: Court, from: Date): Date | null {
  const rt = court.booking_rule_type;
  if (rt === "rolling") {
    return nextRollingOpen(court.booking_open_time_owner, from);
  }
  if (rt === "fixed_schedule") {
    if (court.booking_open_type === "day") {
      return nextDayOfMonthOpen(court.booking_open_day_owner, court.booking_open_time_owner, from);
    }
    if (court.booking_open_type === "week") {
      return nextWeekRuleOpen(
        court.booking_open_day_of_month,
        court.booking_open_day_of_week,
        court.booking_open_time_owner,
        from
      );
    }
    return nextDayOfMonthOpen(court.booking_open_day_owner, court.booking_open_time_owner, from);
  }
  if (rt === "ordinal") {
    if (court.booking_open_type === "week") {
      return nextWeekRuleOpen(
        court.booking_open_ordinal,
        court.booking_open_day_of_week,
        court.booking_open_time_owner,
        from
      );
    }
    return nextWeekRuleOpen(
      court.booking_open_day_of_month,
      court.booking_open_day_of_week,
      court.booking_open_time_owner,
      from
    );
  }
  return null;
}

function normalOpenInstant(court: Court, from: Date): Date | null {
  const rt = court.booking_rule_type;
  if (!court.booking_open_time_normal?.trim()) return null;

  if (rt === "rolling") {
    return nextRollingOpen(court.booking_open_time_normal, from);
  }
  if (rt === "fixed_schedule") {
    if (court.booking_open_type === "day") {
      return nextNormalDayOfMonthOpen(court, from);
    }
    if (court.booking_open_type === "week") {
      return nextWeekRuleOpen(
        court.booking_open_day_of_month,
        court.booking_open_day_of_week,
        court.booking_open_time_normal,
        from
      );
    }
    return nextNormalDayOfMonthOpen(court, from);
  }
  if (rt === "ordinal") {
    if (court.booking_open_type === "week") {
      return nextWeekRuleOpen(
        court.booking_open_ordinal,
        court.booking_open_day_of_week,
        court.booking_open_time_normal,
        from
      );
    }
    return nextWeekRuleOpen(
      court.booking_open_day_of_month,
      court.booking_open_day_of_week,
      court.booking_open_time_normal,
      from
    );
  }
  return null;
}

export function getPriorityBookingLabel(court: Court): PriorityEligibilityLabel | null {
  if (!firstEligible(court)) return null;
  return getPriorityEligibilityLabel(court.booking_eligibility_first);
}

export function getNextOwnerBookingOpen(court: Court, from: Date = new Date()): NextOpenResult | null {
  if (!firstEligible(court)) return null;
  return wrap(ownerOpenInstant(court, from));
}

export function getNextNormalBookingOpen(court: Court, from: Date = new Date()): NextOpenResult | null {
  return wrap(normalOpenInstant(court, from));
}
