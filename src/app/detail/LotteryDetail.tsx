import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { detailCard } from "./detailLayoutStyles";

/** lottery 전용: 예약 블록만 */
export function LotteryBookingBlock({ court: _court }: { court: Court }) {
  return (
    <div className={detailCard}>
      <span className="text-white font-semibold">추첨 방식 예약</span>
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
