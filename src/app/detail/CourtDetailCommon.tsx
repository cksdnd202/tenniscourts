"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Court } from "../types";
import { getReservationHref } from "@/lib/reservationLink";
import { getPhoneReservationHref, isPhoneReservationCourt } from "@/lib/phoneReservation";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { getCourtSurfaceRows, getSportVenueLabel, normalizeSportType } from "@/lib/sports";

const KAKAO_JAVASCRIPT_KEY = (process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "").trim();

declare global {
  interface Window {
    kakao?: {
      maps?: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => {
          setCenter: (center: unknown) => void;
          setLevel: (level: number) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: { position: unknown }) => { setMap: (map: unknown) => void };
      };
    };
  }
}
import {
  courtitem_courtaddress,
  courtitem_courtmaplink,
  th,
  td,
  tdIcon,
  fmt,
} from "../styles";

function PhoneCallIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8 9.71a16 16 0 0 0 6.29 6.29l1.25-1.25a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

/** 상세 페이지: 주소 + 지도에서 보기 링크 */
export function CourtDetailAddress({
  court,
  showNearbyAction = false,
}: {
  court: Court;
  showNearbyAction?: boolean;
}) {
  if (!court.basic_address) return null;
  const venueLabel = getSportVenueLabel(court.sport_type);
  const isBadminton = normalizeSportType(court.sport_type) === "badminton";
  const nearbyTextClass = isBadminton ? "text-[#337DFF]" : "text-[#6FCF97]";
  const canOpenNearbyMap =
    typeof court.basic_latitude === "number" && typeof court.basic_longitude === "number";

  return (
    <div data-detail-address="true" className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-center gap-0.5">
        <Image
          src="/icon/icon_map.svg"
          alt="지도"
          width={16}
          height={16}
          className="flex-shrink-0"
        />
        <span className={`${courtitem_courtaddress} truncate`}>{court.basic_address}</span>
        <a
          data-detail-map-link="true"
          href={`/map?courtId=${encodeURIComponent(court.id)}`}
          className={`${courtitem_courtmaplink} flex-shrink-0`}
        >
          지도에서 보기
        </a>
      </div>

      {showNearbyAction && canOpenNearbyMap ? (
        <a
          data-detail-nearby="true"
          href={`/map?nearbyCourtId=${encodeURIComponent(court.id)}`}
          onClick={() =>
            capturePostHogEvent("nearby_courts_button_clicked", {
              courtId: court.id,
              courtName: court.basic_court_name,
              city: court.basic_city,
              source: "detail_page",
            })
          }
          aria-label={`${court.basic_court_name ?? `현재 ${venueLabel}`} 근처 ${venueLabel} 지도에서 보기`}
          className={`${nearbyTextClass} inline-flex h-9 flex-shrink-0 self-end items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#343438] bg-[#1A1A1B] px-3 text-xs font-semibold transition hover:border-[#4A4A50] hover:bg-[#222224] active:scale-[0.98] sm:self-auto`}
          style={{ color: isBadminton ? "#337DFF" : "#6FCF97" }}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          근처 {venueLabel} 보기
        </a>
      ) : null}
    </div>
  );
}
const DEFAULT_CENTER = { lat: 37.3595704, lng: 127.105399 };
const DETAIL_MAP_LEVEL = 3;

export function CourtDetailMap({
  court,
  showResetControl = false,
}: {
  court: Court;
  showResetControl?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: unknown) => void;
    setLevel: (level: number) => void;
  } | null>(null);
  const initialCenterRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(
    KAKAO_JAVASCRIPT_KEY ? null : "카카오 지도 JavaScript 키를 설정해 주세요."
  );
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const address = court.basic_address?.trim() || "";
  const latitude = court.basic_latitude;
  const longitude = court.basic_longitude;

  useEffect(() => {
    if (!mapRef.current || !KAKAO_JAVASCRIPT_KEY) {
      return;
    }
    mapInstanceRef.current = null;
    initialCenterRef.current = null;
    const scriptId = "kakao-maps-script";

    const loadScript = (): Promise<void> => {
      if (typeof window !== "undefined" && window.kakao?.maps) {
        return new Promise((resolve) => window.kakao?.maps?.load(() => resolve()));
      }
      const existing = document.getElementById(scriptId);
      if (existing) {
        return new Promise((resolve) => {
          const check = () => {
            if (window.kakao?.maps) window.kakao.maps.load(() => resolve());
            else setTimeout(check, 50);
          };
          check();
        });
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JAVASCRIPT_KEY}&autoload=false`;
        script.async = true;
        script.onload = () => {
          if (!window.kakao?.maps) {
            reject(new Error("카카오 지도 객체를 찾을 수 없습니다."));
            return;
          }
          window.kakao.maps.load(() => resolve());
        };
        script.onerror = () => reject(new Error("지도 스크립트 로드 실패"));
        document.head.appendChild(script);
      });
    };

    const initMap = (lat: number, lng: number) => {
      if (!mapRef.current?.isConnected || !window.kakao?.maps) {
        setError("지도를 불러올 수 없습니다.");
        return;
      }
      try {
        const el = mapRef.current;
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(el, { center, level: DETAIL_MAP_LEVEL });
        const marker = new window.kakao.maps.Marker({ position: center });
        marker.setMap(map);
        mapInstanceRef.current = map;
        initialCenterRef.current = center;
        setMapReady(true);
      } catch {
        setError("지도를 불러올 수 없습니다.");
      }
    };

    const run = (lat: number, lng: number) => {
      loadScript()
        .then(() => initMap(lat, lng))
        .catch(() => setError("지도를 불러올 수 없습니다."));
    };

    const cleanup = () => {
      mapInstanceRef.current = null;
      initialCenterRef.current = null;
    };

    if (typeof latitude === "number" && typeof longitude === "number") {
      run(latitude, longitude);
      return cleanup;
    }

    if (!address) {
      return cleanup;
    }

    fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      .then((res) => {
        if (res.ok) return res.json() as Promise<{ lat: number; lng: number }>;
        setGeocodeFailed(true);
        return { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };
      })
      .then((coord) => run(coord.lat, coord.lng))
      .catch(() => {
        setGeocodeFailed(true);
        run(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      });

    return cleanup;
  }, [address, latitude, longitude]);

  function resetMapPosition() {
    const map = mapInstanceRef.current;
    const center = initialCenterRef.current;
    if (!map || !center) return;

    map.setLevel(DETAIL_MAP_LEVEL);
    map.setCenter(center);
  }

  if (!court.basic_address) return null;
  if (error) {
    return (
      <div className="w-full min-h-[260px] rounded-2xl border border-[#2C2C2C] bg-[#1A1A1B] flex items-center justify-center">
        <span className="text-[#6B7280] text-sm">{error}</span>
      </div>
    );
  }
  return (
    <div data-detail-map="true" className="w-full overflow-hidden rounded-2xl border border-[#2C2C2C] bg-[#1A1A1B] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={mapRef}
          className="w-full min-h-[260px] overflow-hidden bg-[#2C2C2C] sm:min-h-[300px]"
        />
        {showResetControl ? (
          <button
            type="button"
            onClick={resetMapPosition}
            disabled={!mapReady}
            aria-label="테니스장 원래 위치로 이동"
            title="테니스장 원래 위치로 이동"
            className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#D6D6D6] bg-white text-[#222] shadow-[0_3px_12px_rgba(0,0,0,0.32)] transition hover:bg-[#F2F2F2] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:bottom-4 sm:right-4"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        ) : null}
      </div>
      {geocodeFailed && (
        <p className="px-2 pb-1.5 pt-2 text-[#6B7280] text-xs">
          주소로 위치를 찾지 못해 기본 위치를 표시합니다. .env.local과 Vercel 환경변수에
          KAKAO_REST_API_KEY(지오코딩), NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY(지도)를 설정해 주세요.
        </p>
      )}
    </div>
  );
}

/** 상세 페이지: 코트 종류 테이블만 */
export function CourtDetailTable({ court }: { court: Court }) {
  const isBadminton = normalizeSportType(court.sport_type) === "badminton";
  const rows = getCourtSurfaceRows(court);
  return (
    <>
      <style>{`
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"] {
          width: 100% !important;
          table-layout: fixed !important;
        }
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"] tr > :first-child {
          display: table-cell !important;
          width: 50% !important;
          min-width: 0 !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
        }
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"] tr > :nth-child(2),
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"] tr > :nth-child(3) {
          width: 25% !important;
        }
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"]
          td[data-court-surface]
          [data-court-surface-label="true"] {
          display: none !important;
        }
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"]
          td[data-court-surface]
          > div {
          display: inline-flex !important;
          vertical-align: middle !important;
        }
        html[data-courts-korea-app="true"]
          [data-detail-court-table="true"]
          td[data-court-surface]::after {
          margin-left: 5px !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
        }
      `}</style>
      <div data-detail-court-table-frame="true">
        <table data-detail-court-table="true" className="w-full table-fixed">
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/4" />
          <col className="w-1/4" />
        </colgroup>
        <thead>
          <tr>
            <th className={th}>구분</th>
            <th className={th}>실내</th>
            <th className={th}>실외</th>
          </tr>
        </thead>
        <tbody>
          {isBadminton && rows.length === 0 ? (
            <tr>
              <td className={`${td} py-4 text-[#8A8F98]`} colSpan={3}>
                바닥 정보 확인중
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.key}>
              <td className={`${tdIcon} align-middle text-center text-white`}>
                <div
                  className={`flex min-w-0 flex-nowrap items-center justify-center overflow-hidden whitespace-nowrap ${isBadminton ? "" : "gap-2"}`}
                >
                  {!isBadminton && row.icon ? (
                    <Image
                      src={row.icon}
                      alt=""
                      aria-hidden="true"
                      className="h-5 w-auto shrink-0"
                      width={34}
                      height={25}
                    />
                  ) : null}
                  <span
                    data-court-surface-label="true"
                    className="block min-w-0 truncate whitespace-nowrap text-center text-sm font-medium leading-none"
                    title={row.label}
                  >
                    {row.label}
                  </span>
                </div>
              </td>
              <td className={`${td} align-middle whitespace-nowrap`}>{fmt(row.indoor)}</td>
              <td className={`${td} align-middle whitespace-nowrap`}>{fmt(row.outdoor)}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

/** 상세 페이지 공통: 주소, 코트 수 테이블, 예약하러가기 버튼 (상세보기 버튼 없음) */
export function CourtDetailCommon({ court }: { court: Court }) {
  const reservationHref = getReservationHref(court);
  const isPhoneReservation = isPhoneReservationCourt(court);
  const phoneHref = getPhoneReservationHref(court);
  const isBadminton = normalizeSportType(court.sport_type) === "badminton";
  const primaryActionClass = isBadminton
    ? "bg-[#375AE6] text-white hover:bg-[#2F4ECC]"
    : "bg-[#2C8B56] text-white hover:bg-[#53A978]";

  return (
    <>
      <CourtDetailAddress court={court} />
      <CourtDetailTable court={court} />
      <div className="mt-3 flex gap-2 text-sm">
        {isPhoneReservation && phoneHref ? (
          <a
            href={phoneHref}
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className={`${primaryActionClass} flex-1 flex items-center justify-center gap-2 rounded px-3 py-2.5 font-normal transition`}
            style={{ backgroundColor: isBadminton ? "#375AE6" : "#2C8B56", color: "#FFFFFF" }}
          >
            <PhoneCallIcon className="h-4 w-4" />
            전화하기
          </a>
        ) : isPhoneReservation ? (
          <span className="flex-1 flex items-center justify-center px-3 py-2.5 rounded bg-[#333333] text-gray-500 text-sm">
            전화번호 없음
          </span>
        ) : court.booking_site_link ? (
          <a
            href={reservationHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className={`${primaryActionClass} flex-1 flex items-center justify-center rounded px-3 py-2.5 font-normal transition`}
            style={{ backgroundColor: isBadminton ? "#375AE6" : "#2C8B56", color: "#FFFFFF" }}
          >
            예약하러가기
          </a>
        ) : (
          <span className="flex-1 flex items-center justify-center px-3 py-2.5 rounded bg-[#333333] text-gray-500 text-sm">
            예약 링크 없음
          </span>
        )}
      </div>
    </>
  );
}
