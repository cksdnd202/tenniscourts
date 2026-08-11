import { NextRequest, NextResponse } from "next/server";
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

const extractTag = extractXmlTag;

function parseListTotalCount(xml: string): number {
  const m = xml.match(/<list_total_count>\s*(\d+)\s*<\/list_total_count>/i);
  return m ? parseInt(m[1], 10) : 0;
}

function findTennisRows(xml: string): string[] {
  const rows = xml.match(/<row>[\s\S]*?<\/row>/gi) ?? [];
  return rows.filter((row) => extractTag(row, "MINCLASSNM") === "테니스장");
}

const fetchSeoulPage = fetchSeoulReservationPage;

async function getExistingSeoulSources(): Promise<{
  links: Set<string>;
  matchKeys: Set<string>;
  looseMatchKeys: Set<string>;
  identityKeys: Set<string>;
}> {
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
      const u = row.booking_site_link?.trim();
      if (u) links.add(u);
      const key = row.source_match_key?.trim();
      if (key) matchKeys.add(key);
      const rebuiltKey = buildSeoulReservationMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.source_service_name ?? row.basic_court_name,
        minTime: row.source_time_min ?? row.basic_time_of_use_weekday_from,
        maxTime: row.source_time_max ?? row.basic_time_of_use_weekday_to,
      });
      if (rebuiltKey) matchKeys.add(rebuiltKey);
      const visibleNameKey = buildSeoulReservationMatchKey({
        areaName: row.source_area_name ?? row.basic_city,
        placeName: row.source_place_name ?? row.basic_address ?? row.basic_court_name,
        serviceName: row.basic_court_name,
        minTime: row.source_time_min ?? row.basic_time_of_use_weekday_from,
        maxTime: row.source_time_max ?? row.basic_time_of_use_weekday_to,
      });
      if (visibleNameKey) matchKeys.add(visibleNameKey);
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

export async function POST(req: NextRequest) {
  const secret = process.env.IMPORT_ADMIN_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey =
    process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";

  try {
    const existingSources = await getExistingSeoulSources();
    const candidateOrder: string[] = [];
    const candidates = new Map<
      string,
      {
        raw: string;
        row: NonNullable<ReturnType<typeof parseSeoulReservationRow>>;
        source: ReturnType<typeof getSeoulReservationSource>;
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
        if (!seoulRow || !source) continue;

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
          candidates.set(candidateKey, { raw: row, row: seoulRow, source });
          continue;
        }

        if (compareSeoulReservationRowsForNext(seoulRow, current.row) < 0) {
          candidates.set(candidateKey, { raw: row, row: seoulRow, source });
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
            "더 넣을 신규 테니스장이 없습니다. (API에 있는 테니스장은 모두 예약 링크가 DB에 있습니다)",
        },
        { status: 409 }
      );
    }

    const payload = {
      basic_court_name: firstCandidate.row.svcName,
      booking_site_link: firstCandidate.row.svcUrl,
      basic_city: extractTag(firstCandidate.raw, "AREANM"),
      basic_latitude: null,
      basic_longitude: null,
      etc_desc: extractTag(firstCandidate.raw, "DTLCONT"),
      basic_time_of_use_weekday_from: extractTag(firstCandidate.raw, "V_MIN"),
      basic_time_of_use_weekday_to: extractTag(firstCandidate.raw, "V_MAX"),
      basic_region: "서울",
      use_or_not: false,
      booking_booking_provide: "public_site",
      time_of_use_same: true,
      ...firstCandidate.source,
    };

    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .insert(payload)
      .select("id,basic_court_name,booking_site_link")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      row: data,
      meta: {
        apiRange: `1-${total || "unknown"}`,
        skippedExistingByUrl: existingSources.links.size,
        skippedExistingByMatchKey: existingSources.matchKeys.size,
        skippedExistingByIdentityKey: existingSources.identityKeys.size,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
