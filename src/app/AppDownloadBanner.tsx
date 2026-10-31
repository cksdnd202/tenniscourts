"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { capturePostHogEvent, isAppWebView } from "@/lib/posthogClient";
import styles from "./AppDownloadBanner.module.css";

const DISMISSED_UNTIL_KEY = "courtskorea:app-banner-dismissed-until";
const CHANGE_EVENT = "courtskorea:app-banner-change";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
let memoryDismissedUntil = 0;

function getDismissedUntil() {
  try {
    const saved = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY));
    return Math.max(memoryDismissedUntil, Number.isFinite(saved) ? saved : 0);
  } catch {
    return memoryDismissedUntil;
  }
}

function getVisibleSnapshot() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !isIOS && !isAppWebView()
    && document.documentElement.dataset.courtsKoreaApp !== "true"
    && new URLSearchParams(window.location.search).get("app") !== "1"
    && Date.now() >= getDismissedUntil();
}

function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    clearTimeout(timer);
    onChange();
    const remaining = getDismissedUntil() - Date.now();
    if (remaining > 0) timer = setTimeout(update, Math.min(remaining + 10, SEVEN_DAYS_MS));
  };
  window.addEventListener("storage", update);
  window.addEventListener(CHANGE_EVENT, update);
  window.addEventListener("pageshow", update);
  document.addEventListener("visibilitychange", update);
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-courts-korea-app"] });
  update();
  return () => {
    clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener("storage", update);
    window.removeEventListener(CHANGE_EVENT, update);
    window.removeEventListener("pageshow", update);
    document.removeEventListener("visibilitychange", update);
  };
}

const getServerSnapshot = () => false;
const configuredStoreUrl = process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim();
const storeUrl = configuredStoreUrl
  && /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.courtskorea\.app(?:&[^\s]*)?$/.test(configuredStoreUrl)
  ? configuredStoreUrl
  : "https://play.google.com/store/apps/details?id=com.courtskorea.app";

export function AppDownloadBanner() {
  const visible = useSyncExternalStore(subscribe, getVisibleSnapshot, getServerSnapshot);

  const dismiss = () => {
    memoryDismissedUntil = Date.now() + SEVEN_DAYS_MS;
    try {
      window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(memoryDismissedUntil));
    } catch {
      // Keep dismissal effective during this visit when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    capturePostHogEvent("app_download_banner_dismissed", { duration_days: 7 });
  };

  if (!visible) return null;

  return (
    <aside className={styles.banner} aria-label="Courts Korea 앱 다운로드 안내" data-app-download-banner="true">
      <div className={styles.inner}>
        <span className={styles.icon} aria-hidden="true">
          <Image src="/icon/courtskorea_logo_mark.svg" width={18} height={24} alt="" />
        </span>
        <div className={styles.copy}>
          <p className={styles.title}>예약 오픈 알림은 앱에서</p>
          <p className={styles.description}>테니스장 예약 오픈 알림 · Android 앱</p>
        </div>
        <a className={styles.download} href={storeUrl} target="_blank" rel="noopener noreferrer" data-ph-event="app_download_banner_clicked">
          앱 다운로드
        </a>
        <button className={styles.close} type="button" aria-label="앱 다운로드 안내 7일간 닫기" title="7일간 보지 않기" onClick={dismiss}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </aside>
  );
}
