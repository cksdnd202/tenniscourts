"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FavoriteButton } from "@/app/FavoriteButton";
import { formatBookingRuleCardText, formatBookingRuleEligibility } from "@/app/BookingRulesContent";
import type { Court } from "@/app/types";
import { getCourtDetailPath } from "@/lib/courtPath";
import {
  getCourtSurfaceRows,
  getSportVenueLabel,
  normalizeSportType,
} from "@/lib/sports";
import { capturePostHogEvent } from "@/lib/posthogClient";
import {
  getNextBookingRuleOpen,
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
  type NextOpenResult,
} from "@/lib/nextBookingOpen";
import { getBookingMethodLabel, getBookingRuleTargetText } from "@/lib/bookingRuleDisplay";
import { getActivePhoneBookingRule, getPhoneReservationHref, isPhoneReservationCourt } from "@/lib/phoneReservation";
import { getReservationHref } from "@/lib/reservationLink";
import { supabase } from "@/lib/supabase";

const KAKAO_JAVASCRIPT_KEY = (process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "").trim();
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const MAP_MAX_LEVEL = 12;
const MAP_VISIBLE_LIMITS = {
  south: 30,
  west: 121,
  north: 43.5,
  east: 134.5,
};

type OverlayHandle = {
  setMap: (map: unknown | null) => void;
};

type MapPoint = {
  x: number;
  y: number;
};

type MapProjectionHandle = {
  pointFromCoords: (coords: unknown) => MapPoint;
  coordsFromPoint: (point: unknown) => unknown;
};

type LatLngHandle = {
  getLat: () => number;
  getLng: () => number;
};

type MapBoundsHandle = {
  getSouthWest: () => LatLngHandle;
  getNorthEast: () => LatLngHandle;
};

type MapHandle = {
  setCenter?: (center: unknown) => void;
  setLevel?: (level: number) => void;
  setMaxLevel?: (level: number) => void;
  getCenter?: () => LatLngHandle;
  getBounds?: () => MapBoundsHandle;
  panTo?: (center: unknown) => void;
  panBy?: (x: number, y: number) => void;
  getProjection?: () => MapProjectionHandle;
};

type KakaoMapsForLocation = {
  CustomOverlay: new (options: {
    content: HTMLElement;
    position: unknown;
    xAnchor: number;
    yAnchor: number;
    zIndex: number;
  }) => OverlayHandle;
  LatLng: new (latitude: number, longitude: number) => unknown;
};

type UpcomingOpen = {
  key: string;
  court: Court;
  badge: string;
  label: string;
  result: NextOpenResult;
};

type CourtLocationGroup = {
  key: string;
  latitude: number;
  longitude: number;
  courts: Court[];
};

type MapMenu = "search" | "schedule" | "favorites";
type MobileMapMode = "map" | "search" | "schedule" | "favorites" | "detail";
type MobileDetailReturnMode = Exclude<MobileMapMode, "detail">;
type MapSportType = "tennis" | "badminton";
type MapSportFilter = "all" | MapSportType;

const MAP_SPORT_FILTER_OPTIONS: Array<{
  value: MapSportFilter;
  label: string;
  icon?: string;
  selectedBackground: string;
}> = [
  { value: "all", label: "전체", selectedBackground: "#2C2C2C" },
  {
    value: "tennis",
    label: "테니스장",
    icon: "/tennis-ball-icon.svg",
    selectedBackground: "#32C985",
  },
  {
    value: "badminton",
    label: "배드민턴장",
    icon: "/icon/loading_Badminton.svg",
    selectedBackground: "#375AE6",
  },
];

function MapSportFilterBar({
  value,
  onChange,
}: {
  value: MapSportFilter;
  onChange: (value: MapSportFilter) => void;
}) {
  return (
    <div
      data-map-sport-filter="true"
      role="radiogroup"
      aria-label="지도 종목 필터"
      className="scrollbar-hide flex max-w-full gap-2 overflow-x-auto px-3 py-3"
    >
      {MAP_SPORT_FILTER_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[15px] font-bold transition active:scale-[0.98]"
            style={{
              backgroundColor: selected ? option.selectedBackground : "#FFFFFF",
              borderColor: selected ? option.selectedBackground : "#ECEDEF",
              color: selected ? "#FFFFFF" : "#17191D",
              boxShadow: "0 1px 8px rgba(0, 0, 0, 0.16)",
            }}
          >
            {option.icon ? (
              <img
                src={option.icon}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 shrink-0"
              />
            ) : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function hasCoordinate(court: Court) {
  return typeof court.basic_latitude === "number" && typeof court.basic_longitude === "number";
}

function getCourtLocationKey(court: Court) {
  return `${court.basic_latitude?.toFixed(6) ?? "0"}:${court.basic_longitude?.toFixed(6) ?? "0"}`;
}

function getCourtMarkerIcon(court: Court | null | undefined) {
  return normalizeSportType(court?.sport_type) === "badminton"
    ? "/icon/loading_Badminton.svg"
    : "/tennis-ball-icon.svg";
}

function formatOwnerType(value: string | null | undefined) {
  if (!value) return "운영주체 미입력";
  return value.replaceAll("일반", "전체");
}

function isPrivateCourt(court: Court) {
  return formatOwnerType(court.basic_owner_type) === "사설";
}

function formatRegion(court: Court) {
  return [court.basic_region, court.basic_city].filter(Boolean).join(" ");
}

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createPointerDragGuard(element: HTMLElement) {
  const dragThreshold = 8;
  let wasDragged = false;

  element.addEventListener("pointerdown", (startEvent) => {
    const { clientX: startX, clientY: startY, pointerId } = startEvent;
    wasDragged = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId || wasDragged) return;
      const movedX = moveEvent.clientX - startX;
      const movedY = moveEvent.clientY - startY;
      wasDragged = Math.hypot(movedX, movedY) >= dragThreshold;
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("blur", cleanup);
    };

    const handlePointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("blur", cleanup, { once: true });
  });

  return () => {
    const result = wasDragged;
    wasDragged = false;
    return result;
  };
}

function getClampedMapCenter(map: MapHandle) {
  const center = map.getCenter?.();
  const bounds = map.getBounds?.();
  if (!center || !bounds) return null;

  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const visibleLatitudeSpan = northEast.getLat() - southWest.getLat();
  const visibleLongitudeSpan = northEast.getLng() - southWest.getLng();
  const allowedLatitudeSpan = MAP_VISIBLE_LIMITS.north - MAP_VISIBLE_LIMITS.south;
  const allowedLongitudeSpan = MAP_VISIBLE_LIMITS.east - MAP_VISIBLE_LIMITS.west;
  let latitude = center.getLat();
  let longitude = center.getLng();

  if (visibleLatitudeSpan >= allowedLatitudeSpan) {
    latitude = (MAP_VISIBLE_LIMITS.south + MAP_VISIBLE_LIMITS.north) / 2;
  } else if (southWest.getLat() < MAP_VISIBLE_LIMITS.south) {
    latitude += MAP_VISIBLE_LIMITS.south - southWest.getLat();
  } else if (northEast.getLat() > MAP_VISIBLE_LIMITS.north) {
    latitude -= northEast.getLat() - MAP_VISIBLE_LIMITS.north;
  }

  if (visibleLongitudeSpan >= allowedLongitudeSpan) {
    longitude = (MAP_VISIBLE_LIMITS.west + MAP_VISIBLE_LIMITS.east) / 2;
  } else if (southWest.getLng() < MAP_VISIBLE_LIMITS.west) {
    longitude += MAP_VISIBLE_LIMITS.west - southWest.getLng();
  } else if (northEast.getLng() > MAP_VISIBLE_LIMITS.east) {
    longitude -= northEast.getLng() - MAP_VISIBLE_LIMITS.east;
  }

  if (
    Math.abs(latitude - center.getLat()) < 0.000001 &&
    Math.abs(longitude - center.getLng()) < 0.000001
  ) {
    return null;
  }

  return { latitude, longitude };
}

function MapMenuIcon({ id }: { id: MapMenu }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "search") {
    return (
      <svg {...commonProps}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
    );
  }

  if (id === "schedule") {
    return (
      <svg {...commonProps}>
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M4 10h16" />
        <path d="M9 15h4" />
        <path d="M9 18h6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M6 4.8C6 3.8 6.8 3 7.8 3h8.4c1 0 1.8.8 1.8 1.8V21l-6-4.7L6 21V4.8Z" />
    </svg>
  );
}

function sortActiveRules(court: Court) {
  return [...(court.court_booking_rules ?? [])]
    .filter((rule) => rule.is_active)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return (a.label ?? "").localeCompare(b.label ?? "", "ko");
    });
}

function formatCourtCount(value: number | null | undefined) {
  return value && value > 0 ? `${value}개` : "-";
}

function buildMapCalendarHref(court: Court, open: UpcomingOpen) {
  const params = new URLSearchParams({
    title: `[${open.badge}] ${court.basic_court_name ?? getSportVenueLabel(court.sport_type)} 예약 오픈`,
    description: `${court.basic_court_name ?? getSportVenueLabel(court.sport_type)} 예약 오픈 시간입니다.`,
    start: open.result.instant.toISOString(),
    durationMin: "10",
  });

  if (court.basic_address?.trim()) {
    params.set("location", court.basic_address.trim());
  }

  return `/api/calendar-event?${params.toString()}`;
}

function getCourtUpcomingOpens(court: Court): UpcomingOpen[] {
  const rules = sortActiveRules(court);

  if (rules.length > 0) {
    return rules
      .map((rule) => {
        const result = getNextBookingRuleOpen(court, rule);
        if (!result) return null;
        return {
          key: `${court.id}-${rule.id}`,
          court,
          badge: formatBookingRuleEligibility(rule.eligibility),
          label: formatBookingRuleCardText(rule),
          result,
        };
      })
      .filter((item): item is UpcomingOpen => Boolean(item));
  }

  const owner = getNextOwnerBookingOpen(court);
  const normal = getNextNormalBookingOpen(court);
  const items: UpcomingOpen[] = [];
  if (owner) {
    items.push({
      key: `${court.id}-owner`,
      court,
      badge: getPriorityBookingLabel(court) ?? "우선",
      label: `${getPriorityBookingLabel(court) ?? "우선"} 예약 오픈`,
      result: owner,
    });
  }
  if (normal) {
    items.push({
      key: `${court.id}-normal`,
      court,
      badge: "누구나",
      label: "누구나 예약 오픈",
      result: normal,
    });
  }
  return items;
}

// Display all access methods; only calendar sections require a calculable date.
function getCourtBookingDisplay(court: Court) {
  const rules = sortActiveRules(court);
  if (rules.length > 0) {
    return rules.map((rule) => ({
      key: rule.id,
      badge: getBookingRuleTargetText(rule),
      label: formatBookingRuleCardText(rule),
      result: getNextBookingRuleOpen(court, rule),
      method: getBookingMethodLabel(rule.rule_type),
    }));
  }
  const method = getBookingMethodLabel(court.booking_rule_type);
  if (method) {
    return [{ key: `${court.id}-method`, badge: "", label: method, result: null, method }];
  }
  return getCourtUpcomingOpens(court).map((item) => ({ ...item, method: null }));
}

function loadKakaoMapScript() {
  if (!KAKAO_JAVASCRIPT_KEY) {
    return Promise.reject(new Error("카카오 지도 JavaScript 키가 없습니다."));
  }

  return new Promise<void>((resolve, reject) => {
    const kakao = (window as any).kakao;
    if (kakao?.maps) {
      kakao.maps.load(() => resolve());
      return;
    }

    const scriptId = "kakao-maps-script";
    const existing = document.getElementById(scriptId);
    if (existing) {
      const wait = () => {
        const nextKakao = (window as any).kakao;
        if (nextKakao?.maps) nextKakao.maps.load(() => resolve());
        else window.setTimeout(wait, 50);
      };
      wait();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JAVASCRIPT_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const nextKakao = (window as any).kakao;
      if (!nextKakao?.maps) {
        reject(new Error("지도 객체를 찾을 수 없습니다."));
        return;
      }
      nextKakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("지도 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export function MapTestClient({
  courts,
  initialSportType,
}: {
  courts: Court[];
  initialSportType?: MapSportType;
}) {
  const [querySportType, setQuerySportType] = useState<MapSportType | null>(null);

  useEffect(() => {
    if (initialSportType) return;

    const requestedSportType = new URLSearchParams(window.location.search).get("sportType");
    setQuerySportType(
      requestedSportType === "tennis" || requestedSportType === "badminton"
        ? requestedSportType
        : null
    );
  }, [initialSportType]);

  const effectiveSportType = initialSportType ?? querySportType;
  const visibleCourts = useMemo(
    () =>
      effectiveSportType
        ? courts.filter((court) => normalizeSportType(court.sport_type) === effectiveSportType)
        : courts,
    [courts, effectiveSportType]
  );

  return (
    <MapTestClientContent
      courts={visibleCourts}
      showSportFilter={!effectiveSportType}
    />
  );
}

function MapTestClientContent({
  courts,
  showSportFilter,
}: {
  courts: Court[];
  showSportFilter: boolean;
}) {
  const venueLabel = "코트";
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapHandle | null>(null);
  const overlaysRef = useRef<OverlayHandle[]>([]);
  const currentLocationOverlayRef = useRef<OverlayHandle | null>(null);
  const locationRequestTimeoutRef = useRef<number | null>(null);
  const filterScrollRef = useRef<HTMLDivElement | null>(null);
  const filterAreaRef = useRef<HTMLDivElement | null>(null);
  const hasClearedMobileInitialSelectionRef = useRef(false);
  const lastCapturedMapSearchRef = useRef("");
  const lastCapturedMapDetailScrollRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [mapSportFilter, setMapSportFilter] = useState<MapSportFilter>("all");
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const nearbyCourtRef = useRef<Court | null>(null);
  const [activeLocationKey, setActiveLocationKey] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<MapMenu>("search");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<"location" | "owner" | null>(null);
  const [isFilterOverflowing, setIsFilterOverflowing] = useState(false);
  const [favoriteCourtIds, setFavoriteCourtIds] = useState<string[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState(`찜한 ${venueLabel}을 확인하는 중입니다.`);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileMode, setMobileMode] = useState<MobileMapMode>("map");
  const [mobileDetailReturnMode, setMobileDetailReturnMode] = useState<MobileDetailReturnMode>("map");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileUserProfile, setMobileUserProfile] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

  const sportFilteredCourts = useMemo(
    () =>
      mapSportFilter === "all"
        ? courts
        : courts.filter((court) => normalizeSportType(court.sport_type) === mapSportFilter),
    [courts, mapSportFilter]
  );
  const mappableCourts = useMemo(
    () => sportFilteredCourts.filter(hasCoordinate),
    [sportFilteredCourts]
  );

  useEffect(() => {
    let isMounted = true;

    const syncMobileUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        setMobileUserProfile(null);
        return;
      }

      const metadata = session.user.user_metadata ?? {};
      setMobileUserProfile({
        name:
          metadata.name ??
          metadata.full_name ??
          metadata.nickname ??
          metadata.preferred_username ??
          "내 계정",
        email: session.user.email ?? metadata.email ?? "",
        avatarUrl:
          metadata.avatar_url ??
          metadata.picture ??
          metadata.profile_image_url ??
          metadata.provider_avatar_url ??
          null,
      });
    };

    syncMobileUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncMobileUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const courtLocationGroups = useMemo(() => {
    const groups = new Map<string, CourtLocationGroup>();

    for (const court of mappableCourts) {
      const key = getCourtLocationKey(court);
      const existing = groups.get(key);

      if (existing) {
        existing.courts.push(court);
      } else {
        groups.set(key, {
          key,
          latitude: court.basic_latitude as number,
          longitude: court.basic_longitude as number,
          courts: [court],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      courts: [...group.courts].sort((a, b) =>
        (a.basic_court_name ?? "").localeCompare(b.basic_court_name ?? "", "ko")
      ),
    }));
  }, [mappableCourts]);

  const regionOptions = useMemo(() => {
    return Array.from(new Set(sportFilteredCourts.map((court) => court.basic_region).filter(Boolean) as string[]));
  }, [sportFilteredCourts]);

  const cityOptions = useMemo(() => {
    const targetCourts =
      selectedRegions.length > 0
        ? sportFilteredCourts.filter((court) => court.basic_region && selectedRegions.includes(court.basic_region))
        : sportFilteredCourts;
    return Array.from(new Set(targetCourts.map((court) => court.basic_city).filter(Boolean) as string[]));
  }, [selectedRegions, sportFilteredCourts]);

  const cityOptionsByRegion = useMemo(() => {
    return regionOptions.reduce<Record<string, string[]>>((map, region) => {
      map[region] = Array.from(
        new Set(
          sportFilteredCourts
            .filter((court) => court.basic_region === region)
            .map((court) => court.basic_city)
            .filter(Boolean) as string[]
        )
      );
      return map;
    }, {});
  }, [regionOptions, sportFilteredCourts]);

  const ownerOptions = useMemo(() => {
    const owners = Array.from(
      new Set(sportFilteredCourts.map((court) => formatOwnerType(court.basic_owner_type)).filter(Boolean))
    );
    return owners.filter((owner) => owner !== "운영주체 미입력");
  }, [sportFilteredCourts]);

  const filteredCourts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sportFilteredCourts.filter((court) => {
      const matchesRegion =
        selectedRegions.length === 0 || Boolean(court.basic_region && selectedRegions.includes(court.basic_region));
      const matchesCity =
        selectedCities.length === 0 || Boolean(court.basic_city && selectedCities.includes(court.basic_city));
      const matchesOwner =
        selectedOwners.length === 0 || selectedOwners.includes(formatOwnerType(court.basic_owner_type));
      if (!matchesRegion || !matchesCity || !matchesOwner) return false;
      if (!normalized) return true;
      const haystack = [
        court.basic_court_name,
        court.basic_address,
        court.basic_region,
        court.basic_city,
        court.basic_owner_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, selectedCities, selectedOwners, selectedRegions, sportFilteredCourts]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;

    const timer = window.setTimeout(() => {
      const captureKey = [
        trimmedQuery,
        selectedRegions.join(","),
        selectedCities.join(","),
        selectedOwners.join(","),
      ].join("|");

      if (lastCapturedMapSearchRef.current === captureKey) return;

      lastCapturedMapSearchRef.current = captureKey;
      capturePostHogEvent("map_search_performed", {
        query: trimmedQuery,
        resultCount: filteredCourts.length,
        regions: selectedRegions,
        cities: selectedCities,
        owners: selectedOwners,
      });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filteredCourts.length, query, selectedCities, selectedOwners, selectedRegions]);

  const hasActiveFilters =
    selectedRegions.length > 0 || selectedCities.length > 0 || selectedOwners.length > 0;

  const favoriteCourts = useMemo(() => {
    const courtMap = new Map(courts.map((court) => [court.id, court]));
    return favoriteCourtIds.map((courtId) => courtMap.get(courtId)).filter((court): court is Court => Boolean(court));
  }, [courts, favoriteCourtIds]);

  const selectedCourt = useMemo(
    () => (selectedCourtId ? courts.find((court) => court.id === selectedCourtId) ?? null : null),
    [courts, selectedCourtId]
  );
  const upcomingOpens = useMemo(
    () =>
      courts
        .flatMap(getCourtUpcomingOpens)
        .sort((a, b) => {
          const privateDiff = Number(isPrivateCourt(a.court)) - Number(isPrivateCourt(b.court));
          if (privateDiff !== 0) return privateDiff;
          const timeDiff = a.result.instant.getTime() - b.result.instant.getTime();
          if (timeDiff !== 0) return timeDiff;
          return (a.court.basic_court_name ?? "").localeCompare(b.court.basic_court_name ?? "", "ko");
        })
        .slice(0, 60),
    [courts]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteCourts() {
      setIsFavoriteLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        setFavoriteCourtIds([]);
        setFavoriteMessage(`로그인하면 찜한 ${venueLabel}을 지도에서 확인할 수 있습니다.`);
        setIsFavoriteLoading(false);
        return;
      }

      const favoriteCourtsTable = supabase.from("favorite_courts" as never) as any;
      const { data, error } = await favoriteCourtsTable
        .select("court_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setFavoriteCourtIds([]);
        setFavoriteMessage(`찜한 ${venueLabel}을 불러오지 못했습니다.`);
      } else {
        const ids = (data ?? []).map((item: { court_id: string }) => item.court_id).filter(Boolean);
        setFavoriteCourtIds(ids);
        setFavoriteMessage(ids.length > 0 ? "" : `아직 찜한 ${venueLabel}이 없습니다.`);
      }
      setIsFavoriteLoading(false);
    }

    loadFavoriteCourts();

    return () => {
      isMounted = false;
    };
  }, [venueLabel]);

  useEffect(() => {
    setSelectedCities((previous) => previous.filter((city) => cityOptions.includes(city)));
  }, [cityOptions]);

  useEffect(() => {
    const updateFilterOverflow = () => {
      const element = filterScrollRef.current;
      if (!element) {
        setIsFilterOverflowing(false);
        return;
      }
      setIsFilterOverflowing(element.scrollWidth > element.clientWidth + 4);
    };

    updateFilterOverflow();
    window.addEventListener("resize", updateFilterOverflow);

    return () => {
      window.removeEventListener("resize", updateFilterOverflow);
    };
  }, [
    activeMenu,
    cityOptions.length,
    ownerOptions.length,
    regionOptions.length,
    selectedCities.length,
    selectedOwners.length,
    selectedRegions.length,
  ]);

  useEffect(() => {
    if (!openFilter) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (target instanceof Element && target.closest("[data-filter-keepopen='true']")) return;
      setOpenFilter(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFilter(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [openFilter]);

  useEffect(() => {
    if (!activeLocationKey) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".map-test-location-layer") || target.closest(".map-test-marker")) return;
      setActiveLocationKey(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveLocationKey(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [activeLocationKey]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || hasClearedMobileInitialSelectionRef.current) return;
    hasClearedMobileInitialSelectionRef.current = true;
    setSelectedCourtId(null);
    setMobileMode("map");
  }, [isMobileViewport]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const nearbyId = searchParams.get("nearbyCourtId");
    if (nearbyId) {
      const targetCourt = courts.find((court) => court.id === nearbyId);
      if (!targetCourt || !hasCoordinate(targetCourt)) return;

      nearbyCourtRef.current = targetCourt;
      setSelectedCourtId(null);
      setActiveLocationKey(null);
      hasClearedMobileInitialSelectionRef.current = true;
      setMobileMode("map");
      capturePostHogEvent("nearby_map_opened", {
        courtId: targetCourt.id,
        courtName: targetCourt.basic_court_name,
        city: targetCourt.basic_city,
        source: "detail_page",
      });
      return;
    }

    const courtId = searchParams.get("courtId");
    if (!courtId) return;
    const targetCourt = courts.find((court) => court.id === courtId);
    if (!targetCourt) return;

    setSelectedCourtId(targetCourt.id);
    setActiveLocationKey(null);
    hasClearedMobileInitialSelectionRef.current = true;

    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileDetailReturnMode("map");
      setMobileMode("detail");
    }
  }, [courts]);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    let mapForCleanup: MapHandle | null = null;
    let kakaoForCleanup: any = null;
    let clampMapToLimits: (() => void) | null = null;
    let isClampingMap = false;

    loadKakaoMapScript()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const kakao = (window as any).kakao;
        const center = new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 8 }) as MapHandle;
        map.setMaxLevel?.(MAP_MAX_LEVEL);
        mapForCleanup = map;
        kakaoForCleanup = kakao;
        clampMapToLimits = () => {
          if (isClampingMap) return;
          const clampedCenter = getClampedMapCenter(map);
          if (!clampedCenter) return;

          isClampingMap = true;
          map.setCenter?.(
            new kakao.maps.LatLng(clampedCenter.latitude, clampedCenter.longitude)
          );
          window.requestAnimationFrame(() => {
            isClampingMap = false;
          });
        };
        kakao.maps.event.addListener(map, "bounds_changed", clampMapToLimits);
        mapInstanceRef.current = map;
        setMapError(null);
        setIsMapReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setIsMapReady(false);
          setMapError(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
        }
      });

    return () => {
      cancelled = true;
      if (mapForCleanup && kakaoForCleanup?.maps?.event && clampMapToLimits) {
        kakaoForCleanup.maps.event.removeListener(
          mapForCleanup,
          "bounds_changed",
          clampMapToLimits
        );
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;
    if (!isMapReady || !map || !kakao?.maps) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    for (const group of courtLocationGroups) {
      const position = new kakao.maps.LatLng(group.latitude, group.longitude);
      const marker = document.createElement("button");
      const isSelected = group.courts.some((court) => court.id === selectedCourtId);
      const groupSportType = normalizeSportType(group.courts[0]?.sport_type);
      const groupMarkerIcon = getCourtMarkerIcon(group.courts[0]);
      marker.type = "button";
      marker.setAttribute(
        "aria-label",
        group.courts.length > 1
          ? `${group.courts[0]?.basic_court_name ?? venueLabel} 외 ${group.courts.length - 1}개 위치`
          : `${group.courts[0]?.basic_court_name ?? venueLabel} 위치`
      );
      marker.className = [
        "map-test-marker",
        `map-test-marker-${groupSportType}`,
        isSelected ? "map-test-marker-selected" : "",
      ].join(" ");
      marker.innerHTML = `
        <img src="${groupMarkerIcon}" alt="" aria-hidden="true" />
        ${group.courts.length > 1 ? `<span class="map-test-marker-count">${group.courts.length}</span>` : ""}
      `;
      const consumeMarkerDrag = createPointerDragGuard(marker);
      marker.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (consumeMarkerDrag()) return;
        if (group.courts.length > 1) {
          setActiveLocationKey((current) => (current === group.key ? null : group.key));
          return;
        }
        const nextCourtId = group.courts[0]?.id ?? null;
        setSelectedCourtId(nextCourtId);
        if (isMobileViewport && nextCourtId) {
          setMobileDetailReturnMode("map");
          setMobileMode("detail");
        }
        setActiveLocationKey(null);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: marker,
        yAnchor: 0.5,
        zIndex: isSelected ? 30 : 20,
      }) as OverlayHandle;
      overlay.setMap(map);
      overlaysRef.current.push(overlay);

      if (activeLocationKey === group.key && group.courts.length > 1) {
        const layer = document.createElement("div");
        layer.className = "map-test-location-layer";
        layer.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
        layer.addEventListener("mousedown", (event) => event.stopPropagation());
        layer.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
        layer.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });

        for (const court of group.courts) {
          const button = document.createElement("button");
          const courtOpens = getCourtUpcomingOpens(court);
          const courtMarkerIcon = getCourtMarkerIcon(court);
          button.type = "button";
          button.className = [
            "map-test-location-layer-item",
            court.id === selectedCourtId ? "map-test-location-layer-item-selected" : "",
          ].join(" ");
          button.innerHTML = `
            <span class="map-test-location-layer-icon">
              <img src="${courtMarkerIcon}" alt="" aria-hidden="true" />
            </span>
            <span class="map-test-location-layer-copy">
              <strong>${escapeHtml(court.basic_court_name ?? venueLabel)}</strong>
              <small>${
                courtOpens[0]
                  ? escapeHtml(`${courtOpens[0].result.dateLabel} ${courtOpens[0].result.timeLabel} 오픈`)
                  : escapeHtml(court.basic_address ?? "예약 정보 확인 중")
              }</small>
            </span>
          `;
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedCourtId(court.id);
            if (isMobileViewport) {
              setMobileDetailReturnMode("map");
              setMobileMode("detail");
            }
            setActiveLocationKey(null);
          });
          layer.appendChild(button);
        }

        const layerOverlay = new kakao.maps.CustomOverlay({
          position,
          content: layer,
          xAnchor: 0.5,
          yAnchor: 1.08,
          zIndex: 1000,
        }) as OverlayHandle;
        layerOverlay.setMap(map);
        overlaysRef.current.push(layerOverlay);
      }
    }

    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, [activeLocationKey, courtLocationGroups, isMapReady, isMobileViewport, selectedCourtId, venueLabel]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;
    if (!isMapReady || !map || !kakao?.maps || !selectedCourt || !hasCoordinate(selectedCourt)) return;
    const center = new kakao.maps.LatLng(selectedCourt.basic_latitude, selectedCourt.basic_longitude);
    const mapWidth = mapRef.current?.clientWidth ?? 0;
    const mapHeight = mapRef.current?.clientHeight ?? 0;
    const offsetX = isMobileViewport ? 0 : -Math.min(220, Math.max(0, mapWidth * 0.22));
    const offsetY = isMobileViewport
      ? Math.min(190, Math.max(120, mapHeight * 0.24))
      : 0;
    const projection = map.getProjection?.();

    if (projection && map.panTo && kakao.maps.Point) {
      const markerPoint = projection.pointFromCoords(center);
      const adjustedCenterPoint = new kakao.maps.Point(
        markerPoint.x + offsetX,
        markerPoint.y + offsetY
      );
      map.panTo(projection.coordsFromPoint(adjustedCenterPoint));
      return;
    }

    map.setCenter?.(center);
    window.requestAnimationFrame(() => map.panBy?.(offsetX, offsetY));
  }, [isMapReady, isMobileViewport, selectedCourt]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;
    const nearbyCourt = nearbyCourtRef.current;
    if (!isMapReady || !map || !kakao?.maps || !nearbyCourt || !hasCoordinate(nearbyCourt)) return;

    const center = new kakao.maps.LatLng(nearbyCourt.basic_latitude, nearbyCourt.basic_longitude);
    map.setCenter?.(center);
    map.setLevel?.(5);
  }, [isMapReady]);

  useEffect(() => {
    if (!shareMessage) return;
    const timer = window.setTimeout(() => setShareMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  useEffect(() => {
    if (!locationMessage) return;
    const timer = window.setTimeout(() => setLocationMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [locationMessage]);

  useEffect(() => {
    const handleNativeLocationResult = (event: Event) => {
      const detail = (event as CustomEvent<{
        latitude?: number;
        longitude?: number;
        message?: string;
        status?: "success" | "error";
      }>).detail;

      if (locationRequestTimeoutRef.current !== null) {
        window.clearTimeout(locationRequestTimeoutRef.current);
        locationRequestTimeoutRef.current = null;
      }

      setIsLocating(false);

      if (
        detail?.status !== "success" ||
        typeof detail.latitude !== "number" ||
        typeof detail.longitude !== "number"
      ) {
        setLocationMessage(detail?.message ?? "현재 위치를 확인하지 못했습니다.");
        return;
      }

      const map = mapInstanceRef.current;
      const kakaoMaps = (window as unknown as { kakao?: { maps?: KakaoMapsForLocation } }).kakao?.maps;
      if (!isMapReady || !map || !kakaoMaps) {
        setLocationMessage("지도를 불러온 뒤 다시 시도해주세요.");
        return;
      }

      const center = new kakaoMaps.LatLng(detail.latitude, detail.longitude);
      map.setCenter?.(center);
      setSelectedCourtId(null);
      setActiveLocationKey(null);

      currentLocationOverlayRef.current?.setMap(null);
      const marker = document.createElement("div");
      marker.setAttribute("aria-label", "현재 위치");
      marker.style.cssText = [
        "width:22px",
        "height:22px",
        "border:3px solid #FFFFFF",
        "border-radius:999px",
        "background:#2878FF",
        "box-shadow:0 0 0 7px rgba(40,120,255,0.18),0 3px 12px rgba(15,23,42,0.28)",
      ].join(";");

      const overlay = new kakaoMaps.CustomOverlay({
        position: center,
        content: marker,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 45,
      }) as OverlayHandle;
      overlay.setMap(map);
      currentLocationOverlayRef.current = overlay;
      setLocationMessage("현재 위치로 이동했어요.");
    };

    window.addEventListener("courtskorea:native-location-result", handleNativeLocationResult);
    return () => {
      window.removeEventListener("courtskorea:native-location-result", handleNativeLocationResult);
      if (locationRequestTimeoutRef.current !== null) {
        window.clearTimeout(locationRequestTimeoutRef.current);
        locationRequestTimeoutRef.current = null;
      }
      currentLocationOverlayRef.current?.setMap(null);
      currentLocationOverlayRef.current = null;
    };
  }, [isMapReady]);

  const selectedOpens = selectedCourt ? getCourtUpcomingOpens(selectedCourt).slice(0, 4) : [];
  const nextSelectedOpen = selectedOpens[0] ?? null;
  const selectedBookingDisplay = selectedCourt ? getCourtBookingDisplay(selectedCourt) : [];
  const selectedBlogLinks = selectedCourt?.court_blog_links?.slice(0, 3) ?? [];
  const phoneReservation = selectedCourt ? isPhoneReservationCourt(selectedCourt) : false;
  const reservationHref = selectedCourt ? (phoneReservation ? getPhoneReservationHref(selectedCourt, getActivePhoneBookingRule(selectedCourt)) : getReservationHref(selectedCourt)) : "";
  const selectedMethodLabels = [...new Set(selectedBookingDisplay.map((item) => item.method).filter(Boolean))];

  const moveToCurrentLocation = () => {
    if (isLocating) return;

    const map = mapInstanceRef.current;
    const kakao = (window as any).kakao;

    if (!map || !kakao?.maps) {
      setLocationMessage("지도를 불러온 뒤 다시 시도해주세요.");
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);

    const nativeBridge = (window as typeof window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }).ReactNativeWebView;

    if (nativeBridge) {
      nativeBridge.postMessage(JSON.stringify({ type: "current-location-request" }));
      locationRequestTimeoutRef.current = window.setTimeout(() => {
        locationRequestTimeoutRef.current = null;
        setIsLocating(false);
        setLocationMessage("현재 위치 확인이 지연되고 있어요. 다시 시도해주세요.");
      }, 15000);
      return;
    }

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationMessage("현재 브라우저에서는 위치 기능을 사용할 수 없습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
        map.setCenter?.(center);
        setSelectedCourtId(null);
        setActiveLocationKey(null);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage("위치 권한을 허용해주세요.");
          return;
        }
        setLocationMessage("현재 위치를 가져오지 못했습니다.");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  const handleShareSelectedCourt = async () => {
    if (!selectedCourt) return;

    const url = `${window.location.origin}${getCourtDetailPath(selectedCourt)}`;
    const title = `${selectedCourt.basic_court_name ?? venueLabel} 예약 정보`;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setShareMessage("공유창을 열었어요.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareMessage("링크를 복사했어요.");
    } catch {
      return;
    }
  };
  const menuItems = [
    { id: "search", label: "코트 검색" },
    { id: "schedule", label: "예약 일정" },
    { id: "favorites", label: "찜" },
  ] as const;

  const toggleFilterValue = (
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void
  ) => {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value]
    );
  };

  const scrollFilterRow = (direction: "left" | "right") => {
    filterScrollRef.current?.scrollBy({
      left: direction === "left" ? -170 : 170,
      behavior: "smooth",
    });
  };

  const resetFilters = () => {
    setSelectedRegions([]);
    setSelectedCities([]);
    setSelectedOwners([]);
    setOpenFilter(null);
  };

  const renderFilterResetButton = () => {
    if (!hasActiveFilters) return null;

    return (
      <button
        type="button"
        onClick={resetFilters}
        className="h-9 shrink-0 rounded-full border border-[#cfd8e3] bg-white px-3 text-[12px] font-medium text-[#334155] transition hover:border-[#9aa8b7] hover:bg-[#f8fafc]"
      >
        초기화
      </button>
    );
  };

  const openMobileSearchMode = () => {
    setMobileMode("search");
    setSelectedCourtId(null);
    setActiveLocationKey(null);
    setOpenFilter(null);
  };

  const openMobileDetailMode = (court: Court, returnMode: MobileDetailReturnMode) => {
    setSelectedCourtId(court.id);
    setMobileDetailReturnMode(returnMode);
    setMobileMode("detail");
    setActiveLocationKey(null);
    setOpenFilter(null);
  };

  const handleMobileBack = () => {
    if (mobileMode === "detail") {
      setSelectedCourtId(null);
      setMobileMode(mobileDetailReturnMode);
      return;
    }

    setMobileMode("map");
    setSelectedCourtId(null);
    setOpenFilter(null);
  };

  useEffect(() => {
    const handleNativeBack = (event: Event) => {
      if (isMobileMenuOpen) {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }

      if (mobileMode === "map") return;

      event.preventDefault();
      if (mobileMode === "detail") {
        setSelectedCourtId(null);
        setMobileMode(mobileDetailReturnMode);
        return;
      }

      setMobileMode("map");
      setSelectedCourtId(null);
      setOpenFilter(null);
    };

    window.addEventListener("courtskorea:native-back", handleNativeBack);
    return () => window.removeEventListener("courtskorea:native-back", handleNativeBack);
  }, [isMobileMenuOpen, mobileDetailReturnMode, mobileMode]);

  const goToMobileMenuPath = (path: string) => {
    setIsMobileMenuOpen(false);

    if (path === "/map") {
      openMobileSearchMode();
      return;
    }

    window.location.href = path;
  };

  const startMobileLogin = async () => {
    setIsMobileMenuOpen(false);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.href,
      },
    });

    if (error) {
      alert(`카카오 로그인 연결에 실패했습니다: ${error.message}`);
    }
  };

  const renderDropdownFilter = ({ id, label }: { id: "location" | "owner"; label: string }) => {
    const activeCount =
      id === "location" ? selectedRegions.length + selectedCities.length : selectedOwners.length;
    const buttonLabel = activeCount > 0 ? `${label} ${activeCount}` : label;

    return (
      <div className="shrink-0">
        <button
          data-filter-keepopen="true"
          type="button"
          onClick={() => setOpenFilter(openFilter === id ? null : id)}
          className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[12px] font-medium transition ${
            activeCount > 0
              ? "bg-[#1f2937] text-white"
              : "bg-white text-[#5f6b7a] hover:bg-[#f8fafc] hover:text-[#111827]"
          } ${openFilter === id ? "ring-2 ring-[#cbd5df] ring-offset-1 ring-offset-[#eef2f5]" : ""}`}
        >
          <span>{buttonLabel}</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70"
            aria-hidden="true"
          >
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </div>
    );
  };

  const renderOpenFilterPanel = () => {
    if (!openFilter) return null;

    if (openFilter === "location") {
      const activeCityRegions = selectedRegions.length > 0 ? selectedRegions : regionOptions;

      return (
        <div
          data-filter-keepopen="true"
          className="absolute left-3 right-3 top-[54px] z-[120] overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-[#eef1f4] px-3 py-2">
            <p className="text-[12px] font-medium text-[#111827]">지역</p>
            {selectedRegions.length + selectedCities.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedRegions([]);
                  setSelectedCities([]);
                }}
                className="text-[11px] font-medium text-[#8b95a1] hover:text-[#111827]"
              >
                초기화
              </button>
            ) : null}
          </div>
          <div className="grid max-h-[320px] grid-cols-[104px_minmax(0,1fr)] overflow-hidden">
            <div className="border-r border-[#eef1f4] bg-[#f8fafc] p-2">
              <button
                type="button"
                onClick={() => setSelectedRegions([])}
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition ${
                  selectedRegions.length === 0 ? "bg-[#1f2937] text-white" : "text-[#6b7280] hover:bg-white"
                }`}
              >
                전체
              </button>
              <div className="max-h-[270px] overflow-y-auto">
                {regionOptions.map((region) => {
                  const isSelected = selectedRegions.includes(region);
                  return (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleFilterValue(region, selectedRegions, setSelectedRegions)}
                      className={`mb-1 flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition ${
                        isSelected ? "bg-[#eef7f1] text-[#25764d]" : "text-[#6b7280] hover:bg-white"
                      }`}
                    >
                      <span>{region}</span>
                      {isSelected ? <span>✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {activeCityRegions.map((region) => {
                const cities = cityOptionsByRegion[region] ?? [];
                if (cities.length === 0) return null;
                return (
                  <div key={region} className="mb-3 last:mb-0">
                    <p className="px-2 pb-1 text-[11px] font-medium text-[#8b95a1]">{region}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {cities.map((city) => {
                        const isSelected = selectedCities.includes(city);
                        return (
                          <button
                            key={`${region}-${city}`}
                            type="button"
                            onClick={() => toggleFilterValue(city, selectedCities, setSelectedCities)}
                            className={`rounded-xl px-2.5 py-2 text-left text-[12px] font-medium transition ${
                              isSelected ? "bg-[#eef7f1] text-[#25764d]" : "text-[#4b5563] hover:bg-[#f5f7fa]"
                            }`}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        data-filter-keepopen="true"
        className="absolute left-3 right-3 top-[54px] z-[120] overflow-hidden rounded-2xl border border-[#e5e8ec] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-[#eef1f4] px-3 py-2">
          <p className="text-[12px] font-medium text-[#111827]">운영</p>
          {selectedOwners.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedOwners([])}
              className="text-[11px] font-medium text-[#8b95a1] hover:text-[#111827]"
            >
              초기화
            </button>
          ) : null}
        </div>
        <div className="max-h-[260px] overflow-y-auto p-2">
          {ownerOptions.length > 0 ? (
            ownerOptions.map((option) => {
              const isSelected = selectedOwners.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleFilterValue(option, selectedOwners, setSelectedOwners)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] font-medium transition ${
                    isSelected ? "bg-[#eef7f1] text-[#25764d]" : "text-[#4b5563] hover:bg-[#f5f7fa]"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected ? <span className="text-[#25764d]">✓</span> : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-4 text-center text-[12px] font-medium text-[#9ca3af]">
              선택 가능한 옵션이 없습니다.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderCourtListItem = (court: Court, onSelect?: (court: Court) => void) => {
    const isSelected = court.id === selectedCourt?.id;
    const courtOpens = getCourtUpcomingOpens(court);
    const methods = [...new Set(getCourtBookingDisplay(court).map((item) => item.method).filter(Boolean))];

    return (
      <button
        key={court.id}
        type="button"
        onClick={() => (onSelect ? onSelect(court) : setSelectedCourtId(court.id))}
        className={`block w-full rounded-2xl border px-3 py-3 text-left transition md:px-4 md:py-4 ${
          isSelected
            ? "border-[#9ab8a7] bg-[#f2f7f4] shadow-[0_12px_28px_rgba(31,41,55,0.08)]"
            : "border-[#e6eaee] bg-white hover:border-[#cbd5df] hover:bg-[#f8fafc]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#111827] md:text-[15px]">
              {court.basic_court_name}
            </h2>
            <p className="mt-1 truncate text-[12px] text-[#8b95a1]">{court.basic_address}</p>
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-[#f3f6f8] px-3 py-2 md:mt-3 md:py-2.5">
          {courtOpens[0] ? (
            <p className="truncate text-[12px] font-semibold text-[#111827]">
              {courtOpens[0].result.dateLabel} {courtOpens[0].result.timeLabel} 오픈
            </p>
          ) : methods.length === 0 ? (
            <p className="text-[12px] font-medium text-[#9ca3af]">예약 오픈 정보 확인 중</p>
          ) : null}
          {methods.length > 0 ? (
            <p className="text-[12px] font-semibold text-[#111827]">{methods.join(" · ")}</p>
          ) : null}
        </div>
      </button>
    );
  };

  const shouldShowInfoLayer = Boolean(selectedCourt && (!isMobileViewport || mobileMode === "detail"));
  const shouldShowSportFilter =
    showSportFilter &&
    !selectedCourt &&
    !isMobileMenuOpen &&
    (!isMobileViewport || mobileMode === "map");
  const handleMapSportFilterChange = (nextFilter: MapSportFilter) => {
    setMapSportFilter(nextFilter);
    setSelectedCourtId(null);
    setActiveLocationKey(null);
    capturePostHogEvent("map_sport_filter_changed", {
      sportFilter: nextFilter,
      source: isMobileViewport ? "mobile_map" : "desktop_map",
    });
  };
  const mobileHeaderTitle =
    mobileMode === "detail"
      ? selectedCourt?.basic_court_name ?? "상세 정보"
      : mobileMode === "schedule"
        ? "예약 일정"
        : mobileMode === "favorites"
          ? "찜"
          : "";

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#eef2f6] text-[#111827]">
      <div className="relative h-full md:flex">
        <div className="absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[80] md:hidden">
          <div className="flex h-12 items-center gap-2">
            {mobileMode === "map" ? (
              <Link
                href="/"
                data-map-home-link="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
                aria-label="검색 화면으로 돌아가기"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 18 9 12l6-6"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleMobileBack}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
                aria-label="뒤로가기"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 18 9 12l6-6"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            {mobileHeaderTitle ? (
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-2xl border border-white/70 bg-white/95 px-4 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur">
                <p className="truncate text-sm font-semibold text-[#111827]">
                  {mobileHeaderTitle}
                </p>
              </div>
            ) : (
              <label
                className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-3 text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur"
                onClick={() => {
                  if (mobileMode === "map") openMobileSearchMode();
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {mobileMode === "search" ? (
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="코트 또는 지역 검색"
                    className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#9ca3af]"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={openMobileSearchMode}
                    className="h-10 min-w-0 flex-1 truncate text-left text-sm font-medium text-[#7b8491]"
                  >
                    코트 또는 지역 검색
                  </button>
                )}
              </label>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
              aria-label="메뉴 열기"
            >
              <span className="flex w-5 flex-col gap-1.5">
                <span className="h-[2.5px] rounded-full bg-current" />
                <span className="h-[2.5px] rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>

        {mobileMode === "map" ? (
          <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom))] z-[55] flex justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => {
                capturePostHogEvent("map_schedule_menu_opened", {
                  source: "mobile_quick_button",
                  itemCount: upcomingOpens.length,
                });
                setMobileMode("schedule");
                setSelectedCourtId(null);
                setActiveLocationKey(null);
                setOpenFilter(null);
              }}
              className="flex h-[86px] w-[86px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/95 text-[#111827] shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur transition active:scale-95"
            >
              <MapMenuIcon id="schedule" />
              <span className="text-[13px] font-semibold">예약일정</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMode("favorites");
                setSelectedCourtId(null);
                setActiveLocationKey(null);
                setOpenFilter(null);
              }}
              className="flex h-[86px] w-[86px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/95 text-[#111827] shadow-[0_14px_34px_rgba(15,23,42,0.18)] backdrop-blur transition active:scale-95"
            >
              <MapMenuIcon id="favorites" />
              <span className="text-[13px] font-semibold">찜</span>
            </button>
          </div>
        ) : null}

        {isMobileMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[220] bg-black/55 md:hidden"
              aria-label="메뉴 닫기"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="fixed right-0 top-0 z-[230] h-full w-[78vw] max-w-[330px] bg-[#202229] px-7 py-8 text-white shadow-[-16px_0_40px_rgba(0,0,0,0.35)] md:hidden mobile-slide-in-right">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] p-1 text-[12px] font-semibold text-[#9A9EA6]">
                  <button
                    type="button"
                    onClick={() => goToMobileMenuPath("/")}
                    className="rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    목록으로 보기
                  </button>
                  <span className="rounded-lg bg-white/10 px-3 py-2 text-white">
                    지도로 보기
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-white"
                  aria-label="메뉴 닫기"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18 6 6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {mobileUserProfile ? (
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/mypage?tab=profile")}
                  className="mt-10 flex w-full items-center gap-3 border-b border-white/10 pb-6 text-left transition hover:text-[#6FCF97]"
                >
                  {mobileUserProfile.avatarUrl ? (
                    <img
                      src={mobileUserProfile.avatarUrl}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2C8B56] text-lg font-bold text-white">
                      {mobileUserProfile.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{mobileUserProfile.name}</p>
                    {mobileUserProfile.email ? (
                      <p className="mt-0.5 truncate text-sm text-[#9A9EA6]">{mobileUserProfile.email}</p>
                    ) : null}
                  </div>
                </button>
              ) : null}

              <nav className={mobileUserProfile ? "mt-8 flex flex-col gap-7" : "mt-24 flex flex-col gap-7"}>
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/")}
                  className="text-left text-xl font-semibold transition hover:text-[#6FCF97]"
                >
                  홈
                </button>
                <button
                  type="button"
                  onClick={() => goToMobileMenuPath("/map")}
                  className="text-left text-xl font-semibold transition hover:text-[#6FCF97]"
                >
                  {venueLabel} 검색하기
                </button>
                {mobileUserProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => goToMobileMenuPath("/mypage?tab=favorites")}
                      className="text-left text-xl font-semibold transition hover:text-[#6FCF97]"
                    >
                      찜한 {venueLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMobileMenuPath("/mypage?tab=recent")}
                      className="text-left text-xl font-semibold transition hover:text-[#6FCF97]"
                    >
                      최근 본 {venueLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToMobileMenuPath("/mypage?tab=profile")}
                      className="text-left text-xl font-semibold transition hover:text-[#6FCF97]"
                    >
                      내 프로필
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startMobileLogin}
                    className="mt-3 inline-flex w-fit items-center rounded-full bg-[#2C8B56] px-7 py-3 text-lg font-bold text-white transition hover:bg-[#35A667]"
                  >
                    로그인
                  </button>
                )}
              </nav>
            </aside>
          </>
        ) : null}

        {mobileMode === "search" ? (
          <section className="absolute inset-x-3 bottom-3 top-[calc(max(12px,env(safe-area-inset-top))+62px)] z-[60] flex flex-col overflow-hidden rounded-[22px] border border-[#dbe2ea] bg-white/97 shadow-[0_18px_55px_rgba(15,23,42,0.22)] backdrop-blur md:hidden">
            <div className="relative z-[70] border-b border-[#e1e6eb] bg-[#eef2f5] px-4 py-2">
              <div ref={filterAreaRef} className="relative">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div ref={filterScrollRef} className="scrollbar-hide flex gap-2 overflow-x-auto px-1 py-1.5">
                      {renderDropdownFilter({ id: "location", label: "지역" })}
                      {renderDropdownFilter({ id: "owner", label: "운영" })}
                    </div>
                  </div>
                  {renderFilterResetButton()}
                </div>
                {renderOpenFilterPanel()}
              </div>
            </div>
            <div className="map-test-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              {filteredCourts.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredCourts.map((court) =>
                    renderCourtListItem(court, (nextCourt) => openMobileDetailMode(nextCourt, "search"))
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#eef1f4] bg-white px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-[#111827]">검색 결과가 없습니다.</p>
                  <p className="mt-2 text-xs font-medium text-[#8b95a1]">다른 코트명이나 지역을 입력해보세요.</p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {mobileMode === "schedule" ? (
          <section className="absolute inset-x-3 bottom-3 top-[calc(max(12px,env(safe-area-inset-top))+62px)] z-[60] flex flex-col overflow-hidden rounded-[22px] border border-[#dbe2ea] bg-white/97 shadow-[0_18px_55px_rgba(15,23,42,0.22)] backdrop-blur md:hidden">
            <div className="map-test-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-2.5">
                {upcomingOpens.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openMobileDetailMode(item.court, "schedule")}
                    className={`block w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedCourt?.id === item.court.id
                        ? "border-[#9ab8a7] bg-[#f2f7f4]"
                        : "border-[#e6eaee] bg-white hover:border-[#cbd5df] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[#111827]">
                          {item.result.dateLabel} {item.result.timeLabel}
                        </p>
                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#111827]">
                          {item.court.basic_court_name}
                        </p>
                        <p className="mt-1 truncate text-[12px] font-medium text-[#6b7280]">
                          {formatRegion(item.court) || "지역 미입력"} · {item.label}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#f3f6f8] px-2 py-1 text-[11px] font-semibold text-[#25764d]">
                        {item.badge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {mobileMode === "favorites" ? (
          <section className="absolute inset-x-3 bottom-3 top-[calc(max(12px,env(safe-area-inset-top))+62px)] z-[60] flex flex-col overflow-hidden rounded-[22px] border border-[#dbe2ea] bg-white/97 shadow-[0_18px_55px_rgba(15,23,42,0.22)] backdrop-blur md:hidden">
            <div className="map-test-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
              {favoriteCourts.length > 0 ? (
                <div className="space-y-2.5">
                  {favoriteCourts.map((court) =>
                    renderCourtListItem(court, (nextCourt) => openMobileDetailMode(nextCourt, "favorites"))
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#eef1f4] bg-white px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-[#111827]">
                    {isFavoriteLoading ? `찜한 ${venueLabel}을 불러오는 중입니다.` : favoriteMessage}
                  </p>
                  {!isFavoriteLoading && favoriteMessage.includes("로그인") ? (
                    <button
                      type="button"
                      onClick={startMobileLogin}
                      className="mt-4 inline-flex rounded-xl bg-[#1f2937] px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      로그인하기
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="hidden shrink-0 flex-col overflow-hidden bg-white text-[#111] shadow-[14px_0_36px_rgba(15,23,42,0.10)] md:static md:flex md:h-full md:w-[430px] md:border-y-0 md:border-l-0 md:border-r md:border-[#d1d8e0]">
          <header className="flex h-[42px] shrink-0 items-center justify-between gap-2 border-b border-[#e5e8ec] bg-white px-3 text-[#111] md:h-[44px] md:gap-3 md:px-4">
            <Link href="/" className="shrink-0" aria-label="Courts Korea 메인으로 이동">
              <img
                src="/courtskroea_logo_svg.svg"
                alt="Courts Korea"
                className="h-[18px] w-auto [filter:brightness(0)] md:h-[22px]"
              />
            </Link>
            <div className="flex shrink-0 rounded-full bg-[#f1f4f7] p-0.5 text-[9px] font-semibold md:text-[10px]">
              <Link href="/" className="whitespace-nowrap rounded-full px-2 py-1.5 text-[#6b7280]">
                목록으로 보기
              </Link>
              <span className="whitespace-nowrap rounded-full bg-[#1f2937] px-2 py-1.5 text-white">
                지도로 보기
              </span>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="지도 메뉴"
              className="flex h-full w-[58px] shrink-0 flex-col border-r border-[#e5e8ec] bg-[#fbfcfd] text-[#111] md:w-[64px]"
            >
              <div className="flex flex-1 flex-col">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveMenu(item.id);
                      if (item.id === "schedule") {
                        capturePostHogEvent("map_schedule_menu_opened", {
                          source: "desktop_sidebar",
                          itemCount: upcomingOpens.length,
                        });
                      }
                    }}
                    className={`flex h-[62px] flex-col items-center justify-center gap-1 text-[9px] font-normal transition md:h-[74px] md:text-[10px] ${
                      activeMenu === item.id
                        ? "bg-[#111827] text-white"
                        : "bg-[#fbfcfd] text-[#6b7280] hover:bg-white hover:text-[#111827]"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center leading-none">
                      <MapMenuIcon id={item.id} />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>

            <aside className="relative flex h-full min-w-0 flex-1 flex-col bg-[#fbfcfd] text-[#111]">
              {activeMenu === "search" ? (
                <>
                  <div className="relative z-[80] overflow-visible border-b border-[#ebedf0] bg-white px-4 py-3">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-[#cbd5df] bg-white px-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                      <span className="text-[#536173]">⌕</span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="코트 또는 지역 검색"
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#9ca3af]"
                      />
                      {query ? (
                        <button type="button" onClick={() => setQuery("")} className="text-lg text-[#6b7280]">
                          ×
                        </button>
                      ) : null}
                    </label>
                  </div>

                  <div
                    ref={filterAreaRef}
                    className="relative z-[70] border-b border-[#e1e6eb] bg-[#eef2f5] px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="group relative min-w-0 flex-1 overflow-visible">
                        {isFilterOverflowing ? (
                          <button
                            type="button"
                            aria-label="필터 왼쪽으로 이동"
                            onClick={() => scrollFilterRow("left")}
                            className="pointer-events-none absolute left-0 top-1/2 z-[90] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e8ec] bg-white text-[#6b7280] opacity-0 shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100"
                          >
                            ‹
                          </button>
                        ) : null}
                        <div
                          ref={filterScrollRef}
                          className="scrollbar-hide flex gap-2 overflow-x-auto px-1 py-1.5 md:px-2 md:py-2"
                        >
                          {renderDropdownFilter({
                            id: "location",
                            label: "지역",
                          })}
                          {renderDropdownFilter({
                            id: "owner",
                            label: "운영",
                          })}
                        </div>
                        {isFilterOverflowing ? (
                          <button
                            type="button"
                            aria-label="필터 오른쪽으로 이동"
                            onClick={() => scrollFilterRow("right")}
                            className="pointer-events-none absolute right-0 top-1/2 z-[90] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5e8ec] bg-white text-[#6b7280] opacity-0 shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100"
                          >
                            ›
                          </button>
                        ) : null}
                      </div>
                      {renderFilterResetButton()}
                    </div>
                    {renderOpenFilterPanel()}
                  </div>

                  <div className="map-test-scrollbar relative z-0 min-h-0 flex-1 overflow-y-auto p-2 md:p-3">
                    <div className="space-y-2 md:space-y-2.5">
                      {filteredCourts.map((court) => renderCourtListItem(court))}
                    </div>
                  </div>
                </>
              ) : activeMenu === "schedule" ? (
                <>
                  <div className="map-test-scrollbar min-h-0 flex-1 overflow-y-auto p-2 md:p-3">
                    <div className="space-y-2 md:space-y-2.5">
                      {upcomingOpens.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedCourtId(item.court.id)}
                          className={`block w-full rounded-2xl border px-4 py-4 text-left transition ${
                            selectedCourt?.id === item.court.id
                              ? "border-[#9ab8a7] bg-[#f2f7f4]"
                              : "border-[#e6eaee] bg-white hover:border-[#cbd5df] hover:bg-[#f8fafc]"
                          }`}
                        >
                          <p className="text-[15px] font-semibold text-[#111827]">
                            {item.result.dateLabel} {item.result.timeLabel}
                          </p>
                          <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#111827]">
                            {item.court.basic_court_name}
                          </p>
                          <p className="mt-1 truncate text-[12px] font-medium text-[#6b7280]">
                            {formatRegion(item.court) || "지역 미입력"} · {item.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="map-test-scrollbar min-h-0 flex-1 overflow-y-auto p-2 md:p-3">
                    {favoriteCourts.length > 0 ? (
                      <div className="space-y-2.5">
                        {favoriteCourts.map((court) => renderCourtListItem(court))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[#eef1f4] bg-white px-4 py-6 text-center">
                        <p className="text-[13px] font-semibold text-[#111827]">
                          {isFavoriteLoading ? `찜한 ${venueLabel}을 불러오는 중입니다.` : favoriteMessage}
                        </p>
                        {!isFavoriteLoading && favoriteMessage.includes("로그인") ? (
                          <Link
                            href="/mypage"
                            className="mt-4 inline-flex rounded-xl bg-[#1f2937] px-4 py-2 text-[12px] font-semibold text-white"
                          >
                            로그인하기
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        </section>

        <section className="absolute inset-0 bg-[#e7edf3] md:relative md:min-w-0 md:flex-1">
          <div ref={mapRef} className="h-full w-full" />
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111827] text-white">
              <div className="max-w-sm rounded-xl border border-white/10 bg-black/70 p-5 text-center">
                <p className="text-sm font-bold">{mapError}</p>
                <p className="mt-2 text-xs text-[#9ca3af]">
                  테스트 페이지는 현재 프로젝트의 카카오 지도 키를 사용합니다.
                </p>
              </div>
            </div>
          ) : null}

          {shouldShowSportFilter ? (
            <>
              <div
                className="absolute z-[60] min-w-0 md:hidden"
                style={{
                  left: 4,
                  right: 4,
                  top: "calc(max(12px, env(safe-area-inset-top)) + 54px)",
                }}
              >
                <MapSportFilterBar
                  value={mapSportFilter}
                  onChange={handleMapSportFilterChange}
                />
              </div>
              <div
                className="absolute z-[60] hidden min-w-0 md:block"
                style={{ left: 12, top: 12 }}
              >
                <MapSportFilterBar
                  value={mapSportFilter}
                  onChange={handleMapSportFilterChange}
                />
              </div>
            </>
          ) : null}

          {isMapReady && !mapError && (!isMobileViewport || mobileMode === "map") ? (
            <div className="absolute bottom-[calc(max(18px,env(safe-area-inset-bottom))+104px)] right-4 z-[56] flex flex-col items-end gap-2 md:bottom-5 md:right-5">
              {locationMessage ? (
                <p className="rounded-full bg-[#111827]/90 px-3 py-2 text-xs font-medium text-white shadow-[0_8px_22px_rgba(15,23,42,0.18)]">
                  {locationMessage}
                </p>
              ) : null}
              <button
                type="button"
                onClick={moveToCurrentLocation}
                disabled={isLocating}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#cfd8e3] bg-white text-[#4b5563] shadow-[0_8px_20px_rgba(15,23,42,0.16)] transition hover:border-[#9aa8b7] hover:bg-[#f8fafc] active:scale-95 md:h-12 md:w-12"
                aria-label="내 위치로 이동"
                aria-busy={isLocating}
              >
                <svg
                  className={isLocating ? "animate-spin" : ""}
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.8v3.1M12 18.1v3.1M2.8 12h3.1M18.1 12h3.1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                </svg>
              </button>
            </div>
          ) : null}

          {shouldShowInfoLayer && selectedCourt ? (
            <article
              className="map-test-scrollbar fixed inset-x-2 bottom-2 z-50 max-h-[66dvh] overflow-y-auto rounded-[22px] border border-[#dbe2ea] bg-white/95 p-4 text-[#111] shadow-[0_18px_60px_rgba(15,23,42,0.22)] backdrop-blur md:absolute md:inset-auto md:left-5 md:top-5 md:max-h-[calc(100vh-40px)] md:w-[380px] md:p-5 md:shadow-[0_18px_60px_rgba(15,23,42,0.14)]"
              onScroll={() => {
                if (lastCapturedMapDetailScrollRef.current === selectedCourt.id) return;

                lastCapturedMapDetailScrollRef.current = selectedCourt.id;
                capturePostHogEvent("map_detail_scrolled", {
                  courtId: selectedCourt.id,
                  courtName: selectedCourt.basic_court_name,
                  source: isMobileViewport ? "mobile_info_layer" : "desktop_info_layer",
                });
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="break-keep text-xl font-bold">{selectedCourt.basic_court_name}</h2>
                  <p className="mt-2 text-xs font-medium text-[#6b7280]">
                    {formatRegion(selectedCourt)} · {formatOwnerType(selectedCourt.basic_owner_type)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourtId(null);
                    if (isMobileViewport) {
                      setMobileMode(mobileDetailReturnMode);
                    }
                  }}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6] text-xl leading-none text-[#6b7280] transition hover:bg-[#e5e7eb] md:flex"
                  aria-label="정보 레이어 닫기"
                >
                  ×
                </button>
              </div>
              {shareMessage ? (
                <p className="mt-3 rounded-lg bg-[#eefaf3] px-3 py-2 text-xs font-medium text-[#25764d]">
                  {shareMessage}
                </p>
              ) : null}
              <p className="mt-4 text-sm font-medium leading-relaxed text-[#374151]">
                {selectedCourt.basic_address}
              </p>

              <div className="mt-4 flex items-center gap-2 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-xl [&>button>svg]:h-6 [&>button>svg]:w-6 md:[&>button]:h-8 md:[&>button]:w-8 md:[&>button]:rounded-md md:[&>button>svg]:h-5 md:[&>button>svg]:w-5">
                <FavoriteButton courtId={selectedCourt.id} variant="light" source="map_info_layer" />
                <button
                  type="button"
                  onClick={handleShareSelectedCourt}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#111827] transition hover:bg-[#e5e7eb] md:h-8 md:w-8 md:rounded-md"
                  aria-label="공유하기"
                >
                  <svg className="h-6 w-6 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M8.6 10.8 15.4 7M8.6 13.2l6.8 3.8M7 15.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <Link
                href={getCourtDetailPath(selectedCourt)}
                className="mt-3 inline-flex rounded-lg border border-[#d6dde5] px-3 py-2 text-xs font-semibold text-[#374151] transition hover:border-[#9ab8a7] hover:text-[#25764d]"
              >
                상세페이지 보기
              </Link>

              {normalizeSportType(selectedCourt.sport_type) === "tennis" ? (
                <section className="mt-5 border-t border-[#d6dde5] pt-5">
                  <h3 className="text-sm font-semibold text-[#111827]">코트</h3>
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#e5e7eb]">
                    <table className="w-full text-center text-sm">
                      <thead className="bg-[#f7f8fa] text-xs font-semibold text-[#6b7280]">
                        <tr>
                          <th className="px-3 py-2">구분</th>
                          <th className="px-3 py-2">실내</th>
                          <th className="px-3 py-2">실외</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef0f3] text-[#111827]">
                        {getCourtSurfaceRows(selectedCourt).map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-2">
                              <span className="flex items-center justify-center gap-2">
                                {row.icon ? (
                                  <img src={row.icon} alt="" className="h-5 w-5" />
                                ) : null}
                                <span className="sr-only">{row.label}</span>
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">{formatCourtCount(row.indoor)}</td>
                            <td className="px-3 py-2 font-medium">{formatCourtCount(row.outdoor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <section className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#111827]">예약 오픈 정보</h3>
                  {selectedBookingDisplay.length > 0 ? (
                    <span className="text-xs font-medium text-[#9ca3af]">{selectedBookingDisplay.length}개</span>
                  ) : null}
                </div>
                <div className="mt-2 space-y-2">
                {selectedBookingDisplay.length > 0 ? (
                  selectedBookingDisplay.map((item) => (
                    <div key={item.key} className="rounded-xl bg-[#f4f6f8] px-3 py-3">
                      <div className="flex items-start gap-2">
                        {item.badge ? <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#25764d]">
                          {item.badge}
                        </span> : null}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                          {item.result ? <p className="mt-1 text-xs font-medium text-[#6b7280]">
                            {item.result.dateLabel} {item.result.timeLabel}
                          </p> : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-[#f4f6f8] px-3 py-3 text-sm font-medium text-[#9ca3af]">
                    예약 오픈 정보를 확인 중입니다.
                  </div>
                )}
                </div>
              </section>

              {nextSelectedOpen || selectedMethodLabels.length === 0 ? <section className="mt-5">
                <h3 className="text-sm font-semibold text-[#111827]">다음 예약 오픈일</h3>
                {nextSelectedOpen ? (
                  <div className="mt-2 rounded-2xl border border-[#d6dde5] bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#25764d]">
                        {nextSelectedOpen.badge}
                      </span>
                      <a
                        href={buildMapCalendarHref(selectedCourt, nextSelectedOpen)}
                        data-gtm="calendar_register_map_click"
                        data-court-id={selectedCourt.id}
                        data-court-name={selectedCourt.basic_court_name ?? undefined}
                        data-booking-badge={nextSelectedOpen.badge}
                        data-booking-label={nextSelectedOpen.label}
                        className="text-xs font-semibold text-[#6b7280] underline underline-offset-2"
                      >
                        캘린더 등록하기
                      </a>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-xl font-bold text-[#16824f]">{nextSelectedOpen.result.dateLabel}</p>
                      <p className="text-lg font-bold text-[#16824f]">{nextSelectedOpen.result.timeLabel}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-[#f4f6f8] px-3 py-3 text-sm font-medium text-[#9ca3af]">
                    계산 가능한 다음 예약 오픈일이 없습니다.
                  </p>
                )}
              </section> : null}

              <div className="mt-5">
                {reservationHref ? (
                  <a
                    href={reservationHref}
                    target={phoneReservation ? undefined : "_blank"}
                    rel="noreferrer"
                    data-gtm="reserve_click"
                    data-court-id={selectedCourt.id}
                    data-court-name={selectedCourt.basic_court_name ?? undefined}
                    data-booking-source="map_info_layer"
                    className="block rounded-xl bg-[#25764d] px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    {phoneReservation ? "전화 예약" : "예약하러가기"}
                  </a>
                ) : (
                  <span className="block rounded-xl bg-[#e5e7eb] px-4 py-3 text-center text-sm font-semibold text-[#9ca3af]">
                    {selectedMethodLabels.length > 0 ? selectedMethodLabels.join(" · ") : "예약 링크 확인 중"}
                  </span>
                )}
              </div>

              <section className="mt-5 border-t border-[#d6dde5] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#111827]">방문 후기</h3>
                  <Link
                    href={getCourtDetailPath(selectedCourt)}
                    className="text-xs font-semibold text-[#6b7280] underline underline-offset-2"
                  >
                    상세페이지 보기
                  </Link>
                </div>
                <div className="mt-2 space-y-2">
                  {selectedBlogLinks.length > 0 ? (
                    selectedBlogLinks.map((blog) => (
                      <a
                        key={`${blog.url}-${blog.sort_order}`}
                        href={blog.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex gap-3 rounded-xl border border-[#e5e7eb] bg-white p-2 transition hover:border-[#b7c3d0]"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eef0f3]">
                          {blog.thumbnail_url ? (
                            <img
                              src={blog.thumbnail_url}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 py-1">
                          <p className="truncate text-xs font-semibold text-[#25764d]">
                            {blog.source ?? "방문 후기"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#111827]">
                            {blog.title ?? "방문 후기 보기"}
                          </p>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="rounded-xl bg-[#f4f6f8] px-3 py-3 text-sm font-medium text-[#9ca3af]">
                      등록된 방문 후기가 없습니다.
                    </p>
                  )}
                </div>
              </section>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
