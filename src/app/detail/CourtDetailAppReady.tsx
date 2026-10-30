"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

const READY_RETRY_DELAYS_MS = [0, 500, 2_000, 6_000];

/**
 * The installed app keeps its native loading cover visible until the detail
 * WebView reports that the streamed page has mounted. Repeating the message a
 * few times makes the handshake resilient to Android WebView load-event races
 * while remaining a no-op in ordinary browsers.
 */
export function CourtDetailAppReady() {
  useEffect(() => {
    const reportReady = () => {
      if (!window.ReactNativeWebView) return;

      const title = document.querySelector('[data-detail-title="true"]');
      const location = document.querySelector('[data-detail-location="true"]');
      if (!title?.textContent?.trim() || !location) return;

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "detail-ready" }));
    };

    const timers = READY_RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(reportReady, delay)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return null;
}
