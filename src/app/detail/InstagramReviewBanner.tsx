"use client";

import { type MouseEvent, useSyncExternalStore } from "react";

type InstagramReviewBannerProps = {
  courtId: string;
  courtName?: string | null;
  hashtag?: string | null;
};

function normalizeHashtag(value?: string | null) {
  return value?.trim().replace(/^#+/, "") ?? "";
}

type NativeWebViewWindow = Window & {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
};

function subscribeToAppWebView() {
  return () => undefined;
}

function getAppWebViewSnapshot() {
  return Boolean(
    (window as NativeWebViewWindow).ReactNativeWebView
    || document.documentElement.getAttribute("data-courts-korea-app") === "true"
  );
}

function getServerAppWebViewSnapshot() {
  return false;
}

export function InstagramReviewBanner({
  courtId,
  courtName,
  hashtag,
}: InstagramReviewBannerProps) {
  const normalizedHashtag = normalizeHashtag(hashtag);
  const isAppWebView = useSyncExternalStore(
    subscribeToAppWebView,
    getAppWebViewSnapshot,
    getServerAppWebViewSnapshot
  );

  if (!normalizedHashtag) return null;

  // Instagram's web-only keyword search URL loses its query when Android
  // hands it to the Instagram app. The canonical hashtag route is understood
  // by both the mobile app and the browser, so the selected court opens at the
  // actual hashtag results instead of the Instagram home screen.
  const instagramSearchUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(normalizedHashtag)}/`;

  const openInstagramSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    const nativeBridge = (window as NativeWebViewWindow).ReactNativeWebView;
    if (!nativeBridge) return;

    event.preventDefault();
    event.stopPropagation();
    nativeBridge.postMessage(JSON.stringify({
      type: "open-external",
      url: instagramSearchUrl,
    }));
  };

  return (
    <section
      id="instagram-reviews"
      data-detail-instagram-banner="true"
      aria-label="인스타그램 방문 후기"
    >
      <a
        href={instagramSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-ph-event="detail_instagram_clicked"
        data-court-id={courtId}
        data-court-name={courtName ?? undefined}
        data-instagram-hashtag={normalizedHashtag}
        aria-label={`인스타그램에서 #${normalizedHashtag} 검색하기`}
        onClick={openInstagramSearch}
        className={`group block w-full rounded-xl px-5 py-4 transition-colors duration-200 sm:px-6 ${
          isAppWebView
            ? "border border-[#E3E5E8] bg-white shadow-none hover:bg-[#FAFAFA]"
            : "bg-[#111112] hover:bg-[#171719]"
        }`}
      >
        <span className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon/icon_instagram.svg"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 flex-none transition-transform duration-200 group-hover:scale-[1.03]"
            />

            <span className="min-w-0 flex-1">
              <span
                data-instagram-banner-title="true"
                className={`block break-keep text-[17px] font-bold leading-6 ${isAppWebView ? "text-[#303030]" : "text-white"}`}
              >
                인스타그램에서 방문 후기를 확인해 보세요
              </span>
              <span
                data-instagram-banner-subtitle="true"
                className={`mt-0.5 block truncate text-[13px] font-medium leading-[18px] ${isAppWebView ? "text-[#777777]" : "text-[#858589]"}`}
              >
                #{normalizedHashtag}
              </span>
            </span>
          </span>

          <span
            data-instagram-banner-action="true"
            className={`inline-flex w-full flex-none items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-bold leading-5 transition-colors duration-200 sm:w-auto ${
              isAppWebView
                ? "border border-[#E5E7EB] bg-[#F7F8F9] shadow-none group-hover:bg-[#F1F2F4]"
                : "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] group-hover:bg-[#F6F6F7]"
            }`}
          >
            <span className="bg-[linear-gradient(90deg,#F01A78_0%,#D52394_55%,#A21BC1_100%)] bg-clip-text text-transparent">
              인스타그램에서 검색하기
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-[#A21BC1] transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </span>
      </a>
    </section>
  );
}
