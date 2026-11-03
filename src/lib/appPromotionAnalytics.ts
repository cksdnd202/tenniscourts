"use client";
import posthog from "posthog-js";
import { isAppWebView } from "./posthogClient";

export function promotionAnalyticsAllowed() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production"
    && /^(www\.)?courtskorea\.com$/.test(location.hostname)
    && !isAppWebView() && document.documentElement.dataset.courtsKoreaApp !== "true"
    && new URLSearchParams(location.search).get("app") !== "1";
}
const GA_ID = "G-P5WNNV82W4";
type GoogleWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let initialized = false;
export function initPromotionGoogleTag() {
  if (!promotionAnalyticsAllowed()) return;
  const target = window as GoogleWindow;
  target.dataLayer ??= [];
  target.gtag ??= (...args: unknown[]) => { target.dataLayer!.push(args); };
  if (initialized) return;
  initialized = true;
  target.gtag("js", new Date());
  target.gtag("config", GA_ID, { send_page_view: false });
  // Reuse an existing Google tag loader where present; otherwise load our tag.
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }
}

/** Resolves after GA acknowledgement or bounded timeout. Never blocks navigation indefinitely. */
export function trackAppPromotion(event: string, source: string, extra: Record<string, string | number> = {}) {
  if (!promotionAnalyticsAllowed()) return Promise.resolve();
  const properties = { source, promo_source: source, campaign: "app_launch", device_type: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop", os: /Android/i.test(navigator.userAgent) ? "android" : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "other", page_path: location.pathname, facility_path: location.pathname.startsWith("/courts/") ? location.pathname : "", analytics_environment: "production", ...extra };
  try {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture(event, properties, { send_instantly: true, transport: "sendBeacon" });
  } catch { /* Analytics must not prevent app/store navigation. */ }
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 1200);
    try {
      initPromotionGoogleTag();
      (window as GoogleWindow).gtag?.("event", event, { ...properties, send_to: GA_ID, transport_type: "beacon", event_timeout: 1000, event_callback: () => { clearTimeout(timer); resolve(); } });
    } catch { clearTimeout(timer); resolve(); }
  });
}
