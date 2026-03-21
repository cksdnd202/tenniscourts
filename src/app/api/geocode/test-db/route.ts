import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type CourtRow = {
  id: string;
  basic_court_name: string | null;
  basic_address: string | null;
};

type GeocodeResult = {
  id: string;
  name: string | null;
  address: string;
  ok: boolean;
  lat?: number;
  lng?: number;
  reason?: string;
};

async function geocodeAddress(address: string) {
  const kakaoRestApiKey = (process.env.KAKAO_REST_API_KEY ?? "").trim();

  if (!kakaoRestApiKey) {
    return { ok: false, reason: "missing_kakao_rest_api_key" as const };
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${kakaoRestApiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return { ok: false, reason: `http_${res.status}` as const };
  }

  const data = (await res.json()) as { documents?: Array<{ x?: string; y?: string }> };
  if (!data.documents?.length) {
    return { ok: false, reason: "no_result" as const };
  }

  const first = data.documents[0];
  const lng = first.x != null ? Number.parseFloat(first.x) : Number.NaN;
  const lat = first.y != null ? Number.parseFloat(first.y) : Number.NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, reason: "invalid_coordinate" as const };
  }

  return { ok: true, lat, lng };
}

/** DB 주소 -> 카카오 지오코딩 결과 점검용 API (개발용) */
export async function GET(request: NextRequest) {
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const sampleRaw = request.nextUrl.searchParams.get("sample");
  const limit = Math.min(Math.max(Number.parseInt(limitRaw ?? "30", 10) || 30, 1), 200);
  const sample = sampleRaw === "1" || sampleRaw === "true";

  const query = supabase
    .from("courtinfo")
    .select("id,basic_court_name,basic_address")
    .not("basic_address", "is", null)
    .neq("basic_address", "")
    .limit(limit);

  const { data, error } = sample
    ? await query.order("id", { ascending: false })
    : await query.order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "db_query_failed", detail: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CourtRow[];
  const results: GeocodeResult[] = [];

  for (const row of rows) {
    const address = row.basic_address?.trim();
    if (!address) continue;

    try {
      const g = await geocodeAddress(address);
      if (!g.ok) {
        results.push({
          id: row.id,
          name: row.basic_court_name,
          address,
          ok: false,
          reason: g.reason,
        });
        continue;
      }
      results.push({
        id: row.id,
        name: row.basic_court_name,
        address,
        ok: true,
        lat: g.lat,
        lng: g.lng,
      });
    } catch (e) {
      results.push({
        id: row.id,
        name: row.basic_court_name,
        address,
        ok: false,
        reason: e instanceof Error ? e.message : "unknown_error",
      });
    }
  }

  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;

  return NextResponse.json({
    total: results.length,
    success,
    failed,
    failRate: results.length ? Number(((failed / results.length) * 100).toFixed(1)) : 0,
    results,
  });
}
