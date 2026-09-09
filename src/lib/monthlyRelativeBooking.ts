const SEOUL_OFFSET_HOURS = 9;

function seoulWallToUtc(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour - SEOUL_OFFSET_HOURS, minute, 0));
}

function getSeoulYmd(instant) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function addCalendarDays(year, month, day, delta) {
  const instant = seoulWallToUtc(year, month, day, 12, 0);
  instant.setUTCDate(instant.getUTCDate() + delta);
  return getSeoulYmd(instant);
}

function parsePositiveInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.trunc(number);
}

function parseTime(value) {
  if (!value?.trim()) return null;
  const [hourRaw, minuteRaw] = value.trim().split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function parseEffectiveMonth(value) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

/** 다음 이용월 1일을 기준으로 N일 전 정해진 시각에 열리는 월 단위 예약 */
export function nextMonthlyRelativeOpen(daysBeforeRaw, timeRaw, effectiveFromRaw, from) {
  const daysBefore = parsePositiveInteger(daysBeforeRaw);
  const time = parseTime(timeRaw);
  if (daysBefore == null || daysBefore < 1 || daysBefore > 31 || !time) return null;

  const fromYmd = getSeoulYmd(from);
  let usageYear = fromYmd.year;
  let usageMonth = fromYmd.month + 1;
  if (usageMonth > 12) {
    usageMonth = 1;
    usageYear += 1;
  }

  const effectiveMonth = parseEffectiveMonth(effectiveFromRaw);
  if (
    effectiveMonth &&
    usageYear * 12 + usageMonth < effectiveMonth.year * 12 + effectiveMonth.month
  ) {
    usageYear = effectiveMonth.year;
    usageMonth = effectiveMonth.month;
  }

  for (let step = 0; step < 36; step++) {
    const openYmd = addCalendarDays(usageYear, usageMonth, 1, -daysBefore);
    const candidate = seoulWallToUtc(
      openYmd.year,
      openYmd.month,
      openYmd.day,
      time.hour,
      time.minute
    );
    if (candidate.getTime() > from.getTime()) return candidate;

    usageMonth += 1;
    if (usageMonth > 12) {
      usageMonth = 1;
      usageYear += 1;
    }
  }

  return null;
}
