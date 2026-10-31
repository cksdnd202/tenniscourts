"use client";

import { useState, useSyncExternalStore } from "react";
import { isAppWebView } from "@/lib/posthogClient";
import styles from "./AppReminderCard.module.css";

const subscribe = () => () => undefined;
const getServerSnapshot = () => true;
function getHiddenSnapshot() {
  return isAppWebView()
    || document.documentElement.dataset.courtsKoreaApp === "true"
    || new URLSearchParams(window.location.search).get("app") === "1";
}

/** Public listing for the launch release; never use a closed-test URL. */
const playStoreUrl = process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim();
const publicPlayUrl = playStoreUrl
  && /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.courtskorea\.app(?:&[^\s]*)?$/.test(playStoreUrl)
  ? playStoreUrl
  : "https://play.google.com/store/apps/details?id=com.courtskorea.app";

export function AppReminderCard() {
  const [motionKey, setMotionKey] = useState(0);
  const ring = () => setMotionKey((value) => value + 1);
  const hidden = useSyncExternalStore(subscribe, getHiddenSnapshot, getServerSnapshot);
  if (hidden) return null;

  return (
    <aside
      aria-label="앱 예약 오픈 알림 안내"
      data-detail-app-reminder="true"
      className={styles.card}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") ring(); }}
      onPointerDown={ring}
      onFocus={ring}
    >
      <div className={styles.layout}>
        <div key={motionKey} aria-hidden="true" className={`${styles.art} ${motionKey ? styles.ringing : ""}`}>
          <div className={styles.notification}>
            <span className={styles.notificationDot} />
            <span><strong>예약 오픈 10분 전</strong><i /></span>
          </div>
        </div>
        <div className={styles.copy}>
          <h3>예약 오픈 알림, 이제 앱에서</h3>
          <p>이 테니스장 예약 오픈 1일 전·10분 전,<br className={styles.mobileBreak} /> 앱에서 미리 알려드려요.</p>
        </div>
        <a href={publicPlayUrl} target="_blank" rel="noopener noreferrer" data-ph-event="detail_app_reminder_store_clicked" className={styles.install}>
          앱 다운로드하기
        </a>
      </div>
    </aside>
  );
}
