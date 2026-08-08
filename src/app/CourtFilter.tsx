"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Court } from "./types";
import { FixedScheduleContent } from "./FixedScheduleContent";
import { OrdinalContent } from "./ordinal";
import { RollingContent } from "./RollingContent";
import { LotteryContent } from "./LotteryContent";
import { PhoneContent } from "./PhoneContent";
import { OnSiteContent } from "./OnSiteContent";
import { IrregularContent } from "./IrregularContent";
import { CheckingContent } from "./CheckingContent";
import { FirstVisitCoachmark } from "./FirstVisitCoachmark";
import { hasActiveBookingRules } from "./BookingRulesContent";
import { supabase } from "@/lib/supabase";

type Props = {
  courts: Court[];
};

type CourtListSort = "recent" | "name";
type MyRegionProfile = {
  home_region?: string | null;
  home_city?: string | null;
};

const courtitemstyle = 
"grid w-full min-h-[380px] content-start border rounded-xl border-transparent p-5 bg-[#191B1E] gap-2 transition duration-300 ease-in-out hover:-translate-y-1 hover:bg-[#2C2C2C] overflow-hidden min-w-0";
const COURTS_PER_PAGE = 30;

const getDateTime = (value?: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const compareCourtName = (a: Court, b: Court) =>
  (a.basic_court_name ?? "").localeCompare(b.basic_court_name ?? "", "ko");

export function CourtFilter({ courts }: Props) {
  // 실제 필터 상태 (필터링에 사용)
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCourtTypes, setSelectedCourtTypes] = useState<string[]>([]);
  const [selectedOwnerTypes, setSelectedOwnerTypes] = useState<string[]>([]);
  
  // 팝업에서 사용할 임시 필터 상태
  const [tempRegion, setTempRegion] = useState<string>("");
  const [tempCity, setTempCity] = useState<string>("");
  const [tempCourtTypes, setTempCourtTypes] = useState<string[]>([]);
  const [tempOwnerTypes, setTempOwnerTypes] = useState<string[]>([]);
  
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isFilterClosing, setIsFilterClosing] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState(COURTS_PER_PAGE);
  const [sortMode, setSortMode] = useState<CourtListSort>("recent");
  const [myRegionMessage, setMyRegionMessage] = useState<string>("");
  const [myRegionProfile, setMyRegionProfile] = useState<MyRegionProfile | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isRegionSetupPromptOpen, setIsRegionSetupPromptOpen] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const filterCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      if (filterCloseTimerRef.current) {
        clearTimeout(filterCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMyRegion = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setMyRegionProfile(null);
        return;
      }

      const profiles = supabase.from("profiles" as never) as any;
      const { data } = await profiles
        .select("home_region, home_city")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted) {
        setMyRegionProfile((data ?? null) as MyRegionProfile | null);
      }
    };

    loadMyRegion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMyRegion();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 좌측 필터 영역 스크롤 제어
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const handleWheel = (e: WheelEvent) => {
      // 스크롤이 위로 올라가서 0보다 작아지지 않도록 제한
      if (aside.scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault();
        aside.scrollTop = 0;
      }
    };

    const handleScroll = () => {
      // 스크롤이 위로 올라가서 0보다 작아지지 않도록 제한
      if (aside.scrollTop < 0) {
        aside.scrollTop = 0;
      }
    };

    aside.addEventListener('wheel', handleWheel, { passive: false });
    aside.addEventListener('scroll', handleScroll);
    return () => {
      aside.removeEventListener('wheel', handleWheel);
      aside.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 시/도 목록
  const regions = useMemo(() => {
    const set = new Set<string>();
    courts.forEach((c) => {
      if (c.basic_region) {
        set.add(c.basic_region);
      }
    });
    return Array.from(set).sort();
  }, [courts]);

  // 시/도별 구 목록
  const citiesByRegion = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    courts.forEach((c) => {
      if (!c.basic_region || !c.basic_city) return;
      if (!map[c.basic_region]) {
        map[c.basic_region] = new Set<string>();
      }
      map[c.basic_region].add(c.basic_city);
    });

    const obj: Record<string, string[]> = {};
    Object.entries(map).forEach(([region, set]) => {
      obj[region] = Array.from(set).sort();
    });
    return obj;
  }, [courts]);

  const cities = useMemo(() => {
    if (!selectedRegion) return [];
    return citiesByRegion[selectedRegion] ?? [];
  }, [selectedRegion, citiesByRegion]);

  const toggleInArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  // 지역/도시 + 코트 종류 + 운영 구분 필터링
  const filteredCourts = useMemo(() => {
    return courts.filter((c) => {
      const owner = (c.basic_owner_type ?? "").trim();

      // use_or_not === true 인 데이터만 노출
      if (c.use_or_not !== true) {
        return false;
      }

      // 시/도 필터: basic_region 기준으로 일치 여부 확인
      if (selectedRegion && c.basic_region !== selectedRegion) {
        return false;
      }

      // 시/군/구 필터: basic_city 기준으로 일치 여부 확인
      if (selectedCity && c.basic_city !== selectedCity) {
        return false;
      }

      if (selectedCourtTypes.length > 0) {
        const hasHard =
          (c.court_count_hard_indoor ?? 0) +
            (c.court_count_hard_outdoor ?? 0) >
          0;
        const hasGrass =
          (c.court_count_grass_indoor ?? 0) +
            (c.court_count_grass_outdoor ?? 0) >
          0;
        const hasClay =
          (c.court_count_clay_indoor ?? 0) +
            (c.court_count_clay_outdoor ?? 0) >
          0;

        let matchesType = false;
        if (selectedCourtTypes.includes("hard") && hasHard) matchesType = true;
        if (selectedCourtTypes.includes("grass") && hasGrass)
          matchesType = true;
        if (selectedCourtTypes.includes("clay") && hasClay) matchesType = true;

        if (!matchesType) return false;
      }

      if (selectedOwnerTypes.length > 0) {
        if (!selectedOwnerTypes.includes(owner)) return false;
      }

      return true;
    });
  }, [
    courts,
    selectedRegion,
    selectedCity,
    selectedCourtTypes,
    selectedOwnerTypes,
  ]);
  const sortedCourts = useMemo(() => {
    const list = [...filteredCourts];
    if (sortMode === "name") {
      return list.sort(compareCourtName);
    }

    return list.sort((a, b) => {
      const compared = getDateTime(b.created_at) - getDateTime(a.created_at);
      if (compared !== 0) return compared;
      return compareCourtName(a, b);
    });
  }, [filteredCourts, sortMode]);

  const visibleCourts = useMemo(
    () => sortedCourts.slice(0, visibleCount),
    [sortedCourts, visibleCount]
  );
  const hasMoreCourts = visibleCount < sortedCourts.length;

  useEffect(() => {
    setVisibleCount(COURTS_PER_PAGE);
    resultsRef.current?.scrollTo({ top: 0 });
  }, [selectedRegion, selectedCity, selectedCourtTypes, selectedOwnerTypes, sortMode]);

  const handleResultsScroll = () => {
    const el = resultsRef.current;
    if (!el || !hasMoreCourts) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom < 600) {
      setVisibleCount((current) => Math.min(current + COURTS_PER_PAGE, sortedCourts.length));
    }
  };

  const handleSortChange = (nextSort: CourtListSort) => {
    setSortMode(nextSort);
  };

  const handleLogin = async () => {
    const redirectTo = window.location.href;
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

  const goToProfileRegion = () => {
    setIsRegionSetupPromptOpen(false);
    window.location.href = "/mypage?tab=profile";
  };

  const handleMyRegionClick = async (useTemp = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsLoginPromptOpen(true);
      return;
    }

    let region = myRegionProfile?.home_region?.trim() ?? "";
    let city = myRegionProfile?.home_city?.trim() ?? "";

    if (!region) {
      const profiles = supabase.from("profiles" as never) as any;
      const { data } = await profiles
        .select("home_region, home_city")
        .eq("id", session.user.id)
        .maybeSingle();
      const nextProfile = (data ?? null) as MyRegionProfile | null;
      setMyRegionProfile(nextProfile);
      region = nextProfile?.home_region?.trim() ?? "";
      city = nextProfile?.home_city?.trim() ?? "";
    }

    if (!region) {
      setIsRegionSetupPromptOpen(true);
      return;
    }

    if (!regions.includes(region)) {
      setMyRegionMessage(`현재 목록에서 '${region}' 지역을 찾지 못했어요.`);
      return;
    }

    const availableCities = citiesByRegion[region] ?? [];
    const nextCity = city && availableCities.includes(city) ? city : "";

    if (useTemp) {
      setTempRegion(region);
      setTempCity(nextCity);
    } else {
      setSelectedRegion(region);
      setSelectedCity(nextCity);
    }

    setMyRegionMessage(
      nextCity
        ? `${region} ${nextCity} 필터가 적용됐어요.`
        : `${region} 필터가 적용됐어요.`
    );
  };

  // 팝업 열 때 임시 상태를 현재 상태로 초기화
  const handleOpenFilter = () => {
    if (filterCloseTimerRef.current) {
      clearTimeout(filterCloseTimerRef.current);
    }
    setTempRegion(selectedRegion);
    setTempCity(selectedCity);
    setTempCourtTypes([...selectedCourtTypes]);
    setTempOwnerTypes([...selectedOwnerTypes]);
    setIsFilterClosing(false);
    setIsFilterOpen(true);
  };

  // 확인 버튼 클릭 시 임시 상태를 실제 상태에 적용
  const handleConfirmFilter = () => {
    setSelectedRegion(tempRegion);
    setSelectedCity(tempCity);
    setSelectedCourtTypes([...tempCourtTypes]);
    setSelectedOwnerTypes([...tempOwnerTypes]);
    handleCloseFilter();
  };

  // X 버튼 클릭 시 팝업만 닫기 (임시 상태는 버림)
  const handleCloseFilter = () => {
    if (!isFilterOpen || isFilterClosing) return;
    setIsFilterClosing(true);
    filterCloseTimerRef.current = setTimeout(() => {
      setIsFilterOpen(false);
      setIsFilterClosing(false);
    }, 200);
  };

  // 필터 초기화
  const handleResetFilter = () => {
    setSelectedRegion("");
    setSelectedCity("");
    setSelectedCourtTypes([]);
    setSelectedOwnerTypes([]);
    if (isFilterOpen) {
      setTempRegion("");
      setTempCity("");
      setTempCourtTypes([]);
      setTempOwnerTypes([]);
    }
  };

  // 임시 상태에서 사용할 cities 목록
  const tempCities = useMemo(() => {
    if (!tempRegion) return [];
    return citiesByRegion[tempRegion] ?? [];
  }, [tempRegion, citiesByRegion]);

  // booking_rule_type에 따라 적절한 컴포넌트를 반환
  const renderCourtContent = (c: Court) => {
    if (hasActiveBookingRules(c)) {
      return <FixedScheduleContent court={c} />;
    }

    const ruleType = c.booking_rule_type;
    
    switch (ruleType) {
      case "rolling":
        return <RollingContent court={c} />;
      case "fixed_schedule":
        return <FixedScheduleContent court={c} />;
      case "ordinal":
        return <OrdinalContent court={c} />;
      case "lottery":
        return <LotteryContent court={c} />;
      case "phone":
        return <PhoneContent court={c} />;
      case "on_site":
        return <OnSiteContent court={c} />;
      case "irregular":
        return <IrregularContent court={c} />;
      case "checking":
        return <CheckingContent court={c} />;
      default:
        // 기본값은 fixed_schedule로 처리
        return <FixedScheduleContent court={c} />;
    }
  };

  // 필터 콘텐츠 컴포넌트 (재사용을 위해 분리)
  const FilterContent = ({ isMobile = false, useTemp = false }: { isMobile?: boolean; useTemp?: boolean }) => {
    const currentRegion = useTemp ? tempRegion : selectedRegion;
    const currentCity = useTemp ? tempCity : selectedCity;
    const currentCourtTypes = useTemp ? tempCourtTypes : selectedCourtTypes;
    const currentOwnerTypes = useTemp ? tempOwnerTypes : selectedOwnerTypes;
    const currentCities = useTemp ? tempCities : cities;

    const handleRegionChange = (value: string) => {
      if (useTemp) {
        setTempRegion(value);
        setTempCity("");
      } else {
        setSelectedRegion(value);
        setSelectedCity("");
      }
    };

    const handleCityChange = (value: string) => {
      if (useTemp) {
        setTempCity(value);
      } else {
        setSelectedCity(value);
      }
    };

    return (
      <>
        {/* 내 지역 필터 */}
        <section className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center text-[#53A978]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21C12 21 18 15.5 18 9.75C18 6.44 15.31 3.75 12 3.75C8.69 3.75 6 6.44 6 9.75C6 15.5 12 21 12 21Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12.25C13.38 12.25 14.5 11.13 14.5 9.75C14.5 8.37 13.38 7.25 12 7.25C10.62 7.25 9.5 8.37 9.5 9.75C9.5 11.13 10.62 12.25 12 12.25Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-sm font-bold text-white">내 지역</span>
            </span>
            <button
              type="button"
              onClick={() => handleMyRegionClick(useTemp)}
              className="shrink-0 rounded-md border border-[#53A978]/50 px-3 py-1.5 text-xs font-bold text-[#53A978] transition-colors hover:border-[#53A978] hover:bg-[#1E2A24] hover:text-[#7BE0A0]"
            >
              적용
            </button>
          </div>
          {myRegionMessage ? (
            <p className="mt-2 text-sm leading-5 text-[#8A8F98]">{myRegionMessage}</p>
          ) : null}
        </section>

        {/* 지역 필터 */}
        <section className="mb-6">
          <h3 className={`mb-2 text-lg font-bold text-white`}>
            지역
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <select
                className={`flex-1 border rounded px-2.5 py-2 text-sm appearance-none border-[#3C3C3C] bg-[#2C2C2C] text-[#B0B0B0]`}
                value={currentRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
              >
                <option value="" className="bg-[#2C2C2C] text-[#B0B0B0]">
                  시/도 전체
                </option>
                {regions.map((r) => (
                  <option
                    key={r}
                    value={r}
                    className="bg-[#2C2C2C] text-[#B0B0B0]"
                  >
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                className={`flex-1 border rounded px-2.5 py-2 text-sm appearance-none border-[#3C3C3C] bg-[#2C2C2C] text-[#B0B0B0] ${!currentRegion ? "opacity-50" : ""}`}
                value={currentCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!currentRegion}
              >
                <option value="" className="bg-[#2C2C2C] text-[#B0B0B0]">
                  시/군/구 전체
                </option>
                {currentCities.map((c) => (
                  <option
                    key={c}
                    value={c}
                    className="bg-[#2C2C2C] text-[#B0B0B0]"
                  >
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 코트 종류 필터 */}
        <section className="mb-6">
          <h3 className={`mb-2 text-lg font-bold text-white`}>
            코트 종류
          </h3>
          <div className={`flex flex-col gap-1 text-sm text-white`}>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentCourtTypes.includes("hard")}
                onChange={() => {
                  if (useTemp) {
                    setTempCourtTypes((prev) => toggleInArray(prev, "hard"));
                  } else {
                    setSelectedCourtTypes((prev) => toggleInArray(prev, "hard"));
                  }
                }}
              />
              <span className="text-sm">하드</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentCourtTypes.includes("grass")}
                onChange={() => {
                  if (useTemp) {
                    setTempCourtTypes((prev) => toggleInArray(prev, "grass"));
                  } else {
                    setSelectedCourtTypes((prev) => toggleInArray(prev, "grass"));
                  }
                }}
              />
              <span className="text-sm">잔디</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentCourtTypes.includes("clay")}
                onChange={() => {
                  if (useTemp) {
                    setTempCourtTypes((prev) => toggleInArray(prev, "clay"));
                  } else {
                    setSelectedCourtTypes((prev) => toggleInArray(prev, "clay"));
                  }
                }}
              />
              <span className="text-sm">클레이</span>
            </label>
          </div>
        </section>

        {/* 운영 구분 필터 */}
        <section className="mb-6">
          <h3 className={`mb-2 text-lg font-bold text-white`}>
            운영 구분
          </h3>
          <div className={`flex flex-col gap-1 text-sm text-white`}>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentOwnerTypes.includes("시립")}
                onChange={() => {
                  if (useTemp) {
                    setTempOwnerTypes((prev) => toggleInArray(prev, "시립"));
                  } else {
                    setSelectedOwnerTypes((prev) => toggleInArray(prev, "시립"));
                  }
                }}
              />
              <span className="text-sm">시립</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentOwnerTypes.includes("구립")}
                onChange={() => {
                  if (useTemp) {
                    setTempOwnerTypes((prev) => toggleInArray(prev, "구립"));
                  } else {
                    setSelectedOwnerTypes((prev) => toggleInArray(prev, "구립"));
                  }
                }}
              />
              <span className="text-sm">구립</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="custom-checkbox"
                checked={currentOwnerTypes.includes("사설")}
                onChange={() => {
                  if (useTemp) {
                    setTempOwnerTypes((prev) => toggleInArray(prev, "사설"));
                  } else {
                    setSelectedOwnerTypes((prev) => toggleInArray(prev, "사설"));
                  }
                }}
              />
              <span className="text-sm">사설</span>
            </label>
          </div>
        </section>
      </>
    );
  };

  return (
    <>
    <div className="flex relative flex-1 overflow-hidden">
      <FirstVisitCoachmark />
      <div className="pointer-events-none absolute top-0 bottom-0 left-[calc(20px+18rem)] hidden w-px bg-[#24272D] min-[1032px]:block" />
      {/* 좌측 필터 영역 - 1032px 이상에서만 표시 */}
      <aside 
        ref={asideRef}
        data-coachmark="filter-area"
        className="filter-scrollbar hidden min-[1032px]:block w-full max-w-2xs h-[calc(100vh-73px-40px)] overflow-y-auto p-7.5 pr-6 bg-[#000000] overscroll-y-none ml-5 mt-5"
      >
        {/*<h2 className="mb-6 text-2xl font-black text-zinc-900">
          GROUND KOREA
        </h2>*/}
        <FilterContent isMobile={false} useTemp={false} />
        {/* 초기화 버튼 */}
        <button
          onClick={handleResetFilter}
          className="mt-6 w-full px-4 py-2.5 text-sm font-medium text-white border border-[#3C3C3C] rounded hover:bg-[#2C2C2C] transition-colors"
        >
          필터 초기화
        </button>
      </aside>

      {/* 플로팅 필터 버튼 - 1031px 이하에서만 표시 */}
      <button
        onClick={handleOpenFilter}
        data-coachmark="filter-area-mobile"
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 max-[1031px]:flex min-[1032px]:hidden items-center justify-center bg-white text-black px-6 py-3 rounded-full gap-2 shadow-lg hover:bg-gray-100 transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-black"
        >
          <path
            d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-medium text-black">필터</span>
      </button>

      {/* 풀팝업 필터 - 1031px 이하에서만 표시 */}
      {isFilterOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className={`fixed inset-0 bg-black/50 z-50 max-[1031px]:block min-[1032px]:hidden ${
              isFilterClosing ? "mobile-fade-out" : "mobile-fade-in"
            }`}
            onClick={handleCloseFilter}
          />
          {/* 필터 팝업 */}
          <div
            className={`fixed inset-0 z-50 max-[1031px]:flex min-[1032px]:hidden flex-col bg-[#1A1A1A] dark-theme ${
              isFilterClosing ? "mobile-slide-out-bottom" : "mobile-slide-in-bottom"
            }`}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2C2C2C]">
              <h2 className="text-xl font-bold text-white">필터</h2>
              <button
                onClick={handleCloseFilter}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label="닫기"
              >
                <svg
                  width="24"
                  height="24"
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
            {/* 필터 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <FilterContent isMobile={true} useTemp={true} />
              {/* 초기화 버튼 */}
              <button
                onClick={handleResetFilter}
                className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-white border border-[#3C3C3C] rounded hover:bg-[#2C2C2C] transition-colors"
              >
                필터 초기화
              </button>
            </div>
            {/* 확인 버튼 - 1031px 이하 팝업에서만 표시 */}
            <div className="px-6 py-4 border-t border-[#2C2C2C]">
              <button
                onClick={handleConfirmFilter}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-[#2C8B56] rounded hover:bg-[#53A978] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}

      {/* 우측 결과 영역 */}
      <section
        ref={resultsRef}
        data-coachmark="results-area"
        className="flex-1 h-full overflow-y-auto space-y-4 px-4 py-6 min-[1032px]:p-7.5 min-[1032px]:ml-4"
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleResultsScroll}
      >
        {/* 모바일용 코트 정보 알려주기 배너 - 1031px 이하에서만 표시 */}
        <a
          href="https://forms.gle/FfvfcDATe5CfH1iR6"
          target="_blank"
          rel="noopener noreferrer"
          className="max-[1031px]:flex min-[1032px]:hidden items-center justify-between w-full px-5 py-3 rounded-xl bg-[#191B1E] hover:bg-[#2C2C2C] transition-colors"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm text-white">나만 아는 코트가 있으신가요?</span>
            <div className="flex items-center gap-1">
              <span className="text-lg">🎾</span>
              <span className="text-lg text-white">코트 정보 알려주기</span>
            </div>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#B0B0B0] flex-shrink-0"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        {/* PC용 코트 정보 알려주기 버튼 - 1032px 이상에서만 표시 */}
        <div className="hidden min-[1032px]:flex items-center justify-end w-full mb-2">
          <a
            href="https://forms.gle/FfvfcDATe5CfH1iR6"
            target="_blank"
            data-gtm="inform_court_click"
            rel="noopener"
            className="relative flex flex-col gap-1 px-5 py-3 rounded-xl bg-[#191B1E] hover:bg-[#2C2C2C] transition-colors w-3xs"
          >
            <span className="text-xs text-white">나만 아는 코트가 있으신가요?</span>
            <div className="flex items-center gap-1">
              <span className="text-lg text-white">🎾</span>
              <span className="text-lg text-white">코트 정보 알려주기</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#B0B0B0]"
            >
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        <div className="mt-8 flex flex-col items-start gap-7">
          <div className="flex items-center gap-5 overflow-x-auto text-base font-semibold">
            <button
              type="button"
              onClick={() => handleSortChange("recent")}
              className={`whitespace-nowrap transition-colors ${
                sortMode === "recent" ? "text-white" : "text-[#6F737B] hover:text-white"
              }`}
            >
              최근 등록순
            </button>
            <button
              type="button"
              onClick={() => handleSortChange("name")}
              className={`whitespace-nowrap transition-colors ${
                sortMode === "name" ? "text-white" : "text-[#6F737B] hover:text-white"
              }`}
            >
              이름순
            </button>
          </div>
          <p className="text-lg font-semibold text-white">
            {sortedCourts.length}개의 코트
          </p>
        </div>

        {sortedCourts.length === 0 ? (
          <p className="text-[#B0B0B0]">조건에 맞는 코트가 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 max-[768px]:grid-cols-1 min-[769px]:max-[1275px]:grid-cols-2 min-[1276px]:sm:grid-cols-2 min-[1276px]:lg:grid-cols-3 min-[1276px]:2xl:grid-cols-4">
            {visibleCourts.map((c, index) => (
              <li
                key={c.id}
                data-coachmark={index === 0 ? "first-court-card" : undefined}
                className={courtitemstyle}
              >
                {renderCourtContent(c)}
              </li>
            ))}
          </ul>
        )}

        {hasMoreCourts ? (
          <div className="flex justify-center py-4">
            <span className="text-sm text-[#8A8F98]">아래로 스크롤하면 더 보여드릴게요</span>
          </div>
        ) : null}

        {sortedCourts.length > 0 ? (
          <nav
            aria-label="전체 테니스장 바로가기"
            className="mt-12 rounded-xl border border-[#242426] bg-[#101112] p-5"
          >
            <h2 className="text-sm font-semibold text-white">전체 테니스장 바로가기</h2>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {sortedCourts.map((court) => (
                <Link
                  key={court.id}
                  href={`/courts/${court.slug || court.id}`}
                  className="text-xs leading-5 text-[#8A8F98] underline-offset-2 transition hover:text-white hover:underline"
                >
                  {court.basic_court_name || "이름 없는 테니스장"}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        <footer className="mt-40 min-h-[220px] border-t border-[#2C2C2C] px-1 py-12 text-[#8A8F98]">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">courtskorea</p>
              <p className="mt-3 text-sm leading-6">
                서울과 수도권 테니스장 예약 정보를 더 쉽게 확인할 수 있도록 정리합니다.
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium">
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                개인정보처리방침
              </Link>
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                이용약관
              </Link>
            </nav>
          </div>
          <p className="mt-12 text-xs text-[#5F646D]">
            © 2026 Courts Korea. All rights reserved.
          </p>
        </footer>
      </section>
    </div>

    {isMounted && isLoginPromptOpen
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
            <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">로그인이 필요한 기능입니다.</h2>
              <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
                내 지역 필터를 사용하려면 로그인이 필요합니다.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoginPromptOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978]"
                >
                  로그인하기
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null}

    {isMounted && isRegionSetupPromptOpen
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
            <div className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-5 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">내 지역을 먼저 설정해주세요.</h2>
              <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
                마이페이지에서 시/도와 시/군/구를 설정하면 내 지역 필터를 바로 사용할 수 있어요.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegionSetupPromptOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#B0B0B0] hover:bg-[#2C2C2C]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={goToProfileRegion}
                  className="rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978]"
                >
                  마이페이지로 이동
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
}
