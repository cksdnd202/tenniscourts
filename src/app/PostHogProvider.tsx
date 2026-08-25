"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

let posthogInitialized = false;

function initPostHog() {
  if (posthogInitialized || typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });

  posthogInitialized = true;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();

    const search = searchParams.toString();
    const url = `${window.origin}${pathname}${search ? `?${search}` : ""}`;

    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [pathname, searchParams]);

  return null;
}

function getTrackedClickElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  return target.closest(
    "[data-ph-event], [data-gtm='reserve_click'], [data-gtm^='calendar_register']"
  ) as HTMLElement | null;
}

function getDatasetProperties(element: HTMLElement) {
  const properties: Record<string, string> = {};

  Object.entries(element.dataset).forEach(([key, value]) => {
    if (!value || key === "phEvent") return;

    properties[key] = value;
  });

  if (element instanceof HTMLAnchorElement && element.href) {
    properties.href = element.href;
  }

  return properties;
}

function getPostHogEventName(element: HTMLElement) {
  if (element.dataset.phEvent) return element.dataset.phEvent;

  const gtmAction = element.dataset.gtm;
  if (gtmAction === "reserve_click") {
    return window.location.pathname.startsWith("/map")
      ? "map_booking_button_clicked"
      : "booking_button_clicked";
  }

  if (gtmAction?.startsWith("calendar_register")) {
    return "calendar_add_clicked";
  }

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  initPostHog();

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <TrackedClicks />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

function TrackedClicks() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      initPostHog();

      const element = getTrackedClickElement(event.target);
      if (!element) return;

      const eventName = getPostHogEventName(element);
      if (!eventName) return;

      posthog.capture(eventName, {
        ...getDatasetProperties(element),
        pathname: window.location.pathname,
        url: window.location.href,
      });
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
