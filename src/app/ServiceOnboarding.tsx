"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";

const ONBOARDING_DONE_KEY = "courtskorea_service_onboarding_v1_done";
const FIRST_VISIT_COOKIE = "courtskorea_first_visit_done";

type OnboardingStep = {
  eyebrow: string;
  title: string;
  description: string;
  visual: "booking" | "favorite" | "map" | "calendar";
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
    eyebrow: "지도에서 찾기",
    title: "가까운 테니스장을\n지도에서 한눈에 찾아보세요",
    description:
      "지도로 보기를 누르면 위치별 테니스장을 한눈에 살펴보고 원하는 코트를 빠르게 찾을 수 있어요.",
    visual: "map",
  },
  {
    eyebrow: "캘린더 등록",
    title: "모바일에서는 예약 오픈일을\n캘린더에 등록하세요",
    description:
      "캘린더 등록하기를 누르면 휴대폰 캘린더에 예약 오픈 날짜를 등록할 수 있어요",
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
          ["전체", "20일 10:00, 다음달 예약 오픈"],
        ].map(([label, text]) => (
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
        <div className="onboarding-favorite-bookmark-only relative flex h-18 w-18 items-center justify-center rounded-2xl bg-[#2C2C2C] min-[760px]:h-22 min-[760px]:w-22">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-favorite-bookmark-icon h-10 w-10 min-[760px]:h-12 min-[760px]:w-12" fill="none" stroke="#D8D8D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 4.9C5.8 3.85 6.65 3 7.7 3h8.6c1.05 0 1.9.85 1.9 1.9V20.4L12 15.5l-6.2 4.9V4.9Z" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="onboarding-favorite-bookmark-icon-filled absolute inset-0 m-auto h-10 w-10 min-[760px]:h-12 min-[760px]:w-12" fill="#6FCF97" stroke="#6FCF97" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="onboarding-calendar-tap absolute left-5 right-5 top-1/2 rounded-xl border border-[#2C2C2C] bg-[#1A1A1B] p-3 min-[760px]:p-4">
        <div className="flex items-start justify-between gap-2 min-[760px]:gap-4">
          <div className="flex min-w-0 items-center gap-2 min-[760px]:gap-3">
            <span className="rounded-md border border-[#2C2C2C] bg-black px-1.5 py-1 text-[10px] font-bold text-[#4DA3FF] min-[760px]:px-2 min-[760px]:text-[11px]">전체</span>
            <span className="whitespace-nowrap text-[12px] font-semibold text-white min-[760px]:text-sm">다음 예약 오픈 일</span>
          </div>
          <button type="button" className="onboarding-calendar-link -mt-1 shrink-0 whitespace-nowrap rounded-md px-1.5 py-1 text-[12px] font-semibold text-[#8A8F98] underline underline-offset-2 min-[760px]:px-2 min-[760px]:text-sm">
            캘린더 등록하기
          </button>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-xl font-bold text-[#6FCF97]">2026.07.27</div>
          <div className="text-xl font-bold text-[#6FCF97]">오전 10:00</div>
        </div>
      </div>
      <div className="onboarding-phone-calendar absolute left-5 right-5 top-[calc(50%+44px)] rounded-xl bg-white p-3 text-[#1F1F1F] shadow-2xl min-[760px]:top-[calc(50%+72px)]">
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

function MapVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#0D0F10]" aria-hidden="true">
      <div className="onboarding-map-view absolute inset-0 overflow-hidden bg-[#E8E7DF]">
        <svg viewBox="0 0 360 430" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="360" height="430" fill="#E8E7DF" />
          <path d="M-18 270 C55 238 94 252 151 279 C215 309 283 302 378 257 L378 329 C293 365 214 371 143 339 C83 312 43 302 -18 330Z" fill="#A9D3E7" />
          <path d="M-20 225 C57 213 108 218 164 237 C229 259 292 248 380 204" fill="none" stroke="#F7F6F0" strokeWidth="17" />
          <path d="M-20 225 C57 213 108 218 164 237 C229 259 292 248 380 204" fill="none" stroke="#D5C6A4" strokeWidth="2" />
          <path d="M72 -20 C93 65 116 127 155 205 C183 260 196 338 206 452" fill="none" stroke="#FAF9F5" strokeWidth="15" />
          <path d="M72 -20 C93 65 116 127 155 205 C183 260 196 338 206 452" fill="none" stroke="#D8C9A8" strokeWidth="2" />
          <path d="M276 -20 C250 73 248 152 279 220 C306 280 315 345 301 450" fill="none" stroke="#F8F7F2" strokeWidth="13" />
          <path d="M276 -20 C250 73 248 152 279 220 C306 280 315 345 301 450" fill="none" stroke="#D7C8A6" strokeWidth="2" />
          <path d="M-20 92 L380 147" fill="none" stroke="#FAF9F5" strokeWidth="11" />
          <path d="M-20 92 L380 147" fill="none" stroke="#D2D0C4" strokeWidth="1.5" />
          <path d="M-20 391 L380 346" fill="none" stroke="#FAF9F5" strokeWidth="10" />
          <g fill="none" stroke="#F5F4EF" strokeWidth="4">
            <path d="M20 0 L55 430" /><path d="M132 0 L95 430" /><path d="M220 0 L244 430" /><path d="M332 0 L339 430" />
            <path d="M0 47 L360 66" /><path d="M0 175 L360 190" /><path d="M0 374 L360 402" />
          </g>
          <g fill="#C9D9BD" stroke="#B8CBAA" strokeWidth="1">
            <path d="M8 111 L72 117 L67 185 L3 174Z" /><path d="M182 50 L241 58 L232 117 L174 105Z" />
            <path d="M248 355 L341 344 L347 415 L258 424Z" /><path d="M23 345 L87 338 L91 397 L31 409Z" />
          </g>
          <g fill="#D5D5CD" stroke="#CBCBC1" strokeWidth="1">
            <rect x="18" y="18" width="43" height="27" rx="3" /><rect x="120" y="73" width="36" height="23" rx="3" />
            <rect x="291" y="72" width="48" height="30" rx="3" /><rect x="204" y="154" width="44" height="27" rx="3" />
            <rect x="52" y="186" width="39" height="25" rx="3" /><rect x="315" y="167" width="38" height="29" rx="3" />
            <rect x="109" y="365" width="43" height="27" rx="3" /><rect x="218" y="385" width="37" height="24" rx="3" />
          </g>
          <g fill="#68706B" fontSize="9" fontWeight="600" textAnchor="middle">
            <text x="54" y="77">은평구</text><text x="173" y="45">성북구</text><text x="294" y="43">중랑구</text>
            <text x="117" y="156">서대문구</text><text x="210" y="132">종로구</text><text x="303" y="165">광진구</text>
            <text x="54" y="244">마포구</text><text x="176" y="214">용산구</text><text x="284" y="235">성동구</text>
            <text x="76" y="369">영등포구</text><text x="172" y="388">동작구</text><text x="271" y="376">강남구</text>
          </g>
          <text x="246" y="316" fill="#5E9CB9" fontSize="10" fontWeight="700">한강</text>
        </svg>

        {[
          { left: "18%", top: "19%" },
          { left: "49%", top: "23%", count: "2" },
          { left: "76%", top: "35%" },
          { left: "27%", top: "54%" },
          { left: "60%", top: "49%" },
          { left: "43%", top: "73%", count: "3" },
          { left: "75%", top: "79%" },
        ].map(({ left, top, count }) => (
          <span key={`${left}-${top}`} className="onboarding-map-marker absolute" style={{ left, top }}>
            <span className="map-test-marker">
              <Image src="/tennis-ball-icon.svg" alt="" width={30} height={30} />
              {count ? <span className="map-test-marker-count">{count}</span> : null}
            </span>
          </span>
        ))}
        <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[8px] font-bold text-[#5D665E] shadow-sm">서울특별시</span>
      </div>

      <div className="onboarding-map-toggle-stage absolute inset-0 z-20 flex items-center justify-center bg-[#0D0F10]">
        <div className="relative flex rounded-full bg-[#252729] p-1.5 text-sm font-bold shadow-2xl min-[760px]:text-[15px]">
          <span
            className="onboarding-map-toggle-indicator absolute bottom-1.5 left-1.5 top-1.5 rounded-full bg-[#2C8B56]"
            style={{ width: "calc((100% - 12px) / 2)" }}
          />
          <span className="onboarding-map-list-tab relative z-10 px-5 py-3 text-white min-[760px]:px-6">목록으로 보기</span>
          <span className="onboarding-map-map-tab relative z-10 px-5 py-3 text-[#8A8F98] min-[760px]:px-6">지도로 보기</span>
        </div>
      </div>
    </div>
  );
}

function OnboardingVisual({ visual }: { visual: OnboardingStep["visual"] }) {
  if (visual === "booking") return <BookingVisual />;
  if (visual === "favorite") return <FavoriteVisual />;
  if (visual === "map") return <MapVisual />;
  return <CalendarVisual />;
}

export function ServiceOnboarding() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const shouldUseOnboarding = pathname === "/";
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
          <div className="h-[330px] bg-black p-3 min-[760px]:h-[440px]">
            <OnboardingVisual visual={currentStep.visual} />
          </div>
          <div className="flex h-[300px] flex-col px-5 pb-8 pt-5 min-[760px]:h-[440px] min-[760px]:p-7">
            <div className="flex items-center justify-start gap-4">
              <span className="text-xs font-semibold text-[#8A8F98]">
                {stepIndex + 1} / {STEPS.length}
              </span>
            </div>
            <div className="mt-5 min-[760px]:mt-7">
              <h2 id="service-onboarding-title" className="mt-3 break-keep text-[20px] font-bold leading-[1.5] text-white min-[760px]:text-[22px]">
                {currentStep.title.split("\n").map((line) => (
                  <span key={line} className="block whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-3 break-keep text-[15px] leading-7 text-[#C8C8C8] min-[760px]:mt-4 min-[760px]:text-base min-[760px]:leading-7">
                {currentStep.description}
              </p>
            </div>
            <div className="mt-auto pt-8">
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
