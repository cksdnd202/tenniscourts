"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Court = {
  id: string;
  court_name: string | null;
  owner_type: string | null;
  address: string | null;
  map_link: string | null;
  region: string | null;
  city: string | null;
  opentime_owner: string | null;
  opentime_normal: string | null;
  reservation_time: string | null;
  time_of_use: string | null;
  court_count_hard_indoor: number | null;
  court_count_hard_outdoor: number | null;
  court_count_grass_indoor: number | null;
  court_count_grass_outdoor: number | null;
  court_count_clay_indoor: number | null;
  court_count_clay_outdoor: number | null;
  reserve_link: string | null;
};

type Props = {
  courts: Court[];
};

const courtitemstyle = 
"grid border rounded-xl border-[#D9E5DE] p-5 bg-[#ffffff] gap-2 transition duration-300 ease-in-out hover:-translate-y-1 hover:bg-[#DEF4E0] overflow-hidden min-w-0";
const courtitem_courtname = "font-semibold text-[#4CA375] text-xl w-full md:w-auto flex-1 min-w-0 truncate";
const courtitem_courtownertype =
  "rounded text-xs font-medium text-[#4F8065] pt-1 pb-1 pl-1.5 pr-1.5 bg-[#D4E0D6] flex-shrink-0 whitespace-nowrap";
const courtitem_courtopentime = "text-sm font-bold text-zinc-700";
const courtitem_courtopentime_text = "text-sm font-normal text-zinc-700";
const courtitem_courtaddress = "font-light text-sm text-[#686868] mr-2";
const courtitem_courtmaplink = "text-sm font-light text-zinc-400 underline";
const th =
  "border border-gray-200 bg-[#F5FBEA] px-1 py-1 text-center font-normal text-zinc-600 text-xs overflow-hidden";
const td =
  "border border-gray-200 px-1 py-1 text-center text-zinc-600 font-normal text-xs bg-white overflow-hidden";
const tdIcon =
  "border border-gray-200 bg-[#F5FBEA] px-1 py-1 text-center text-xs";

const fmt = (n?: number | null) => (n && n > 0 ? `${n}개` : "-");

export function CourtFilter({ courts }: Props) {
  // 디버깅: 첫 번째 코트의 opentime_normal 확인
  if (courts.length > 0) {
    console.log("CourtFilter - 첫 번째 코트:", courts[0]);
    console.log("CourtFilter - opentime_normal:", courts[0]?.opentime_normal);
  }

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

  // 시/도 목록
  const regions = useMemo(() => {
    const set = new Set<string>();
    courts.forEach((c) => {
      if (c.region) {
        set.add(c.region);
      }
    });
    return Array.from(set).sort();
  }, [courts]);

  // 시/도별 구 목록
  const citiesByRegion = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    courts.forEach((c) => {
      if (!c.region || !c.city) return;
      if (!map[c.region]) {
        map[c.region] = new Set<string>();
      }
      map[c.region].add(c.city);
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

  // 주소 + 코트 종류 + 운영 구분 필터링
  const filteredCourts = useMemo(() => {
    return courts.filter((c) => {
      const addr = c.address ?? "";
      const owner = (c.owner_type ?? "").trim();

      if (selectedRegion && !addr.includes(selectedRegion)) {
        return false;
      }
      if (selectedCity && !addr.includes(selectedCity)) {
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

  // 팝업 열 때 임시 상태를 현재 상태로 초기화
  const handleOpenFilter = () => {
    setTempRegion(selectedRegion);
    setTempCity(selectedCity);
    setTempCourtTypes([...selectedCourtTypes]);
    setTempOwnerTypes([...selectedOwnerTypes]);
    setIsFilterOpen(true);
  };

  // 확인 버튼 클릭 시 임시 상태를 실제 상태에 적용
  const handleConfirmFilter = () => {
    setSelectedRegion(tempRegion);
    setSelectedCity(tempCity);
    setSelectedCourtTypes([...tempCourtTypes]);
    setSelectedOwnerTypes([...tempOwnerTypes]);
    setIsFilterOpen(false);
  };

  // X 버튼 클릭 시 팝업만 닫기 (임시 상태는 버림)
  const handleCloseFilter = () => {
    setIsFilterOpen(false);
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
        {/* 지역 필터 */}
        <section className="mb-6">
          <h3 className={`mb-2 text-lg font-bold ${isMobile ? "text-white" : "text-[#282828]"}`}>
            지역
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <select
                className={`flex-1 border rounded px-2.5 py-2 text-sm appearance-none ${
                  isMobile
                    ? "border-[#3C3C3C] bg-[#2C2C2C] text-white"
                    : "border-[#E1E1E1] text-[#555555]"
                }`}
                value={currentRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
              >
                <option value="" className={isMobile ? "bg-[#2C2C2C] text-white" : ""}>
                  시/도 전체
                </option>
                {regions.map((r) => (
                  <option
                    key={r}
                    value={r}
                    className={isMobile ? "bg-[#2C2C2C] text-white" : ""}
                  >
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                className={`flex-1 border rounded px-2.5 py-2 text-sm appearance-none ${
                  isMobile
                    ? "border-[#3C3C3C] bg-[#2C2C2C] text-white"
                    : "border-[#E1E1E1] text-[#555555]"
                } ${!currentRegion ? "opacity-50" : ""}`}
                value={currentCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!currentRegion}
              >
                <option value="" className={isMobile ? "bg-[#2C2C2C] text-white" : ""}>
                  시/군/구 전체
                </option>
                {currentCities.map((c) => (
                  <option
                    key={c}
                    value={c}
                    className={isMobile ? "bg-[#2C2C2C] text-white" : ""}
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
          <h3 className={`mb-2 text-lg font-bold ${isMobile ? "text-white" : "text-[#282828]"}`}>
            코트 종류
          </h3>
          <div className={`flex flex-col gap-1 text-sm ${isMobile ? "text-white" : "text-zinc-700"}`}>
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
          <h3 className={`mb-2 text-lg font-bold ${isMobile ? "text-white" : "text-[#282828]"}`}>
            운영 구분
          </h3>
          <div className={`flex flex-col gap-1 text-sm ${isMobile ? "text-white" : "text-zinc-700"}`}>
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
    <div className="flex gap-4 relative">
      {/* 좌측 필터 영역 - 1032px 이상에서만 표시 */}
      <aside className="hidden min-[1032px]:block w-full max-w-xs min-h-screen border-r border-[#EEEEEE] p-7.5 bg-[#ffffff]">
        <h2 className="mb-6 text-2xl font-black text-zinc-900">
          GROUND KOREA
        </h2>
        <FilterContent isMobile={false} useTemp={false} />
        {/* 초기화 버튼 */}
        <button
          onClick={handleResetFilter}
          className="mt-6 w-full px-4 py-2.5 text-sm font-medium text-[#555555] border border-[#E1E1E1] rounded hover:bg-[#F5F5F5] transition-colors"
        >
          필터 초기화
        </button>
      </aside>

      {/* 플로팅 필터 버튼 - 1031px 이하에서만 표시 */}
      <button
        onClick={handleOpenFilter}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 max-[1031px]:flex min-[1032px]:hidden items-center justify-center bg-[#2C2C2C] text-white px-6 py-3 rounded-full gap-2 shadow-lg hover:bg-[#3C3C3C] transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-medium">필터</span>
      </button>

      {/* 풀팝업 필터 - 1031px 이하에서만 표시 */}
      {isFilterOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/50 z-50 max-[1031px]:block min-[1032px]:hidden"
            onClick={handleCloseFilter}
          />
          {/* 필터 팝업 */}
          <div className="fixed inset-0 z-50 max-[1031px]:flex min-[1032px]:hidden flex-col bg-[#1A1A1A] dark-theme">
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
      <section className="flex-1 space-y-4 p-7.5">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold text-zinc-900">
            {filteredCourts.length}개의 코트
          </p>
        </div>

        {filteredCourts.length === 0 ? (
          <p className="text-gray-600">조건에 맞는 코트가 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 max-[768px]:grid-cols-1 min-[769px]:max-[1275px]:grid-cols-2 min-[1276px]:sm:grid-cols-2 min-[1276px]:lg:grid-cols-3 min-[1276px]:2xl:grid-cols-4">
            {filteredCourts.map((c) => (
              <li key={c.id} className={courtitemstyle}>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className={courtitem_courtname}>{c.court_name ?? "(이름 없음)"}</span>
                  <span className={courtitem_courtownertype}>{c.owner_type}</span>
                </div>
                <div className="text-sm px-2.5 py-2 bg-[#F5FAF6]">
                  <div className="">
                    <p className={`${courtitem_courtopentime} break-words`}>
                      <span className="text-[#2B523C]">구민/시민 : </span>
                      <span className="text-[#909090] font-normal">{c.opentime_owner ?? ""} 예약 오픈</span>
                    </p>
                  </div>
                  {c.opentime_normal != null && c.opentime_normal.trim() !== "" && (
                    <div className="">
                      <p className={`${courtitem_courtopentime} break-words`}>
                        <span className="text-[#2B523C]">일반 : </span>
                        <span className="text-[#909090] font-normal">
                          {c.opentime_normal} 예약 오픈
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                {c.address && (
                  <div className="flex items-center gap-0.5 min-w-0">
                    <Image
                            src="/icon/icon_map.svg"
                            alt="지도"
                            width={16}
                            height={16}
                            className="flex-shrink-0"
                          />
                    <span className={`${courtitem_courtaddress} truncate`}>{c.address}</span>
                    <a
                      href={c.map_link ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${courtitem_courtmaplink} flex-shrink-0`}
                    >
                      위치보기
                    </a>
                  </div>
                )}

                <table className="w-full table-fixed">
                  <thead>
                    <tr>
                      <th className={th}>구분</th>
                      <th className={th}>실내</th>
                      <th className={th}>실외</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={tdIcon}>
                        <div className="flex justify-center">
                          <Image
                            src="/icon/icon_hard_court.svg"
                            alt="하드코트"
                            width={20}
                            height={36}
                          />
                        </div>
                      </td>
                      <td className={td}>{fmt(c.court_count_hard_indoor)}</td>
                      <td className={td}>{fmt(c.court_count_hard_outdoor)}</td>
                    </tr>
                    <tr>
                      <td className={tdIcon}>
                        <div className="flex justify-center">
                          <Image
                            src="/icon/icon_grass_court.svg"
                            alt="잔디코트"
                            width={20}
                            height={36}
                          />
                        </div>
                      </td>
                      <td className={td}>{fmt(c.court_count_grass_indoor)}</td>
                      <td className={td}>{fmt(c.court_count_grass_outdoor)}</td>
                    </tr>
                    <tr>
                      <td className={tdIcon}>
                        <div className="flex justify-center">
                          <Image
                            src="/icon/icon_clay_court.svg"
                            alt="클레이코트"
                            width={20}
                            height={36}
                          />
                        </div>
                      </td>
                      <td className={td}>{fmt(c.court_count_clay_indoor)}</td>
                      <td className={td}>{fmt(c.court_count_clay_outdoor)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-lg text-gray-100">
                  {c.reserve_link && (
                    <a
                      href={c.reserve_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-center mt-3 px-3 py-2.5 text-sm font-normal text-white bg-[#2C8B56] rounded hover:bg-[#53A978] transition"
                    >
                      예약하러가기
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


