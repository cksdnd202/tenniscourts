import Image from "next/image";
import { Court } from "./types";
import { getCourtDetailPath } from "@/lib/courtPath";
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

// 주차 숫자를 한글 주차로 변환 (-2는 첫번째 영업일, -1은 마지막, API에서 문자열 "-1"로 올 수 있음)
const formatWeekOfMonth = (week: number | string | null | undefined): string => {
  if (week == null) return "";
  const n = Number(week);
  if (n === -1) return "마지막";
  if (n === -2) return "첫번째 영업일";
  const weekMap: Record<number, string> = {
    1: "첫번째",
    2: "두번째",
    3: "세번째",
    4: "네번째",
  };
  return weekMap[n] ?? "";
};

// 요일 숫자를 한글 요일로 변환
const formatDayOfWeek = (day: number | null | undefined): string => {
  if (day == null) return "";
  const dayMap: Record<number, string> = {
    1: "월요일",
    2: "화요일",
    3: "수요일",
    4: "목요일",
    5: "금요일",
    6: "토요일",
    7: "일요일",
  };
  return dayMap[day] || "";
};

export function OrdinalContent({ court }: { court: Court }) {
  const priorityLabel = getPriorityEligibilityLabel(court.booking_eligibility_first);

  return (
    <>
      {/* 코트 이름, 찜하기 */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={courtitem_courtname}>{court.basic_court_name ?? "(이름 없음)"}</span>
        <FavoriteButton courtId={court.id} />
      </div>

      {/* ordinal 타입용 구조 - 필요에 따라 수정하세요 */}
      <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-md my-2 h-[56px] flex flex-col justify-center">
        {court.booking_open_type === "week" ? (
          <>
            {/* week 타입용 구조 */}
            {priorityLabel && (
              <div className="">
                <p className={`${courtitem_courtopentime} break-words`}>
                  <span className="text-[#6FCF97]">
                    {priorityLabel} :{" "}
                  </span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                  <span className="text-white font-semibold">
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
                  <span className="text-white font-normal">{`예약 오픈`}</span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                </p>
              </div>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <div className="">
                <p className={`${courtitem_courtopentime} break-words`}>
                  <span className="text-[#6FCF97]">일반 : </span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                  <span className="text-white font-semibold">
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
                  <span className="text-white font-normal">{`예약 오픈`}</span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                </p>
              </div>
            )}
            {/* week 타입 전용 내용을 여기에 추가하세요 */}
          </>
        ) : (
          // booking_open_type이 없거나 다른 값인 경우 week로 기본 처리
          <>
            {/* week 타입용 구조 */}
            {priorityLabel && (
              <div className="">
                <p className={`${courtitem_courtopentime} break-words`}>
                  <span className="text-[#6FCF97]">
                    {priorityLabel} :{" "}
                  </span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                  <span className="text-white font-semibold">
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
                  <span className="text-white font-normal">{`예약 오픈`}</span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                </p>
              </div>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <div className="">
                <p className={`${courtitem_courtopentime} break-words`}>
                  <span className="text-[#6FCF97]">일반 : </span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                  <span className="text-white] font-semibold">
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
                  <span className="text-white] font-normal">{`예약 오픈`}</span>
                  {/* 여기가 찐 week 타입용 내용 넣을 곳 - */}
                </p>
              </div>
            )}
            {/* week 타입 전용 내용을 여기에 추가하세요 */}
          </>
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
        )}
      </div>
    </>
  );
}
