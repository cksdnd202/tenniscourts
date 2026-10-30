"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourtDetailPath } from "@/lib/courtPath";
import { capturePostHogEvent } from "@/lib/posthogClient";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Court, SportType } from "./types";
import { SPORT_LABELS, SPORT_VENUE_LABELS } from "@/lib/sports";

const SELECTED_SPORT_STORAGE_KEY = "courtskorea:selected-sport";
const SEARCH_SPORTS: SportType[] = ["tennis", "badminton"];
const SEARCH_SPORT_ICONS: Record<SportType, string> = {
  tennis: "/tennis-ball-icon.svg",
  badminton: "/icon/loading_Badminton.svg",
};
const SEARCH_SPORT_COLORS: Record<SportType, string> = {
  tennis: "#30C27C",
  badminton: "#375AE6",
};

/** 헤더 검색에 실제로 쓰이는 필드만 있으면 됨 */
export type CourtSearchListItem = Pick<
  Court,
  | "id"
  | "sport_type"
  | "slug"
  | "basic_court_name"
  | "basic_region"
  | "basic_city"
  | "basic_address"
>;

type Props = {
  courts: CourtSearchListItem[];
  sportType?: SportType;
};

type SportSearchResultsProps = {
  activeSport: SportType;
  fillHeight?: boolean;
  groupedResults: Record<SportType, CourtSearchListItem[]>;
  onSelectCourt: (court: CourtSearchListItem) => void;
  sportOrder: SportType[];
};

function SportSearchResults({
  activeSport,
  fillHeight = false,
  groupedResults,
  onSelectCourt,
  sportOrder,
}: SportSearchResultsProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<SportType, HTMLElement | null>>>({});
  const pendingAnchorRef = useRef<{ sport: SportType; top: number } | null>(null);
  const anchorReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedSport, setHighlightedSport] = useState(activeSport);

  useEffect(() => {
    setHighlightedSport(activeSport);
  }, [activeSport]);

  useEffect(() => {
    return () => {
      if (anchorReleaseTimerRef.current) {
        clearTimeout(anchorReleaseTimerRef.current);
      }
    };
  }, []);

  const getSectionScrollTop = (section: HTMLElement, container: HTMLDivElement) =>
    container.scrollTop +
    section.getBoundingClientRect().top -
    container.getBoundingClientRect().top;

  const syncHighlightedSport = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const pendingAnchor = pendingAnchorRef.current;
    if (pendingAnchor) {
      if (Math.abs(container.scrollTop - pendingAnchor.top) <= 2) {
        pendingAnchorRef.current = null;
      } else {
        return;
      }
    }

    const detectionLine = container.scrollTop + 24;
    let nextSport = sportOrder[0] ?? activeSport;

    for (const resultSport of sportOrder) {
      const section = sectionRefs.current[resultSport];
      if (section && getSectionScrollTop(section, container) <= detectionLine) {
        nextSport = resultSport;
      }
    }

    setHighlightedSport((current) => (current === nextSport ? current : nextSport));
  };

  const scrollToSport = (targetSport: SportType) => {
    const container = scrollContainerRef.current;
    const target = sectionRefs.current[targetSport];
    if (!container || !target) return;

    const sectionTop = getSectionScrollTop(target, container);
    const targetTop = Math.max(
      0,
      Math.min(sectionTop, container.scrollHeight - container.clientHeight)
    );

    if (anchorReleaseTimerRef.current) {
      clearTimeout(anchorReleaseTimerRef.current);
    }
    pendingAnchorRef.current = { sport: targetSport, top: targetTop };
    setHighlightedSport(targetSport);
    container.scrollTo({
      top: targetTop,
      behavior: "smooth",
    });
    anchorReleaseTimerRef.current = setTimeout(() => {
      pendingAnchorRef.current = null;
      syncHighlightedSport();
    }, 700);
  };

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden bg-[#2C2C2C] ${
        fillHeight ? "h-full" : "max-h-[320px]"
      }`}
    >
      <div
        className="scrollbar-hide flex w-full shrink-0 gap-2 overflow-x-auto border-b border-[#3C3C3C] bg-[#242424] px-3 py-5"
        aria-label="검색 결과 종목 바로가기"
      >
        {sportOrder.map((resultSport) => {
          const isActive = resultSport === highlightedSport;
          return (
            <button
              key={resultSport}
              type="button"
              onClick={() => scrollToSport(resultSport)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[15px] font-semibold leading-none shadow-sm"
              style={{
                backgroundColor: isActive ? SEARCH_SPORT_COLORS[resultSport] : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#1A1A1A",
              }}
              aria-label={`${SPORT_VENUE_LABELS[resultSport]} 검색 결과로 이동`}
            >
              <Image
                src={SEARCH_SPORT_ICONS[resultSport]}
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px] shrink-0"
              />
              <span>{SPORT_VENUE_LABELS[resultSport]}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={syncHighlightedSport}
        className={`min-h-0 overflow-y-auto overscroll-contain bg-[#2C2C2C] ${
          fillHeight ? "flex-1" : "max-h-[244px]"
        }`}
      >
        <div className="px-3">
          {sportOrder.map((resultSport, index) => {
            const sportResults = groupedResults[resultSport];
            return (
              <section
                key={resultSport}
                ref={(node) => {
                  sectionRefs.current[resultSport] = node;
                }}
                className="py-5"
                style={
                  index < sportOrder.length - 1
                    ? { borderBottom: "1px solid #565656" }
                    : undefined
                }
              >
                <h3
                  className="mb-2.5 text-sm font-semibold"
                  style={{ color: "#ADADAD" }}
                >
                  {SPORT_VENUE_LABELS[resultSport]}
                </h3>
                {sportResults.length > 0 ? (
                  <ul className="space-y-0.5">
                    {sportResults.map((court) => (
                      <li key={court.id}>
                        <button
                          type="button"
                          onClick={() => onSelectCourt(court)}
                          className="-mx-2 flex w-[calc(100%+1rem)] flex-col items-start gap-1 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-[#3C3C3C] focus-visible:bg-[#3C3C3C] focus-visible:outline-none"
                        >
                          <span className="text-sm font-medium leading-snug text-white">
                            {court.basic_court_name ?? SPORT_VENUE_LABELS[resultSport]}
                          </span>
                          <span className="text-xs leading-snug text-[#B0B0B0]">
                            {[court.basic_region, court.basic_city].filter(Boolean).join(" ") ||
                              court.basic_address ||
                              "지역 정보 없음"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-xs text-[#8F8F8F]">검색 결과가 없습니다.</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CourtSearchHeader({ courts, sportType = "tennis" }: Props) {
  const venueLabel = SPORT_VENUE_LABELS[sportType];
  const isBadminton = sportType === "badminton";
  const accentHoverClass = isBadminton ? "hover:text-[#337DFF]" : "hover:text-[#6FCF97]";
  const searchAccentColor = isBadminton ? "#375AE6" : "#2C8B56";
  const primaryActionClass = isBadminton
    ? "bg-[#375AE6] text-white hover:bg-[#2F4ECC]"
    : "bg-[#2C8B56] text-white hover:bg-[#53A978]";
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
  const lastCapturedSearchRef = useRef("");
  const mobileSearchCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sportOrder = useMemo(
    () => [sportType, ...SEARCH_SPORTS.filter((candidate) => candidate !== sportType)],
    [sportType]
  );

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

  const normalizeSearchText = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().replace(/\s+/g, "");

  const getSearchPriority = (court: CourtSearchListItem, keyword: string) => {
    if (normalizeSearchText(court.basic_court_name).includes(keyword)) return 0;
    if (normalizeSearchText(court.basic_region).includes(keyword)) return 1;
    if (normalizeSearchText(court.basic_city).includes(keyword)) return 2;
    if (normalizeSearchText(court.basic_address).includes(keyword)) return 3;
    return 4;
  };

  // 검색 결과 필터링 (코트 이름, 지역, 주소 기준)
  const results = useMemo(() => {
    const q = normalizeSearchText(query);
    if (!q) return [];
    return courts
      .filter((court) => {
        const searchText = [
          court.basic_court_name,
          court.basic_region,
          court.basic_city,
          court.basic_address,
          [court.basic_region, court.basic_city].filter(Boolean).join(" "),
          [court.basic_region, court.basic_city, court.basic_court_name].filter(Boolean).join(" "),
        ]
          .map(normalizeSearchText)
          .join(" ");

        return searchText.includes(q);
      })
      .sort((a, b) => {
        const priorityComparison = getSearchPriority(a, q) - getSearchPriority(b, q);
        if (priorityComparison !== 0) return priorityComparison;

        return (a.basic_court_name ?? "").localeCompare(b.basic_court_name ?? "", "ko");
      });
  }, [courts, query]);

  const groupedResults = useMemo(
    () =>
      Object.fromEntries(
        SEARCH_SPORTS.map((resultSport) => [
          resultSport,
          results
            .filter((court) =>
              resultSport === "badminton"
                ? court.sport_type === "badminton"
                : court.sport_type !== "badminton"
            )
            .slice(0, 10),
        ])
      ) as Record<SportType, CourtSearchListItem[]>,
    [results]
  );

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    const timer = setTimeout(() => {
      if (lastCapturedSearchRef.current === trimmedQuery) return;

      lastCapturedSearchRef.current = trimmedQuery;
      capturePostHogEvent("search_performed", {
        query: trimmedQuery,
        resultCount: results.length,
        source: isMobileSearchOpen ? "mobile_header" : "desktop_header",
      });
    }, 700);

    return () => {
      clearTimeout(timer);
    };
  }, [isMobileSearchOpen, query, results.length]);

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

  const goToSportHome = (nextSport: SportType) => {
    window.localStorage.setItem(SELECTED_SPORT_STORAGE_KEY, nextSport);
    closeMobileMenu();

  };

  return (
    <header
      data-courts-korea-header="true"
      className={`fixed top-0 left-0 right-0 bg-[#000000] border-b border-[#2C2C2C] ${
        isMobileMenuOpen || isMobileSearchOpen ? "z-[240]" : "z-30"
      }`}
    >
      <div className="px-5 py-4 min-[1032px]:h-20 min-[1032px]:px-10 min-[1032px]:py-0">
        {/* 데스크탑: 검색창을 헤더 정중앙에 고정 */}
        <div className="relative hidden h-full items-center min-[1032px]:flex">
          <div className="flex min-w-0 items-center gap-16" style={{ gap: 64 }}>
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
            <nav className="flex items-center gap-6" aria-label="종목 선택">
              {(["tennis", "badminton"] as const).map((value) => {
                const selected = value === sportType;
                return (
                  <Link
                    key={value}
                    href={`/${value}`}
                    onClick={() => goToSportHome(value)}
                    aria-current={selected ? "page" : undefined}
                    className={`text-sm font-semibold transition-colors ${
                      selected ? "text-white" : "text-[#5F646D] hover:text-[#B7BBC2]"
                    }`}
                  >
                    {SPORT_LABELS[value]}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goToLoginPage}
              className="inline-flex min-w-[88px] items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#191B1E] transition-colors hover:bg-[#E8E9EB]"
              style={{ minWidth: 88, color: "#191B1E" }}
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
            className="absolute left-1/2 w-[280px] -translate-x-1/2"
          >
            <div className="flex items-center rounded-full bg-[#191B1E] px-4 py-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
                style={{ color: searchAccentColor }}
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
              <div className="absolute left-0 right-0 mt-3 max-h-80 overflow-hidden rounded-xl border border-[#3C3C3C] bg-[#2C2C2C] shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
                <SportSearchResults
                  activeSport={sportType}
                  groupedResults={groupedResults}
                  onSelectCourt={handleSelectCourt}
                  sportOrder={sportOrder}
                />
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
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-[#E7E7E7] transition-colors hover:text-white"
            aria-label="코트 검색 열기"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.5 14.5L18 18"
                stroke="currentColor"
                strokeWidth="2.2"
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
            className={`fixed inset-0 z-[220] bg-black/60 min-[1032px]:hidden ${
              isMobileMenuClosing ? "mobile-fade-out" : "mobile-fade-in"
            }`}
            aria-label="메뉴 닫기"
            onClick={closeMobileMenu}
          />
          <aside
            className={`fixed right-0 top-0 z-[230] h-full w-[78vw] max-w-sm bg-[#202229] px-7 py-8 shadow-[-16px_0_40px_rgba(0,0,0,0.35)] min-[1032px]:hidden ${
              isMobileMenuClosing ? "mobile-slide-out-right" : "mobile-slide-in-right"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] p-1 text-[12px] font-semibold text-[#9A9EA6]">
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/")}
                  className="rounded-lg bg-white/10 px-3 py-2 text-white"
                >
                  목록으로 보기
                </button>
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/map")}
                  className="rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  지도로 보기
                </button>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-white"
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
            </div>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => goToMobileMenuPath("/mypage?tab=profile")}
                className={`${accentHoverClass} mt-10 flex w-full items-center gap-3 border-b border-white/10 pb-6 text-left transition-colors`}
              >
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`${primaryActionClass} flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold`}
                    style={{ backgroundColor: isBadminton ? "#375AE6" : "#2C8B56", color: "#FFFFFF" }}
                  >
                    {profileName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">{profileName}</p>
                  {profileEmail ? (
                    <p className="mt-0.5 truncate text-sm text-[#9A9EA6]">{profileEmail}</p>
                  ) : null}
                </div>
              </button>
            ) : null}

            <nav className={isLoggedIn ? "mt-8 flex flex-col gap-7" : "mt-24 flex flex-col gap-7"}>
              <div>
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/")}
                  className={`${accentHoverClass} text-left text-xl font-semibold text-white transition-colors`}
                >
                  홈
                </button>
                <div className="ml-1 mt-4 flex flex-col gap-3 border-l border-white/10 pl-4">
                  {(["tennis", "badminton"] as const).map((value) => {
                    const selected = value === sportType;
                    const selectedColor = value === "badminton" ? "text-[#337DFF]" : "text-[#6FCF97]";
                    return (
                      <Link
                    key={value}
                    href={`/${value}`}
                    onClick={() => goToSportHome(value)}
                    aria-current={selected ? "page" : undefined}
                        className={`w-fit text-left text-base font-semibold transition-colors hover:text-white ${
                          selected ? selectedColor : "text-[#9A9EA6]"
                        }`}
                      >
                        {SPORT_LABELS[value]}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={openMobileSearch}
                className={`${accentHoverClass} text-left text-xl font-semibold text-white transition-colors`}
              >
                {venueLabel} 검색하기
              </button>

              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=favorites")}
                    className={`${accentHoverClass} text-left text-xl font-semibold text-white transition-colors`}
                  >
                    찜한 {venueLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=recent")}
                    className={`${accentHoverClass} text-left text-xl font-semibold text-white transition-colors`}
                  >
                    최근 본 {venueLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/mypage?tab=profile")}
                    className={`${accentHoverClass} text-left text-xl font-semibold text-white transition-colors`}
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
                  className={`${primaryActionClass} mt-3 inline-flex w-fit items-center rounded-full px-7 py-3 text-lg font-bold transition-colors`}
                  style={{ backgroundColor: isBadminton ? "#375AE6" : "#2C8B56", color: "#FFFFFF" }}
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
            <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
              <div className="flex items-center rounded-full border border-[#3C3C3C] bg-[#2C2C2C] px-4 py-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2"
                  style={{ color: searchAccentColor }}
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
                  placeholder={`${venueLabel}을 검색해주세요`}
                  autoFocus
                />
              </div>

              <div className="mt-4 min-h-0 flex-1">
                {results.length === 0 ? (
                  <p className="text-sm text-[#B0B0B0] mt-4">
                    {query.trim()
                      ? "검색 결과가 없습니다."
                      : "검색어를 입력하면 코트 목록이 표시됩니다."}
                  </p>
                ) : (
                  <div className="h-full min-h-0 overflow-hidden rounded-xl border border-[#3C3C3C] bg-[#2C2C2C]">
                    <SportSearchResults
                      activeSport={sportType}
                      fillHeight
                      groupedResults={groupedResults}
                      onSelectCourt={handleSelectCourt}
                      sportOrder={sportOrder}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
