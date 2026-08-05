import type { Court } from "../types";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";
import { formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { BookingOpenCardRow } from "./BookingOpenCardRow";
import { detailCard, detailNoNormalClass, detailNoPriorityClass } from "./detailLayoutStyles";

const bookingGrid = "grid grid-cols-1 gap-3 min-[1032px]:grid-cols-2 min-[1032px]:gap-4";

const formatDayOfMonth = (day: number | null | undefined): string => {
  if (day == null) return "";
  if (Number(day) === -1) return "말일";
  return `${day}일`;
};

/** lottery 전용: 예약 블록만 */
export function LotteryBookingBlock({ court }: { court: Court }) {
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
              {court.booking_open_day_owner != null ? `${formatDayOfMonth(court.booking_open_day_owner)} ` : ""}
              {formatTime(court.booking_open_time_owner)}
              {court.booking_open_offset != null ? `, ${court.booking_open_offset}` : ""} 예약 오픈
            </span>
          </BookingOpenCardRow>
        ) : (
          <span className={detailNoPriorityClass}>우선 예약 권한 없음</span>
        )}
      </div>
      <div className={detailCard}>
        {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" ? (
          <BookingOpenCardRow label="전체" labelTone="general">
            <span className="font-bold">
              {court.booking_open_day_normal != null
                ? `${court.booking_normal_iscurrentmonth ? "당월 " : ""}${formatDayOfMonth(court.booking_open_day_normal)} `
                : ""}
              {formatTime(court.booking_open_time_normal)}
              {(() => {
                if (court.booking_normal_iscurrentmonth === true) return ", 당월";
                if (court.booking_open_offset != null) return `, ${court.booking_open_offset}`;
                return "";
              })()}{" "}
              예약 오픈
            </span>
          </BookingOpenCardRow>
        ) : (
          <span className={detailNoNormalClass}>전체 예약 정보 없음</span>
        )}
      </div>
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
