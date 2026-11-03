const PLAY_URL = "https://play.google.com/store/apps/details?id=com.courtskorea.app";

/** Accept public facility paths only; never pass arbitrary URLs to native routing. */
export function getAppDestination(raw: string | null | undefined) {
  if (raw === "/tennis" || raw === "/badminton") return raw;
  const match = /^\/courts\/([^/?#]+)\/?$/.exec(raw ?? "");
  if (!match) return "/";
  try {
    const slug = decodeURIComponent(match[1]);
    if (!/^[\p{L}\p{N}_-]+$/u.test(slug)) return "/";
    return `/courts/${encodeURIComponent(slug)}`;
  } catch {
    return "/";
  }
}

export function getAndroidAppIntent(raw: string) {
  const path = getAppDestination(raw);
  const nativePath = path.startsWith("/courts/") ? path : "/";
  const fallback = getFacilityPlayUrl(path);
  return `intent://${nativePath}#Intent;scheme=courtskorea;package=com.courtskorea.app;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

export function getPublicPlayUrl() {
  const value = process.env.NEXT_PUBLIC_ANDROID_APP_STORE_URL?.trim();
  if (!value) return PLAY_URL;
  try {
    const url = new URL(value);
    return url.origin === "https://play.google.com" && url.pathname === "/store/apps/details"
      && url.searchParams.get("id") === "com.courtskorea.app" && !url.username && !url.password
      ? url.toString() : PLAY_URL;
  } catch {
    return PLAY_URL;
  }
}

export function getFacilityPlayUrl(raw: string) {
  const url = new URL(getPublicPlayUrl());
  url.searchParams.set("referrer", new URLSearchParams({ court_path: getAppDestination(raw) }).toString());
  return url.toString();
}

export type AppQrSource = "launch_popup" | "header_qr";
export function getAppQrUrl(source: AppQrSource, path = "/") {
  const origin = typeof window === "undefined" ? "https://courtskorea.com" : window.location.origin;
  const params = new URLSearchParams({ source, path: getAppDestination(path) });
  return `${origin}/app-download?${params}`;
}
export function getAttributedPlayUrl(source: string) {
  const url = new URL(getPublicPlayUrl());
  url.searchParams.set("referrer", new URLSearchParams({ utm_source: "courtskorea_web", utm_medium: "qr", utm_campaign: "app_launch", utm_content: source }).toString());
  return url.toString();
}
