import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { fetchBlogPreview } from "@/lib/blogPreview";

type NaverBlogItem = {
  title?: string;
  link?: string;
  description?: string;
  bloggername?: string;
  postdate?: string;
};

function normalizeCourtName(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeywordPart(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경변수가 필요합니다." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      courtName?: string;
      region?: string | null;
      city?: string | null;
      excludeUrls?: string[];
      count?: number;
    };
    const courtName = normalizeCourtName(body.courtName ?? "");
    const region = normalizeKeywordPart(body.region);
    const city = normalizeKeywordPart(body.city);
    const excludeUrls = new Set(
      (body.excludeUrls ?? []).map((url) => url.trim()).filter(Boolean)
    );
    const count = Math.min(Math.max(Number(body.count) || 3, 1), 3);

    if (!courtName) {
      return NextResponse.json({ error: "테니스장명이 필요합니다." }, { status: 400 });
    }

    const query = [region, city, courtName, "테니스장 후기"].filter(Boolean).join(" ");
    const params = new URLSearchParams({
      query,
      display: "30",
      start: "1",
      sort: "sim",
    });

    const response = await fetch(`https://openapi.naver.com/v1/search/blog.json?${params}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `네이버 블로그 검색 실패: ${response.status} ${text}` },
        { status: 500 }
      );
    }

    const data = (await response.json()) as { items?: NaverBlogItem[] };
    const uniqueItems = new Map<string, NaverBlogItem>();

    for (const item of data.items ?? []) {
      if (!item.link) continue;
      if (excludeUrls.has(item.link)) continue;
      uniqueItems.set(item.link, item);
      if (uniqueItems.size >= count) break;
    }

    const links = await Promise.all(
      Array.from(uniqueItems.values()).map((item, index) =>
        fetchBlogPreview({
          url: item.link ?? "",
          title: item.title ?? null,
          description: item.description ?? null,
          source: item.bloggername ?? null,
        }).then((preview) => ({ ...preview, sort_order: index }))
      )
    );

    return NextResponse.json({ query, links });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
