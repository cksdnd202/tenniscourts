import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { detailCard } from "./detailLayoutStyles";

/** irregular 전용: 예약 블록만 */
export function IrregularBookingBlock({ court }: { court: Court }) {
  return (
    <div className={detailCard}>
      <span className="text-white font-semibold">예약 방식 변동 (비정기)</span>
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
