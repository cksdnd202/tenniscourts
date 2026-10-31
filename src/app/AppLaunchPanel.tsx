"use client";

import { useState, useSyncExternalStore } from "react";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { getAndroidAppIntent, getAppDestination, getAppHandoffUrl, getPublicPlayUrl } from "@/lib/appLaunch";
import styles from "./AppLaunchPanel.module.css";

const subscribe = () => () => undefined;
function getBrowser() {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (!/Android/i.test(navigator.userAgent)) return "desktop";
  if (/\b(?:KAKAOTALK|Instagram)\b/i.test(navigator.userAgent)) return "in-app";
  return "android";
}
const getServerBrowser = () => "unknown";

export function AppLaunchPanel({ path, attempted = false, onContinue }: { path: string; attempted?: boolean; onContinue?: () => void }) {
  const browser = useSyncExternalStore(subscribe, getBrowser, getServerBrowser);
  const [tried, setTried] = useState(attempted);
  const [copyStatus, setCopyStatus] = useState("");
  const destination = getAppDestination(path);
  const isCourt = destination.startsWith("/courts/");
  const isAndroid = browser === "android" || browser === "in-app";
  const handoffUrl = getAppHandoffUrl(destination);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(handoffUrl);
      setCopyStatus("링크를 복사했어요. 휴대폰 브라우저에서 열어 주세요.");
    } catch {
      setCopyStatus("복사하지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <div className={styles.panel}>
      <h1>Courts Korea 앱으로 보기</h1>
      <p>{isCourt ? "지금 보고 있는 시설을 앱에서 이어서 확인하세요." : "앱에서 테니스장을 찾고 예약 오픈 알림을 설정하세요."}</p>
      {isAndroid && (
        <a className={styles.primary} href={getAndroidAppIntent(destination, window.location.origin)} onClick={() => {
          setTried(true);
          capturePostHogEvent("app_open_attempted", { destination, browser });
        }}>앱에서 열기</a>
      )}
      {browser === "ios" ? (
        <p className={styles.notice}>현재 Android 앱을 제공하고 있어요. iPhone·iPad에서는 웹으로 계속 이용해 주세요.</p>
      ) : (
        <>
          {browser === "desktop" && <p className={styles.notice}>Android 휴대폰에서 아래 링크를 열면 앱으로 연결할 수 있어요.</p>}
          <a className={styles.secondary} href={getPublicPlayUrl()} target="_blank" rel="noopener noreferrer" data-ph-event="app_handoff_store_clicked" data-destination={destination}>Google Play에서 다운로드</a>
          {isAndroid && <p className={styles.hint}>설치했다면 이 화면으로 돌아와 ‘앱에서 열기’를 눌러 주세요.</p>}
        </>
      )}
      {(tried || browser === "in-app") && (
        <div className={styles.notice} role="status">
          <strong>앱이 열리지 않나요?</strong>
          <p>{browser === "in-app" ? "카카오톡·인스타그램에서는 앱 실행이 제한될 수 있어요. 브라우저 메뉴에서 ‘외부 브라우저로 열기’를 선택한 뒤 다시 눌러 주세요." : "앱 설치 여부와 휴대폰의 링크 열기 설정을 확인해 주세요. 설치 후에도 안 열리면 아래 링크를 Chrome에서 열어 주세요."}</p>
        </div>
      )}
      {browser !== "ios" && (
        <details className={styles.copy} open={browser === "desktop" || browser === "in-app"}>
          <summary>휴대폰·외부 브라우저에서 열기</summary>
          <button type="button" className={styles.secondary} onClick={copyLink}>연결 링크 복사</button>
          <a href={handoffUrl} className={styles.url}>{handoffUrl}</a>
          <p role="status">{copyStatus}</p>
        </details>
      )}
      {onContinue ? <button className={styles.continue} onClick={onContinue}>웹에서 계속 보기</button> : <a className={styles.continue} href={destination}>웹에서 계속 보기</a>}
    </div>
  );
}
