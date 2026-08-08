"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourtDetailPath } from "@/lib/courtPath";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Court } from "./types";

/** 헤더 검색에 실제로 쓰이는 필드만 있으면 됨 */
export type CourtSearchListItem = Pick<
  Court,
  "id" | "slug" | "basic_court_name" | "basic_region" | "basic_city"
>;

type Props = {
  courts: CourtSearchListItem[];
};

export function CourtSearchHeader({ courts }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileSearchClosing, setIsMobileSearchClosing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ display_name?: string; avatar_url?: string | null } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (mobileSearchCloseTimerRef.current) {
        clearTimeout(mobileSearchCloseTimerRef.current);
      }
      if (mobileMenuCloseTimerRef.current) {
        clearTimeout(mobileMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsLocalhost(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "::1"
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncProfile = async (nextUser: User | null) => {
      setUser(nextUser);
      setIsLoggedIn(Boolean(nextUser));

      if (!nextUser) {
        setProfile(null);
        return;
      }

      const profiles = supabase.from("profiles" as never) as any;
      const { data: userProfile } = await profiles
        .select("display_name, avatar_url")
        .eq("id", nextUser.id)
        .maybeSingle();

      setProfile(userProfile ?? null);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        syncProfile(data.session?.user ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      closeMobileSearch();
      inputRef.current?.blur();
    }
  };

  const handleSelectCourt = (court: CourtSearchListItem) => {
    router.push(getCourtDetailPath(court));
    setIsOpen(false);
    closeMobileSearch();
  };

  const goToTestPage = () => {
    router.push("/test-lab");
  };

  const goToAdminPage = () => {
    router.push("/admin/courtslist");
  };

  const goToLoginPage = async () => {
    if (isLoggedIn) {
      router.push("/mypage");
      return;
    }

    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
      },
    });

    if (error) {
      alert(`카카오 로그인 연결에 실패했습니다: ${error.message}`);
    }
  };

  const showTestPageButton = process.env.NODE_ENV !== "production";
  const showAdminButton = isLocalhost;
  const metadata = user?.user_metadata ?? {};
  const profileImageUrl =
    profile?.avatar_url ??
    metadata.avatar_url ??
    metadata.picture ??
    metadata.profile_image_url ??
    metadata.provider_avatar_url ??
    null;
  const profileName =
    profile?.display_name ??
    metadata.name ??
    metadata.full_name ??
    metadata.nickname ??
    metadata.preferred_username ??
    "내 계정";
  const profileEmail = user?.email ?? metadata.email ?? "";

  const openMobileSearch = () => {
    if (mobileSearchCloseTimerRef.current) {
      clearTimeout(mobileSearchCloseTimerRef.current);
    }

    const showSearch = () => {
      setIsMobileSearchClosing(false);
      setIsMobileSearchOpen(true);
    };

    if (isMobileMenuOpen) {
      if (mobileMenuCloseTimerRef.current) {
        clearTimeout(mobileMenuCloseTimerRef.current);
      }
      setIsMobileMenuClosing(true);
      mobileMenuCloseTimerRef.current = setTimeout(() => {
        setIsMobileMenuOpen(false);
        setIsMobileMenuClosing(false);
        showSearch();
      }, 180);
      return;
    }

    showSearch();
  };

  const closeMobileSearch = () => {
    if (!isMobileSearchOpen || isMobileSearchClosing) return;
    setIsMobileSearchClosing(true);
    mobileSearchCloseTimerRef.current = setTimeout(() => {
      setIsMobileSearchOpen(false);
      setIsMobileSearchClosing(false);
    }, 180);
  };

  const openMobileMenu = () => {
    if (mobileMenuCloseTimerRef.current) {
      clearTimeout(mobileMenuCloseTimerRef.current);
    }
    setIsMobileMenuClosing(false);
    setIsMobileMenuOpen(true);
  };

  const closeMobileMenu = () => {
    if (!isMobileMenuOpen || isMobileMenuClosing) return;
    setIsMobileMenuClosing(true);
    mobileMenuCloseTimerRef.current = setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsMobileMenuClosing(false);
    }, 180);
  };

  const goToMobileMenuPath = (path: string) => {
    closeMobileMenu();

    if (path.startsWith("/mypage?tab=") && window.location.pathname === "/mypage") {
      const tab = new URLSearchParams(path.split("?")[1] ?? "").get("tab");
      window.dispatchEvent(new CustomEvent("courtskorea:mypage-tab", { detail: tab }));
    }

    router.push(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#000000] border-b border-[#2C2C2C]">
      <div className="px-5 py-4 min-[1032px]:px-10 min-[1032px]:py-5.5">
        {/* 데스크탑: 검색창을 헤더 정중앙에 고정 */}
        <div className="hidden min-[1032px]:flex items-center relative">
          <div className="w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                // 홈으로 완전 새로고침
                window.location.href = "/";
              }}
              className="text-left"
              aria-label="홈으로 이동"
            >
              <Image
                src="/courtskroea_logo_svg.svg"
                alt="Courts Korea"
                width={200}
                height={40}
                className="h-7 w-auto object-contain"
                priority
              />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goToLoginPage}
              className="inline-flex items-center rounded-lg border border-[#3C3C3C] bg-[#1A1A1B] px-3 py-2 text-xs font-medium text-white hover:bg-[#252528] transition"
            >
              {isLoggedIn ? "마이페이지" : "로그인"}
            </button>
            {showAdminButton ? (
              <button
                type="button"
                onClick={goToAdminPage}
                className="inline-flex items-center rounded-lg border border-[#3C3C3C] bg-[#1A1A1B] px-3 py-2 text-xs font-medium text-white hover:bg-[#252528] transition"
              >
                어드민
              </button>
            ) : null}
            {showTestPageButton ? (
              <button
                type="button"
                onClick={goToTestPage}
                className="inline-flex items-center rounded-lg border border-[#3C3C3C] bg-[#1A1A1B] px-3 py-2 text-xs font-medium text-white hover:bg-[#252528] transition"
              >
                테스트 페이지
              </button>
            ) : null}
          </div>
          {/* 데스크탑용 검색 입력창 (1032px 이상) */}
          <div
            ref={containerRef}
            data-coachmark="search-area"
            className="absolute left-1/2 -translate-x-1/2 w-[300px]"
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

        {/* 모바일/태블릿 헤더 */}
        <div className="flex min-[1032px]:hidden items-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="text-left"
            aria-label="홈으로 이동"
          >
            <Image
              src="/courtskroea_logo.png"
              alt="Courts Korea"
              width={154}
              height={28}
              className="h-[22px] w-auto object-contain"
              priority
            />
          </button>
          <button
            type="button"
            onClick={openMobileSearch}
            data-coachmark="search-area-mobile"
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3C3C3C] bg-[#2C2C2C] text-[#E7E7E7]"
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
          <button
            type="button"
            onClick={openMobileMenu}
            className="ml-3 inline-flex h-9 w-9 items-center justify-center text-white"
            aria-label="메뉴 열기"
          >
            <span className="flex w-6 flex-col gap-1.5">
              <span className="h-[3px] rounded-full bg-current" />
              <span className="h-[3px] rounded-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      {/* 모바일/태블릿용 메뉴 레이어 */}
      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-40 bg-black/60 min-[1032px]:hidden ${
              isMobileMenuClosing ? "mobile-fade-out" : "mobile-fade-in"
            }`}
            aria-label="메뉴 닫기"
            onClick={closeMobileMenu}
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-full w-[78vw] max-w-sm bg-[#202229] px-7 py-8 shadow-[-16px_0_40px_rgba(0,0,0,0.35)] min-[1032px]:hidden ${
              isMobileMenuClosing ? "mobile-slide-out-right" : "mobile-slide-in-right"
            }`}
          >
            <button
              type="button"
              onClick={closeMobileMenu}
              className="absolute right-5 top-4 inline-flex h-9 w-9 items-center justify-center text-white"
              aria-label="메뉴 닫기"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isLoggedIn ? (
              <div className="mt-14 flex items-center gap-3 border-b border-white/10 pb-6">
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2C8B56] text-lg font-bold text-white">
                    {profileName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{profileName}</p>
                  {profileEmail ? (
                    <p className="mt-0.5 truncate text-sm text-[#9A9EA6]">{profileEmail}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <nav className={isLoggedIn ? "mt-8 flex flex-col gap-7" : "mt-24 flex flex-col gap-7"}>
              <button
                type="button"
                onClick={() => goToMobileMenuPath("/")}
                className="text-left text-xl font-semibold text-white transition-colors hover:text-[#6FCF97]"
              >
                홈
              </button>
              <button
                type="button"
                onClick={openMobileSearch}
                className="text-left text-xl font-semibold text-white transition-colors hover:text-[#6FCF97]"
              >
                테니스장 검색하기
              </button>

              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=favorites")}
                    className="text-left text-xl font-semibold text-white transition-colors hover:text-[#6FCF97]"
                  >
                    찜한 테니스장
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=recent")}
                    className="text-left text-xl font-semibold text-white transition-colors hover:text-[#6FCF97]"
                  >
                    최근 본 테니스장
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=profile")}
                    className="text-left text-xl font-semibold text-white transition-colors hover:text-[#6FCF97]"
                  >
                    내 프로필
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    goToLoginPage();
                  }}
                  className="mt-3 inline-flex w-fit items-center rounded-full bg-[#2C8B56] px-7 py-3 text-lg font-bold text-white transition-colors hover:bg-[#35A667]"
                >
                  로그인
                </button>
              )}
            </nav>
          </aside>
        </>
      )}

      {/* 모바일/태블릿용 풀팝업 검색 */}
      {isMobileSearchOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className={`fixed inset-0 z-40 bg-black/40 min-[1032px]:hidden ${
              isMobileSearchClosing ? "mobile-fade-out" : "mobile-fade-in"
            }`}
            onClick={closeMobileSearch}
          />
          {/* 검색 팝업 */}
          <div
            className={`fixed inset-0 z-50 flex flex-col bg-[#1A1A1A] min-[1032px]:hidden ${
              isMobileSearchClosing ? "mobile-fade-out" : "mobile-fade-in"
            }`}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2C2C2C]">
              <span className="text-base font-semibold text-white">
                코트 검색
              </span>
              <button
                type="button"
                onClick={closeMobileSearch}
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
