import Image from "next/image";
import { Court } from "./types";
import {
  courtitem_courtname,
  courtitem_courtownertype,
  courtitem_courtopentime,
  courtitem_courtaddress,
  courtitem_courtmaplink,
  th,
  td,
  tdIcon,
  fmt,
  formatTime,
} from "./styles";

// 주차 숫자를 한글 주차로 변환
const formatWeekOfMonth = (week: number | null | undefined): string => {
  if (week == null) return "";
  const weekMap: Record<number, string> = {
    1: "첫째주",
    2: "둘째주",
    3: "셋째주",
    4: "넷째주",
    5: "다섯째주",
  };
  return weekMap[week] || "";
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

export function CheckingContent({ court }: { court: Court }) {
  return (
    <>
      {/* 코트 이름, 시립/구립/사설 */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className={courtitem_courtname}>{court.basic_court_name ?? "(이름 없음)"}</span>
        <span className={courtitem_courtownertype}>{court.basic_owner_type}</span>
      </div>

      {/* checking 타입용 구조 - 필요에 따라 수정하세요 */}
      <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 h-[56px] flex items-center justify-center">
        <span className="text-[#828995] font-semibold">예약 오픈 시간 확인중</span>
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
          href={`/courts/${court.id}`}
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
