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

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseXmlItems(text: string) {
  const items = [...text.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item: RecordLike = {};
    const body = match[1] ?? "";

    for (const fieldMatch of body.matchAll(/<([A-Za-z0-9_:-]+)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const key = fieldMatch[1];
      const value = decodeXml((fieldMatch[2] ?? "").trim());
      if (key) item[key] = value;
    }

    return item;
  });

  const meta: RecordLike = {};
  for (const key of ["totalCount", "pageNo", "numOfRows", "resultCode", "resultMsg"]) {
    const match = text.match(new RegExp(`<${key}\\b[^>]*>([\\s\\S]*?)<\\/${key}>`, "i"));
    if (match?.[1]) meta[key] = decodeXml(match[1].trim());
  }

  return { items, meta };
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const apiKey = process.env.ESHARE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "ESHARE_API_KEY 환경변수가 없습니다." }, { status: 500 });
  }

  const pageNo = parsePositiveInt(req.nextUrl.searchParams.get("pageNo"), 1, 9999);
  const numOfRows = parsePositiveInt(req.nextUrl.searchParams.get("numOfRows"), 100, 100);
  const ctpvCd = req.nextUrl.searchParams.get("ctpvCd")?.trim() || "41";
  const sggCd = req.nextUrl.searchParams.get("sggCd")?.trim();
  const keyword = normalizeText(req.nextUrl.searchParams.get("keyword") ?? "");

  const url = new URL(
    `https://www.eshare.go.kr/eshare-openapi/rsrc/list/010500/${encodeURIComponent(apiKey)}`
  );
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("ctpvCd", ctpvCd);
  if (sggCd) url.searchParams.set("sggCd", sggCd);

  let response: Response;
  let text: string;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    text = await response.text();
  } catch (fetchError) {
    return NextResponse.json(
      {
        error: "공유누리 API 서버에 연결하지 못했습니다.",
        detail: fetchError instanceof Error ? fetchError.message : "알 수 없는 연결 오류",
      },
      { status: 502 }
    );
  }

  let raw: unknown;
  let xmlMeta: RecordLike | null = null;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    const parsedXml = parseXmlItems(text);

    if (parsedXml.items.length === 0) {
      return NextResponse.json(
        {
          error: "공유누리 응답을 JSON/XML 목록으로 읽지 못했습니다.",
          status: response.status,
          contentType: response.headers.get("content-type"),
          body: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    raw = { items: parsedXml.items, meta: parsedXml.meta, responseType: "xml" };
    xmlMeta = parsedXml.meta;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "공유누리 API 요청에 실패했습니다.",
        status: response.status,
        statusText: response.statusText,
        raw,
      },
      { status: 502 }
    );
  }

  const allItems = extractItems(raw);
  const tennisItems = allItems.filter((item) => normalizeText(JSON.stringify(item)).includes("테니스"));
  const items = keyword
    ? tennisItems.filter((item) => normalizeText(JSON.stringify(item)).includes(keyword))
    : tennisItems;

  return NextResponse.json({
    items,
    raw,
    meta: {
      pageNo,
      numOfRows,
      ctpvCd,
      sggCd: sggCd ?? null,
      apiTotalCount: xmlMeta?.totalCount ?? null,
      resultCode: xmlMeta?.resultCode ?? null,
      resultMsg: xmlMeta?.resultMsg ?? null,
      totalRawCount: allItems.length,
      filteredCount: items.length,
      fetchedAt: new Date().toISOString(),
    },
  });
}
