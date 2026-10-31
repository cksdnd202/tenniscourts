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

/** Set only after the public Play listing is available; never use a closed-test URL. */
const playStoreUrl = process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim();
const publicPlayUrl = playStoreUrl
  && /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.courtskorea\.app(?:&[^\s]*)?$/.test(playStoreUrl)
  ? playStoreUrl
  : null;

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
          <span className={styles.halo} />
          <div className={styles.phone}>
            <span className={styles.camera} />
            <div className={styles.screen}>
              <span className={styles.screenLabel}>COURTS</span>
              <div className={styles.court}><i /><i /></div>
              <span className={styles.screenLine} />
              <span className={styles.screenLineShort} />
            </div>
            <span className={styles.homeIndicator} />
          </div>
          <div className={styles.notification}>
            <span className={styles.notificationDot} />
            <span><strong>예약 오픈 10분 전</strong><i /></span>
          </div>
          <div className={styles.bellBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
            <span className={styles.badgeDot} />
          </div>
          <span className={styles.sparkle}>✦</span>
        </div>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>COURTS KOREA APP</span>
          <h3>예약 오픈, 이제 알림으로</h3>
          <p>이 테니스장 예약 오픈 1일 전·10분 전,<br className={styles.mobileBreak} /> 앱에서 미리 알려드려요.</p>
        </div>
        {publicPlayUrl ? (
          <a href={publicPlayUrl} target="_blank" rel="noopener noreferrer" data-ph-event="detail_app_reminder_store_clicked" className={styles.install}>
            Google Play에서 설치
          </a>
        ) : (
          <span aria-disabled="true" className={styles.comingSoon}>앱 출시 준비 중</span>
        )}
      </div>
    </aside>
  );
}
