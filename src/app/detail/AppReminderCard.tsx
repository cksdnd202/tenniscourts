"use client";

import { AppPromotionImpression } from "../AppPromotionImpression";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { isAppWebView } from "@/lib/posthogClient";
import styles from "./AppReminderCard.module.css";
import { AppLaunchButton } from "../AppLaunchButton";

const subscribe = () => () => undefined;
const getServerSnapshot = () => true;
function getHiddenSnapshot() {
  return isAppWebView()
    || document.documentElement.dataset.courtsKoreaApp === "true"
    || new URLSearchParams(window.location.search).get("app") === "1";
}

export function AppReminderCard() {
  const hidden = useSyncExternalStore(subscribe, getHiddenSnapshot, getServerSnapshot);
  if (hidden) return null;

  return (
    <aside aria-label="앱 예약 오픈 알림 안내" data-detail-app-reminder="true" className={styles.card}>
      <AppPromotionImpression source="detail_card"><div className={styles.layout}>
        <Image className={styles.icon} unoptimized src="/images/app-launch/notification-bell-yellow.png" alt="" width={72} height={72} />
        <div className={styles.copy}>
          <h3>앱에서 코트 예약 오픈 알림 받기</h3>
          <p>예약 오픈 1일 전, 10분 전에<br className={styles.mobileBreak}/> 알림을 받아보세요</p>
        </div>
        <span className={styles.button} aria-hidden="true">앱에서 열기</span>
        <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </div>
      </AppPromotionImpression>
      <AppLaunchButton className={styles.install} source="detail_card" />
    </aside>
  );
}
