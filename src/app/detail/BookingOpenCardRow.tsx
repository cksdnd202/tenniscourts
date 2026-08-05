import type { ReactNode } from "react";
import {
  bookingOpenLabelTextClass,
  type BookingOpenLabelTone,
} from "./detailLayoutStyles";

type Props = {
  /** 구민 · 시민 · 주민 · 일반 */
  label: string;
  /** 구민·시민·주민: priority, 일반: general */
  labelTone: BookingOpenLabelTone;
  children: ReactNode;
  compact?: boolean;
};

/** 라벨은 좌측 고정(톤별 배지), 예약 오픈 문구는 박스 가로 중앙 */
export function BookingOpenCardRow({ label, labelTone, children, compact = false }: Props) {
  const labelColorClass = bookingOpenLabelTextClass[labelTone];
  const rowHeightClass = compact ? "min-h-[38px]" : "min-h-[48px]";

  return (
    <div className={`relative w-full ${rowHeightClass}`}>
      <span
        className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[#0D0D0F] px-2.5 py-1 text-xs font-medium leading-none ring-1 ring-white/5 ${labelColorClass}`}
      >
        {label}
      </span>
      <div className={`flex ${rowHeightClass} w-full items-center justify-end min-[1032px]:justify-center pl-14 pr-4 sm:pl-16 sm:pr-5 min-[1032px]:px-16 text-right min-[1032px]:text-center text-sm text-white break-words`}>
        <span className="max-w-full leading-snug">{children}</span>
      </div>
    </div>
  );
}
