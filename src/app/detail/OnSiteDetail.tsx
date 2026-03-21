import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { detailCard } from "./detailLayoutStyles";

/** on_site 전용: 예약 블록만 */
export function OnSiteBookingBlock({ court }: { court: Court }) {
  return (
    <div className={detailCard}>
      <span className="text-white font-semibold">현장 방문 예약</span>
    </div>
  );
}

/** on_site 전용 상세 화면 (현장 예약) */
export function OnSiteDetail({ court }: { court: Court }) {
  return (
    <>
      <OnSiteBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
