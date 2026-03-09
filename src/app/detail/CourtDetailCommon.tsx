import Image from "next/image";
import type { Court } from "../types";
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
