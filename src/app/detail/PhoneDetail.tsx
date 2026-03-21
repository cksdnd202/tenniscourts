import type { Court } from "../types";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { detailCard, detailMuted } from "./detailLayoutStyles";

/** phone 전용: 예약 블록만 */
export function PhoneBookingBlock({ court }: { court: Court }) {
  return (
    <div className={detailCard}>
      <span className="text-white font-semibold">전화 예약</span>
      {court.booking_reception_time != null && court.booking_reception_time.trim() !== "" && (
        <span className={`${detailMuted} text-sm mt-1 block`}>접수 시간: {court.booking_reception_time}</span>
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
