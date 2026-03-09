import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** irregular 전용: 예약 블록만 */
export function IrregularBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
      <span className="text-[#909090] font-semibold">예약 방식 변동 (비정기)</span>
    </div>
  );
}

/** irregular 전용 상세 화면 (비정기/변동) */
export function IrregularDetail({ court }: { court: Court }) {
  return (
    <>
      <IrregularBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
