export function webAnalyticsAllowed() {
 return typeof window !== "undefined" && process.env.NODE_ENV === "production"
  && /^(www\.)?courtskorea\.com$/.test(window.location.hostname);
}
