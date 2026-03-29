import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 100;

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function parseListTotalCount(xml: string): number {
  const m = xml.match(/<list_total_count>\s*(\d+)\s*<\/list_total_count>/i);
  return m ? parseInt(m[1], 10) : 0;
}

function findTennisRows(xml: string): string[] {
  const rows = xml.match(/<row>[\s\S]*?<\/row>/gi) ?? [];
  return rows.filter((row) => extractTag(row, "MINCLASSNM") === "테니스장");
}

async function fetchSeoulPage(
  apiKey: string,
  start: number,
  end: number
): Promise<string> {
  const res = await fetch(
    `http://openapi.seoul.go.kr:8088/${apiKey}/xml/ListPublicReservationSport/${start}/${end}/%20/`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`서울시 API 실패: ${res.status}`);
  }
  return res.text();
}

async function getExistingBookingLinks(): Promise<Set<string>> {
  const links = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("courtinfo")
      .select("booking_site_link")
      .not("booking_site_link", "is", null)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) break;
    for (const row of data) {
      const u = row.booking_site_link?.trim();
      if (u) links.add(u);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return links;
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

        const payload = {
          basic_court_name: name,
          booking_site_link: url,
          basic_city: extractTag(row, "AREANM"),
          etc_desc: extractTag(row, "DTLCONT"),
          basic_time_of_use_weekday_from: extractTag(row, "V_MIN"),
          basic_time_of_use_weekday_to: extractTag(row, "V_MAX"),
          basic_region: "서울",
          use_or_not: false,
          booking_booking_provide: "public_site",
          time_of_use_same: true,
        };

        const { data, error } = await supabaseAdmin
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
            apiRange: `${start}-${end}`,
            skippedExistingByUrl: existingLinks.size,
          },
        });
      }

      if (total > 0 && end >= total) {
        return NextResponse.json(
          {
            error:
              "더 넣을 신규 테니스장이 없습니다. (API에 있는 테니스장은 모두 예약 링크가 DB에 있습니다)",
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
