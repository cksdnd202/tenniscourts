import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";

type CoordinateResult = {
  lat: number;
  lng: number;
  source: string;
  query: string;
};

function normalizeKeyword(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/테니스장\s*\d*/g, "테니스장 ")
    .replace(/\d+(?=\s*$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCoordinates(document: { x?: string; y?: string }, source: string, query: string) {
  const lng = document.x != null ? Number(document.x) : NaN;
  const lat = document.y != null ? Number(document.y) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, source, query } satisfies CoordinateResult;
}

async function kakaoRequest<T>(path: string, params: Record<string, string>) {
  const kakaoRestApiKey = (process.env.KAKAO_REST_API_KEY ?? "").trim();
  if (!kakaoRestApiKey) {
    throw new Error("KAKAO_REST_API_KEY가 필요합니다.");
  }

  const url = new URL(`https://dapi.kakao.com${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${kakaoRestApiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`카카오 좌표 검색 실패: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function searchAddress(address: string): Promise<CoordinateResult | null> {
  if (!address.trim()) return null;

  const data = await kakaoRequest<{
    documents?: Array<{ x?: string; y?: string }>;
  }>("/v2/local/search/address.json", { query: address.trim() });

  const first = data.documents?.[0];
  return first ? parseCoordinates(first, "address", address.trim()) : null;
}

async function searchKeyword(query: string): Promise<CoordinateResult | null> {
  if (!query.trim()) return null;

  const data = await kakaoRequest<{
    documents?: Array<{ x?: string; y?: string }>;
  }>("/v2/local/search/keyword.json", { query: query.trim(), size: "1" });

  const first = data.documents?.[0];
  return first ? parseCoordinates(first, "keyword", query.trim()) : null;
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    address?: unknown;
    name?: unknown;
    mapLink?: unknown;
  };
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  try {
    const addressResult = await searchAddress(address);
    if (addressResult) return NextResponse.json(addressResult);

    const keywordQueries = Array.from(
      new Set(
        [
          name,
          normalizeKeyword(name),
          [normalizeKeyword(name), address].filter(Boolean).join(" "),
          address,
        ].filter((query) => query.trim())
      )
    );

    for (const query of keywordQueries) {
      const keywordResult = await searchKeyword(query);
      if (keywordResult) return NextResponse.json(keywordResult);
    }

    return NextResponse.json(
      { error: "주소와 테니스장명으로 좌표를 찾지 못했습니다." },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "좌표 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
