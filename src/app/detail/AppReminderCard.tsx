"use client";

import { useSyncExternalStore } from "react";
import { isAppWebView } from "@/lib/posthogClient";
import styles from "./AppReminderCard.module.css";

const subscribe = () => () => undefined;
const getServerSnapshot = () => true;
function getHiddenSnapshot() {
  return isAppWebView()
    || document.documentElement.dataset.courtsKoreaApp === "true"
    || new URLSearchParams(window.location.search).get("app") === "1";
}

/** Set only after the public Play listing is available; never use a closed-test URL. */
const playStoreUrl = process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim();
const publicPlayUrl = playStoreUrl
  && /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.courtskorea\.app(?:&[^\s]*)?$/.test(playStoreUrl)
  ? playStoreUrl
  : null;

export function AppReminderCard() {
  const hidden = useSyncExternalStore(subscribe, getHiddenSnapshot, getServerSnapshot);
  if (hidden) return null;

  return (
    <aside
      aria-label="앱 예약 오픈 알림 안내"
      data-detail-app-reminder="true"
      className={`${styles.card} mt-6 rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] p-5 sm:p-6`}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="sport-card-accent-text mt-0.5 h-6 w-6 shrink-0">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          <div className="min-w-0">
            <h3 className="break-keep text-[17px] font-semibold leading-6 text-white">이 테니스장 예약 오픈, 알림으로 받아보세요</h3>
            <p className="mt-1 break-keep text-sm leading-6 text-[#B0B0B0]">Courts Korea 앱에서 예약 오픈 1일 전·10분 전 알림을 설정할 수 있어요.</p>
          </div>
        </div>
        {publicPlayUrl ? (
          <a href={publicPlayUrl} target="_blank" rel="noopener noreferrer" data-ph-event="detail_app_reminder_store_clicked" className="sport-card-accent-focus inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#1A1A1B] transition-colors hover:bg-[#E5E5E5] focus-visible:outline-2 focus-visible:outline-offset-4">
            Google Play에서 설치
          </a>
        ) : (
          <span aria-disabled="true" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-[#3C3C3C] px-5 py-3 text-sm font-medium text-[#B0B0B0]">앱 출시 준비 중</span>
        )}
      </div>
    </aside>
  );
}
