import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** lottery 전용: 예약 블록만 */
export function LotteryBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
      <span className="text-[#909090] font-semibold">추첨 방식 예약</span>
    </div>
  );
}

/** lottery 전용 상세 화면 (추첨 방식) */
export function LotteryDetail({ court }: { court: Court }) {
  return (
    <>
      <LotteryBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
