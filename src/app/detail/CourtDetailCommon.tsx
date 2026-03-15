"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Court } from "../types";

const NAVER_MAP_CLIENT_ID = (process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "").trim();

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (idOrElement: string | HTMLElement, options: { center: unknown; zoom: number }) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: { position: unknown; map: unknown }) => unknown;
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

/** 상세 페이지: 주소 + 위치보기 링크만 */
export function CourtDetailAddress({ court }: { court: Court }) {
  if (!court.basic_address) return null;
  return (
    <div className="flex items-center gap-0.5 min-w-0">
      <Image
        src="/icon/icon_map.svg"
        alt="지도"
        width={16}
        height={16}
        className="flex-shrink-0"
      />
      <span className={`${courtitem_courtaddress} truncate`}>{court.basic_address}</span>
      <a
        href={court.basic_map_link ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`${courtitem_courtmaplink} flex-shrink-0`}
      >
        위치보기
      </a>
    </div>
  );
}
const DEFAULT_CENTER = { lat: 37.3595704, lng: 127.105399 };

export function CourtDetailMap({ court }: { court: Court }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const address = court.basic_address?.trim() || "";

  useEffect(() => {
    if (!mapRef.current || !NAVER_MAP_CLIENT_ID) {
      if (!NAVER_MAP_CLIENT_ID) setError("지도 API 키를 설정해 주세요.");
      return;
    }
    setGeocodeFailed(false);
    const scriptId = "naver-maps-script";

    const loadScript = (): Promise<void> => {
      if (typeof window !== "undefined" && window.naver?.maps) {
        return Promise.resolve();
      }
      const existing = document.getElementById(scriptId);
      if (existing) {
        return new Promise((resolve) => {
          const check = () => {
            if (window.naver?.maps) resolve();
            else setTimeout(check, 50);
          };
          check();
        });
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("지도 스크립트 로드 실패"));
        document.head.appendChild(script);
      });
    };

    const initMap = (lat: number, lng: number) => {
      if (!mapRef.current?.isConnected || !window.naver?.maps) {
        setError("지도를 불러올 수 없습니다.");
        return;
      }
      try {
        const el = mapRef.current;
        const center = new window.naver.maps.LatLng(lat, lng);
        const map = new window.naver.maps.Map(el, { center, zoom: 16 });
        new window.naver.maps.Marker({ position: center, map });
      } catch (e) {
        setError("지도를 불러올 수 없습니다.");
      }
    };

    const run = (lat: number, lng: number) => {
      loadScript()
        .then(() => initMap(lat, lng))
        .catch(() => setError("지도를 불러올 수 없습니다."));
    };

    if (!address) {
      setGeocodeFailed(true);
      run(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      return;
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
  }, [address]);

  if (!court.basic_address) return null;
  if (error) {
    return (
      <div className="w-full min-h-[300px] rounded-lg bg-[#2C2C2C] flex items-center justify-center">
        <span className="text-[#6B7280] text-sm">{error}</span>
      </div>
    );
  }
  return (
    <div className="w-full">
      <div ref={mapRef} className="w-full min-h-[300px] rounded-lg bg-[#2C2C2C] overflow-hidden" style={{ minHeight: "300px" }} />
      {geocodeFailed && (
        <p className="mt-1.5 text-[#6B7280] text-xs">
          주소로 위치를 찾지 못해 기본 위치를 표시합니다. 지도에 코트 위치가 나오게 하려면 .env.local과 Vercel 환경변수에 NAVER_MAP_CLIENT_SECRET(지오코딩 API 키)을 추가해 주세요.
        </p>
      )}
    </div>
  );
}

/** 상세 페이지: 코트 종류 테이블만 */
export function CourtDetailTable({ court }: { court: Court }) {
  return (
    <table className="w-full table-fixed">
      <thead>
        <tr>
          <th className={th}>구분</th>
          <th className={th}>실내</th>
          <th className={th}>실외</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={tdIcon}>
            <div className="flex justify-center">
              <Image src="/icon/icon_hard_court.svg" alt="하드코트" title="하드코트" width={20} height={36} />
            </div>
          </td>
          <td className={td}>{fmt(court.court_count_hard_indoor)}</td>
          <td className={td}>{fmt(court.court_count_hard_outdoor)}</td>
        </tr>
        <tr>
          <td className={tdIcon}>
            <div className="flex justify-center">
              <Image src="/icon/icon_grass_court.svg" alt="잔디코트" title="잔디코트" width={20} height={36} />
            </div>
          </td>
          <td className={td}>{fmt(court.court_count_grass_indoor)}</td>
          <td className={td}>{fmt(court.court_count_grass_outdoor)}</td>
        </tr>
        <tr>
          <td className={tdIcon}>
            <div className="flex justify-center">
              <Image src="/icon/icon_clay_court.svg" alt="클레이코트" title="클레이코트" width={20} height={36} />
            </div>
          </td>
          <td className={td}>{fmt(court.court_count_clay_indoor)}</td>
          <td className={td}>{fmt(court.court_count_clay_outdoor)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** 상세 페이지 공통: 주소, 코트 수 테이블, 예약하러가기 버튼 (상세보기 버튼 없음) */
export function CourtDetailCommon({ court }: { court: Court }) {
  return (
    <>
      <CourtDetailAddress court={court} />
      <CourtDetailTable court={court} />
      <div className="mt-3 flex gap-2 text-sm">
        {court.booking_site_link ? (
          <a
            href={court.booking_site_link}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="flex-1 flex items-center justify-center px-3 py-2.5 rounded bg-[#2C8B56] text-white font-normal hover:bg-[#53A978] transition"
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
