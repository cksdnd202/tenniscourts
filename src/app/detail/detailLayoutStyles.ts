/** 코트 상세 페이지 공통 카드/강조 스타일 (레이아웃용) */
export const detailCard =
  "rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] px-4 py-4 text-sm min-h-[72px] flex flex-col justify-center";
export const detailAccentGreen = "text-[#4ADE80] font-semibold";
export const detailMuted = "text-[#B0B0B0]";

/** 구민/시민 우선 예약 정보가 없을 때 왼쪽 카드 문구 */
export const detailNoPriorityClass =
  "block w-full text-center text-[#888888] text-sm font-normal leading-relaxed";

/** 일반 예약 정보가 없을 때 오른쪽 카드 문구 */
export const detailNoNormalClass =
  "block w-full text-center text-[#888888] text-sm font-normal leading-relaxed";

/** 예약 오픈 카드 좌측 라벨 · 사이드바 뱃지 글자색 공통 */
export type BookingOpenLabelTone =
  | "priority"
  | "general"
  | "normal"
  | "citizen"
  | "resident"
  | "inhabitant"
  | "none";

export const bookingOpenLabelTextClass: Record<BookingOpenLabelTone, string> = {
  priority: "text-[#FD844C]",
  general: "text-[#3896FB]",
  normal: "text-[#3896FB]",
  citizen: "text-[#FD844C]",
  resident: "text-[#6FCF97]",
  inhabitant: "text-[#B58CFF]",
  none: "text-[#9CA3AF]",
};

export function getBookingOpenLabelTextClass(
  tone: BookingOpenLabelTone,
  label?: string | null
) {
  if (tone === "priority") {
    if (label === "시민") return bookingOpenLabelTextClass.citizen;
    if (label === "구민") return bookingOpenLabelTextClass.resident;
    if (label === "주민") return bookingOpenLabelTextClass.inhabitant;
  }

  if (tone === "general") return bookingOpenLabelTextClass.normal;

  return bookingOpenLabelTextClass[tone];
}
