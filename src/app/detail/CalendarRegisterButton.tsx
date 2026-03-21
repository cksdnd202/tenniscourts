"use client";

import type { CalendarAndroidEventPayload } from "./calendarAndroidPayload";

type Props = {
  /** 단일 일정 .ics (iOS·데스크톱 등) */
  icsPath: string;
  /** 안드로이드: 시스템이 처리할 일정 INSERT 인텐트용 메타 */
  androidEvent: CalendarAndroidEventPayload;
  compact?: boolean;
};

function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Android Intent URI: ACTION_INSERT + vnd.android.cursor.item/event
 * → 삼성/구글 등 기본 캘린더 앱의 "새 일정" 화면으로 열리는 경우가 많음.
 * Chrome: S.browser_fallback_url 로 처리 실패 시 .ics URL 로 폴백.
 *
 * @see https://developer.chrome.com/docs/multidevice/android/intents
 */
function buildAndroidCalendarInsertIntentUrl(
  event: CalendarAndroidEventPayload,
  browserFallbackAbsoluteUrl: string
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
  parts.push(`S.browser_fallback_url=${enc(browserFallbackAbsoluteUrl)}`, "end");
  return parts.join(";");
}

/**
 * - iOS / 대부분 데스크톱: .ics 링크
 * - Android: 기본 캘린더용 INSERT 인텐트 (실패 시 브라우저가 .ics URL 로 폴백)
 */
export function CalendarRegisterButton({ icsPath, androidEvent, compact = false }: Props) {
  const className = compact
    ? "text-[11px] text-[#8A8F98] underline underline-offset-2"
    : "text-sm text-[#8A8F98] underline underline-offset-2";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAndroidUa()) return;
    e.preventDefault();
    const fallback = new URL(icsPath, window.location.origin).href;
    const intentUrl = buildAndroidCalendarInsertIntentUrl(androidEvent, fallback);
    window.location.href = intentUrl;
  };

  return (
    <a href={icsPath} target="_blank" rel="noopener noreferrer" onClick={handleClick} className={className}>
      캘린더 등록하기
    </a>
  );
}
