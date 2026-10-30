"use client";

import posthog from "posthog-js";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export function isAppWebView() {
  if (typeof window === "undefined") return false;
  return Boolean(window.ReactNativeWebView) || /CourtsKoreaApp/i.test(window.navigator.userAgent);
}

export function capturePostHogEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const eventProperties = {
    ...properties,
    pathname: window.location.pathname,
  };

  if (isAppWebView()) {
    window.ReactNativeWebView?.postMessage(JSON.stringify({
      type: "analytics",
      eventName,
      properties: eventProperties,
    }));
    return;
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.capture(eventName, {
    ...eventProperties,
    url: window.location.href,
  });
}
