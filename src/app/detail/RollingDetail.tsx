import type { Court } from "../types";
import { courtitem_courtopentime, formatTime } from "../styles";
import { CourtDetailCommon } from "./CourtDetailCommon";

/** rolling 전용 상세 화면 */
function RollingBookingBlock({ court }: { court: Court }) {
  return (
    <div className="text-sm px-2.5 py-2 bg-[#2C2C2C] rounded-lg my-2 min-h-[56px] flex flex-col justify-center">
        {court.booking_eligibility_first && (court.booking_eligibility_first === "resident" || court.booking_eligibility_first === "citizen") && (
          <p className={`${courtitem_courtopentime} break-words`}>
            <span className="text-[#6FCF97]">{court.booking_eligibility_first === "resident" ? "구민" : "시민"} : </span>
            <span className="text-white font-semibold">
              매일 {court.booking_open_time_owner != null ? `${formatTime(court.booking_open_time_owner)},` : ""} +{court.booking_open_offset != null ? `${court.booking_open_offset}일` : ""} 일자{" "}
              <span className="font-normal">예약 오픈</span>
            </span>
          </p>
        )}
        {court.booking_open_time_normal != null && court.booking_open_time_normal.trim() !== "" && (
          <p className={`${courtitem_courtopentime} break-words`}>
            <span className="text-[#6FCF97]">일반 : </span>
            <span className="text-white font-semibold">
              매일 {court.booking_open_time_normal != null ? `${formatTime(court.booking_open_time_normal)},` : ""} +{court.booking_open_offset != null ? `${court.booking_open_offset}일` : ""} 일자{" "}
              <span className="font-normal">예약 오픈</span>
            </span>
          </p>
        )}
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
