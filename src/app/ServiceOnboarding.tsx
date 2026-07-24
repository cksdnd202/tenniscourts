"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const ONBOARDING_DONE_KEY = "courtskorea_service_onboarding_v1_done";
const FIRST_VISIT_COOKIE = "courtskorea_first_visit_done";

type OnboardingStep = {
  eyebrow: string;
  title: string;
  description: string;
  visual: "booking" | "favorite" | "calendar";
};

const STEPS: OnboardingStep[] = [
  {
    eyebrow: "예약 오픈일 확인",
    title: "한눈에 확인하는\n테니스장 예약 오픈일",
    description:
      "티켓팅처럼 빠르게 마감되는 테니스장 예약을 미리 준비할 수 있어요",
    visual: "booking",
  },
  {
    eyebrow: "찜한 테니스장",
    title: "자주 보는 코트는\n찜해서 모아보세요",
    description:
      "북마크한 테니스장은 내 계정에서 카드형, 날짜형, 캘린더형으로 다시 확인할 수 있어요.",
    visual: "favorite",
  },
  {
    eyebrow: "캘린더 등록",
    title: "모바일에서는 예약 오픈일을 캘린더에 등록하세요",
    description:
      "상세페이지의 캘린더 등록하기 버튼을 누르면 휴대폰 캘린더 앱에 예약 오픈 알림을 남길 수 있어요.",
    visual: "calendar",
  },
];

function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true;
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  return window.localStorage.getItem(ONBOARDING_DONE_KEY) === "true";
}

function markOnboardingDone() {
  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return;
  window.localStorage.setItem(ONBOARDING_DONE_KEY, "true");
  document.cookie = `${FIRST_VISIT_COOKIE}=true; path=/; max-age=31536000; samesite=lax`;
}

function BookingVisual() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#121416] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-44 rounded bg-white/18" />
        <div className="h-8 w-8 rounded-md bg-[#2C2C2C]" />
      </div>
      <div className="my-auto w-full space-y-2">
        {[
          ["시민", "10일 09:00, 다음달 예약 오픈"],
          ["구민", "13일 10:00, 다음달 예약 오픈"],
          ["주민", "15일 14:00, 다음달 예약 오픈"],
          ["일반", "20일 10:00, 다음달 예약 오픈"],
        ].map(([label, text], index) => (
          <div
            key={label}
            className="onboarding-booking-card rounded-lg bg-[#2C2C2C] px-3 py-2.5 text-sm font-bold"
          >
            <span className="text-[#6FCF97]">{label} : </span>
            <span className="text-white">{text}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-[#232323]" />
        <div className="h-10 rounded-lg bg-[#2C8B56]/70" />
      </div>
    </div>
  );
}

function FavoriteVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#101112] p-5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="onboarding-favorite-bookmark-only relative flex h-22 w-22 items-center justify-center rounded-2xl bg-[#2C2C2C]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-favorite-bookmark-icon h-12 w-12" fill="none" stroke="#D8D8D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 4.9C5.8 3.85 6.65 3 7.7 3h8.6c1.05 0 1.9.85 1.9 1.9V20.4L12 15.5l-6.2 4.9V4.9Z" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-favorite-bookmark-icon-filled absolute inset-0 m-auto h-12 w-12" fill="#6FCF97" stroke="#6FCF97" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 4.9C5.8 3.85 6.65 3 7.7 3h8.6c1.05 0 1.9.85 1.9 1.9V20.4L12 15.5l-6.2 4.9V4.9Z" />
          </svg>
        </div>
      </div>
      <div className="onboarding-favorite-calendar absolute left-5 right-5 top-1/2 rounded-xl border border-[#2C2C2C] bg-[#17191B] p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-20 rounded bg-white/22" />
          <div className="h-3 w-10 rounded bg-white/12" />
        </div>
        <div className="grid grid-cols-7 border-l border-t border-[#2C2C2C]">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div key={day} className="border-b border-r border-[#2C2C2C] py-1 text-center text-[9px] font-bold text-[#8A8F98]">
              {day}
            </div>
          ))}
          {Array.from({ length: 28 }).map((_, index) => {
            const day = index + 1;
            const eventMap: Record<number, { label: string; className: string }> = {
              3: { label: "3호", className: "bg-[#2C8B56] text-[#6FCF97]" },
              7: { label: "건강공원", className: "bg-[#1E3A5F] text-[#4DA3FF]" },
              12: { label: "열우물", className: "bg-[#5A2F18] text-[#FF884D]" },
              18: { label: "계남", className: "bg-[#2C8B56] text-[#6FCF97]" },
              23: { label: "소래샛길", className: "bg-[#1E3A5F] text-[#4DA3FF]" },
            };
            const event = eventMap[day];
            return (
              <div key={day} className="relative h-9 border-b border-r border-[#2C2C2C] bg-white/[0.03] p-1">
                <span className="text-[9px] font-semibold text-[#D8D8D8]">{day}</span>
                {event ? (
                  <div className={`mt-1 truncate rounded px-1 py-0.5 text-[8px] font-bold leading-none ${event.className}`}>
                    {event.label}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#0B0C0D] p-5">
      <div className="onboarding-calendar-tap absolute left-5 right-5 top-1/2 rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-[#2C2C2C] bg-black px-2 py-1 text-[11px] font-bold text-[#4DA3FF]">일반</span>
            <span className="whitespace-nowrap text-sm font-semibold text-white">다음 예약 오픈 일</span>
          </div>
          <button type="button" className="onboarding-calendar-link -mt-1 rounded-md px-2 py-1 text-sm font-semibold text-[#8A8F98] underline underline-offset-2">
            캘린더 등록하기
          </button>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-xl font-bold text-[#6FCF97]">2026.07.27</div>
          <div className="text-xl font-bold text-[#6FCF97]">오전 10:00</div>
        </div>
      </div>
      <div className="onboarding-phone-calendar absolute left-5 right-5 top-[calc(50%+72px)] rounded-xl bg-white p-3 text-[#1F1F1F] shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-[#8A8F98]">캘린더</div>
          <div className="h-2 w-8 rounded bg-[#DADDE2]" />
        </div>
        <div className="mt-2 rounded-lg bg-[#EAF7EF] p-3">
          <div className="text-xs font-bold text-[#2C8B56]">테니스 예약 오픈</div>
          <div className="mt-1 text-[11px] font-medium">2026.07.27 오전 10:00</div>
        </div>
      </div>
    </div>
  );
}

function OnboardingVisual({ visual }: { visual: OnboardingStep["visual"] }) {
  if (visual === "booking") return <BookingVisual />;
  if (visual === "favorite") return <FavoriteVisual />;
  return <CalendarVisual />;
}

export function ServiceOnboarding() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const shouldUseOnboarding = pathname === "/" || pathname.startsWith("/courts/");
  const currentStep = useMemo(() => STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!shouldUseOnboarding || hasCompletedOnboarding()) return;
    const rafId = window.requestAnimationFrame(() => setIsOpen(true));
    return () => window.cancelAnimationFrame(rafId);
  }, [shouldUseOnboarding]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const close = () => {
    markOnboardingDone();
    setIsOpen(false);
  };

  const goNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      close();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  if (!isMounted || !isOpen || !shouldUseOnboarding) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/52 px-4 py-6 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-onboarding-title"
        className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-[#2C2C2C] bg-[#17191B] shadow-2xl"
      >
        <div className="grid min-[760px]:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[380px] bg-black p-3 min-[760px]:h-[440px]">
            <OnboardingVisual visual={currentStep.visual} />
          </div>
          <div className="flex min-h-[360px] flex-col p-6 min-[760px]:p-7">
            <div className="flex items-center justify-start gap-4">
              <span className="text-xs font-semibold text-[#8A8F98]">
                {stepIndex + 1} / {STEPS.length}
              </span>
            </div>
            <div className="mt-7">
              <h2 id="service-onboarding-title" className="mt-3 whitespace-pre-line break-keep text-[28px] font-bold leading-[1.5] text-white min-[760px]:text-[32px]">
                {currentStep.title}
              </h2>
              <p className="mt-4 break-keep text-[18px] leading-8 text-[#C8C8C8]">
                {currentStep.description}
              </p>
            </div>
            <div className="mt-auto">
              <div className="grid grid-cols-[3fr_7fr] gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="h-12 rounded-lg bg-[#2C2C2C] text-sm font-semibold text-[#A8ADB5] transition-colors hover:bg-[#34373A] hover:text-white"
                >
                  건너뛰기
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="h-12 rounded-lg bg-[#2C8B56] text-sm font-bold text-white transition-colors hover:bg-[#53A978]"
                >
                  {stepIndex >= STEPS.length - 1 ? "시작하기" : "다음"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
