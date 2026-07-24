"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const FIRST_VISIT_COOKIE = "courtskorea_first_visit_done";
const SERVICE_ONBOARDING_DONE_KEY = "courtskorea_service_onboarding_v1_done";

const hasFirstVisitCookie = () => {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${FIRST_VISIT_COOKIE}=`));
};

const hasCompletedServiceOnboarding = () => {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SERVICE_ONBOARDING_DONE_KEY) === "true";
};

const isLocalDevHost = () => {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
};

type CoachmarkStep = {
  title: string;
  description: string;
  selectors: string[];
};

type NextSource = "button" | "outside";

const STEPS: CoachmarkStep[] = [
  {
    title: "필터",
    description: "찾고 싶은 테니스장의 조건을 입력해보세요.",
    selectors: ['[data-coachmark="filter-area"]', '[data-coachmark="filter-area-mobile"]'],
  },
  {
    title: "테니스장 목록",
    description: "조건에 맞는 테니스장 목록을 확인하세요.",
    selectors: ['[data-coachmark="results-area"]'],
  },
  {
    title: "테니스장 정보",
    description: "더 상세한 정보는 상세페이지에서 제공하고 있어요.",
    selectors: ['[data-coachmark="first-court-card"]'],
  },
  {
    title: "검색",
    description: "테니스장 이름을 검색하면 빠르게 찾을 수 있어요.",
    selectors: ['[data-coachmark="search-area"]', '[data-coachmark="search-area-mobile"]'],
  },
];

const findTargetRect = (selectors: string[]) => {
  if (typeof document === "undefined") return null;
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return rect;
    }
  }
  return null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function FirstVisitCoachmark() {
  const [stepIndex, setStepIndex] = useState(() => {
    if (!hasCompletedServiceOnboarding()) return -1;
    if (isLocalDevHost()) return hasFirstVisitCookie() ? -1 : 0;
    return hasFirstVisitCookie() ? -1 : 0;
  });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [measuredBubbleHeight, setMeasuredBubbleHeight] = useState(180);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const currentStep = useMemo(
    () => (stepIndex >= 0 && stepIndex < STEPS.length ? STEPS[stepIndex] : null),
    [stepIndex]
  );

  useEffect(() => {
    if (!currentStep) return;

    const updateRect = () => {
      const rect = findTargetRect(currentStep.selectors);
      setTargetRect(rect);
    };

    const rafId = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [currentStep]);

  useEffect(() => {
    if (!currentStep || !bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    if (rect.height > 0) {
      setMeasuredBubbleHeight((prev) =>
        Math.abs(prev - rect.height) > 1 ? rect.height : prev
      );
    }
  }, [currentStep, stepIndex, targetRect]);

  const completeCoachmark = () => {
    if (!isLocalDevHost()) {
      document.cookie = `${FIRST_VISIT_COOKIE}=true; path=/; max-age=31536000; samesite=lax`;
    }
    setStepIndex(-1);
  };

  const trackCoachmarkNext = (source: NextSource) => {
    if (typeof window === "undefined" || !currentStep) return;
    const win = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "coachmark_next",
      coachmark_source: source,
      coachmark_step_index: stepIndex + 1,
      coachmark_step_title: currentStep.title,
    });
  };

  const handleNext = (source: NextSource) => {
    if (!currentStep) return;
    trackCoachmarkNext(source);
    if (stepIndex >= STEPS.length - 1) {
      completeCoachmark();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  if (!currentStep || !targetRect) return null;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const isMobile = viewportWidth > 0 ? viewportWidth < 1032 : false;

  const bubbleWidth = isMobile ? Math.min(340, viewportWidth - 24) : 320;
  const bubbleHeight = measuredBubbleHeight;
  const desktopGap = 14;
  const mobileGap = 6;
  const margin = 12;

  let bubbleLeft = targetRect.right + desktopGap;
  let bubbleTop = targetRect.top + targetRect.height / 2 - bubbleHeight / 2;

  if (isMobile) {
    if (stepIndex === 0) {
      // "필터" 단계는 필터 버튼 바로 위에 거의 붙여서 노출
      const closeGap = 8;
      bubbleTop = targetRect.top - bubbleHeight - closeGap;
      bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
    } else if (stepIndex === 1) {
      // "테니스장 목록" 단계에서는 하단 필터 버튼을 덮도록 하단 고정에 가깝게 배치
      bubbleTop = viewportHeight - bubbleHeight - 20;
      bubbleLeft = viewportWidth / 2 - bubbleWidth / 2;
    } else if (stepIndex === 3) {
      // "검색" 단계에서는 코치마크 우측 끝을 검색 버튼 하이라이트 우측 끝과 정렬
      bubbleTop = targetRect.bottom + mobileGap;
      bubbleLeft = targetRect.right - bubbleWidth;
    } else {
      const enoughTop = targetRect.top >= bubbleHeight + mobileGap + margin;
      if (enoughTop) {
        bubbleTop = targetRect.top - bubbleHeight - mobileGap;
      } else {
        bubbleTop = targetRect.bottom + mobileGap;
      }
      bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
    }
  } else {
    const enoughRight = viewportWidth - targetRect.right >= bubbleWidth + desktopGap + margin;
    const enoughLeft = targetRect.left >= bubbleWidth + desktopGap + margin;
    const enoughBottom = viewportHeight - targetRect.bottom >= bubbleHeight + desktopGap + margin;

    if (enoughRight) {
      bubbleLeft = targetRect.right + desktopGap;
    } else if (enoughLeft) {
      bubbleLeft = targetRect.left - bubbleWidth - desktopGap;
    } else if (enoughBottom) {
      bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
      bubbleTop = targetRect.bottom + desktopGap;
    } else {
      bubbleLeft = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
      bubbleTop = targetRect.top - bubbleHeight - desktopGap;
    }
  }

  const horizontalMargin = margin;
  bubbleLeft = clamp(
    bubbleLeft,
    horizontalMargin,
    Math.max(horizontalMargin, viewportWidth - bubbleWidth - horizontalMargin)
  );
  if (isMobile && (stepIndex === 0 || stepIndex === 1)) {
    // 1,2단계는 하단 타겟과의 상대 위치가 우선이라 상단 최소값만 적용
    bubbleTop = Math.max(margin, bubbleTop);
  } else {
    bubbleTop = clamp(bubbleTop, margin, Math.max(margin, viewportHeight - bubbleHeight - margin));
  }

  const highlightStyle = {
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height,
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.82)",
  } as const;

  const bubbleStyle = {
    top: bubbleTop,
    left: bubbleLeft,
    width: bubbleWidth,
  } as const;

  return (
    <div
      className="fixed inset-0 z-[70] cursor-pointer"
      onClick={() => handleNext("outside")}
    >
      <div
        className="pointer-events-none fixed rounded-xl"
        style={highlightStyle}
      />

      <div className="fixed pointer-events-auto" style={bubbleStyle}>
        <div
          ref={bubbleRef}
          className="rounded-2xl border border-[#D9D9D9] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.28)] outline outline-2 outline-[#2C8B56]"
        >
          <p className="text-lg font-semibold text-[#1F1F1F]">{currentStep.title}</p>
          <p className="mt-1.5 text-sm leading-6 text-[#222222]">
            {currentStep.description}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#5A5A5A]">
              {stepIndex + 1} / {STEPS.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  completeCoachmark();
                }}
                className="rounded-xl border border-[#D6D6D6] bg-white px-4 py-2 text-sm font-medium text-[#222222] hover:bg-[#F5F5F5]"
                data-gtm="coachmark_confirm_click"
              >
                확인
              </button>
              {stepIndex < STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNext("button");
                  }}
                  className="rounded-xl bg-[#2C8B56] px-4 py-2 text-sm font-semibold text-white hover:bg-[#53A978]"
                  data-gtm="coachmark_next_click"
                >
                  다음
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
