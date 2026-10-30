"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EshareItem = Record<string, unknown>;

type RegionalSource = "gangwon" | "chungbuk" | "gijang" | "gumi" | "gochang" | "seogwipo";
type ApiSource = "eshare" | "seoul" | RegionalSource;

type RegionalItem = {
  id: string;
  name: string;
  address: string;
  description: string;
  phone: string;
  extra: string;
  raw: Record<string, unknown>;
};

type RegionalListResponse = {
  items?: RegionalItem[];
  meta?: {
    source?: RegionalSource;
    pageNo?: number;
    numOfRows?: number;
    totalCount?: number;
    currentCount?: number;
    filteredCount?: number;
    sourceUrl?: string;
    requiresApplication?: boolean;
    configured?: boolean;
    limitedTestMode?: boolean;
    fetchedAt?: string;
  };
  error?: string;
  sourceUrl?: string;
};

const REGIONAL_API_TABS: Array<{
  key: RegionalSource;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  limitation?: string;
}> = [
  {
    key: "gangwon",
    label: "강원 체육시설",
    eyebrow: "강원특별자치도 공공체육시설 통계",
    title: "강원 시군별 테니스장 통계",
    description: "시설명이 아닌 시군별·연도별 테니스장 수를 제공하는 통계 데이터입니다.",
    limitation: "개별 테니스장 이름·주소·예약 정보는 포함하지 않습니다.",
  },
  {
    key: "chungbuk",
    label: "충북 체육시설",
    eyebrow: "충청북도 공공체육시설 현황",
    title: "충북 테니스장 목록",
    description: "충청북도 공공체육시설 중 이름 또는 규격에 테니스가 포함된 시설을 표시합니다.",
  },
  {
    key: "gijang",
    label: "부산 기장군",
    eyebrow: "부산광역시 기장군 공공체육시설정보",
    title: "기장군 테니스장 포함 체육시설",
    description: "시설 구성에 테니스장이 포함된 기장군 공공체육시설과 예약 방법을 표시합니다.",
  },
  {
    key: "gumi",
    label: "경북 구미시",
    eyebrow: "경상북도 구미시 체육시설업 현황",
    title: "구미시 테니스 관련 체육시설업",
    description: "등록 체육시설업 데이터에서 테니스장업으로 조회한 결과입니다.",
    limitation: "공공 테니스장 예약 API가 아니라 등록 체육시설업 현황 API입니다.",
  },
  {
    key: "gochang",
    label: "전북 고창군",
    eyebrow: "전북특별자치도 고창군 시설물 예약정보",
    title: "고창군 시설물 예약 데이터",
    description: "시설물 예약 이력의 코트명·사용일·시간·요금을 표시합니다.",
    limitation: "원본 코트명이 대부분 ‘미확인’이라 테니스 예약만 정확히 분리할 수 없습니다.",
  },
  {
    key: "seogwipo",
    label: "제주 서귀포시",
    eyebrow: "제주특별자치도 서귀포시 공공체육시설정보",
    title: "서귀포시 테니스장 목록",
    description: "서귀포시 공공체육시설에서 테니스 종목 시설만 표시합니다.",
  },
];

type SeoulItem = {
  svcId: string;
  svcName: string;
  svcUrl: string;
  areaName: string;
  placeName: string;
  minTime: string;
  maxTime: string;
  status: string;
  receiptBeginAt: string;
  receiptEndAt: string;
  useBeginAt: string;
  useEndAt: string;
};

type SeoulListResponse = {
  items?: SeoulItem[];
  meta?: {
    pageNo?: number;
    numOfRows?: number;
    totalCount?: number;
    apiTotalCount?: number;
    fetchedAt?: string;
  };
  error?: string;
};

type EshareListResponse = {
  items?: EshareItem[];
  meta?: {
    pageNo?: number;
    numOfRows?: number;
    ctpvCd?: string;
    sggCd?: string | null;
    totalRawCount?: number;
    filteredCount?: number;
    fetchedAt?: string;
  };
  error?: string;
};

type AdminApiError = Error & {
  payload?: unknown;
};

const NAME_KEYS = ["rsrcNm", "RSRC_NM", "resourceName", "resourceNm", "fcltNm", "title", "name"];
const RESOURCE_NO_KEYS = ["rsrcNo", "RSRC_NO", "resourceNo", "resourceId", "id"];
const ADDRESS_KEYS = [
  "addr",
  "ADDR",
  "roadAddr",
  "ROAD_ADDR",
  "rnAdres",
  "addrDetail",
  "insttAddr",
  "placeAddr",
];
const ORG_KEYS = ["instNm", "INST_NM", "orgNm", "institutionNm", "mngInstNm", "operInstNm"];
const CATEGORY_KEYS = ["ctgryNm", "CTGRY_NM", "categoryNm", "svcClNm", "rsrcClNm"];
const URL_KEYS = ["url", "URL", "rsrcUrl", "detailUrl", "reserveUrl", "useUrl", "homepageUrl"];

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("어드민 기능은 로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

async function readAdminResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      data = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(typeof data.error === "string" ? data.error : fallbackMessage) as AdminApiError;
    error.payload = data;
    throw error;
  }

  return data as T;
}

function stringifyValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function getField(item: EshareItem | null | undefined, keys: string[]) {
  if (!item) return "";
  for (const key of keys) {
    const value = stringifyValue(item[key]);
    if (value) return value;
  }
  return "";
}

function getDisplayRows(item: EshareItem | null | undefined) {
  if (!item) return [];
  return Object.entries(item).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

export function EshareApiTestClient() {
  const [activeApi, setActiveApi] = useState<ApiSource>("eshare");

  return (
    <div className="flex flex-col gap-5">
      <section className="border-b border-[#2c2c2c] pb-5">
        <p className="text-sm text-[#a7a7a7]">연동 중인 외부 테니스장 데이터 확인</p>
        <h1 className="mt-2 text-3xl font-semibold">API 테스트</h1>
      </section>

      <nav aria-label="API 종류" className="flex gap-2 overflow-x-auto border-b border-[#2c2c2c] pb-3">
        <button
          type="button"
          onClick={() => setActiveApi("eshare")}
          aria-current={activeApi === "eshare" ? "page" : undefined}
          className={`shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
            activeApi === "eshare"
              ? "bg-[#4ade80] text-black"
              : "border border-[#3c3c3c] bg-[#151515] text-[#d8d8d8] hover:bg-[#242424]"
          }`}
        >
          공유누리 체육시설
        </button>
        <button
          type="button"
          onClick={() => setActiveApi("seoul")}
          aria-current={activeApi === "seoul" ? "page" : undefined}
          className={`shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
            activeApi === "seoul"
              ? "bg-[#4ade80] text-black"
              : "border border-[#3c3c3c] bg-[#151515] text-[#d8d8d8] hover:bg-[#242424]"
          }`}
        >
          서울시 공공서비스 예약
        </button>
        {REGIONAL_API_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveApi(tab.key)}
            aria-current={activeApi === tab.key ? "page" : undefined}
            className={`shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
              activeApi === tab.key
                ? "bg-[#4ade80] text-black"
                : "border border-[#3c3c3c] bg-[#151515] text-[#d8d8d8] hover:bg-[#242424]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeApi === "eshare" ? (
        <EsharePanel />
      ) : activeApi === "seoul" ? (
        <SeoulApiPanel />
      ) : (
        <RegionalApiPanel source={activeApi} />
      )}
    </div>
  );
}

function EsharePanel() {
  const [items, setItems] = useState<EshareItem[]>([]);
  const [meta, setMeta] = useState<EshareListResponse["meta"] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<unknown>(null);
  const [selectedItem, setSelectedItem] = useState<EshareItem | null>(null);
  const [detailItem, setDetailItem] = useState<EshareItem | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const selectedName = useMemo(() => {
    const target = detailItem ?? selectedItem;
    return getField(target, NAME_KEYS) || "공유누리 자원 상세";
  }, [detailItem, selectedItem]);

  async function loadItems(nextPageNo = pageNo) {
    setIsLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const params = new URLSearchParams({
        pageNo: String(nextPageNo),
        numOfRows: "100",
        ctpvCd: "41",
      });
      if (keyword.trim()) params.set("keyword", keyword.trim());

      const response = await adminFetch(`/api/admin/eshare/tennis?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readAdminResponse<EshareListResponse>(
        response,
        "공유누리 테니스장 목록을 불러오지 못했습니다."
      );

      setItems(data.items ?? []);
      setMeta(data.meta ?? null);
      setPageNo(nextPageNo);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "공유누리 테니스장 목록을 불러오지 못했습니다.";
      setError(message);
      setErrorDetail(loadError instanceof Error ? (loadError as AdminApiError).payload ?? null : null);
    } finally {
      setIsLoading(false);
    }
  }

  async function openDetail(item: EshareItem) {
    setSelectedItem(item);
    setDetailItem(null);
    setDetailError(null);

    const rsrcNo = getField(item, RESOURCE_NO_KEYS);
    if (!rsrcNo) {
      setDetailError("이 항목에서는 상세 조회에 필요한 rsrcNo 값을 찾지 못했습니다.");
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await adminFetch(
        `/api/admin/eshare/detail?rsrcNo=${encodeURIComponent(rsrcNo)}`,
        { cache: "no-store" }
      );
      const data = await readAdminResponse<{ item?: EshareItem }>(
        response,
        "공유누리 상세 정보를 불러오지 못했습니다."
      );
      setDetailItem(data.item ?? null);
    } catch (detailLoadError) {
      setDetailError(
        detailLoadError instanceof Error
          ? detailLoadError.message
          : "공유누리 상세 정보를 불러오지 못했습니다."
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    loadItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detailTarget = detailItem ?? selectedItem;
  const detailRows = getDisplayRows(detailTarget);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[#a7a7a7]">전국 공공 체육시설 데이터</p>
          <h2 className="mt-2 text-2xl font-semibold">공유누리 테니스장 목록</h2>
        </div>
        <button
          type="button"
          onClick={() => loadItems(pageNo)}
          disabled={isLoading}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </section>

      <section className="rounded-xl border border-[#2c2c2c] bg-[#151515] p-4">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            loadItems(1);
          }}
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-[#d8d8d8]" htmlFor="eshare-keyword">
              결과 내 검색
            </label>
            <input
              id="eshare-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: 성남, 테니스장, 공원"
              className="w-full rounded-lg border border-[#3c3c3c] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-[#777] focus:border-[#4ade80]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-[#4ade80] px-5 py-3 text-sm font-bold text-black hover:bg-[#65f093] disabled:cursor-not-allowed disabled:opacity-60 md:mt-7"
          >
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#a7a7a7]">
          <span className="rounded-full bg-[#242424] px-3 py-1">지역 코드 41</span>
          <span className="rounded-full bg-[#242424] px-3 py-1">체육시설 중 테니스 필터</span>
          {meta ? (
            <span className="rounded-full bg-[#242424] px-3 py-1">
              원본 {meta.totalRawCount ?? 0}개 / 표시 {meta.filteredCount ?? items.length}개
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">
          <p className="font-semibold">{error}</p>
          {errorDetail ? (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs leading-5 text-[#ffd6d6]">
              {JSON.stringify(errorDetail, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#2c2c2c] bg-[#111]">
        <div className="grid grid-cols-[1.3fr_1.2fr_0.8fr] gap-3 border-b border-[#2c2c2c] px-4 py-3 text-xs font-semibold text-[#9ca3af] md:grid-cols-[1.5fr_1.7fr_1fr_0.9fr]">
          <span>자원명</span>
          <span>주소</span>
          <span className="hidden md:block">운영기관</span>
          <span>분류</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-[#a7a7a7]">공유누리 목록을 불러오고 있습니다.</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#a7a7a7]">표시할 테니스장 정보가 없습니다.</div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {items.map((item, index) => {
              const name = getField(item, NAME_KEYS) || `이름 없음 ${index + 1}`;
              const address = getField(item, ADDRESS_KEYS) || "-";
              const org = getField(item, ORG_KEYS) || "-";
              const category = getField(item, CATEGORY_KEYS) || "-";
              const rsrcNo = getField(item, RESOURCE_NO_KEYS);

              return (
                <button
                  type="button"
                  key={`${rsrcNo || name}-${index}`}
                  onClick={() => openDetail(item)}
                  className="grid w-full grid-cols-[1.3fr_1.2fr_0.8fr] gap-3 px-4 py-4 text-left text-sm transition-colors hover:bg-[#1c1c1c] md:grid-cols-[1.5fr_1.7fr_1fr_0.9fr]"
                >
                  <span className="font-semibold text-white">{name}</span>
                  <span className="line-clamp-2 text-[#c7c7c7]">{address}</span>
                  <span className="hidden text-[#a7a7a7] md:block">{org}</span>
                  <span className="text-[#a7a7a7]">{category}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => loadItems(Math.max(1, pageNo - 1))}
          disabled={isLoading || pageNo <= 1}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-sm text-[#a7a7a7]">{pageNo} 페이지</span>
        <button
          type="button"
          onClick={() => loadItems(pageNo + 1)}
          disabled={isLoading}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#3c3c3c] bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#2c2c2c] px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-[#4ade80]">공유누리 상세 데이터</p>
                <h2 className="mt-1 text-2xl font-bold">{selectedName}</h2>
                {isDetailLoading ? <p className="mt-2 text-sm text-[#a7a7a7]">상세 정보를 불러오는 중입니다.</p> : null}
                {detailError ? <p className="mt-2 text-sm text-[#ffb4b4]">{detailError}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setDetailItem(null);
                  setDetailError(null);
                }}
                className="rounded-lg border border-[#3c3c3c] bg-[#242424] px-3 py-2 text-sm font-semibold hover:bg-[#333]"
              >
                닫기
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label="자원번호" value={getField(detailTarget, RESOURCE_NO_KEYS)} />
                <InfoRow label="자원명" value={getField(detailTarget, NAME_KEYS)} />
                <InfoRow label="주소" value={getField(detailTarget, ADDRESS_KEYS)} />
                <InfoRow label="운영기관" value={getField(detailTarget, ORG_KEYS)} />
                <InfoRow label="분류" value={getField(detailTarget, CATEGORY_KEYS)} />
                <InfoRow label="URL" value={getField(detailTarget, URL_KEYS)} />
              </div>

              <h3 className="mt-6 text-lg font-semibold">전체 필드</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#2c2c2c]">
                {detailRows.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#252525] px-4 py-3 last:border-b-0"
                  >
                    <span className="break-all text-sm font-semibold text-[#9ca3af]">{key}</span>
                    <span className="min-w-0 break-all text-sm text-[#e5e7eb]">
                      {typeof value === "object" && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-lg font-semibold">원본 JSON</h3>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#2c2c2c] bg-black p-4 text-xs leading-5 text-[#d8d8d8]">
                {JSON.stringify(detailTarget, null, 2)}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2c2c2c] bg-black px-4 py-3">
      <p className="text-xs font-semibold text-[#8b8b8b]">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-white">{value || "-"}</p>
    </div>
  );
}

function SeoulApiPanel() {
  const [items, setItems] = useState<SeoulItem[]>([]);
  const [meta, setMeta] = useState<SeoulListResponse["meta"] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems(nextPageNo = pageNo) {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        pageNo: String(nextPageNo),
        numOfRows: "50",
      });
      if (keyword.trim()) params.set("keyword", keyword.trim());

      const response = await adminFetch(`/api/admin/seoul/tennis?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readAdminResponse<SeoulListResponse>(
        response,
        "서울시 테니스 예약 목록을 불러오지 못했습니다."
      );

      setItems(data.items ?? []);
      setMeta(data.meta ?? null);
      setPageNo(nextPageNo);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "서울시 테니스 예약 목록을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = meta?.totalCount ?? items.length;
  const pageSize = meta?.numOfRows ?? 50;
  const hasNextPage = pageNo * pageSize < totalCount;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[#a7a7a7]">서울시 공공서비스 예약 데이터</p>
          <h2 className="mt-2 text-2xl font-semibold">서울시 테니스 예약 목록</h2>
        </div>
        <button
          type="button"
          onClick={() => loadItems(pageNo)}
          disabled={isLoading}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "불러오는 중" : "새로고침"}
        </button>
      </section>

      <section className="rounded-xl border border-[#2c2c2c] bg-[#151515] p-4">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            loadItems(1);
          }}
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-[#d8d8d8]" htmlFor="seoul-api-keyword">
              테니스장 검색
            </label>
            <input
              id="seoul-api-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: 송파구, 올림픽공원"
              className="w-full rounded-lg border border-[#3c3c3c] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-[#777] focus:border-[#4ade80]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-[#4ade80] px-5 py-3 text-sm font-bold text-black hover:bg-[#65f093] disabled:cursor-not-allowed disabled:opacity-60 md:mt-7"
          >
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#a7a7a7]">
          <span className="rounded-full bg-[#242424] px-3 py-1">테니스장 분류만 표시</span>
          <span className="rounded-full bg-[#242424] px-3 py-1">전체 {meta?.apiTotalCount ?? 0}건</span>
          {keyword.trim() ? (
            <span className="rounded-full bg-[#242424] px-3 py-1">검색 결과 {totalCount}건</span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#2c2c2c] bg-[#111]">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-3 border-b border-[#2c2c2c] px-4 py-3 text-xs font-semibold text-[#9ca3af] md:grid-cols-[1.5fr_1fr_1.2fr_0.7fr]">
          <span>서비스명</span>
          <span>지역·장소</span>
          <span className="hidden md:block">접수 기간</span>
          <span>상태</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-[#a7a7a7]">서울시 목록을 불러오고 있습니다.</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#a7a7a7]">표시할 테니스장 정보가 없습니다.</div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {items.map((item, index) => (
              <a
                key={`${item.svcId}-${index}`}
                href={item.svcUrl}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-3 px-4 py-4 text-left text-sm transition-colors hover:bg-[#1c1c1c] md:grid-cols-[1.5fr_1fr_1.2fr_0.7fr]"
              >
                <span>
                  <strong className="line-clamp-2 block text-white">{item.svcName || "-"}</strong>
                  <small className="mt-1 block text-xs text-[#777]">
                    {[item.minTime, item.maxTime].filter(Boolean).join(" ~ ") || "이용시간 정보 없음"}
                  </small>
                </span>
                <span className="line-clamp-2 text-[#c7c7c7]">
                  {[item.areaName, item.placeName].filter(Boolean).join(" / ") || "-"}
                </span>
                <span className="hidden text-xs leading-5 text-[#a7a7a7] md:block">
                  {item.receiptBeginAt || "-"}
                  <br />
                  {item.receiptEndAt || "-"}
                </span>
                <span className="text-[#a7a7a7]">{item.status || "-"}</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => loadItems(Math.max(1, pageNo - 1))}
          disabled={isLoading || pageNo <= 1}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-sm text-[#a7a7a7]">{pageNo} 페이지</span>
        <button
          type="button"
          onClick={() => loadItems(pageNo + 1)}
          disabled={isLoading || !hasNextPage}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function RegionalApiPanel({ source }: { source: RegionalSource }) {
  const config = REGIONAL_API_TABS.find((tab) => tab.key === source) ?? REGIONAL_API_TABS[0];
  const [items, setItems] = useState<RegionalItem[]>([]);
  const [meta, setMeta] = useState<RegionalListResponse["meta"] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems(nextPageNo = pageNo, nextKeyword = keyword) {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        source,
        pageNo: String(nextPageNo),
        numOfRows: source === "gochang" ? "100" : "1000",
      });
      if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());

      const response = await adminFetch(`/api/admin/regional-sports?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readAdminResponse<RegionalListResponse>(
        response,
        `${config.label} 데이터를 불러오지 못했습니다.`
      );
      setItems(data.items ?? []);
      setMeta(data.meta ?? null);
      setPageNo(nextPageNo);
    } catch (loadError) {
      setItems([]);
      setMeta(null);
      setError(loadError instanceof Error ? loadError.message : `${config.label} 데이터를 불러오지 못했습니다.`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setKeyword("");
    setPageNo(1);
    setItems([]);
    setMeta(null);
    loadItems(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const pageSize = meta?.limitedTestMode ? meta.currentCount ?? 10 : meta?.numOfRows ?? 100;
  const hasNextPage =
    !meta?.limitedTestMode && source !== "seogwipo" && pageNo * pageSize < (meta?.totalCount ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[#a7a7a7]">{config.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold">{config.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a7a7a7]">{config.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {meta?.sourceUrl ? (
            <a
              href={meta.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424]"
            >
              공식 출처
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => loadItems(pageNo)}
            disabled={isLoading}
            className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "불러오는 중" : "새로고침"}
          </button>
        </div>
      </section>

      {config.limitation ? (
        <div className="rounded-xl border border-[#56451c] bg-[#211d12] px-4 py-3 text-sm leading-6 text-[#f8d889]">
          {config.limitation}
        </div>
      ) : null}

      {meta?.requiresApplication && !meta.configured ? (
        <div className="rounded-xl border border-[#28543a] bg-[#102118] p-4 text-sm leading-6 text-[#c8f7d7]">
          <p className="font-semibold text-white">
            {meta.limitedTestMode ? "현재 공공 테스트 키로 제한 조회 중입니다." : "API 활용신청과 인증키 설정이 필요합니다."}
          </p>
          <p className="mt-1 text-[#a9d9b9]">
            공공데이터포털에서 이 데이터의 활용신청을 완료한 뒤 서버 환경변수
            <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 text-[#7ff0a6]">PUBLIC_DATA_PORTAL_API_KEY</code>
            에 일반 인증키(Decoding)를 등록하면 전체 조회와 페이지 이동이 활성화됩니다.
          </p>
          {meta.sourceUrl ? (
            <a
              href={meta.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-lg bg-[#4ade80] px-4 py-2 font-bold text-black hover:bg-[#65f093]"
            >
              활용신청 페이지 열기
            </a>
          ) : null}
        </div>
      ) : meta?.requiresApplication ? (
        <div className="rounded-lg border border-[#28543a] bg-[#102118] px-4 py-3 text-sm text-[#b9e9c8]">
          공공데이터포털 인증키가 연결되어 있습니다.
        </div>
      ) : (
        <div className="rounded-lg border border-[#2c2c2c] bg-[#151515] px-4 py-3 text-sm text-[#bdbdbd]">
          별도 활용신청이나 인증키 없이 서귀포시 공개 JSON API를 호출합니다.
        </div>
      )}

      <section className="rounded-xl border border-[#2c2c2c] bg-[#151515] p-4">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            loadItems(1);
          }}
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-[#d8d8d8]" htmlFor={`${source}-api-keyword`}>
              현재 조회 결과에서 검색
            </label>
            <input
              id={`${source}-api-keyword`}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="시설명, 지역, 주소 검색"
              className="w-full rounded-lg border border-[#3c3c3c] bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-[#777] focus:border-[#4ade80]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-[#4ade80] px-5 py-3 text-sm font-bold text-black hover:bg-[#65f093] disabled:cursor-not-allowed disabled:opacity-60"
          >
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#a7a7a7]">
          <span className="rounded-full bg-[#242424] px-3 py-1">API 전체 {meta?.totalCount ?? 0}건</span>
          <span className="rounded-full bg-[#242424] px-3 py-1">현재 표시 {items.length}건</span>
          {meta?.limitedTestMode ? (
            <span className="rounded-full bg-[#4a3510] px-3 py-1 text-[#ffd27a]">테스트 키: 첫 10건 제한</span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">{error}</div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#2c2c2c] bg-[#111]">
        <div className="grid grid-cols-[1.2fr_1fr] gap-3 border-b border-[#2c2c2c] px-4 py-3 text-xs font-semibold text-[#9ca3af] md:grid-cols-[1.2fr_1.4fr_1.2fr_0.8fr]">
          <span>시설·항목</span>
          <span>주소·지역</span>
          <span className="hidden md:block">시설·예약 정보</span>
          <span className="hidden md:block">연락처·관리기관</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-[#a7a7a7]">데이터를 불러오고 있습니다.</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm leading-6 text-[#a7a7a7]">
            {meta?.requiresApplication && !meta.configured && !meta.limitedTestMode
              ? "활용신청 후 인증키를 등록하면 결과를 확인할 수 있습니다."
              : "현재 응답에서 표시할 테니스 관련 정보가 없습니다."}
          </div>
        ) : (
          <div className="divide-y divide-[#252525]">
            {items.map((item) => (
              <details key={item.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[1.2fr_1fr] gap-3 px-4 py-4 text-sm transition-colors hover:bg-[#1c1c1c] md:grid-cols-[1.2fr_1.4fr_1.2fr_0.8fr]">
                  <strong className="line-clamp-2 text-white">{item.name || "-"}</strong>
                  <span className="line-clamp-2 text-[#c7c7c7]">{item.address || "-"}</span>
                  <span className="hidden line-clamp-2 text-[#a7a7a7] md:block">{item.description || "-"}</span>
                  <span className="hidden line-clamp-2 text-[#a7a7a7] md:block">
                    {[item.phone, item.extra].filter(Boolean).join(" / ") || "-"}
                  </span>
                </summary>
                <pre className="max-h-80 overflow-auto border-t border-[#252525] bg-black p-4 text-xs leading-5 text-[#d8d8d8]">
                  {JSON.stringify(item.raw, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => loadItems(Math.max(1, pageNo - 1))}
          disabled={isLoading || pageNo <= 1 || Boolean(meta?.limitedTestMode)}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        <span className="text-sm text-[#a7a7a7]">{pageNo} 페이지</span>
        <button
          type="button"
          onClick={() => loadItems(pageNo + 1)}
          disabled={isLoading || !hasNextPage}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}
