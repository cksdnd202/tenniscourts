"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { isAppWebView } from "@/lib/posthogClient";
import { getPublicPlayUrl } from "@/lib/appLaunch";
import styles from "./AppLaunchAnnouncement.module.css";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const KEY = "courtskorea:app-launch-dismissed-until";
const DAY = 24 * 60 * 60 * 1000;
const EVENT = "courtskorea:app-launch-dismissed";
let memoryUntil = 0;
function expiry() {
  try { return Math.max(memoryUntil, Number(localStorage.getItem(KEY)) || 0); }
  catch { return memoryUntil; }
}
function eligible() {
  return !isAppWebView() && document.documentElement.dataset.courtsKoreaApp !== "true"
    && new URLSearchParams(location.search).get("app") !== "1"
    && (DEVELOPMENT || Date.now() >= expiry()) && !document.querySelector('[role="dialog"][aria-modal="true"]');
}
function subscribe(update: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const refresh = () => {
    clearTimeout(timer);
    update();
    const remaining = expiry() - Date.now();
    if (remaining > 0) timer = setTimeout(refresh, Math.min(remaining + 20, DAY));
  };
  window.addEventListener(EVENT, refresh);
  window.addEventListener("storage", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", refresh);
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-courts-korea-app"] });
  observer.observe(document.body, { childList: true, subtree: true });
  refresh();
  return () => {
    clearTimeout(timer); observer.disconnect();
    window.removeEventListener(EVENT, refresh); window.removeEventListener("storage", refresh);
    window.removeEventListener("pageshow", refresh); document.removeEventListener("visibilitychange", refresh);
  };
}
function persistDismissal() {
  memoryUntil = Date.now() + DAY;
  try { localStorage.setItem(KEY, String(memoryUntil)); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event(EVENT));
}
const serverHidden = () => false;
const mobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const noSubscribe = () => () => undefined;
export function AppLaunchAnnouncement() {
  const path = usePathname();
  return <Announcement key={DEVELOPMENT ? path : "app-launch"} />;
}
function Announcement() {
  const path = usePathname();
  const visible = useSyncExternalStore(subscribe, eligible, serverHidden);
  const isMobile = useSyncExternalStore(noSubscribe, mobile, serverHidden);
  const dialog = useRef<HTMLDialogElement>(null);
  const [closed, setClosed] = useState(false);
  const dismiss = () => {
    if (DEVELOPMENT) setClosed(true);
    else persistDismissal();
  };
  if (closed || !visible || /^\/(?:map|login|admin|test|list-test|account-deletion)(?:\/|-|$)/.test(path)) return null;
  return <dialog ref={node => { dialog.current = node; if (node && !node.open) node.showModal(); }}
    className={styles.dialog} aria-labelledby="app-launch-title" onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className={styles.content}>
      <button className={styles.close} type="button" aria-label="앱 출시 안내 닫기" onClick={dismiss}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>
      <h2 id="app-launch-title">기다리던 예약 오픈<br/>이제 알림으로 받아보세요</h2>
      <p className={styles.description}>Courts Korea <span>안드로이드 앱이 출시됐어요.</span><br/>예약 오픈 전에 알림을 드릴게요.</p>
      <div className={`${styles.media} ${isMobile ? styles.mobileMedia : styles.slideshow}`}>
        <div className={styles.appSlide}>
          <Image unoptimized src="/images/app-launch/app-preview.png" alt="Courts Korea 앱의 코트 검색과 예약 오픈 정보 화면" width={922} height={1474} priority />
        </div>
        {!isMobile && <div className={styles.qrSlide}>
          <div className={styles.qrCode}><QRCodeSVG value={getPublicPlayUrl()} size={188} marginSize={2}/></div>
          <p>QR코드를 스캔하면<br/>앱을 설치할 수 있어요</p>
        </div>}
      </div>
      {isMobile && <a className={styles.download} href={getPublicPlayUrl()} onClick={dismiss}>Google Play에서 다운로드</a>}
      <button className={styles.continue} type="button" onClick={dismiss}>웹에서 계속 보기</button>

    </div>
  </dialog>;
}
