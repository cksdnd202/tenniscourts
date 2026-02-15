"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Court } from "./types";

type Props = {
  courts: Court[];
};

export function CourtSearchHeader({ courts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 검색 결과 필터링 (코트 이름 기준)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return courts
      .filter((court) => {
        const name = (court.basic_court_name ?? "").toLowerCase();
        return name.includes(q);
      })
      .slice(0, 10); // 최대 10개까지만 노출
  }, [courts, query]);

  // 바깥 클릭 시 레이어 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside as EventListener);
      document.addEventListener("touchstart", handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside as EventListener);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsMobileSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectCourt = (court: Court) => {
    // 항상 Supabase id 값을 기준으로 상세 페이지 이동
    router.push(`/courts/${court.id}`);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#000000] border-b border-[#2C2C2C]">
      {/* CourtFilter 와 동일한 2열 레이아웃: 좌측(필터 영역 폭) / 우측(콘텐츠 영역) */}
      <div className="flex gap-4 px-7.5 py-4 items-center">
        {/* 데스크탑용 로고 - 좌측 필터 영역 폭과 동일한 컬럼에 배치 */}
        <div className="hidden min-[1032px]:flex w-full max-w-xs items-center">
          <button
            type="button"
            onClick={() => {
              // 홈으로 완전 새로고침
              window.location.href = "/";
            }}
            className="text-left"
          >
            <span className="text-xl font-black tracking-tight text-white">
              GROUND KOREA
            </span>
          </button>
        </div>

        {/* 모바일/태블릿용 로고 - 상단에만 살짝 보이도록 */}
        <div className="flex min-[1032px]:hidden items-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="text-left"
          >
            <span className="text-xl font-black tracking-tight text-white">
              GROUND KOREA
            </span>
          </button>
        </div>

        {/* 우측 콘텐츠 영역 헤더 */}
        <div className="flex-1 flex items-center justify-end">
          {/* 데스크탑용 검색 입력창 (1032px 이상) */}
          <div className="hidden min-[1032px]:block flex-1">
            <div className="flex justify-center">
              <div
                ref={containerRef}
                className="relative w-full max-w-sm"
              >
                <div className="flex items-center rounded-full bg-[#191B1E] px-4 py-3 focus-within:border-[#2C8B56] focus-within:ring-1 focus-within:ring-[#2C8B56]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-2 text-[#2C8B56]"
                  >
                    <path
                      d="M8.25 13.5C11.1495 13.5 13.5 11.1495 13.5 8.25C13.5 5.35051 11.1495 3 8.25 3C5.35051 3 3 5.35051 3 8.25C3 11.1495 5.35051 13.5 8.25 13.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 12L15 15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsOpen(true);
                    }}
                    onFocus={() => {
                      if (query.trim()) {
                        setIsOpen(true);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-sm outline-none text-white placeholder:text-[#888888]"
                    placeholder="검색어를 입력해주세요"
                  />
                </div>

                {/* 검색 결과 레이어 (데스크탑) */}
                {isOpen && results.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl border border-[#3C3C3C] bg-[#2C2C2C] shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
                    <ul className="py-2">
                      {results.map((court) => (
                        <li key={court.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectCourt(court)}
                            className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-[#3C3C3C]"
                          >
                            <span className="text-sm font-medium text-white">
                              {court.basic_court_name}
                            </span>
                            <span className="text-xs text-[#B0B0B0]">
                              {court.basic_region} {court.basic_city}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 모바일/태블릿용 검색 아이콘 버튼 (1031px 이하) */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="min-[1032px]:hidden ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3C3C3C] bg-[#2C2C2C] text-[#B0B0B0]"
            aria-label="코트 검색 열기"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.25 13.5C11.1495 13.5 13.5 11.1495 13.5 8.25C13.5 5.35051 11.1495 3 8.25 3C5.35051 3 3 5.35051 3 8.25C3 11.1495 5.35051 13.5 8.25 13.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일/태블릿용 풀팝업 검색 */}
      {isMobileSearchOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40 bg-black/40 min-[1032px]:hidden"
            onClick={() => setIsMobileSearchOpen(false)}
          />
          {/* 검색 팝업 */}
          <div className="fixed inset-0 z-50 flex flex-col bg-[#1A1A1A] min-[1032px]:hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2C2C2C]">
              <span className="text-base font-semibold text-white">
                코트 검색
              </span>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="p-1 text-[#B0B0B0] hover:text-white"
                aria-label="검색 닫기"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* 검색 입력 + 결과 */}
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center rounded-full border border-[#3C3C3C] bg-[#2C2C2C] px-4 py-2 focus-within:border-[#2C8B56] focus-within:ring-1 focus-within:ring-[#2C8B56]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 text-[#B0B0B0]"
                >
                  <path
                    d="M8.25 13.5C11.1495 13.5 13.5 11.1495 13.5 8.25C13.5 5.35051 11.1495 3 8.25 3C5.35051 3 3 5.35051 3 8.25C3 11.1495 5.35051 13.5 8.25 13.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12L15 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-sm outline-none text-white placeholder:text-[#888888]"
                  placeholder="테니스장을 검색해주세요"
                  autoFocus
                />
              </div>

              <div className="flex-1 -mx-5 px-5 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-sm text-[#B0B0B0] mt-4">
                    검색어를 입력하면 코트 목록이 표시됩니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#3C3C3C]">
                    {results.map((court) => (
                      <li key={court.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectCourt(court)}
                          className="flex w-full flex-col items-start gap-0.5 px-1 py-3 text-left hover:bg-[#2C2C2C]"
                        >
                          <span className="text-sm font-medium text-white">
                            {court.basic_court_name}
                          </span>
                          <span className="text-xs text-[#B0B0B0]">
                            {court.basic_region} {court.basic_city}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

