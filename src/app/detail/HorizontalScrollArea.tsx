"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  className: string;
};

export function HorizontalScrollArea({ children, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const hasOverflow = node.scrollWidth > node.clientWidth + 2;
    setScrollState({
      hasOverflow,
      canScrollLeft: node.scrollLeft > 2,
      canScrollRight: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByDirection = (direction: -1 | 1) => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollBy({
      left: direction * Math.max(node.clientWidth * 0.7, 180),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div ref={scrollRef} className={className}>
        {children}
      </div>
      {scrollState.hasOverflow ? (
        <>
          <button
            type="button"
            aria-label="이전 예약 오픈 정보 보기"
            onClick={() => scrollByDirection(-1)}
            disabled={!scrollState.canScrollLeft}
            className="absolute left-1 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#222428]/90 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-opacity disabled:pointer-events-none disabled:opacity-35 min-[1032px]:hidden"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="다음 예약 오픈 정보 보기"
            onClick={() => scrollByDirection(1)}
            disabled={!scrollState.canScrollRight}
            className="absolute right-1 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#222428]/90 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-opacity disabled:pointer-events-none disabled:opacity-35 min-[1032px]:hidden"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
