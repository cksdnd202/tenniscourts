import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** on_site 전용: 예약 블록만 */
export function OnSiteBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
      <span className="text-[#909090] font-semibold">현장 방문 예약</span>
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
