import Image from "next/image";
import { Court } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
import { getPhoneReservationHref } from "@/lib/phoneReservation";
import { FavoriteButton } from "./FavoriteButton";
import { CourtSurfaceTable } from "./CourtSurfaceTable";
import {
  courtitem_courtname,
  courtitem_courtopentime,
  courtitem_courtaddress,
  courtitem_courtmaplink,
  formatTime,
} from "./styles";

export function PhoneContent({ court }: { court: Court }) {
  const phoneHref = getPhoneReservationHref(court);

  return (
    <>
      {/* phone 타입용 구조 - 필요에 따라 수정하세요 */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={courtitem_courtname}>{court.basic_court_name ?? "(이름 없음)"}</span>
        <FavoriteButton courtId={court.id} />
      </div>


      {/* phone 타입 전용 내용 */}
      <div className="my-2 flex h-[112px] items-center justify-center rounded-md bg-[#2C2C2C] px-3 py-3.5 text-sm">
        <span className="text-base font-semibold text-white">전화 예약</span>
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

        {/* 전화하기 버튼 - 등록된 번호로 연결 */}
        {phoneHref && (
          <a
            href={phoneHref}
            data-gtm="reserve_click"
            data-court-id={court.id}
            data-court-name={court.basic_court_name}
            className="sport-card-primary-action flex-1 flex items-center justify-center px-3 py-2.5 rounded text-white font-normal transition"
            style={{ backgroundColor: "var(--sport-primary, #2C8B56)" }}
          >
            전화하기
          </a>
        )}
      </div>
    </>
  );
}
