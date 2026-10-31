const SITE_ORIGIN = "https://courtskorea.com";
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

export function getAppHandoffPath(raw: string, attempted = false) {
  const params = new URLSearchParams({ path: getAppDestination(raw) });
  if (attempted) params.set("attempted", "1");
  return `/app/open?${params}`;
}

export function getAppHandoffUrl(raw: string) {
  return `${SITE_ORIGIN}${getAppHandoffPath(raw)}`;
}

export function getAndroidAppIntent(raw: string, webOrigin = SITE_ORIGIN) {
  const path = getAppDestination(raw);
  const nativePath = path.startsWith("/courts/") ? path : "/";
  const fallback = `${webOrigin}${getAppHandoffPath(path, true)}`;
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
