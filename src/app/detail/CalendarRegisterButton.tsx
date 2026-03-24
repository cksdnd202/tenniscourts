"use client";

import type { CalendarAndroidEventPayload } from "./calendarAndroidPayload";

type Props = {
  /** iOS 등: .ics 링크 */
  icsPath: string;
  /** 안드로이드: 인텐트 실패·보조 폴백용 구글 캘린더 웹 */
  googleCalendarUrl: string;
  androidEvent: CalendarAndroidEventPayload;
  compact?: boolean;
  gtmAction: "calendar_register_priority_click" | "calendar_register_general_click";
  courtId?: string;
  courtName?: string;
  badge?: string;
};

/** PC(윈도우·맥 등) 데스크톱 브라우저 — 모바일만 캘린더 등록 허용 */
function isDesktopPc(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return false;
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
  return true;
}

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Android Intent URI: ACTION_INSERT + vnd.android.cursor.item/event
 * browser_fallback_url 은 .ics 가 아니라 구글 캘린더(다운로드 방지).
 */
function buildAndroidCalendarInsertIntentUrl(
  event: CalendarAndroidEventPayload,
  browserFallbackGoogleCalendarUrl: string
): string {
  const beginMs = new Date(event.startIso).getTime();
  const endMs = new Date(event.endIso).getTime();
  const enc = (value: string) =>
    encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

  const parts: string[] = [
    "intent:#Intent",
    "action=android.intent.action.INSERT",
    "type=vnd.android.cursor.item/event",
    `S.title=${enc(event.title)}`,
    `S.description=${enc(event.description)}`,
    `l.beginTime=${beginMs}`,
    `l.endTime=${endMs}`,
  ];
  if (event.location?.trim()) {
    parts.push(`S.eventLocation=${enc(event.location.trim())}`);
  }
  parts.push(`S.browser_fallback_url=${enc(browserFallbackGoogleCalendarUrl)}`, "end");
  return parts.join(";");
}

export function CalendarRegisterButton({
  icsPath,
  googleCalendarUrl,
  androidEvent,
  compact = false,
  gtmAction,
  courtId,
  courtName,
  badge,
}: Props) {
  const className = compact
    ? "text-[11px] text-[#8A8F98] underline underline-offset-2"
    : "text-sm text-[#8A8F98] underline underline-offset-2";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDesktopPc()) {
      e.preventDefault();
      window.alert("캘린더 등록은 모바일에서만 가능합니다");
      return;
    }

    if (!isAndroidUa()) {
      // iOS 등: 기본 동작으로 .ics 열기
      return;
    }

    e.preventDefault();
    const intentUrl = buildAndroidCalendarInsertIntentUrl(androidEvent, googleCalendarUrl);
    window.location.href = intentUrl;

    // 인텐트가 무시되고 화면에 그대로 남은 경우 → 구글 캘린더로 2차 시도
    window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
      }
    }, 850);
  };

  return (
    <a
      href={icsPath}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      data-gtm={gtmAction}
      data-court-id={courtId}
      data-court-name={courtName}
      data-booking-type={badge}
    >
      캘린더 등록하기
    </a>
  );
}
