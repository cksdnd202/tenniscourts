import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** phone 전용: 예약 블록만 */
export function PhoneBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
      <span className="text-[#909090] font-semibold">전화 예약</span>
      {court.booking_reception_time != null && court.booking_reception_time.trim() !== "" && (
        <span className="text-[#909090] font-normal text-sm mt-1 block">접수 시간: {court.booking_reception_time}</span>
      )}
    </div>
  );
}

/** phone 전용 상세 화면 (전화 예약) */
export function PhoneDetail({ court }: { court: Court }) {
  return (
    <>
      <PhoneBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
