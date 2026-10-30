import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type RecordLike = Record<string, unknown>;
type SourceKey = "gangwon" | "chungbuk" | "gijang" | "gumi" | "gochang" | "seogwipo";

type RegionalItem = {
  id: string;
  name: string;
  address: string;
  description: string;
  phone: string;
  extra: string;
  raw: RecordLike;
};

const SOURCE_PAGES: Record<SourceKey, string> = {
  gangwon: "https://www.data.go.kr/data/15056034/fileData.do",
  chungbuk: "https://www.data.go.kr/data/15083343/fileData.do",
  gijang: "https://www.data.go.kr/data/15030106/fileData.do",
  gumi: "https://www.data.go.kr/data/15097231/openapi.do",
  gochang: "https://www.data.go.kr/data/15150294/fileData.do",
  seogwipo: "https://www.data.go.kr/data/15057147/openapi.do",
};

const ODCLOUD_SOURCES = {
  gangwon: {
    datasetId: "15056034",
    uddi: "439367fd-e086-48bd-a71a-b2ab5b16cbb1",
  },
  chungbuk: {
    datasetId: "15083343",
    uddi: "ba3013ee-3324-4ab4-93c7-aba1d3e8787c",
  },
  gijang: {
    datasetId: "15030106",
    uddi: "6ff6a15b-7b5e-4989-8533-dd5734e759ed",
  },
  gochang: {
    datasetId: "15150294",
    uddi: "c0062de8-5cd8-4f50-9caa-de28a6c6a5c3",
  },
} as const;

function isRecord(value: unknown): value is RecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function first(row: RecordLike, keys: string[]) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function normalize(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function mapRow(source: SourceKey, row: RecordLike, index: number): RegionalItem {
  if (source === "gangwon") {
    const city = first(row, ["기관명"]);
    const year = first(row, ["연도별"]);
    const count = first(row, ["테니스장"]);
    return {
      id: `${city}-${year}-${index}`,
      name: city ? `${city} 테니스장 통계` : `강원 테니스장 통계 ${index + 1}`,
      address: city,
      description: `테니스장 ${count || "0"}개`,
      phone: "",
      extra: year ? `${year}년 기준` : "",
      raw: row,
    };
  }

  if (source === "chungbuk") {
    return {
      id: `${first(row, ["시설명"])}-${index}`,
      name: first(row, ["시설명"]) || `충북 체육시설 ${index + 1}`,
      address: first(row, ["소재지도로명주소", "소재지지번주소", "소재지"]),
      description: first(row, ["규격"]),
      phone: first(row, ["전화번호"]),
      extra: first(row, ["관리기관"]),
      raw: row,
    };
  }

  if (source === "gijang") {
    return {
      id: `${first(row, ["시설명"])}-${index}`,
      name: first(row, ["시설명"]) || `기장 체육시설 ${index + 1}`,
      address: first(row, ["위치"]),
      description: first(row, ["시설"]),
      phone: first(row, ["전화번호"]),
      extra: first(row, ["예약방법"]),
      raw: row,
    };
  }

  if (source === "gumi") {
    return {
      id: `${first(row, ["cmpnm", "상호"])}-${index}`,
      name: first(row, ["cmpnm", "상호"]) || `구미 체육시설업 ${index + 1}`,
      address: first(row, ["fclty_adres_rn", "시설주소(도로명)", "fclty_adres_lnm", "시설주소(지번)"]),
      description: first(row, ["induty", "업종"]),
      phone: first(row, ["fclty_telno", "시설전화번호"]),
      extra: first(row, ["zip", "우편번호"]),
      raw: row,
    };
  }

  if (source === "gochang") {
    const reservationNo = first(row, ["예약번호"]);
    return {
      id: `${reservationNo}-${index}`,
      name: first(row, ["코트명"]) || `고창 시설물 예약 ${index + 1}`,
      address: first(row, ["시설번호"]),
      description: [first(row, ["시설사용일"]), first(row, ["시작시간"]), first(row, ["종료시간"])]
        .filter(Boolean)
        .join(" · "),
      phone: "",
      extra: reservationNo,
      raw: row,
    };
  }

  return {
    id: `${first(row, ["seq", "stname"])}-${index}`,
    name: first(row, ["stname"]) || `서귀포 체육시설 ${index + 1}`,
    address: [first(row, ["add1"]), first(row, ["add2"])].filter(Boolean).join(" / "),
    description: first(row, ["scale", "title1"]),
    phone: first(row, ["phon"]),
    extra: first(row, ["name"]),
    raw: row,
  };
}

function isTennisRow(source: SourceKey, row: RecordLike) {
  if (source === "gangwon") return Number(row["테니스장"] ?? 0) > 0;
  if (source === "gochang") return true;
  return normalize(JSON.stringify(row)).includes("테니스");
}

async function fetchOdcloud(
  source: keyof typeof ODCLOUD_SOURCES,
  pageNo: number,
  numOfRows: number,
  apiKey: string
) {
  const config = ODCLOUD_SOURCES[source];
  const url = new URL(
    `https://api.odcloud.kr/api/${config.datasetId}/v1/uddi:${config.uddi}`
  );
  url.searchParams.set("page", String(pageNo));
  url.searchParams.set("perPage", String(numOfRows));
  url.searchParams.set("serviceKey", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(raw)) {
    throw new Error(`공공데이터포털 API 요청에 실패했습니다. (${response.status})`);
  }

  const data = Array.isArray(raw.data) ? raw.data.filter(isRecord) : [];
  return {
    rows: data,
    totalCount: Number(raw.totalCount ?? data.length),
    currentCount: Number(raw.currentCount ?? data.length),
  };
}

async function fetchGumi(pageNo: number, numOfRows: number, apiKey: string) {
  const url = new URL("https://apis.data.go.kr/5080000/pafbizSttusService/getPafbizSttus");
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("induty", "테니스장업");

  const response = await fetch(url, { cache: "no-store" });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(raw)) {
    throw new Error(`구미시 API 요청에 실패했습니다. (${response.status})`);
  }

  const serviceError = isRecord(raw.OpenAPI_ServiceResponse) ? raw.OpenAPI_ServiceResponse : null;
  if (serviceError) throw new Error("구미시 API 인증키 또는 활용신청 상태를 확인해 주세요.");

  const responseBody = isRecord(raw.response) && isRecord(raw.response.body) ? raw.response.body : null;
  const itemsValue = responseBody && isRecord(responseBody.items) ? responseBody.items.item : null;
  const rows = (Array.isArray(itemsValue) ? itemsValue : itemsValue ? [itemsValue] : []).filter(isRecord);
  return {
    rows,
    totalCount: Number(responseBody?.totalCount ?? rows.length),
    currentCount: rows.length,
  };
}

async function fetchSeogwipo() {
  const response = await fetch(
    "https://www.seogwipo.go.kr/field/living/sportsfacilities/facilities/data.htm?act=index&format=json",
    { cache: "no-store" }
  );
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(raw)) {
    throw new Error(`서귀포시 API 요청에 실패했습니다. (${response.status})`);
  }
  const rows = Array.isArray(raw.stadiumList) ? raw.stadiumList.filter(isRecord) : [];
  return { rows, totalCount: rows.length, currentCount: rows.length };
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const sourceParam = req.nextUrl.searchParams.get("source") ?? "";
  if (!Object.prototype.hasOwnProperty.call(SOURCE_PAGES, sourceParam)) {
    return NextResponse.json({ error: "지원하지 않는 API 출처입니다." }, { status: 400 });
  }
  const source = sourceParam as SourceKey;
  const pageNo = parsePositiveInt(req.nextUrl.searchParams.get("pageNo"), 1, 9999);
  const numOfRows = parsePositiveInt(req.nextUrl.searchParams.get("numOfRows"), 100, 1000);
  const keyword = normalize(req.nextUrl.searchParams.get("keyword") ?? "");
  const configuredApiKey = process.env.PUBLIC_DATA_PORTAL_API_KEY?.trim() ?? "";
  const requiresApplication = source !== "seogwipo";

  if (source === "gumi" && !configuredApiKey) {
    return NextResponse.json({
      items: [],
      meta: {
        source,
        pageNo,
        numOfRows,
        totalCount: 0,
        sourceUrl: SOURCE_PAGES[source],
        requiresApplication,
        configured: false,
        limitedTestMode: false,
        fetchedAt: new Date().toISOString(),
      },
    });
  }

  try {
    const result =
      source === "seogwipo"
        ? await fetchSeogwipo()
        : source === "gumi"
          ? await fetchGumi(pageNo, numOfRows, configuredApiKey)
          : await fetchOdcloud(
              source as keyof typeof ODCLOUD_SOURCES,
              pageNo,
              numOfRows,
              configuredApiKey || "data-portal-test-key"
            );

    const tennisRows = result.rows.filter((row) => isTennisRow(source, row));
    const keywordRows = keyword
      ? tennisRows.filter((row) => normalize(JSON.stringify(row)).includes(keyword))
      : tennisRows;
    const items = keywordRows.map((row, index) => mapRow(source, row, index));

    return NextResponse.json({
      items,
      meta: {
        source,
        pageNo,
        numOfRows,
        totalCount: result.totalCount,
        currentCount: result.currentCount,
        filteredCount: items.length,
        sourceUrl: SOURCE_PAGES[source],
        requiresApplication,
        configured: !requiresApplication || Boolean(configuredApiKey),
        limitedTestMode: requiresApplication && !configuredApiKey,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "지역 체육시설 API를 불러오지 못했습니다.",
        sourceUrl: SOURCE_PAGES[source],
      },
      { status: 502 }
    );
  }
}
