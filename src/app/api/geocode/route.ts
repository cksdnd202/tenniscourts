import { NextRequest, NextResponse } from "next/server";

/** 서버에서 카카오 로컬 API 호출 (REST API Key 노출 방지) */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !address.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const kakaoRestApiKey = (process.env.KAKAO_REST_API_KEY ?? "").trim();

  if (!kakaoRestApiKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY is required for geocoding." },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
    url.searchParams.set("query", address.trim());

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${kakaoRestApiKey}`,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Geocoding failed",
          status: res.status,
          detail: text.slice(0, 500),
          hint:
            res.status === 401
              ? "카카오 개발자 콘솔에서 REST API 키와 Local API 사용 권한을 확인하세요."
              : undefined,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    let data: { documents?: Array<{ x?: string; y?: string }> };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return NextResponse.json({ error: "Invalid response from geocoding API" }, { status: 502 });
    }

    if (!data.documents?.length) {
      return NextResponse.json({ error: "No result for address" }, { status: 404 });
    }

    const first = data.documents[0];
    const x = first.x != null ? parseFloat(first.x) : NaN;
    const y = first.y != null ? parseFloat(first.y) : NaN;
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 502 });
    }

    return NextResponse.json({ lat: y, lng: x });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Geocoding request failed", detail: message },
      { status: 500 }
    );
  }
}
