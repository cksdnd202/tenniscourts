import "server-only";

import { unstable_cache } from "next/cache";
import type {
  Court,
  CourtBookingRule,
  CourtBookingRuleFee,
  CourtSurfaceCount,
  SportType,
} from "@/app/types";
import { normalizeSportType } from "@/lib/sports";
import {
  matchesCourtEnvironment,
  type CourtEnvironment,
} from "@/lib/courtEnvironment";
import {
  getNextBookingRuleOpen,
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
} from "@/lib/nextBookingOpen";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HOME_COURTS_CACHE_TAG,
  HOME_COURTS_REVALIDATE_SECONDS,
} from "@/lib/homeCourtsCache.server";

export const HOME_COURTS_PAGE_SIZE = 30;

export type HomeCourtSort = "recent" | "upcoming" | "name";

export type HomeCourtPageParams = {
  offset?: number;
  limit?: number;
  region?: string;
  city?: string;
  courtTypes?: string[];
  courtEnvironments?: CourtEnvironment[];
  ownerTypes?: string[];
  feeTypes?: Array<"free" | "paid">;
  priceRange?: [number, number];
  courtIds?: string[];
  query?: string;
  sort?: HomeCourtSort;
};

export type HomeCourtFilterOptions = {
  regions: string[];
  citiesByRegion: Record<string, string[]>;
};

export type HomeCourtSearchItem = Pick<
  Court,
  | "id"
  | "sport_type"
  | "slug"
  | "basic_court_name"
  | "basic_region"
  | "basic_city"
  | "basic_address"
>;

const COURT_CARD_SELECT =
  "id, sport_type, created_at, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_latitude, basic_longitude, basic_region, basic_city, booking_site_link, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, has_indoor_courts, has_outdoor_courts, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, court_surface_counts(id, court_id, surface_type, indoor_count, outdoor_count)";

const COURT_CARD_RULE_SELECT =
  "id, court_id, label, eligibility, target_condition, rule_type, open_type, open_day_of_month, open_day_of_week, open_ordinal, open_time, open_offset, open_date_adjustment, interval_weeks, anchor_date, lottery_desc, booking_round_label, usage_period_label, is_active, sort_order";

const COURT_CARD_FEE_SELECT =
  "id, booking_rule_id, is_free, price_basis_hours, outdoor_weekday_price, outdoor_weekend_price, indoor_weekday_price, indoor_weekend_price, lighting_fee_separate, lighting_fee_amount, lighting_fee_basis_hours, lighting_start_time";

function getFeePrices(fee: CourtBookingRuleFee) {
  // The price filter uses a common one-hour basis even when a fee is stored
  // as a two- or three-hour booking amount.
  const basisHours =
    typeof fee.price_basis_hours === "number" &&
    Number.isFinite(fee.price_basis_hours) &&
    fee.price_basis_hours > 0
      ? fee.price_basis_hours
      : 1;

  return [
    fee.outdoor_weekday_price,
    fee.outdoor_weekend_price,
    fee.indoor_weekday_price,
    fee.indoor_weekend_price,
  ]
    .filter(
      (price): price is number =>
        typeof price === "number" && Number.isFinite(price) && price >= 0
    )
    .map((price) => Math.round(price / basisHours));
}

async function attachBookingRulesAndFeeSummary(courts: Court[]) {
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  if (courtIds.length === 0) {
    return courts.map((court) => ({
      ...court,
      court_booking_rules: [],
      court_fee_summary: {
        has_free: false,
        has_paid: false,
        min_price: null,
        max_price: null,
        price_values: [],
      },
    }));
  }

  const bookingRules: CourtBookingRule[] = [];
  for (let index = 0; index < courtIds.length; index += 100) {
    const idChunk = courtIds.slice(index, index + 100);
    const { data: rules, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .select(COURT_CARD_RULE_SELECT)
      .in("court_id", idChunk)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    bookingRules.push(...((rules ?? []) as CourtBookingRule[]));
  }

  const rulesByCourtId = new Map<string, CourtBookingRule[]>();
  for (const rule of bookingRules) {
    if (!rule.court_id) continue;
    const current = rulesByCourtId.get(rule.court_id) ?? [];
    current.push(rule);
    rulesByCourtId.set(rule.court_id, current);
  }

  const courtIdByRuleId = new Map(
    bookingRules.map((rule) => [rule.id, rule.court_id] as const)
  );
  const ruleIds = bookingRules.map((rule) => rule.id).filter(Boolean);
  const bookingRuleFees: CourtBookingRuleFee[] = [];
  for (let index = 0; index < ruleIds.length; index += 100) {
    const ruleIdChunk = ruleIds.slice(index, index + 100);
    const { data: fees, error } = await getSupabaseAdmin()
      .from("court_booking_rule_fees")
      .select(COURT_CARD_FEE_SELECT)
      .in("booking_rule_id", ruleIdChunk);

    if (error) throw new Error(error.message);
    bookingRuleFees.push(...((fees ?? []) as CourtBookingRuleFee[]));
  }

  const feeSummaryByCourtId = new Map<
    string,
    { hasFree: boolean; hasPaid: boolean; prices: Set<number> }
  >();
  for (const fee of bookingRuleFees) {
    const courtId = courtIdByRuleId.get(fee.booking_rule_id);
    if (!courtId) continue;

    const summary = feeSummaryByCourtId.get(courtId) ?? {
      hasFree: false,
      hasPaid: false,
      prices: new Set<number>(),
    };
    if (fee.is_free) {
      summary.hasFree = true;
    } else {
      const prices = getFeePrices(fee);
      if (prices.length > 0) summary.hasPaid = true;
      prices.forEach((price) => summary.prices.add(price));
    }
    feeSummaryByCourtId.set(courtId, summary);
  }

  return courts.map((court) => {
    const feeSummary = feeSummaryByCourtId.get(court.id);
    const priceValues = [...(feeSummary?.prices ?? [])].sort((a, b) => a - b);

    return {
      ...court,
      court_booking_rules: rulesByCourtId.get(court.id) ?? [],
      court_fee_summary: {
        has_free: feeSummary?.hasFree ?? false,
        has_paid: feeSummary?.hasPaid ?? false,
        min_price: priceValues[0] ?? null,
        max_price: priceValues[priceValues.length - 1] ?? null,
        price_values: priceValues,
      },
    };
  });
}

async function fetchHomeCourts(sportType: SportType = "tennis") {
  const normalizedSportType = normalizeSportType(sportType);
  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select(COURT_CARD_SELECT)
    .eq("sport_type", normalizedSportType)
    .eq("use_or_not", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return attachBookingRulesAndFeeSummary((data as Court[] | null) ?? []);
}

export const getCachedHomeCourts = unstable_cache(fetchHomeCourts, ["home-courts-v14-name-slugs"], {
  revalidate: HOME_COURTS_REVALIDATE_SECONDS,
  tags: [HOME_COURTS_CACHE_TAG],
});

function getDateTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareCourtName(a: Court, b: Court) {
  return (a.basic_court_name ?? "").localeCompare(b.basic_court_name ?? "", "ko");
}

function getNearestBookingOpenTime(court: Court, from: Date) {
  const activeRules = (court.court_booking_rules ?? [])
    .filter((rule) => rule.is_active)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const fixedActiveRules = activeRules.filter((rule) => rule.rule_type !== "rolling");

  if (activeRules.length === 0 && court.booking_rule_type === "rolling") {
    return Number.POSITIVE_INFINITY;
  }

  const candidates = activeRules.length > 0
    ? fixedActiveRules.map((rule) => getNextBookingRuleOpen(court, rule, from))
    : [
        getPriorityBookingLabel(court) ? getNextOwnerBookingOpen(court, from) : null,
        getNextNormalBookingOpen(court, from),
      ];

  const times = candidates
    .map((result) => result?.instant.getTime())
    .filter((time): time is number => typeof time === "number" && Number.isFinite(time));

  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function matchesCourtType(court: Court, selectedTypes: Set<string>) {
  if (selectedTypes.size === 0) return true;

  const hasHard =
    (court.court_count_hard_indoor ?? 0) + (court.court_count_hard_outdoor ?? 0) > 0;
  const hasGrass =
    (court.court_count_grass_indoor ?? 0) + (court.court_count_grass_outdoor ?? 0) > 0;
  const hasClay =
    (court.court_count_clay_indoor ?? 0) + (court.court_count_clay_outdoor ?? 0) > 0;

  const legacyMatch = (
    (selectedTypes.has("hard") && hasHard) ||
    (selectedTypes.has("grass") && hasGrass) ||
    (selectedTypes.has("clay") && hasClay)
  );

  const surfaceMatch = ((court.court_surface_counts ?? []) as CourtSurfaceCount[]).some(
    (surface) =>
      selectedTypes.has(surface.surface_type) &&
      (Number(surface.indoor_count ?? 0) + Number(surface.outdoor_count ?? 0) > 0)
  );

  return legacyMatch || surfaceMatch;
}

function matchesHomeCourtFilters(court: Court, params: HomeCourtPageParams) {
  const selectedCourtTypes = new Set(params.courtTypes ?? []);
  const selectedOwnerTypes = new Set(params.ownerTypes ?? []);
  const selectedFeeTypes = new Set(params.feeTypes ?? []);
  const selectedCourtIds = new Set(params.courtIds ?? []);
  if (court.use_or_not !== true) return false;
  if (selectedCourtIds.size > 0 && !selectedCourtIds.has(court.id)) return false;
  if (params.region && court.basic_region !== params.region) return false;
  if (params.city && court.basic_city !== params.city) return false;
  if (params.query) {
    const keyword = params.query.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
    const searchable = [court.basic_court_name, court.basic_address]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .replace(/\s+/g, "");
    if (!searchable.includes(keyword)) return false;
  }
  if (!matchesCourtType(court, selectedCourtTypes)) return false;
  if (!matchesCourtEnvironment(court, params.courtEnvironments ?? [])) return false;
  if (
    selectedOwnerTypes.size > 0 &&
    !selectedOwnerTypes.has((court.basic_owner_type ?? "").trim())
  ) {
    return false;
  }
  if (selectedFeeTypes.size > 0) {
    const summary = court.court_fee_summary;
    const [minimumPrice, maximumPrice] = params.priceRange ?? [0, 500_000];
    const matchesFree = selectedFeeTypes.has("free") && summary?.has_free === true;
    const matchesPaid = selectedFeeTypes.has("paid")
      && summary?.has_paid === true
      && summary.price_values.some(
        (price) => price >= minimumPrice && price <= maximumPrice
      );
    if (!matchesFree && !matchesPaid) return false;
  }
  return true;
}

export function getHomeCourtPage(allCourts: Court[], params: HomeCourtPageParams = {}) {
  const rawOffset = Number(params.offset ?? 0);
  const rawLimit = Number(params.limit ?? HOME_COURTS_PAGE_SIZE);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(50, Math.max(1, Math.trunc(rawLimit)))
    : HOME_COURTS_PAGE_SIZE;
  const filtered = allCourts.filter((court) => matchesHomeCourtFilters(court, params));

  const sorted = filtered.slice();
  if (params.sort === "name") {
    sorted.sort(compareCourtName);
  } else if (params.sort === "upcoming") {
    const now = new Date();
    sorted.sort((a, b) => {
      const compared = getNearestBookingOpenTime(a, now) - getNearestBookingOpenTime(b, now);
      return compared || compareCourtName(a, b);
    });
  } else {
    sorted.sort((a, b) => {
      const compared = getDateTime(b.created_at) - getDateTime(a.created_at);
      return compared || compareCourtName(a, b);
    });
  }

  return {
    courts: sorted.slice(offset, offset + limit),
    total: sorted.length,
    hasMore: offset + limit < sorted.length,
  };
}

export function getNearbyHomeCourtPage(
  allCourts: Court[],
  params: HomeCourtPageParams & { latitude: number; longitude: number }
) {
  const rawOffset = Number(params.offset ?? 0);
  const rawLimit = Number(params.limit ?? HOME_COURTS_PAGE_SIZE);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(50, Math.max(1, Math.trunc(rawLimit)))
    : HOME_COURTS_PAGE_SIZE;

  const rows = allCourts
    .filter((court) => matchesHomeCourtFilters(court, params))
    .filter((court) => Number.isFinite(court.basic_latitude) && Number.isFinite(court.basic_longitude))
    .map((court) => ({
      court_id: court.id,
      distance_meters: getHaversineDistanceMeters(
        params.latitude,
        params.longitude,
        Number(court.basic_latitude),
        Number(court.basic_longitude)
      ),
      name: court.basic_court_name ?? "",
    }))
    .sort((a, b) => a.distance_meters - b.distance_meters || a.name.localeCompare(b.name, "ko") || a.court_id.localeCompare(b.court_id));

  return {
    rows: rows.slice(offset, offset + limit).map(({ court_id, distance_meters }) => ({ court_id, distance_meters })),
    total: rows.length,
    hasMore: offset + limit < rows.length,
  };
}

function getHaversineDistanceMeters(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const earthRadiusMeters = 6_371_008.8;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getHomeCourtFilterOptions(courts: Court[]): HomeCourtFilterOptions {
  const cities = new Map<string, Set<string>>();

  for (const court of courts) {
    if (!court.basic_region) continue;
    const regionCities = cities.get(court.basic_region) ?? new Set<string>();
    if (court.basic_city) regionCities.add(court.basic_city);
    cities.set(court.basic_region, regionCities);
  }

  const regions = [...cities.keys()].sort((a, b) => a.localeCompare(b, "ko"));
  return {
    regions,
    citiesByRegion: Object.fromEntries(
      regions.map((region) => [
        region,
        [...(cities.get(region) ?? [])].sort((a, b) => a.localeCompare(b, "ko")),
      ])
    ),
  };
}

export function getHomeCourtSearchIndex(courts: Court[]): HomeCourtSearchItem[] {
  return courts.map((court) => ({
    id: court.id,
    sport_type: court.sport_type,
    slug: court.slug,
    basic_court_name: court.basic_court_name,
    basic_region: court.basic_region,
    basic_city: court.basic_city,
    basic_address: court.basic_address,
  }));
}

async function fetchAllSportCourtSearchIndex(): Promise<HomeCourtSearchItem[]> {
  const supportedSports: SportType[] = ["tennis", "badminton"];
  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select(
      "id, sport_type, slug, basic_court_name, basic_region, basic_city, basic_address"
    )
    .in("sport_type", supportedSports)
    .eq("use_or_not", true)
    .order("basic_court_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as HomeCourtSearchItem[];
}

/**
 * Header search is intentionally independent from the sport-specific list.
 * Keeping this lightweight index separate avoids loading card and fee data on
 * every detail page. Add the next supported sport to the list above.
 */
export const getAllSportCourtSearchIndex = unstable_cache(
  fetchAllSportCourtSearchIndex,
  ["all-sport-court-search-index-v2-name-slugs"],
  {
    revalidate: HOME_COURTS_REVALIDATE_SECONDS,
    tags: [HOME_COURTS_CACHE_TAG],
  }
);
