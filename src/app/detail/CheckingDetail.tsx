import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** checking 전용: 예약 블록만 */
export function CheckingBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex items-center justify-center">
      <span className="text-[#828995] font-semibold">예약 오픈 시간 확인중</span>
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
