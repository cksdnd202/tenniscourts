import { NextRequest, NextResponse } from "next/server";

/** 서버에서 네이버 지오코딩 API 호출 (Client Secret 노출 방지) */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !address.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_MAP_CLIENT_ID and NAVER_MAP_CLIENT_SECRET are required for geocoding." },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode");
    url.searchParams.set("query", address.trim());

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-ncp-apigw-api-key-id": clientId,
        "x-ncp-apigw-api-key": clientSecret,
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
              ? "네이버 콘솔에서 지오코딩 사용 가능한 Application의 Client ID·Secret(API Key)을 확인하세요."
              : undefined,
        },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    let data: { status?: string; addresses?: Array<{ x?: string; y?: string }> };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return NextResponse.json({ error: "Invalid response from geocoding API" }, { status: 502 });
    }

    if (data.status !== "OK" || !data.addresses?.length) {
      return NextResponse.json({ error: "No result for address" }, { status: 404 });
    }

    const first = data.addresses[0];
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
