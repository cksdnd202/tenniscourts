import type { Court } from "@/app/types";

export const SEOUL_RESERVATION_PROVIDER = "seoul";

const PAGE_SIZE = 100;
const DEFAULT_ROWS_CACHE_TTL_MS = 10 * 60 * 1000;

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
    const source = getSeoulReservationSource(row);
    if (!source.source_match_key) continue;

    const current = map.get(source.source_match_key);
    if (!current || getSeoulReservationFreshnessScore(row) > getSeoulReservationFreshnessScore(current.row)) {
      map.set(source.source_match_key, { row, source });
    }
  }

  return map;
}

export async function fetchSeoulReservationPage(apiKey: string, start: number, end: number) {
  const response = await fetch(
    `http://openapi.seoul.go.kr:8088/${apiKey}/xml/ListPublicReservationSport/${start}/${end}/%20/`,
    { cache: "no-store" }
  );

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
