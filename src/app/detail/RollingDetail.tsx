import type { Court } from "../types";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";
import { formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { BookingOpenCardRow } from "./BookingOpenCardRow";
import { detailCard, detailNoNormalClass, detailNoPriorityClass } from "./detailLayoutStyles";

const bookingGrid = "grid grid-cols-1 gap-3 min-[1032px]:grid-cols-2 min-[1032px]:gap-4";

/** rolling 전용 상세 화면 */
function RollingBookingBlock({ court }: { court: Court }) {
  const priorityLabel = getPriorityEligibilityLabel(court.booking_eligibility_first);

  return (
    <div className={bookingGrid}>
      <div className={detailCard}>
        {priorityLabel ? (
          <BookingOpenCardRow
            label={priorityLabel}
            labelTone="priority"
          >
            <span className="font-bold">
              매일 {court.booking_open_time_owner != null ? `${formatTime(court.booking_open_time_owner)}, ` : ""}
              {court.booking_open_offset != null ? `+${court.booking_open_offset}일 ` : ""}
              일자 <span className="font-normal">예약 오픈</span>
            </span>
          </BookingOpenCardRow>
        ) : (
          <span className={detailNoPriorityClass}>우선 예약 권한 없음</span>
        )}
      </div>
      <div className={detailCard}>
        {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" ? (
          <BookingOpenCardRow label="일반" labelTone="general">
            <span className="font-bold">
              매일 {formatTime(court.booking_open_time_normal)}
              {court.booking_open_offset != null ? `, +${court.booking_open_offset}일 ` : " "}
              일자 <span className="font-normal">예약 오픈</span>
            </span>
          </BookingOpenCardRow>
        ) : (
          <span className={detailNoNormalClass}>일반 예약 권한 없음</span>
        )}
      </div>
    </div>
  );
}

export { RollingBookingBlock };
export function RollingDetail({ court }: { court: Court }) {
  return (
    <>
      <RollingBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
