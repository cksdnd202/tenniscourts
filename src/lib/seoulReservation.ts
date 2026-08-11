import type { Court } from "@/app/types";

export const SEOUL_RESERVATION_PROVIDER = "seoul";

const PAGE_SIZE = 1000;
const DEFAULT_ROWS_CACHE_TTL_MS = 10 * 60 * 1000;
const SEOUL_API_TIMEOUT_MS = 4500;

let rowsCache:
  | {
      apiKey: string;
      fetchedAt: number;
      rows: SeoulReservationRow[];
    }
  | null = null;

export type SeoulReservationRow = {
  svcId: string;
  svcName: string;
  svcUrl: string;
  areaName: string;
  placeName: string;
  minTime: string;
  maxTime: string;
  raw: string;
};

export type SeoulReservationSource = {
  source_provider: string;
  source_service_id: string | null;
  source_service_name: string | null;
  source_place_name: string | null;
  source_area_name: string | null;
  source_time_min: string | null;
  source_time_max: string | null;
  source_match_key: string | null;
  source_synced_at?: string | null;
};

export function extractXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function parseListTotalCount(xml: string): number {
  const match = xml.match(/<list_total_count>\s*(\d+)\s*<\/list_total_count>/i);
  return match ? parseInt(match[1], 10) : 0;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[［\[][^［\[\]］]*[］\]]/g, "")
    .trim();
}

export function normalizeSeoulServiceName(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\d{4}\s*년\s*0?\d{1,2}\s*월/g, "")
    .replace(/0?\d{1,2}\s*월/g, "")
    .replace(/^테니스장\s*\d+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSeoulReservationIdentityName(value: string | null | undefined) {
  return normalizeSeoulServiceName(value)
    .replace(/\d{4}[./-]\d{1,2}[./-]\d{1,2}\s*~\s*\d{4}[./-]\d{1,2}[./-]\d{1,2}/g, "")
    .replace(/\d{1,2}[./-]\d{1,2}\s*~\s*\d{1,2}[./-]\d{1,2}/g, "")
    .replace(/\d{1,2}\s*일\s*~\s*(?:\d{1,2}\s*일|말일)/g, "")
    .replace(/\b\d+\s*차\b/g, "")
    .replace(/\d+\s*차/g, "")
    .replace(/접수|예약|대관/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSeoulServiceMonth(value: string | null | undefined) {
  const match = (value ?? "").match(/(?:^|[^\d])(\d{1,2})\s*월/);
  if (!match) return null;

  const month = Number(match[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

function isSeoulServiceMonthAhead(serviceMonth: number, currentMonth: number) {
  if (currentMonth === 12 && serviceMonth === 1) return true;
  return serviceMonth > currentMonth;
}

export function isStaleSeoulMonthlyService(value: string | null | undefined, now = new Date()) {
  const serviceMonth = getSeoulServiceMonth(value);
  if (!serviceMonth) return false;

  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  return currentDay >= 20 && !isSeoulServiceMonthAhead(serviceMonth, currentMonth);
}

function normalizePlaceName(value: string | null | undefined) {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTime(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2}):?(\d{2})?/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
}

export function buildSeoulReservationMatchKey(input: {
  areaName?: string | null;
  placeName?: string | null;
  serviceName?: string | null;
  minTime?: string | null;
  maxTime?: string | null;
}) {
  const area = normalizeText(input.areaName);
  const place = normalizePlaceName(input.placeName);
  const service = normalizeSeoulServiceName(input.serviceName);
  const minTime = normalizeTime(input.minTime);
  const maxTime = normalizeTime(input.maxTime);

  return [SEOUL_RESERVATION_PROVIDER, area, place, service, minTime, maxTime]
    .map((part) => part || "-")
    .join("|");
}

export function buildSeoulReservationLooseMatchKey(input: {
  areaName?: string | null;
  placeName?: string | null;
  serviceName?: string | null;
}) {
  const area = normalizeText(input.areaName);
  const place = normalizePlaceName(input.placeName);
  const service = normalizeSeoulServiceName(input.serviceName);

  return [SEOUL_RESERVATION_PROVIDER, area, place, service]
    .map((part) => part || "-")
    .join("|");
}

export function buildSeoulReservationIdentityKey(input: {
  areaName?: string | null;
  placeName?: string | null;
  serviceName?: string | null;
}) {
  const area = normalizeText(input.areaName);
  const place = normalizePlaceName(input.placeName);
  const service = normalizeSeoulReservationIdentityName(input.serviceName);

  return [SEOUL_RESERVATION_PROVIDER, area, place, service]
    .map((part) => part || "-")
    .join("|");
}

export function parseSeoulReservationRow(raw: string): SeoulReservationRow | null {
  if (extractXmlTag(raw, "MINCLASSNM") !== "테니스장") return null;

  const svcName = extractXmlTag(raw, "SVCNM");
  const svcUrl = extractXmlTag(raw, "SVCURL");
  if (!svcName || !svcUrl) return null;

  return {
    svcId: extractXmlTag(raw, "SVCID"),
    svcName,
    svcUrl,
    areaName: extractXmlTag(raw, "AREANM"),
    placeName: extractXmlTag(raw, "PLACENM"),
    minTime: extractXmlTag(raw, "V_MIN"),
    maxTime: extractXmlTag(raw, "V_MAX"),
    raw,
  };
}

export function getSeoulReservationSource(row: SeoulReservationRow): SeoulReservationSource {
  return {
    source_provider: SEOUL_RESERVATION_PROVIDER,
    source_service_id: row.svcId || null,
    source_service_name: row.svcName || null,
    source_place_name: row.placeName || null,
    source_area_name: row.areaName || null,
    source_time_min: normalizeTime(row.minTime) || null,
    source_time_max: normalizeTime(row.maxTime) || null,
    source_match_key: buildSeoulReservationMatchKey({
      areaName: row.areaName,
      placeName: row.placeName,
      serviceName: row.svcName,
      minTime: row.minTime,
      maxTime: row.maxTime,
    }),
    source_synced_at: new Date().toISOString(),
  };
}

function parseSeoulDateValue(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return 0;

  const normalized = text
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .replace(/(\d{4}-\d{1,2}-\d{1,2})$/, "$1 23:59:59");
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getStartOfDayTime(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function getSeoulReservationStartTime(row: SeoulReservationRow) {
  return Math.max(
    parseSeoulDateValue(extractXmlTag(row.raw, "RCPTBGNDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "SVCOPNBGNDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "USEBGNDT"))
  );
}

function getSeoulReservationReceptionStartTime(row: SeoulReservationRow) {
  return parseSeoulDateValue(extractXmlTag(row.raw, "RCPTBGNDT"));
}

function getSeoulReservationReceptionEndTime(row: SeoulReservationRow) {
  return parseSeoulDateValue(extractXmlTag(row.raw, "RCPTENDDT"));
}

export function getSeoulReservationEndTime(row: SeoulReservationRow) {
  return Math.max(
    parseSeoulDateValue(extractXmlTag(row.raw, "RCPTENDDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "SVCOPNENDDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "USEENDDT"))
  );
}

export function isExpiredSeoulReservationRow(row: SeoulReservationRow, now = new Date()) {
  const receptionEndTime = parseSeoulDateValue(extractXmlTag(row.raw, "RCPTENDDT"));
  if (receptionEndTime) {
    return receptionEndTime < getStartOfDayTime(now);
  }

  const endTime = getSeoulReservationEndTime(row);
  if (!endTime) return false;

  return endTime < getStartOfDayTime(now);
}

function getSeoulReservationNextTiming(row: SeoulReservationRow, now = new Date()) {
  const nowTime = now.getTime();
  const startOfToday = getStartOfDayTime(now);
  const receptionStartTime = getSeoulReservationReceptionStartTime(row);
  const receptionEndTime = getSeoulReservationReceptionEndTime(row);
  const fallbackStartTime = getSeoulReservationStartTime(row);
  const fallbackEndTime = getSeoulReservationEndTime(row);

  if (
    receptionStartTime &&
    receptionEndTime &&
    receptionStartTime <= nowTime &&
    receptionEndTime >= startOfToday
  ) {
    return { rank: 0, distance: 0 };
  }

  if (receptionStartTime && receptionStartTime > nowTime) {
    return { rank: 1, distance: receptionStartTime - nowTime };
  }

  if (!receptionStartTime && fallbackStartTime && fallbackStartTime > nowTime) {
    return { rank: 2, distance: fallbackStartTime - nowTime };
  }

  if (!receptionEndTime && fallbackEndTime && fallbackEndTime >= startOfToday) {
    return { rank: 3, distance: Math.max(0, fallbackEndTime - nowTime) };
  }

  return { rank: 4, distance: Number.MAX_SAFE_INTEGER };
}

export function compareSeoulReservationRowsForNext(
  a: SeoulReservationRow,
  b: SeoulReservationRow,
  now = new Date()
) {
  const aTiming = getSeoulReservationNextTiming(a, now);
  const bTiming = getSeoulReservationNextTiming(b, now);

  if (aTiming.rank !== bTiming.rank) return aTiming.rank - bTiming.rank;
  if (aTiming.distance !== bTiming.distance) return aTiming.distance - bTiming.distance;

  return getSeoulReservationFreshnessScore(b) - getSeoulReservationFreshnessScore(a);
}

function getServiceMonthScore(row: SeoulReservationRow) {
  const month = getSeoulServiceMonth(row.svcName);
  if (!month) return 0;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  let year = now.getFullYear();
  if (month < currentMonth - 6) year += 1;

  return new Date(year, month - 1, 1).getTime();
}

export function getSeoulReservationFreshnessScore(row: SeoulReservationRow) {
  const dateScore = Math.max(
    parseSeoulDateValue(extractXmlTag(row.raw, "RCPTENDDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "RCPTBGNDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "SVCOPNENDDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "SVCOPNBGNDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "USEENDDT")),
    parseSeoulDateValue(extractXmlTag(row.raw, "USEBGNDT"))
  );

  return Math.max(dateScore, getServiceMonthScore(row));
}

export function buildLatestSeoulReservationMap(rows: SeoulReservationRow[]) {
  const map = new Map<string, { row: SeoulReservationRow; source: SeoulReservationSource }>();

  for (const row of rows) {
    if (isExpiredSeoulReservationRow(row)) continue;

    const source = getSeoulReservationSource(row);
    if (!source.source_match_key) continue;

    const current = map.get(source.source_match_key);
    if (!current || compareSeoulReservationRowsForNext(row, current.row) < 0) {
      map.set(source.source_match_key, { row, source });
    }
  }

  return map;
}

export function buildNextSeoulReservationLooseMap(rows: SeoulReservationRow[]) {
  const map = new Map<string, { row: SeoulReservationRow; source: SeoulReservationSource }>();

  for (const row of rows) {
    if (isExpiredSeoulReservationRow(row)) continue;

    const key = buildSeoulReservationLooseMatchKey({
      areaName: row.areaName,
      placeName: row.placeName,
      serviceName: row.svcName,
    });
    const source = getSeoulReservationSource(row);
    const current = map.get(key);
    if (!current || compareSeoulReservationRowsForNext(row, current.row) < 0) {
      map.set(key, { row, source });
    }
  }

  return map;
}

export async function fetchSeoulReservationPage(apiKey: string, start: number, end: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEOUL_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `http://openapi.seoul.go.kr:8088/${apiKey}/xml/ListPublicReservationSport/${start}/${end}/%20/`,
      { cache: "no-store", signal: controller.signal }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`서울시 API 실패: ${response.status}`);
  }

  return response.text();
}

export async function fetchAllSeoulTennisReservations(
  apiKey: string,
  options: { cacheTtlMs?: number } = {}
) {
  const cacheTtlMs = options.cacheTtlMs ?? 0;
  if (
    cacheTtlMs > 0 &&
    rowsCache?.apiKey === apiKey &&
    Date.now() - rowsCache.fetchedAt < cacheTtlMs
  ) {
    return rowsCache.rows;
  }

  const rows: SeoulReservationRow[] = [];
  let total = 0;
  let start = 1;

  while (true) {
    const end = start + PAGE_SIZE - 1;
    const xml = await fetchSeoulReservationPage(apiKey, start, end);

    if (total === 0) {
      total = parseListTotalCount(xml);
    }

    const rawRows = xml.match(/<row>[\s\S]*?<\/row>/gi) ?? [];
    for (const raw of rawRows) {
      const row = parseSeoulReservationRow(raw);
      if (row) rows.push(row);
    }

    if (total > 0 && end >= total) break;
    start += PAGE_SIZE;

    if (total === 0 && start > 3000) {
      throw new Error("API에서 list_total_count를 찾지 못해 탐색을 중단했습니다.");
    }
  }

  if (cacheTtlMs > 0) {
    rowsCache = {
      apiKey,
      fetchedAt: Date.now(),
      rows,
    };
  }

  return rows;
}

export const SEOUL_RESERVATION_ROWS_CACHE_TTL_MS = DEFAULT_ROWS_CACHE_TTL_MS;

export function buildFallbackSeoulMatchKeyFromCourt(court: Partial<Court>) {
  return buildSeoulReservationMatchKey({
    areaName: court.basic_city,
    placeName: court.basic_address || court.basic_court_name,
    serviceName: court.basic_court_name,
    minTime: court.basic_time_of_use_weekday_from,
    maxTime: court.basic_time_of_use_weekday_to,
  });
}

export function getCourtStoredSeoulMatchKey(court: Partial<Court>) {
  return court.source_match_key || buildFallbackSeoulMatchKeyFromCourt(court);
}

export function buildFallbackSeoulLooseMatchKeyFromCourt(court: Partial<Court>) {
  return buildSeoulReservationLooseMatchKey({
    areaName: court.source_area_name || court.basic_city,
    placeName: court.source_place_name || court.basic_address || court.basic_court_name,
    serviceName: court.source_service_name || court.basic_court_name,
  });
}

export function getCourtStoredSeoulLooseMatchKey(court: Partial<Court>) {
  return buildFallbackSeoulLooseMatchKeyFromCourt(court);
}
