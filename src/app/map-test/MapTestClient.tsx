"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatBookingRuleCardText } from "@/app/BookingRulesContent";
import type { Court } from "@/app/types";
import { getCourtDetailPath } from "@/lib/courtPath";
import {
  getNextBookingRuleOpen,
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
  type NextOpenResult,
} from "@/lib/nextBookingOpen";
import { getReservationHref } from "@/lib/reservationLink";

const KAKAO_JAVASCRIPT_KEY = (process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "").trim();
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

type OverlayHandle = {
  setMap: (map: unknown | null) => void;
};

type MapHandle = {
  setCenter?: (center: unknown) => void;
  setLevel?: (level: number) => void;
};

type UpcomingOpen = {
  key: string;
  court: Court;
  label: string;
  result: NextOpenResult;
};

function hasCoordinate(court: Court) {
  return typeof court.basic_latitude === "number" && typeof court.basic_longitude === "number";
}

function getCourtCount(court: Court) {
  return (
    (court.court_count_hard_indoor ?? 0) +
    (court.court_count_hard_outdoor ?? 0) +
    (court.court_count_grass_indoor ?? 0) +
    (court.court_count_grass_outdoor ?? 0) +
    (court.court_count_clay_indoor ?? 0) +
    (court.court_count_clay_outdoor ?? 0)
  );
}

function formatOwnerType(value: string | null | undefined) {
  if (!value) return "운영주체 미입력";
  return value.replaceAll("일반", "전체");
}

function formatRegion(court: Court) {
  return [court.basic_region, court.basic_city].filter(Boolean).join(" ");
}

function sortActiveRules(court: Court) {
  return [...(court.court_booking_rules ?? [])]
    .filter((rule) => rule.is_active)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return (a.label ?? "").localeCompare(b.label ?? "", "ko");
    });
}

function getCourtUpcomingOpens(court: Court): UpcomingOpen[] {
  const rules = sortActiveRules(court);

  if (rules.length > 0) {
    return rules
      .map((rule) => {
        const result = getNextBookingRuleOpen(court, rule);
        if (!result) return null;
        return {
          key: `${court.id}-${rule.id}`,
          court,
          label: formatBookingRuleCardText(rule),
          result,
        };
      })
      .filter((item): item is UpcomingOpen => Boolean(item));
  }

  const owner = getNextOwnerBookingOpen(court);
  const normal = getNextNormalBookingOpen(court);
  const items: UpcomingOpen[] = [];
  if (owner) {
    items.push({
      key: `${court.id}-owner`,
      court,
      label: `${getPriorityBookingLabel(court) ?? "우선"} 예약 오픈`,
      result: owner,
    });
  }
  if (normal) {
    items.push({
      key: `${court.id}-normal`,
      court,
      label: "전체 예약 오픈",
      result: normal,
    });
  }
  return items;
}

function loadKakaoMapScript() {
  if (!KAKAO_JAVASCRIPT_KEY) {
    return Promise.reject(new Error("카카오 지도 JavaScript 키가 없습니다."));
  }

  return new Promise<void>((resolve, reject) => {
    const kakao = (window as any).kakao;
    if (kakao?.maps) {
      kakao.maps.load(() => resolve());
      return;
    }

    const scriptId = "kakao-maps-script";
    const existing = document.getElementById(scriptId);
    if (existing) {
      const wait = () => {
        const nextKakao = (window as any).kakao;
        if (nextKakao?.maps) nextKakao.maps.load(() => resolve());
        else window.setTimeout(wait, 50);
      };
      wait();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JAVASCRIPT_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const nextKakao = (window as any).kakao;
      if (!nextKakao?.maps) {
        reject(new Error("지도 객체를 찾을 수 없습니다."));
        return;
      }
      nextKakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("지도 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export function MapTestClient({ courts }: { courts: Court[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapHandle | null>(null);
  const overlaysRef = useRef<OverlayHandle[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(
    courts.find(hasCoordinate)?.id ?? courts[0]?.id ?? null
  );
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const mappableCourts = useMemo(() => courts.filter(hasCoordinate), [courts]);

  const filteredCourts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courts;
    return courts.filter((court) => {
      const haystack = [
        court.basic_court_name,
        court.basic_address,
        court.basic_region,
        court.basic_city,
        court.basic_owner_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [courts, query]);

  const selectedCourt = useMemo(
    () => (selectedCourtId ? courts.find((court) => court.id === selectedCourtId) ?? null : null),
    [courts, selectedCourtId]
  );

  const upcomingOpens = useMemo(
    () =>
      courts
        .flatMap(getCourtUpcomingOpens)
        .sort((a, b) => a.result.instant.getTime() - b.result.instant.getTime())
        .slice(0, 12),
    [courts]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    loadKakaoMapScript()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const kakao = (window as any).kakao;
        const firstCourt = selectedCourt && hasCoordinate(selectedCourt) ? selectedCourt : mappableCourts[0];
        const center = new kakao.maps.LatLng(
          firstCourt?.basic_latitude ?? DEFAULT_CENTER.lat,
          firstCourt?.basic_longitude ?? DEFAULT_CENTER.lng
        );
        const map = new kakao.maps.Map(mapRef.current, { center, level: 8 }) as MapHandle;
        mapInstanceRef.current = map;
        setMapError(null);
        setIsMapReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setIsMapReady(false);
          setMapError(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;
    if (!isMapReady || !map || !kakao?.maps) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    for (const court of mappableCourts) {
      const position = new kakao.maps.LatLng(court.basic_latitude, court.basic_longitude);
      const marker = document.createElement("button");
      const isSelected = court.id === selectedCourtId;
      marker.type = "button";
      marker.setAttribute("aria-label", `${court.basic_court_name ?? "테니스장"} 위치`);
      marker.className = [
        "map-test-marker",
        isSelected ? "map-test-marker-selected" : "",
      ].join(" ");
      marker.innerHTML = `<span></span>`;
      marker.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedCourtId(court.id);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: marker,
        yAnchor: 1,
      }) as OverlayHandle;
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [isMapReady, mappableCourts, selectedCourtId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;
    if (!isMapReady || !map || !kakao?.maps || !selectedCourt || !hasCoordinate(selectedCourt)) return;
    const center = new kakao.maps.LatLng(selectedCourt.basic_latitude, selectedCourt.basic_longitude);
    map.setCenter?.(center);
    map.setLevel?.(5);
  }, [isMapReady, selectedCourt]);

  const selectedOpens = selectedCourt ? getCourtUpcomingOpens(selectedCourt).slice(0, 3) : [];
  const reservationHref = selectedCourt ? getReservationHref(selectedCourt) : "";

  return (
    <main className="h-screen overflow-hidden bg-black text-white">
      <div className="flex h-full">
        <aside className="z-10 flex h-full w-[430px] shrink-0 flex-col border-r border-[#d9dde3] bg-white text-[#111] shadow-2xl">
          <div className="border-b border-[#ebedf0] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-2xl font-black tracking-[-0.02em] text-[#111]">
                Courts Korea
              </Link>
              <div className="flex rounded-full bg-[#f2f4f7] p-1 text-xs font-bold">
                <Link href="/list-test" className="rounded-full px-3 py-2 text-[#6b7280]">
                  목록으로 보기
                </Link>
                <span className="rounded-full bg-[#27c46b] px-3 py-2 text-white">지도로 보기</span>
              </div>
            </div>
            <label className="mt-4 flex h-11 items-center gap-2 rounded-lg border-2 border-[#27c46b] px-3">
              <span className="text-[#20b862]">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="코트 또는 지역 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#9ca3af]"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-lg text-[#6b7280]">
                  ×
                </button>
              ) : null}
            </label>
            <p className="mt-3 text-xs font-medium text-[#6b7280]">
              {filteredCourts.length}개 코트 · 지도 표시 {mappableCourts.length}개
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="divide-y divide-[#edf0f2]">
              {filteredCourts.map((court) => {
                const isSelected = court.id === selectedCourt?.id;
                const courtOpens = getCourtUpcomingOpens(court);
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setSelectedCourtId(court.id)}
                    className={`block w-full px-5 py-4 text-left transition ${
                      isSelected ? "bg-[#ecfdf3]" : "bg-white hover:bg-[#f8fafc]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-extrabold text-[#111827]">
                          {court.basic_court_name}
                        </h2>
                        <p className="mt-1 truncate text-xs font-semibold text-[#6b7280]">
                          {formatRegion(court) || "지역 미입력"} · {formatOwnerType(court.basic_owner_type)}
                        </p>
                        <p className="mt-2 truncate text-xs text-[#6b7280]">{court.basic_address}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#111827] px-2.5 py-1 text-xs font-bold text-white">
                        {getCourtCount(court)}면
                      </span>
                    </div>
                    <div className="mt-3 rounded-lg bg-[#f3f4f6] px-3 py-2">
                      {courtOpens[0] ? (
                        <p className="truncate text-xs font-bold text-[#111827]">
                          {courtOpens[0].result.dateLabel} {courtOpens[0].result.timeLabel} 오픈
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-[#9ca3af]">예약 오픈 정보 확인 중</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <section className="max-h-[290px] border-t border-[#ebedf0] bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#111827]">
              <span>📅</span> 다가오는 예약 일정
            </h3>
            <div className="mt-3 max-h-[220px] overflow-y-auto pr-1">
              {upcomingOpens.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedCourtId(item.court.id)}
                  className="block w-full border-b border-[#edf0f2] py-3 text-left last:border-b-0"
                >
                  <p className="text-sm font-extrabold text-[#111827]">
                    {item.result.dateLabel} {item.result.timeLabel}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#6b7280]">{item.court.basic_court_name}</p>
                  <p className="mt-0.5 truncate text-xs text-[#9ca3af]">{item.label}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="relative min-w-0 flex-1 bg-[#e9eef3]">
          <div ref={mapRef} className="h-full w-full" />
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111827] text-white">
              <div className="max-w-sm rounded-xl border border-white/10 bg-black/70 p-5 text-center">
                <p className="text-sm font-bold">{mapError}</p>
                <p className="mt-2 text-xs text-[#9ca3af]">
                  테스트 페이지는 현재 프로젝트의 카카오 지도 키를 사용합니다.
                </p>
              </div>
            </div>
          ) : null}

          {selectedCourt ? (
            <article className="absolute right-5 top-5 z-50 w-[360px] rounded-2xl border border-black/10 bg-white p-5 text-[#111] shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="break-keep text-xl font-black">{selectedCourt.basic_court_name}</h2>
                  <p className="mt-2 text-xs font-bold text-[#6b7280]">
                    {formatRegion(selectedCourt)} · {formatOwnerType(selectedCourt.basic_owner_type)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourtId(null)}
                  className="text-xl leading-none text-[#6b7280]"
                >
                  ×
                </button>
              </div>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-[#374151]">
                {selectedCourt.basic_address}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#f3f4f6] px-2 py-3">
                  <p className="text-xs text-[#6b7280]">총 코트</p>
                  <p className="mt-1 text-lg font-black">{getCourtCount(selectedCourt)}면</p>
                </div>
                <div className="rounded-lg bg-[#f3f4f6] px-2 py-3">
                  <p className="text-xs text-[#6b7280]">지도</p>
                  <p className="mt-1 text-lg font-black">{hasCoordinate(selectedCourt) ? "가능" : "대기"}</p>
                </div>
                <div className="rounded-lg bg-[#f3f4f6] px-2 py-3">
                  <p className="text-xs text-[#6b7280]">예약</p>
                  <p className="mt-1 text-lg font-black">{reservationHref ? "가능" : "확인"}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {selectedOpens.length > 0 ? (
                  selectedOpens.map((item) => (
                    <div key={item.key} className="rounded-xl bg-[#f8fafc] px-3 py-3">
                      <p className="text-xs font-bold text-[#27c46b]">{item.label}</p>
                      <p className="mt-1 text-sm font-black">
                        {item.result.dateLabel} {item.result.timeLabel}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-sm font-bold text-[#9ca3af]">
                    예약 오픈 정보를 확인 중입니다.
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href={getCourtDetailPath(selectedCourt)}
                  className="rounded-lg bg-[#111827] px-4 py-3 text-center text-sm font-extrabold text-white"
                >
                  상세보기
                </Link>
                {reservationHref ? (
                  <a
                    href={reservationHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[#27c46b] px-4 py-3 text-center text-sm font-extrabold text-white"
                  >
                    예약하기
                  </a>
                ) : (
                  <span className="rounded-lg bg-[#e5e7eb] px-4 py-3 text-center text-sm font-extrabold text-[#9ca3af]">
                    링크 없음
                  </span>
                )}
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
