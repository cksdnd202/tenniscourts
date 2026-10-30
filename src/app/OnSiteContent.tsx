import Image from "next/image";
import { Court } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
import { getReservationHref } from "@/lib/reservationLink";
import { FavoriteButton } from "./FavoriteButton";
import { BookingRulesCompactContent, hasActiveBookingRules } from "./BookingRulesContent";
import { CourtSurfaceTable } from "./CourtSurfaceTable";
import {
  courtitem_courtname,
  courtitem_courtopentime,
  courtitem_courtaddress,
  courtitem_courtmaplink,
  formatTime,
} from "./styles";

export function OnSiteContent({ court }: { court: Court }) {
  const reservationHref = getReservationHref(court);

  return (
    <>
      {/* 코트 이름, 찜하기 */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={courtitem_courtname}>{court.basic_court_name ?? "(이름 없음)"}</span>
        <FavoriteButton courtId={court.id} />
      </div>


      {/* on_site 타입 전용 내용을 여기에 추가하세요 */}
      <div className="text-sm px-3 py-3.5 bg-[#2C2C2C] rounded-md my-2 h-[112px] flex flex-col justify-center">
        {hasActiveBookingRules(court) ? <BookingRulesCompactContent court={court} /> : (
          <span className="text-center font-semibold text-white">현장 예약</span>
        )}
      </div>

      {/* 주소, 지도보기, 코트 종류 정보, 예약하러가기 */}
      {court.basic_address && (
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
      )}
      <CourtSurfaceTable court={court} />

      <div className="mt-3 flex gap-2 text-sm">
        {/* 상세보기 버튼 - 코트 상세 페이지로 이동 */}
        <a
          href={getCourtDetailPath(court)}
          rel="noopener"
          data-gtm="detail_click"
          data-court-id={court.id}
          data-court-name={court.basic_court_name}
          className="flex-1 flex items-center justify-center px-3 py-2.5 rounded bg-[#222222] text-white font-normal hover:bg-[#333333] transition"
        >
          상세보기
        </a>

        {/* 예약하러가기 버튼 - 예약 사이트로 이동 */}
        {court.booking_site_link && (
          <a
            href={reservationHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="sport-card-primary-action flex-1 flex items-center justify-center px-3 py-2.5 rounded text-white font-normal transition"
            style={{ backgroundColor: "var(--sport-primary, #2C8B56)" }}
          >
            예약하러가기
          </a>
        )}
      </div>
    </>
  );
}
