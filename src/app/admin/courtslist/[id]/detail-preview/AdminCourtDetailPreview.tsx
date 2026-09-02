"use client";

import { useEffect, useState } from "react";
import type { Court, CourtBlogLink, CourtBookingRuleFee } from "@/app/types";
import { CourtDetailBookingSection } from "@/app/detail/CourtDetailBookingSection";
import {
  CourtDetailAddress,
  CourtDetailMap,
  CourtDetailTable,
} from "@/app/detail/CourtDetailCommon";
import { CourtDetailAside, CourtDetailMobileBookBar } from "@/app/detail/CourtDetailAside";
import { CourtFeesSection } from "@/app/detail/CourtFeesSection";
import { ShareButton } from "@/app/detail/ShareButton";
import { FavoriteButton } from "@/app/FavoriteButton";
import { supabase } from "@/lib/supabase";

const STORAGE_PREFIX = "courtskorea:admin-detail-preview:";
const PREVIEW_MAX_AGE_MS = 30 * 60 * 1000;

type RelatedCourt = Pick<
  Court,
  "id" | "slug" | "basic_court_name" | "basic_owner_type" | "basic_region" | "basic_city"
>;

type PreviewPayload = {
  savedAt: number;
  court: Court;
  blogLinks: CourtBlogLink[];
  relatedCourts: RelatedCourt[];
};

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("어드민 기능은 로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(input, { ...init, headers });
}

async function readJson(response: Response, fallback: string) {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : fallback);
  }
  return data;
}

function RelatedReservationPreview({ courts }: { courts: RelatedCourt[] }) {
  if (courts.length === 0) return null;

  return (
    <section className="mt-8 space-y-3">
      <h2 className="font-semibold text-white">이 테니스장의 다른 예약 정보</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {courts.map((court) => (
          <div
            key={court.id}
            className="rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-3"
          >
            <span className="block min-w-0 text-sm font-semibold text-white">
              {court.basic_court_name ?? "이름 없음"}
            </span>
            <p className="mt-1 truncate text-xs text-[#B0B0B0]">
              {[court.basic_region, court.basic_city].filter(Boolean).join(" ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BlogLinksPreview({ links }: { links: CourtBlogLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-white">방문 후기</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {links.slice(0, 3).map((link) => (
          <div
            key={link.id ?? link.url}
            className="overflow-hidden rounded-xl border border-[#2C2C2C] bg-[#1A1A1B]"
          >
            <div className="aspect-[16/9] bg-[#242426]">
              {link.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={link.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#777]">
                  이미지 없음
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              {link.source ? (
                <p className="truncate text-xs font-medium text-[#4ade80]">{link.source}</p>
              ) : null}
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                {link.title ?? "블로그 후기 보기"}
              </h3>
              {link.description ? (
                <p className="line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                  {link.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminCourtDetailPreview({ courtId }: { courtId: string }) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [source, setSource] = useState<"form" | "database">("database");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const storageKey = `${STORAGE_PREFIX}${courtId}`;

      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const stored = JSON.parse(raw) as PreviewPayload;
          if (
            stored?.court?.id === courtId &&
            Number.isFinite(stored.savedAt) &&
            Date.now() - stored.savedAt <= PREVIEW_MAX_AGE_MS
          ) {
            if (!cancelled) {
              setPayload(stored);
              setSource("form");
            }
            return;
          }
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // 임시 데이터가 손상된 경우 DB 데이터를 사용합니다.
      }

      try {
        const [courtResponse, blogResponse, feeResponse] = await Promise.all([
          adminFetch(`/api/admin/courts?id=${encodeURIComponent(courtId)}`, {
            cache: "no-store",
          }),
          adminFetch(`/api/admin/courts/blog-links?courtId=${encodeURIComponent(courtId)}`, {
            cache: "no-store",
          }),
          adminFetch(
            `/api/admin/courts/booking-rule-fees?courtId=${encodeURIComponent(courtId)}`,
            { cache: "no-store" }
          ),
        ]);
        const courtData = await readJson(courtResponse, "테니스장 정보를 불러오지 못했습니다.");
        const blogData = await readJson(blogResponse, "블로그 정보를 불러오지 못했습니다.");
        const feeData = await readJson(feeResponse, "요금정보를 불러오지 못했습니다.");

        if (!cancelled) {
          setPayload({
            savedAt: Date.now(),
            court: {
              ...(courtData.court as Court),
              court_booking_rule_fees: (feeData.fees ?? []) as CourtBookingRuleFee[],
            },
            blogLinks: (blogData.links ?? []) as CourtBlogLink[],
            relatedCourts: [],
          });
          setSource("database");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "정보를 불러오지 못했습니다.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courtId]);

  if (error) {
    return (
      <section className="rounded-xl border border-[#533] bg-[#211] p-6 text-sm text-[#ffd6d6]">
        {error}
      </section>
    );
  }

  if (!payload) {
    return <p className="py-16 text-center text-sm text-[#a7a7a7]">상세페이지를 준비하는 중...</p>;
  }

  const { court, blogLinks, relatedCourts } = payload;

  return (
    <div className="-mx-5 -my-6 md:-mx-8">
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[#31543c] bg-[#102217]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div>
          <p className="text-sm font-semibold text-[#86efac]">상세페이지 개발 테스트</p>
          <p className="mt-0.5 text-xs text-[#9ab9a4]">
            공개 상세페이지와 분리된 화면 · {source === "form" ? "현재 수정 팝업 입력값" : "DB 저장값"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-[#3f6f4c] bg-[#173522] px-4 py-2 text-sm font-semibold text-white hover:bg-[#20462e]"
        >
          수정 화면으로 돌아가기
        </button>
      </div>

      <main className="min-h-screen bg-black pb-44 min-[1032px]:pb-10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 min-[1032px]:px-8 min-[1032px]:py-8">
          <div className="min-[1032px]:grid min-[1032px]:grid-cols-12 min-[1032px]:items-stretch min-[1032px]:gap-8">
            <div className="min-w-0 space-y-6 min-[1032px]:col-span-8 xl:col-span-9">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <h1 className="min-w-0 break-keep text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {court.basic_court_name ?? "(이름 없음)"}
                  </h1>
                  {court.basic_owner_type ? (
                    <span className="flex-shrink-0 whitespace-nowrap rounded bg-[#2C2C2C] px-2 py-1 text-xs font-medium text-white">
                      {court.basic_owner_type}
                    </span>
                  ) : null}
                </div>
                <div className="pointer-events-none inline-flex flex-shrink-0 items-center gap-2">
                  <ShareButton title={court.basic_court_name ?? "Courts Korea"} />
                  <FavoriteButton courtId={court.id} source="detail_page" />
                </div>
              </div>

              <section aria-label="예약 오픈 정보">
                <CourtDetailBookingSection court={court} />
              </section>

              <section aria-label="위치 정보" className="space-y-3 border-y border-[#242426] py-5">
                <CourtDetailAddress court={court} />
                <CourtDetailMap court={court} showResetControl />
              </section>

              <CourtFeesSection court={court} />

              <section>
                <h2 className="mb-3 font-semibold text-white">코트 종류</h2>
                <CourtDetailTable court={court} />
              </section>

              <BlogLinksPreview links={blogLinks} />

              <RelatedReservationPreview courts={relatedCourts} />

              <section>
                <h2 className="mb-3 font-semibold text-white">부가 정보</h2>
                <div className="min-h-[120px] whitespace-pre-wrap rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-4 text-sm text-[#B0B0B0]">
                  {court.etc_desc?.trim() || "등록된 부가 정보가 없습니다."}
                </div>
              </section>
            </div>

            <div className="hidden min-w-0 min-[1032px]:col-span-4 min-[1032px]:block xl:col-span-3">
              <CourtDetailAside court={court} />
            </div>
          </div>
        </div>
      </main>

      <CourtDetailMobileBookBar court={court} />
    </div>
  );
}
