import type { Court } from "../types";
import { courtitem_courtopentime, formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";

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

/** fixed_schedule 전용 상세 화면: 예약 오픈 정보 + 공통(주소/테이블/예약 버튼) */
function FixedScheduleBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
        {court.booking_open_type === "day" ? (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-white font-semibold">
                  {court.booking_open_day_owner != null ? `${court.booking_open_day_owner}일 ` : ""}
                  {formatTime(court.booking_open_time_owner)}{`, `}
                  {court.booking_open_offset != null ? `${court.booking_open_offset}` : ""}
                </span>
                <span className="text-white font-normal"> 예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-white font-semibold">
                  {court.booking_open_day_normal != null ? `${court.booking_normal_iscurrentmonth ? "당월 " : ""}${court.booking_open_day_normal}일 ` : ""}
                  {formatTime(court.booking_open_time_normal)}{`, `}
                  {court.booking_open_offset != null ? `${court.booking_open_offset}` : ""}
                </span>
                <span className="text-white font-normal"> 예약 오픈</span>
              </p>
            )}
          </>
        ) : court.booking_open_type === "week" ? (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-white font-semibold">
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
                <span className="text-white font-normal">예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-white font-semibold">
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
                <span className="text-white font-normal">예약 오픈</span>
              </p>
            )}
          </>
        ) : (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-white font-normal">
                  {court.booking_open_day_owner != null ? `${court.booking_open_day_owner}일 ` : ""}
                  {formatTime(court.booking_open_time_owner)} 예약 오픈
                </span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-white font-normal">
                  {court.booking_open_day_normal != null ? `${court.booking_open_day_normal}일 ` : ""}
                  {formatTime(court.booking_open_time_normal)} 예약 오픈
                </span>
              </p>
            )}
          </>
        )}
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
