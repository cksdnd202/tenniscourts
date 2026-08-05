import type { Court } from "../types";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";
import { formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { BookingOpenCardRow } from "./BookingOpenCardRow";
import { detailCard, detailNoNormalClass, detailNoPriorityClass } from "./detailLayoutStyles";

const formatWeekOfMonth = (week: number | string | null | undefined): string => {
  if (week == null) return "";
  if (Number(week) === -1) return "마지막주";
  const weekMap: Record<number, string> = {
    1: "첫째주", 2: "둘째주", 3: "셋째주", 4: "넷째주", 5: "다섯째주",
  };
  return weekMap[Number(week)] ?? "";
};

const formatDayOfWeek = (day: number | null | undefined): string => {
  if (day == null) return "";
  const dayMap: Record<number, string> = {
    1: "월요일", 2: "화요일", 3: "수요일", 4: "목요일",
    5: "금요일", 6: "토요일", 7: "일요일",
  };
  return dayMap[day] || "";
};

const formatDayOfMonth = (day: number | null | undefined): string => {
  if (day == null) return "";
  if (Number(day) === -1) return "말일";
  return `${day}일`;
};

const bookingGrid = "grid grid-cols-1 gap-3 min-[1032px]:grid-cols-2 min-[1032px]:gap-4";

/** fixed_schedule 전용 상세 화면: 예약 오픈 정보 + 공통(주소/테이블/예약 버튼) */
function FixedScheduleBookingBlock({ court }: { court: Court }) {
  const priorityLabel = getPriorityEligibilityLabel(court.booking_eligibility_first);

  if (court.booking_open_type === "day") {
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

  if (court.booking_open_type === "week") {
    return (
      <div className={bookingGrid}>
        <div className={detailCard}>
          {priorityLabel ? (
            <BookingOpenCardRow
              label={priorityLabel}
              labelTone="priority"
            >
              <>
                <span className="font-bold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_day_of_month);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_owner);
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, 다음달 `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, 다음달 `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, 다음달 `;
                    return time ? `${time}, 다음달 ` : "";
                  })()}
                </span>
                <span className="font-normal">예약 오픈</span>
              </>
            </BookingOpenCardRow>
          ) : (
            <span className={detailNoPriorityClass}>우선 예약 권한 없음</span>
          )}
        </div>
        <div className={detailCard}>
          {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" ? (
            <BookingOpenCardRow label="전체" labelTone="general">
              <>
                <span className="font-bold">
                  {(() => {
                    const month = formatWeekOfMonth(court.booking_open_day_of_month);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_normal);
                    const monthLabel = court.booking_normal_iscurrentmonth ? "당월" : "다음달";
                    if (month && week) return `${month} ${week}${time ? ` ${time}` : ""}, ${monthLabel} `;
                    if (month) return `${month}${time ? ` ${time}` : ""}, ${monthLabel} `;
                    if (week) return `${week}${time ? ` ${time}` : ""}, ${monthLabel} `;
                    return time ? `${time}, ${monthLabel} ` : "";
                  })()}
                </span>
                <span className="font-normal">예약 오픈</span>
              </>
            </BookingOpenCardRow>
          ) : (
            <span className={detailNoNormalClass}>전체 예약 정보 없음</span>
          )}
        </div>
      </div>
    );
  }

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
              {formatTime(court.booking_open_time_owner)} 예약 오픈
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
              {court.booking_open_day_normal != null ? `${formatDayOfMonth(court.booking_open_day_normal)} ` : ""}
              {formatTime(court.booking_open_time_normal)} 예약 오픈
            </span>
          </BookingOpenCardRow>
        ) : (
          <span className={detailNoNormalClass}>전체 예약 정보 없음</span>
        )}
      </div>
    </div>
  );
}

export { FixedScheduleBookingBlock };
export function FixedScheduleDetail({ court }: { court: Court }) {
  return (
    <>
      <FixedScheduleBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
