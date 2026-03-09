"use client";

import { useEffect, useRef, useState } from "react";
import type { Court } from "../types";
import { courtitem_courtopentime, formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";

const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

/** 네이버 지도 (basic_address로 주소 검색 후 표시) - OrdinalDetail 전용 */
export function NaverMapBlock({ address }: { address: string | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !address.trim() || !NAVER_MAP_CLIENT_ID) {
      if (!NAVER_MAP_CLIENT_ID) setError("지도 API 키를 설정해 주세요.");
      return;
    }

    const mapEl = mapRef.current;
    if (!mapEl) return;

    const scriptId = "naver-maps-script";
    const loadScript = (): Promise<void> => {
      if (typeof window !== "undefined" && (window as unknown as { naver?: { maps: unknown } }).naver?.maps) {
        return Promise.resolve();
      }
      if (document.getElementById(scriptId)) {
        return new Promise((resolve) => {
          const check = () => {
            if ((window as unknown as { naver?: { maps: unknown } }).naver?.maps) resolve();
            else setTimeout(check, 50);
          };
          check();
        });
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("네이버 지도 스크립트 로드 실패"));
        document.head.appendChild(script);
      });
    };

    loadScript()
      .then(() => {
        const w = window as unknown as Record<string, unknown>;
        const naver = w.naver as undefined | {
          maps: {
            Service: { Status: { OK: number }; geocode: (opts: { query: string }, cb: (status: number, res: { result?: { items?: Array<{ point: { x: number; y: number } }> } }) => void) => void };
            LatLng: new (lat: number, lng: number) => unknown;
            Map: new (el: HTMLElement, opts: { center: unknown; zoom: number }) => unknown;
            Marker: new (opts: { position: unknown; map: unknown }) => unknown;
          };
        };
        if (!naver?.maps) return;
        naver.maps.Service.geocode({ query: address }, (status: number, res) => {
          if (status !== naver.maps.Service.Status.OK || !res.result?.items?.length) {
            setError("주소를 찾을 수 없습니다.");
            return;
          }
          const item = res.result.items[0];
          const { x: lng, y: lat } = item.point;
          const center = new naver.maps.LatLng(lat, lng);
          const map = new naver.maps.Map(mapEl, { center, zoom: 16 });
          new naver.maps.Marker({ position: center, map });
        });
      })
      .catch(() => setError("지도를 불러올 수 없습니다."));
  }, [address]);

  if (!address || !address.trim()) {
    return (
      <div className="w-full min-h-[200px] rounded-lg bg-[#2C2C2C] flex items-center justify-center">
        <span className="text-[#6B7280] text-sm">등록된 주소가 없습니다.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[200px] rounded-lg bg-[#2C2C2C] flex items-center justify-center">
        <span className="text-[#6B7280] text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full min-h-[200px] rounded-lg overflow-hidden"
      style={{ minHeight: "200px" }}
    />
  );
}

const formatWeekOfMonth = (week: number | string | null | undefined): string => {
  if (week == null) return "";
  const n = Number(week);
  if (n === -1) return "마지막";
  if (n === -2) return "첫번째 영업일";
  const weekMap: Record<number, string> = {
    1: "첫번째", 2: "두번째", 3: "세번째", 4: "네번째",
  };
  return weekMap[n] ?? "";
};

const formatDayOfWeek = (day: number | null | undefined): string => {
  if (day == null) return "";
  const dayMap: Record<number, string> = {
    1: "월요일", 2: "화요일", 3: "수요일", 4: "목요일",
    5: "금요일", 6: "토요일", 7: "일요일",
  };
  return dayMap[day] || "";
};

/** ordinal 전용 상세 화면: 예약 오픈 정보 + 공통(주소/테이블/예약 버튼) */
function OrdinalBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
        {court.booking_open_type === "week" ? (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-[#909090] font-semibold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_ordinal);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_owner);
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, 다음달 `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, 다음달 `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, 다음달 `;
                    return time ? `${time}, 다음달 ` : "";
                  })()}
                </span>
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-[#909090] font-semibold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_ordinal);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_normal);
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, 다음달 `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, 다음달 `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, 다음달 `;
                    return time ? `${time}, 다음달 ` : "";
                  })()}
                </span>
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
          </>
        ) : (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-[#909090] font-semibold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_day_of_month);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_owner);
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, 다음달 `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, 다음달 `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, 다음달 `;
                    return time ? `${time}, 다음달 ` : "";
                  })()}
                </span>
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-[#909090] font-semibold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_day_of_month);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_normal);
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, 다음달 `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, 다음달 `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, 다음달 `;
                    return time ? `${time}, 다음달 ` : "";
                  })()}
                </span>
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
          </>
        )}
      </div>
  );
}

export { OrdinalBookingBlock };
export function OrdinalDetail({ court }: { court: Court }) {
  return (
    <>
      <OrdinalBookingBlock court={court} />
      <section className="my-4">
        <NaverMapBlock address={court.basic_address} />
      </section>
      <CourtDetailCommon court={court} />
    </>
  );
}
