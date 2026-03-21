import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { detailCard, detailMuted } from "./detailLayoutStyles";

/** checking 전용: 예약 블록만 */
export function CheckingBookingBlock({ court }: { court: Court }) {
  return (
    <div className={`${detailCard} items-center text-center`}>
      <span className={`${detailMuted} font-semibold`}>예약 오픈 시간 확인중</span>
    </div>
  );
}

/** checking 전용 상세 화면 (예약 오픈 시간 확인 중) */
export function CheckingDetail({ court }: { court: Court }) {
  return (
    <>
      <CheckingBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
