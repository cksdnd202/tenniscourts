import type { Court } from "../types";
import { getPriorityEligibilityLabel } from "@/lib/bookingEligibility";
import { formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";
import { BookingOpenCardRow } from "./BookingOpenCardRow";
import { detailCard, detailNoNormalClass, detailNoPriorityClass } from "./detailLayoutStyles";

const formatWeekOfMonth = (week: number | string | null | undefined): string => {
  if (week == null) return "";
  const n = Number(week);
  if (n === -1) return "마지막";
  if (n === -2) return "첫번째 영업일";
  const weekMap: Record<number, string> = {
    1: "첫번째", 2: "두번째", 3: "세번째", 4: "네번째",
  };
  return weekMap[n] ?? "";
};

const formatDayOfWeek = (day: number | null | undefined): string => {
  if (day == null) return "";
  const dayMap: Record<number, string> = {
    1: "월요일", 2: "화요일", 3: "수요일", 4: "목요일",
    5: "금요일", 6: "토요일", 7: "일요일",
  };
  return dayMap[day] || "";
};

const bookingGrid = "grid grid-cols-1 gap-3 min-[1032px]:grid-cols-2 min-[1032px]:gap-4";

/** ordinal 전용 상세 화면: 예약 오픈 정보 + 공통(주소/테이블/예약 버튼) */
function OrdinalBookingBlock({ court }: { court: Court }) {
  const priorityLabel = getPriorityEligibilityLabel(court.booking_eligibility_first);

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
                    const month = formatWeekOfMonth(court.booking_open_ordinal);
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
                    const month = formatWeekOfMonth(court.booking_open_ordinal);
                    const week = formatDayOfWeek(court.booking_open_day_of_week);
                    const time = formatTime(court.booking_open_time_normal);
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
          <span className={detailNoNormalClass}>전체 예약 정보 없음</span>
        )}
      </div>
    </div>
  );
}

export { OrdinalBookingBlock };
export function OrdinalDetail({ court }: { court: Court }) {
  return (
    <>
      <OrdinalBookingBlock court={court} />
      <CourtDetailCommon court={court} />
    </>
  );
}
