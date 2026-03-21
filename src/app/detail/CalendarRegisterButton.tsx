"use client";

type Props = {
  calendarPath: string;
  compact?: boolean;
};

/**
 * 단일 일정용 .ics 링크.
 * webcal:// 는 macOS 등에서 "캘린더 구독" UI로 열리므로 사용하지 않습니다.
 */
export function CalendarRegisterButton({ calendarPath, compact = false }: Props) {
  const className = compact
    ? "text-[11px] text-[#8A8F98] underline underline-offset-2"
    : "text-sm text-[#8A8F98] underline underline-offset-2";

  return (
    <a href={calendarPath} target="_blank" rel="noopener noreferrer" className={className}>
      캘린더 등록하기
    </a>
  );
}
