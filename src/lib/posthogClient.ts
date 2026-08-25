"use client";

import posthog from "posthog-js";

export function capturePostHogEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.capture(eventName, {
    ...properties,
    pathname: window.location.pathname,
    url: window.location.href,
  });
}
