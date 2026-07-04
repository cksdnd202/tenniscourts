import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 100;
const DEFAULT_COURT_COUNTS = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

function isLocalhost(req: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(req.nextUrl.hostname);
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

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

async function fetchSeoulPage(apiKey: string, start: number, end: number) {
  const response = await fetch(
    `http://openapi.seoul.go.kr:8088/${apiKey}/xml/ListPublicReservationSport/${start}/${end}/%20/`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`서울시 API 실패: ${response.status}`);
  }

  return response.text();
}

async function getExistingBookingLinks() {
  const links = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .select("booking_site_link")
      .not("booking_site_link", "is", null)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) break;

    for (const row of data) {
      const url = row.booking_site_link?.trim();
      if (url) links.add(url);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return links;
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
  const name = extractTag(row, "SVCNM");
  const kakaoPlace = await searchKakaoPlace(name);

  return {
    ...DEFAULT_COURT_COUNTS,
    basic_court_name: name,
    basic_owner_type: null,
    basic_region: "서울",
    basic_city: extractTag(row, "AREANM"),
    basic_address: kakaoPlace?.address ?? extractTag(row, "PLACENM"),
    basic_map_link: kakaoPlace?.mapLink ?? null,
    basic_latitude: Number.isFinite(kakaoPlace?.latitude) ? kakaoPlace?.latitude : null,
    basic_longitude: Number.isFinite(kakaoPlace?.longitude) ? kakaoPlace?.longitude : null,
    time_of_use_same: true,
    basic_time_of_use_weekday_from: extractTag(row, "V_MIN") || null,
    basic_time_of_use_weekday_to: extractTag(row, "V_MAX") || null,
    basic_time_of_use_weekend_from: extractTag(row, "V_MIN") || null,
    basic_time_of_use_weekend_to: extractTag(row, "V_MAX") || null,
    booking_site_link: extractTag(row, "SVCURL"),
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
  };
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isLocalhost(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";

  try {
    const existingLinks = await getExistingBookingLinks();

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

        if (!url || !name) continue;
        if (existingLinks.has(url)) continue;

        return NextResponse.json({
          court: await toCourtCandidate(row),
          meta: {
            apiRange: `${start}-${end}`,
            skippedExistingByUrl: existingLinks.size,
          },
        });
      }

      if (total > 0 && end >= total) {
        return NextResponse.json(
          {
            error:
              "더 가져올 신규 테니스장이 없습니다. (API에 있는 테니스장은 모두 예약 링크가 DB에 있습니다)",
          },
          { status: 409 }
        );
      }

      start += PAGE_SIZE;

      if (total === 0 && start > 2000) {
        return NextResponse.json(
          { error: "API에서 list_total_count를 찾지 못해 탐색을 중단했습니다." },
          { status: 502 }
        );
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
