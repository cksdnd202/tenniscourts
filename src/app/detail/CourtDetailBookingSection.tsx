import type { Court } from "../types";
import { FixedScheduleBookingBlock } from "./FixedScheduleDetail";
import { OrdinalBookingBlock } from "./OrdinalDetail";
import { RollingBookingBlock } from "./RollingDetail";
import { LotteryBookingBlock } from "./LotteryDetail";
import { PhoneBookingBlock } from "./PhoneDetail";
import { OnSiteBookingBlock } from "./OnSiteDetail";
import { IrregularBookingBlock } from "./IrregularDetail";
import { CheckingBookingBlock } from "./CheckingDetail";
import { BookingRulesDetailBlock, hasActiveBookingRules } from "../BookingRulesContent";

/** ruleType별 예약 오픈 시간 블록만 (상세 페이지 섹션 2용) */
export function CourtDetailBookingSection({ court }: { court: Court }) {
  if (hasActiveBookingRules(court)) {
    return <BookingRulesDetailBlock court={court} />;
  }

  const ruleType = court.booking_rule_type;
  switch (ruleType) {
    case "rolling":
      return <RollingBookingBlock court={court} />;
    case "fixed_schedule":
      return <FixedScheduleBookingBlock court={court} />;
    case "ordinal":
      return <OrdinalBookingBlock court={court} />;
    case "lottery":
      return <LotteryBookingBlock court={court} />;
    case "phone":
      return <PhoneBookingBlock court={court} />;
    case "on_site":
      return <OnSiteBookingBlock court={court} />;
    case "irregular":
      return <IrregularBookingBlock court={court} />;
    case "checking":
      return <CheckingBookingBlock court={court} />;
    default:
      return <FixedScheduleBookingBlock court={court} />;
  }
}
