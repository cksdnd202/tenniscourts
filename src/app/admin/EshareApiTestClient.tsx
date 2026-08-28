"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EshareItem = Record<string, unknown>;

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
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data.error ?? fallbackMessage) as AdminApiError;
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
          <p className="text-sm text-[#a7a7a7]">경기도 공유누리 체육시설 API</p>
          <h1 className="mt-2 text-3xl font-semibold">공유누리 API 테스트</h1>
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
