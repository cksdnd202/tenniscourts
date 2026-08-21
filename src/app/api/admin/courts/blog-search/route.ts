import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { fetchBlogPreview } from "@/lib/blogPreview";
import { storeBlogThumbnail } from "@/lib/blogThumbnailStorage";

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

function stripHtml(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeForSearch(value: string | null | undefined) {
  return stripHtml(value).toLowerCase().replace(/\s+/g, "");
}

function compactKoreanPlaceName(value: string) {
  return value
    .replace(/\s+(한강공원|공원|테니스장)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBlogSearchNames(courtName: string) {
  const names: string[] = [];
  const seenNames = new Set<string>();
  const addName = (name: string | null | undefined) => {
    const normalizedName = normalizeKeywordPart(name);
    if (!normalizedName || seenNames.has(normalizedName)) return;
    seenNames.add(normalizedName);
    names.push(normalizedName);
  };
  const normalized = normalizeCourtName(courtName);
  if (!normalized) return [];

  const tennisCourtIndex = normalized.indexOf("테니스장");
  if (tennisCourtIndex >= 0) {
    addName(normalized.slice(0, tennisCourtIndex + "테니스장".length).trim());
  }

  const beforeDash = normalized.split(/\s*[-–—]\s*/)[0]?.trim();
  addName(beforeDash);

  const withoutCourtUnit = normalized
    .replace(/\b[ABCDEF]\s*면\b/gi, " ")
    .replace(/\d+\s*번\s*코트/g, " ")
    .replace(/\d+\s*번코트/g, " ")
    .replace(/\d+\s*면/g, " ")
    .replace(/평일|주말|공휴일|주간|야간|저녁|새벽|낮|접수/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutCourtUnit) {
    const unitCleanedTennisCourtIndex = withoutCourtUnit.indexOf("테니스장");
    if (unitCleanedTennisCourtIndex >= 0) {
      addName(withoutCourtUnit.slice(0, unitCleanedTennisCourtIndex + "테니스장".length).trim());
    }
    addName(withoutCourtUnit);
  }
  addName(normalized);

  const expandedNames = names
    .map(normalizeKeywordPart)
    .filter(Boolean)
    .flatMap((name) => {
      const variants = [name, compactKoreanPlaceName(name)];
      if (name.includes("한강공원 테니스장")) {
        variants.push(name.replace(/\s*한강공원\s*/, " ").replace(/\s+/g, " ").trim());
      }
      if (name.includes("한강공원테니스장")) {
        variants.push(name.replace("한강공원테니스장", "테니스장"));
      }
      return variants;
    })
    .map(normalizeKeywordPart)
    .filter((name) => name && name !== "테니스장");

  return Array.from(new Set(expandedNames));
}

function buildBlogSearchQueries({
  courtName,
  region,
  city,
}: {
  courtName: string;
  region: string;
  city: string;
}) {
  const searchNames = buildBlogSearchNames(courtName);
  const primaryName = searchNames[0] ?? courtName;
  const compactPrimaryName = primaryName.replace(/\s+/g, "");
  const baseSuffix = primaryName.includes("테니스장") ? "후기" : "테니스장 후기";
  const queries = [
    [primaryName, baseSuffix].filter(Boolean).join(" "),
    [compactPrimaryName, baseSuffix].filter(Boolean).join(" "),
    [region, city, primaryName, baseSuffix].filter(Boolean).join(" "),
    [primaryName, "예약 후기"].filter(Boolean).join(" "),
    [primaryName, "주차 후기"].filter(Boolean).join(" "),
    ...searchNames.slice(1, 5).flatMap((name) => [
      [name, name.includes("테니스장") ? "후기" : "테니스장 후기"].filter(Boolean).join(" "),
      [name, "예약"].filter(Boolean).join(" "),
    ]),
  ];

  return Array.from(new Set(queries.map(normalizeKeywordPart).filter(Boolean)));
}

function getBlogItemScoreForName(item: NaverBlogItem, courtName: string) {
  const title = stripHtml(item.title);
  const description = stripHtml(item.description);
  const text = normalizeForSearch(`${title} ${description} ${item.bloggername ?? ""}`);
  const titleText = normalizeForSearch(title);
  const compactCourtName = normalizeForSearch(courtName);
  const tokens = courtName
    .split(/\s+/)
    .map((token) => normalizeForSearch(token))
    .filter((token) => token && token !== "테니스장");

  let score = 0;

  if (titleText.includes(compactCourtName)) score += 120;
  else if (text.includes(compactCourtName)) score += 90;

  const matchedTokens = tokens.filter((token) => text.includes(token)).length;
  score += matchedTokens * 25;

  if (titleText.includes("후기")) score += 20;
  if (titleText.includes("예약")) score += 12;
  if (titleText.includes("주차")) score += 8;
  if (titleText.includes("코트")) score += 8;
  if (normalizeForSearch(description).includes("후기")) score += 8;

  if (/주소록|위치\s*정보|충전소|지역화폐|netizen|photo\s*news/i.test(`${title} ${description}`)) {
    score -= 120;
  }

  return score;
}

function getBlogItemScore(item: NaverBlogItem, courtName: string) {
  const searchNames = buildBlogSearchNames(courtName);
  const candidateNames = Array.from(new Set([courtName, ...searchNames]));
  return Math.max(...candidateNames.map((name) => getBlogItemScoreForName(item, name)));
}

async function fetchNaverBlogItems({
  clientId,
  clientSecret,
  query,
}: {
  clientId: string;
  clientSecret: string;
  query: string;
}) {
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
    throw new Error(`네이버 블로그 검색 실패: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { items?: NaverBlogItem[] };
  return data.items ?? [];
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

    const queries = buildBlogSearchQueries({ courtName, region, city });
    const uniqueItems = new Map<string, { item: NaverBlogItem; score: number; order: number }>();

    for (const query of queries) {
      const items = await fetchNaverBlogItems({ clientId, clientSecret, query });
      for (const item of items) {
        if (!item.link) continue;
        if (excludeUrls.has(item.link)) continue;

        const score = getBlogItemScore(item, courtName);
        const existing = uniqueItems.get(item.link);
        if (!existing || score > existing.score) {
          uniqueItems.set(item.link, { item, score, order: uniqueItems.size });
        }
      }
    }

    const selectedItems = Array.from(uniqueItems.values())
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, count)
      .map(({ item }) => item);

    if (selectedItems.length < count) {
      for (const { item } of Array.from(uniqueItems.values()).sort((a, b) => a.order - b.order)) {
        if (selectedItems.some((selected) => selected.link === item.link)) continue;
        if (!item.link) continue;
        selectedItems.push(item);
        if (selectedItems.length >= count) break;
      }
    }

    const links = await Promise.all(
      selectedItems.map((item, index) =>
        fetchBlogPreview({
          url: item.link ?? "",
          title: item.title ?? null,
          description: item.description ?? null,
          source: item.bloggername ?? null,
        }).then(async (preview) => ({
          ...preview,
          thumbnail_url: await storeBlogThumbnail(preview.thumbnail_url),
          sort_order: index,
        }))
      )
    );

    return NextResponse.json({ query: queries[0], queries, links });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
