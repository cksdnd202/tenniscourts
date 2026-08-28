import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type RecordLike = Record<string, unknown>;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toArray(value: unknown): unknown[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getPath(source: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, source);
}

function extractItems(raw: unknown) {
  const candidates = [
    ["response", "body", "items", "item"],
    ["response", "body", "items"],
    ["body", "items", "item"],
    ["body", "items"],
    ["items", "item"],
    ["items"],
    ["data"],
    ["result"],
    ["list"],
  ];

  for (const path of candidates) {
    const value = getPath(raw, path);
    const items = toArray(value).filter(isRecord);
    if (items.length > 0) return items;
  }

  return [];
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error("공유누리 상세 응답을 JSON으로 읽지 못했습니다.");
  }
}

async function fetchDetailByGet(endpoint: string, rsrcNo: string) {
  const getUrl = new URL(endpoint);
  getUrl.searchParams.set("rsrcNoList", rsrcNo);
  const response = await fetch(getUrl, { cache: "no-store" });
  const raw = await readJsonResponse(response);

  return { response, raw };
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const apiKey = process.env.ESHARE_API_KEY?.trim();
  const rsrcNo = req.nextUrl.searchParams.get("rsrcNo")?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "ESHARE_API_KEY 환경변수가 없습니다." }, { status: 500 });
  }

  if (!rsrcNo) {
    return NextResponse.json({ error: "rsrcNo가 필요합니다." }, { status: 400 });
  }

  const endpoint = `https://www.eshare.go.kr/eshare-openapi/rsrc/detail/${encodeURIComponent(apiKey)}`;

  const postResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rsrcNoList: [rsrcNo] }),
    cache: "no-store",
  });

  let raw: unknown;
  try {
    raw = await readJsonResponse(postResponse);
  } catch {
    const fallback = await fetchDetailByGet(endpoint, rsrcNo);
    raw = fallback.raw;

    if (!fallback.response.ok) {
      return NextResponse.json(
        { error: "공유누리 상세 API 요청에 실패했습니다.", status: fallback.response.status, raw },
        { status: 502 }
      );
    }
  }

  if (!postResponse.ok) {
    const fallback = await fetchDetailByGet(endpoint, rsrcNo);

    if (fallback.response.ok) {
      raw = fallback.raw;
    } else {
      raw = fallback.raw;

      return NextResponse.json(
        { error: "공유누리 상세 API 요청에 실패했습니다.", status: fallback.response.status, raw },
        { status: 502 }
      );
    }
  }

  if (!raw) {
    return NextResponse.json(
      { error: "공유누리 상세 API 응답이 비어 있습니다." },
      { status: 502 }
    );
  }

  const items = extractItems(raw);

  return NextResponse.json({
    item: items[0] ?? raw,
    raw,
  });
}
