import type { Court } from "../types";
import { courtitem_courtopentime, formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";

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

/** ordinal 전용 상세 화면: 예약 오픈 정보 + 공통(주소/테이블/예약 버튼) */
function OrdinalBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
        {court.booking_open_type === "week" ? (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-[#909090] font-semibold">
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
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-[#909090] font-semibold">
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
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
          </>
        ) : (
          <>
            {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#2B523C]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
                <span className="text-[#909090] font-semibold">
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
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
            {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
              <p className={`${courtitem_courtopentime} break-words`}>
                <span className="text-[#6FCF97]">일반 : </span>
                <span className="text-[#909090] font-semibold">
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
                <span className="text-[#909090] font-normal">예약 오픈</span>
              </p>
            )}
          </>
        )}
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
