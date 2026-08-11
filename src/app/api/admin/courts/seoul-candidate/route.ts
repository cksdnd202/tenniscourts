import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildSeoulReservationIdentityKey,
  buildSeoulReservationLooseMatchKey,
  buildSeoulReservationMatchKey,
  compareSeoulReservationRowsForNext,
  extractXmlTag,
  fetchSeoulReservationPage,
  getSeoulReservationSource,
  isExpiredSeoulReservationRow,
  parseSeoulReservationRow,
} from "@/lib/seoulReservation";

const PAGE_SIZE = 1000;
const DEFAULT_COURT_COUNTS = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const extractTag = extractXmlTag;

function normalizePlaceSearchName(name: string) {
  return name.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function parseListTotalCount(xml: string): number {
  const match = xml.match(/<list_total_count>\s*(\d+)\s*<\/list_total_count>/i);
  return match ? parseInt(match[1], 10) : 0;
}

function findTennisRows(xml: string): string[] {
  const rows = xml.match(/<row>[\s\S]*?<\/row>/gi) ?? [];
  return rows.filter((row) => extractTag(row, "MINCLASSNM") === "테니스장");
}

const fetchSeoulPage = fetchSeoulReservationPage;

async function getExistingSeoulSources() {
  const links = new Set<string>();
  const matchKeys = new Set<string>();
  const looseMatchKeys = new Set<string>();
  const identityKeys = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
      const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .select(
        "booking_site_link, source_match_key, source_area_name, source_place_name, source_service_name, source_time_min, source_time_max, basic_city, basic_address, basic_court_name, basic_time_of_use_weekday_from, basic_time_of_use_weekday_to"
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) break;

    for (const row of data) {
      const url = row.booking_site_link?.trim();
      if (url) links.add(url);
      const matchKey = row.source_match_key?.trim();
      if (matchKey) matchKeys.add(matchKey);
      const rebuiltMatchKey = buildSeoulReservationMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.source_service_name ?? row.basic_court_name,
        minTime: row.source_time_min ?? row.basic_time_of_use_weekday_from,
        maxTime: row.source_time_max ?? row.basic_time_of_use_weekday_to,
      });
      if (rebuiltMatchKey) matchKeys.add(rebuiltMatchKey);
      const visibleNameMatchKey = buildSeoulReservationMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.basic_court_name,
        minTime: row.source_time_min ?? row.basic_time_of_use_weekday_from,
        maxTime: row.source_time_max ?? row.basic_time_of_use_weekday_to,
      });
      if (visibleNameMatchKey) matchKeys.add(visibleNameMatchKey);
      const looseSourceKey = buildSeoulReservationLooseMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.source_service_name ?? row.basic_court_name,
      });
      if (looseSourceKey) looseMatchKeys.add(looseSourceKey);
      const looseVisibleNameKey = buildSeoulReservationLooseMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.basic_court_name,
      });
      if (looseVisibleNameKey) looseMatchKeys.add(looseVisibleNameKey);
      const sourceIdentityKey = buildSeoulReservationIdentityKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.source_service_name ?? row.basic_court_name,
      });
      if (sourceIdentityKey) identityKeys.add(sourceIdentityKey);
      const visibleIdentityKey = buildSeoulReservationIdentityKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.basic_court_name,
      });
      if (visibleIdentityKey) identityKeys.add(visibleIdentityKey);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return { links, matchKeys, looseMatchKeys, identityKeys };
}

async function searchKakaoPlace(name: string) {
  const kakaoRestApiKey = (process.env.KAKAO_REST_API_KEY ?? "").trim();
  if (!kakaoRestApiKey) return null;

  const query = normalizePlaceSearchName(name);
  if (!query) return null;

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${kakaoRestApiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    documents?: Array<{
      address_name?: string;
      road_address_name?: string;
      place_url?: string;
      x?: string;
      y?: string;
    }>;
  };

  const place = data.documents?.[0];
  if (!place) return null;

  return {
    address: place.road_address_name || place.address_name || null,
    mapLink: place.place_url || null,
    latitude: place.y ? Number(place.y) : null,
    longitude: place.x ? Number(place.x) : null,
  };
}

async function toCourtCandidate(row: string) {
  const seoulRow = parseSeoulReservationRow(row);
  if (!seoulRow) {
    throw new Error("서울시 테니스장 row를 해석하지 못했습니다.");
  }
  const name = seoulRow.svcName;
  const kakaoPlace = await searchKakaoPlace(name);

  return {
    ...DEFAULT_COURT_COUNTS,
    basic_court_name: name,
    basic_owner_type: null,
    basic_region: "서울",
    basic_city: seoulRow.areaName,
    basic_address: kakaoPlace?.address ?? seoulRow.placeName,
    basic_map_link: kakaoPlace?.mapLink ?? null,
    basic_latitude: Number.isFinite(kakaoPlace?.latitude) ? kakaoPlace?.latitude : null,
    basic_longitude: Number.isFinite(kakaoPlace?.longitude) ? kakaoPlace?.longitude : null,
    time_of_use_same: true,
    basic_time_of_use_weekday_from: seoulRow.minTime || null,
    basic_time_of_use_weekday_to: seoulRow.maxTime || null,
    basic_time_of_use_weekend_from: seoulRow.minTime || null,
    basic_time_of_use_weekend_to: seoulRow.maxTime || null,
    booking_site_link: seoulRow.svcUrl,
    booking_reception_time: [extractTag(row, "RCPTBGNDT"), extractTag(row, "RCPTENDDT")]
      .filter(Boolean)
      .join(" - "),
    booking_rule_type: null,
    booking_open_type: null,
    booking_eligibility_first: null,
    booking_eligibility_second: null,
    booking_open_day_of_month: null,
    booking_open_day_of_week: null,
    booking_open_ordinal: null,
    booking_open_day_owner: null,
    booking_open_time_owner: null,
    booking_open_day_normal: null,
    booking_open_time_normal: null,
    booking_normal_iscurrentmonth: false,
    booking_open_time_local: null,
    booking_open_offset: null,
    booking_online_reserve_possible: null,
    booking_holiday_week: null,
    booking_today_booking_possible: null,
    booking_booking_provide: "public_site",
    use_or_not: false,
    etc_desc: extractTag(row, "DTLCONT"),
    ...getSeoulReservationSource(seoulRow),
  };
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";

  try {
    const existingSources = await getExistingSeoulSources();
    const candidateOrder: string[] = [];
    const candidates = new Map<
      string,
      {
        raw: string;
        row: NonNullable<ReturnType<typeof parseSeoulReservationRow>>;
      }
    >();

    let total = 0;
    let start = 1;

    while (true) {
      const end = start + PAGE_SIZE - 1;
      const xml = await fetchSeoulPage(apiKey, start, end);

      if (total === 0) {
        total = parseListTotalCount(xml);
      }

      const tennisRows = findTennisRows(xml);

      for (const row of tennisRows) {
        const url = extractTag(row, "SVCURL").trim();
        const name = extractTag(row, "SVCNM").trim();
        const seoulRow = parseSeoulReservationRow(row);
        const source = seoulRow ? getSeoulReservationSource(seoulRow) : null;

        if (!url || !name) continue;
        if (seoulRow && isExpiredSeoulReservationRow(seoulRow)) continue;
        if (existingSources.links.has(url)) continue;
        if (source?.source_match_key && existingSources.matchKeys.has(source.source_match_key)) continue;
        if (!seoulRow) continue;

        const looseMatchKey = buildSeoulReservationLooseMatchKey({
          areaName: seoulRow.areaName,
          placeName: seoulRow.placeName,
          serviceName: seoulRow.svcName,
        });
        const identityKey = buildSeoulReservationIdentityKey({
          areaName: seoulRow.areaName,
          placeName: seoulRow.placeName,
          serviceName: seoulRow.svcName,
        });
        if (
          existingSources.looseMatchKeys.has(looseMatchKey) ||
          existingSources.identityKeys.has(identityKey)
        ) {
          continue;
        }

        const candidateKey = identityKey || looseMatchKey;
        const current = candidates.get(candidateKey);
        if (!current) {
          candidateOrder.push(candidateKey);
          candidates.set(candidateKey, { raw: row, row: seoulRow });
          continue;
        }

        if (compareSeoulReservationRowsForNext(seoulRow, current.row) < 0) {
          candidates.set(candidateKey, { raw: row, row: seoulRow });
        }
      }

      if (total > 0 && end >= total) {
        break;
      }

      start += PAGE_SIZE;

      if (total === 0 && start > 2000) {
        return NextResponse.json(
          { error: "API에서 list_total_count를 찾지 못해 탐색을 중단했습니다." },
          { status: 502 }
        );
      }
    }

    const firstCandidateKey = candidateOrder.find((key) => candidates.has(key));
    const firstCandidate = firstCandidateKey ? candidates.get(firstCandidateKey) : null;

    if (!firstCandidate) {
      return NextResponse.json(
        {
          error:
            "더 가져올 신규 테니스장이 없습니다. (API에 있는 테니스장은 모두 예약 링크가 DB에 있습니다)",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      court: await toCourtCandidate(firstCandidate.raw),
      meta: {
        apiRange: `1-${total || "unknown"}`,
        skippedExistingByUrl: existingSources.links.size,
        skippedExistingByMatchKey: existingSources.matchKeys.size,
        skippedExistingByIdentityKey: existingSources.identityKeys.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
