"use client";

type Props = {
  calendarPath: string;
  compact?: boolean;
};

export function CalendarRegisterButton({ calendarPath, compact = false }: Props) {
  const className = compact
    ? "text-[11px] text-[#8A8F98] underline underline-offset-2"
    : "text-sm text-[#8A8F98] underline underline-offset-2";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // 1) 기본 캘린더 앱 연결 시도(webcal 프로토콜)
    const absoluteHttpUrl = new URL(calendarPath, window.location.origin).toString();
    const webcalUrl = absoluteHttpUrl.replace(/^https?:\/\//, "webcal://");

    window.location.href = webcalUrl;

    // 2) 지원하지 않는 환경 대비: 기존 ICS 다운로드로 폴백
    window.setTimeout(() => {
      window.open(calendarPath, "_blank", "noopener,noreferrer");
    }, 900);
  };

  return (
    <a href={calendarPath} onClick={handleClick} className={className}>
      캘린더 등록하기
    </a>
  );
}

