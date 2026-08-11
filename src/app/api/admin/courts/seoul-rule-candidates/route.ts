import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import {
  SEOUL_RESERVATION_ROWS_CACHE_TTL_MS,
  buildSeoulReservationMatchKey,
  extractXmlTag,
  fetchAllSeoulTennisReservations,
  getSeoulReservationSource,
  isExpiredSeoulReservationRow,
  normalizeSeoulServiceName,
  type SeoulReservationRow,
} from "@/lib/seoulReservation";

function normalizeCore(value: string | null | undefined) {
  return normalizeSeoulServiceName(value)
    .replace(/\b[0-9]+\s*차\b/g, "")
    .replace(/[0-9]+\s*차/g, "")
    .replace(/접수|예약|대관/g, "")
    .replace(/테니스장|테니스|야외코트|실내코트|코트/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeTime(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2}):?(\d{2})?/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`;
}

function formatDateRange(start: string, end: string) {
  const startDate = start.slice(0, 10).replace(/-/g, ".");
  const endDate = end.slice(0, 10).replace(/-/g, ".");
  return [startDate, endDate].filter(Boolean).join(" ~ ");
}

function parseDateDay(value: string) {
  const match = value.match(/\d{4}[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  return { month: Number(match[1]), day: Number(match[2]) };
}

function inferUsagePeriodLabel(row: SeoulReservationRow) {
  const start = extractXmlTag(row.raw, "USEBGNDT");
  const end = extractXmlTag(row.raw, "USEENDDT");
  const startDate = parseDateDay(start);
  const endDate = parseDateDay(end);

  if (!startDate || !endDate || startDate.month !== endDate.month) {
    const range = formatDateRange(start, end);
    return range ? `${range} 이용분` : "";
  }

  if (startDate.day === 1 && endDate.day >= 28) return "해당월 전체 이용분";
  return `${startDate.day}일~${endDate.day === 31 ? "말일" : `${endDate.day}일`} 이용분`;
}

function inferRoundLabel(row: SeoulReservationRow, usagePeriodLabel: string) {
  const explicitRound = row.svcName.match(/([0-9]+)\s*차/);
  if (explicitRound) return `${explicitRound[1]}차 예약`;

  if (/1일~15일/.test(usagePeriodLabel)) return "1차 예약";
  if (/16일~/.test(usagePeriodLabel)) return "2차 예약";
  return "";
}

function scoreCandidate(input: {
  courtName?: string | null;
  city?: string | null;
  address?: string | null;
  sourceMatchKey?: string | null;
  weekdayFrom?: string | null;
  weekdayTo?: string | null;
  row: SeoulReservationRow;
}) {
  const { row } = input;
  const source = getSeoulReservationSource(row);
  let score = 0;

  if (input.sourceMatchKey && source.source_match_key && input.sourceMatchKey === source.source_match_key) {
    score += 10;
  }

  const rebuiltMatchKey = buildSeoulReservationMatchKey({
    areaName: input.city,
    placeName: input.address || input.courtName,
    serviceName: input.courtName,
    minTime: input.weekdayFrom,
    maxTime: input.weekdayTo,
  });
  if (rebuiltMatchKey && source.source_match_key && rebuiltMatchKey === source.source_match_key) {
    score += 8;
  }

  if (input.city && row.areaName && input.city === row.areaName) {
    score += 3;
  }

  const courtCore = normalizeCore(input.courtName);
  const serviceCore = normalizeCore(row.svcName);
  if (courtCore && serviceCore) {
    if (courtCore === serviceCore) score += 8;
    else if (courtCore.includes(serviceCore) || serviceCore.includes(courtCore)) score += 6;
  }

  const placeCore = normalizeCore(input.address);
  const rowPlaceCore = normalizeCore(row.placeName);
  if (placeCore && rowPlaceCore && (placeCore.includes(rowPlaceCore) || rowPlaceCore.includes(placeCore))) {
    score += 3;
  }

  if (normalizeTime(input.weekdayFrom) && normalizeTime(input.weekdayFrom) === normalizeTime(row.minTime)) {
    score += 1;
  }
  if (normalizeTime(input.weekdayTo) && normalizeTime(input.weekdayTo) === normalizeTime(row.maxTime)) {
    score += 1;
  }

  return score;
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      courtName?: string | null;
      city?: string | null;
      address?: string | null;
      sourceMatchKey?: string | null;
      weekdayFrom?: string | null;
      weekdayTo?: string | null;
    };

    const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
    const rows = await fetchAllSeoulTennisReservations(apiKey, {
      cacheTtlMs: SEOUL_RESERVATION_ROWS_CACHE_TTL_MS,
    });

    const candidates = rows
      .filter((row) => !isExpiredSeoulReservationRow(row))
      .map((row) => ({ row, score: scoreCandidate({ ...body, row }) }))
      .filter((item) => item.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ row, score }) => {
        const usagePeriodLabel = inferUsagePeriodLabel(row);
        const source = getSeoulReservationSource(row);
        return {
          serviceId: row.svcId,
          serviceName: row.svcName,
          serviceUrl: row.svcUrl,
          areaName: row.areaName,
          placeName: row.placeName,
          minTime: normalizeTime(row.minTime),
          maxTime: normalizeTime(row.maxTime),
          receptionPeriod: formatDateRange(
            extractXmlTag(row.raw, "RCPTBGNDT"),
            extractXmlTag(row.raw, "RCPTENDDT")
          ),
          usePeriod: formatDateRange(
            extractXmlTag(row.raw, "USEBGNDT"),
            extractXmlTag(row.raw, "USEENDDT")
          ),
          bookingRoundLabel: inferRoundLabel(row, usagePeriodLabel),
          usagePeriodLabel,
          score,
          source,
        };
      });

    return NextResponse.json({ candidates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서울시 예약 링크 후보를 찾지 못했습니다." },
      { status: 500 }
    );
  }
}
