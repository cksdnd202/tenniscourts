import Image from "next/image";
import { Court } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
import { getReservationHref } from "@/lib/reservationLink";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";
import { FavoriteButton } from "./FavoriteButton";
import {
  courtitem_courtname,
  courtitem_courtopentime,
  courtitem_courtaddress,
  courtitem_courtmaplink,
  th,
  td,
  tdIcon,
  fmt,
  formatTime,
} from "./styles";

export function RollingContent({ court }: { court: Court }) {
  const priorityLabel = getPriorityEligibilityLabel(court.booking_eligibility_first);
  const reservationHref = getReservationHref(court);

  return (
    <>
      {/* 코트 이름, 찜하기 */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={courtitem_courtname}>{court.basic_court_name ?? "(이름 없음)"}</span>
        <FavoriteButton courtId={court.id} />
      </div>

      {/* rolling 타입용 구조 - 필요에 따라 수정하세요 */}
      <div className="text-sm px-3 py-3.5 bg-[#2C2C2C] rounded-md my-2 h-[112px] flex flex-col justify-center">
        <>
          {priorityLabel && (
            <div className="">
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">
                  {priorityLabel} :{" "}
                </span>

                {/* 여기가 찐 rolling 타입용 내용 넣을 곳 - */}
                <span className="text-white font-semibold">
                  {`매일 `}
                  {court.booking_open_time_owner != null ? `${formatTime(court.booking_open_time_owner)},` : ""}
                  {` +`}
                  {court.booking_open_offset != null ? `${court.booking_open_offset}일` : ""} 
                  {` 일자 `}
                  <span className="font-normal">{`예약 오픈`}</span>
                </span>
                {/* 여기까지가 찐 rolling 타입용 내용 넣을 곳 - */}

              </p>
            </div>
          )}
          {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
            <div className="">
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">전체 : </span>

                {/* 여기가 찐 rolling 타입용 내용 넣을 곳 - */}
                <span className="text-white font-semibold">
                  {`매일 `}
                  {court.booking_open_time_normal != null ? `${formatTime(court.booking_open_time_normal)},` : ""}
                  {` +`}
                  {court.booking_open_offset != null ? `${court.booking_open_offset}일` : ""} 
                  {` 일자 `}
                  <span className="font-normal">{`예약 오픈`}</span>
                </span>
                {/* 여기까지가 찐 rolling 타입용 내용 넣을 곳 - */}

              </p>
            </div>
          )}
        </>
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
                <Image
                  src="/icon/icon_hard_court.svg"
                  alt="하드코트"
                  title="하드코트"
                  width={20}
                  height={36}
                />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_hard_indoor)}</td>
            <td className={td}>{fmt(court.court_count_hard_outdoor)}</td>
          </tr>
          <tr>
            <td className={tdIcon}>
              <div className="flex justify-center">
                <Image
                  src="/icon/icon_grass_court.svg"
                  alt="잔디코트"
                  title="잔디코트"
                  width={20}
                  height={36}
                />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_grass_indoor)}</td>
            <td className={td}>{fmt(court.court_count_grass_outdoor)}</td>
          </tr>
          <tr>
            <td className={tdIcon}>
              <div className="flex justify-center">
                <Image
                  src="/icon/icon_clay_court.svg"
                  alt="클레이코트"
                  title="클레이코트"
                  width={20}
                  height={36}
                />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_clay_indoor)}</td>
            <td className={td}>{fmt(court.court_count_clay_outdoor)}</td>
          </tr>
        </tbody>
      </table>

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
            className="flex-1 flex items-center justify-center px-3 py-2.5 rounded bg-[#2C8B56] text-white font-normal hover:bg-[#53A978] transition"
          >
            예약하러가기
          </a>
        )}
      </div>
    </>
  );
}
