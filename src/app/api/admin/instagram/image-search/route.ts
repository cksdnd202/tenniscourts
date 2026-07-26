import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";

type NaverImageItem = {
  title?: string;
  link?: string;
  thumbnail?: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function normalizeQuery(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, "").trim();
}

async function fetchImageAsDataUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다. (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("이미지 형식이 아닙니다.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("이미지 용량이 너무 큽니다.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("이미지 용량이 너무 큽니다.");
  }

  return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { query?: string; excludeUrls?: string[]; imageUrl?: string };
    const imageUrl = normalizeQuery(body.imageUrl);

    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          return NextResponse.json({ error: "http 또는 https 이미지 URL만 사용할 수 있습니다." }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "올바른 이미지 URL이 아닙니다." }, { status: 400 });
      }

      const dataUrl = await fetchImageAsDataUrl(imageUrl);
      return NextResponse.json({
        image: {
          dataUrl,
          sourceUrl: imageUrl,
          title: "직접 입력한 이미지",
        },
      });
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 환경변수가 필요합니다." },
        { status: 500 }
      );
    }

    const query = normalizeQuery(body.query);
    const excludeUrls = new Set((body.excludeUrls ?? []).map((url) => url.trim()).filter(Boolean));

    if (!query) {
      return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
    }

    const params = new URLSearchParams({
      query,
      display: "20",
      start: "1",
      sort: "sim",
      filter: "large",
    });

    const response = await fetch(`https://openapi.naver.com/v1/search/image.json?${params}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `네이버 이미지 검색 실패: ${response.status} ${text}` },
        { status: 500 }
      );
    }

    const data = (await response.json()) as { items?: NaverImageItem[] };

    for (const item of data.items ?? []) {
      if ((item.link && excludeUrls.has(item.link)) || (item.thumbnail && excludeUrls.has(item.thumbnail))) {
        continue;
      }

      const candidates = [item.link, item.thumbnail].filter(Boolean) as string[];

      for (const imageUrl of candidates) {
        if (excludeUrls.has(imageUrl)) continue;

        try {
          const dataUrl = await fetchImageAsDataUrl(imageUrl);
          return NextResponse.json({
            query,
            image: {
              dataUrl,
              sourceUrl: item.link ?? imageUrl,
              title: stripHtml(item.title),
            },
          });
        } catch {
          // Try the next candidate. Search results often include hotlink-blocked URLs.
        }
      }
    }

    return NextResponse.json({ error: "사용할 수 있는 이미지를 찾지 못했습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지를 찾지 못했습니다." },
      { status: 500 }
    );
  }
}
