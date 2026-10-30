import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import {
  SEOUL_RESERVATION_ROWS_CACHE_TTL_MS,
  extractXmlTag,
  fetchAllSeoulTennisReservations,
} from "@/lib/seoulReservation";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
  const pageNo = parsePositiveInt(req.nextUrl.searchParams.get("pageNo"), 1, 9999);
  const numOfRows = parsePositiveInt(req.nextUrl.searchParams.get("numOfRows"), 50, 100);
  const keyword = normalizeText(req.nextUrl.searchParams.get("keyword") ?? "");

  try {
    const rows = await fetchAllSeoulTennisReservations(apiKey, {
      cacheTtlMs: SEOUL_RESERVATION_ROWS_CACHE_TTL_MS,
    });
    const filteredRows = keyword
      ? rows.filter((row) =>
          normalizeText([row.svcName, row.areaName, row.placeName].join(" ")).includes(keyword)
        )
      : rows;
    const start = (pageNo - 1) * numOfRows;
    const items = filteredRows.slice(start, start + numOfRows).map((row) => ({
      svcId: row.svcId,
      svcName: row.svcName,
      svcUrl: row.svcUrl,
      areaName: row.areaName,
      placeName: row.placeName,
      minTime: row.minTime,
      maxTime: row.maxTime,
      status: extractXmlTag(row.raw, "SVCSTATNM"),
      receiptBeginAt: extractXmlTag(row.raw, "RCPTBGNDT"),
      receiptEndAt: extractXmlTag(row.raw, "RCPTENDDT"),
      useBeginAt: extractXmlTag(row.raw, "USEBGNDT"),
      useEndAt: extractXmlTag(row.raw, "USEENDDT"),
    }));

    return NextResponse.json({
      items,
      meta: {
        pageNo,
        numOfRows,
        totalCount: filteredRows.length,
        apiTotalCount: rows.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "서울시 테니스 예약 목록을 불러오지 못했습니다.",
      },
      { status: 502 }
    );
  }
}
