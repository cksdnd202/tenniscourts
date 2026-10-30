import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchActiveRulesFromWebApi,
  type NotificationBookingRule,
} from '@/lib/courtNotifications';
import { publicSupabase, supabase } from '@/lib/supabase';
import { APP_WEB_ORIGIN } from '@/lib/webOrigin';

export type AppSportType = 'tennis' | 'badminton';

export type AppCourt = {
  id: string;
  sport_type: AppSportType;
  created_at: string | null;
  slug: string | null;
  use_or_not: boolean;
  basic_court_name: string | null;
  basic_owner_type: string | null;
  basic_address: string | null;
  basic_map_link: string | null;
  basic_latitude: number | null;
  basic_longitude: number | null;
  basic_region: string | null;
  basic_city: string | null;
  time_of_use_same: boolean | null;
  basic_time_of_use_weekday_from: string | null;
  basic_time_of_use_weekday_to: string | null;
  basic_time_of_use_weekend_from: string | null;
  basic_time_of_use_weekend_to: string | null;
  court_count_hard_indoor: number | null;
  court_count_hard_outdoor: number | null;
  court_count_grass_indoor: number | null;
  court_count_grass_outdoor: number | null;
  court_count_clay_indoor: number | null;
  court_count_clay_outdoor: number | null;
  booking_site_link: string | null;
  booking_reception_time: string | null;
  booking_rule_type: string | null;
  booking_lottery_desc: string | null;
  booking_booking_provide: string | null;
  etc_desc: string | null;
  rules: NotificationBookingRule[];
  distance_meters?: number | null;
};

export type CourtFee = {
  id: string;
  booking_rule_id: string;
  is_free: boolean;
  price_basis_hours: 1 | 2 | 3;
  outdoor_weekday_price: number | null;
  outdoor_weekend_price: number | null;
  indoor_weekday_price: number | null;
  indoor_weekend_price: number | null;
  lighting_fee_separate: boolean;
  lighting_fee_amount: number | null;
  lighting_fee_basis_hours: 1 | 2 | 3 | null;
  lighting_start_time: string | null;
};

export type CourtBlogLink = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  source: string | null;
  sort_order: number;
};

export type CourtDetail = AppCourt & {
  fees: CourtFee[];
  blogLinks: CourtBlogLink[];
  relatedCourts: AppCourt[];
};

const COURT_SELECT = [
  'id', 'sport_type', 'created_at', 'slug', 'use_or_not', 'basic_court_name', 'basic_owner_type',
  'basic_address', 'basic_map_link', 'basic_latitude', 'basic_longitude', 'basic_region',
  'basic_city', 'time_of_use_same', 'basic_time_of_use_weekday_from',
  'basic_time_of_use_weekday_to', 'basic_time_of_use_weekend_from',
  'basic_time_of_use_weekend_to', 'court_count_hard_indoor', 'court_count_hard_outdoor',
  'court_count_grass_indoor', 'court_count_grass_outdoor', 'court_count_clay_indoor',
  'court_count_clay_outdoor', 'booking_site_link', 'booking_reception_time',
  'booking_rule_type', 'booking_lottery_desc', 'booking_booking_provide', 'etc_desc',
].join(',');

const PAGE_SIZE = 500;
const RECENT_STORAGE_KEY = 'courtskorea:recent-court-ids';

export type CourtListSort = 'recent' | 'opening' | 'name';
export type CourtEnvironmentFilter = 'indoor' | 'outdoor';
export type CourtFeeFilter = 'free' | 'paid';
export type CourtPriceRange = [number, number];
export type CourtSurfaceFilter =
  | 'hard'
  | 'grass'
  | 'clay'
  | 'wood'
  | 'synthetic'
  | 'urethane'
  | 'artificial_grass'
  | 'clay_soil'
  | 'modular'
  | 'concrete'
  | 'other'
  | 'pending';

export type CourtListFilters = {
  region?: string;
  city?: string;
  courtTypes?: CourtSurfaceFilter[];
  courtEnvironments?: CourtEnvironmentFilter[];
  ownerTypes?: string[];
  feeTypes?: CourtFeeFilter[];
  priceRange?: CourtPriceRange;
  query?: string;
};

export type CourtPage = {
  courts: AppCourt[];
  total: number;
  hasMore: boolean;
};

export type CourtFilterOptions = {
  regions: string[];
  citiesByRegion: Record<string, string[]>;
};

export type CourtSearchItem = Pick<
  AppCourt,
  'id' | 'sport_type' | 'slug' | 'basic_court_name' | 'basic_region' | 'basic_city' | 'basic_address'
>;

let courtSearchIndexPromise: Promise<CourtSearchItem[]> | null = null;

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? '').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

function getSearchPriority(court: CourtSearchItem, keyword: string) {
  if (normalizeSearchText(court.basic_court_name).includes(keyword)) return 0;
  if (normalizeSearchText(court.basic_region).includes(keyword)) return 1;
  if (normalizeSearchText(court.basic_city).includes(keyword)) return 2;
  if (normalizeSearchText(court.basic_address).includes(keyword)) return 3;
  return 4;
}

export async function fetchAppCourtSearchIndex() {
  if (courtSearchIndexPromise) return courtSearchIndexPromise;

  courtSearchIndexPromise = (async () => {
    const rows: CourtSearchItem[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await publicSupabase
        .from('courtinfo')
        .select('id,sport_type,slug,basic_court_name,basic_region,basic_city,basic_address')
        .in('sport_type', ['tennis', 'badminton'])
        .eq('use_or_not', true)
        .order('basic_court_name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`검색 목록을 불러오지 못했습니다: ${error.message}`);
      const page = (data ?? []) as unknown as CourtSearchItem[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  })().catch((error) => {
    courtSearchIndexPromise = null;
    throw error;
  });

  return courtSearchIndexPromise;
}

export function searchAppCourtIndex(
  index: CourtSearchItem[],
  query: string,
  limit = 10,
  preferredSportType?: AppSportType,
) {
  const keyword = normalizeSearchText(query);
  if (!keyword) return [];

  return index
    .filter((court) => [
      court.basic_court_name,
      court.basic_region,
      court.basic_city,
      court.basic_address,
      [court.basic_region, court.basic_city].filter(Boolean).join(' '),
      [court.basic_region, court.basic_city, court.basic_court_name].filter(Boolean).join(' '),
    ].map(normalizeSearchText).join(' ').includes(keyword))
    .sort((a, b) => {
      if (preferredSportType && a.sport_type !== b.sport_type) {
        return a.sport_type === preferredSportType ? -1 : 1;
      }
      const priority = getSearchPriority(a, keyword) - getSearchPriority(b, keyword);
      if (priority !== 0) return priority;
      return (a.basic_court_name ?? '').localeCompare(b.basic_court_name ?? '', 'ko');
    })
    .slice(0, limit);
}

export async function searchAppCourts(
  query: string,
  limitPerSport = 10,
  preferredSportType?: AppSportType,
): Promise<CourtSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // PostgREST의 or 필터 구문을 깨뜨릴 수 있는 문자는 검색어에서 제외한다.
  const escaped = trimmed.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!escaped) return [];

  const pattern = `%${escaped}%`;
  const searchSport = async (sport: AppSportType) => {
    const { data, error } = await publicSupabase
      .from('courtinfo')
      .select('id,sport_type,slug,basic_court_name,basic_region,basic_city,basic_address')
      .eq('sport_type', sport)
      .eq('use_or_not', true)
      .or([
        `basic_court_name.ilike.${pattern}`,
        `basic_region.ilike.${pattern}`,
        `basic_city.ilike.${pattern}`,
        `basic_address.ilike.${pattern}`,
      ].join(','))
      .order('basic_court_name', { ascending: true })
      .limit(Math.max(limitPerSport * 3, 30));
    if (error) throw new Error(`검색 결과를 불러오지 못했습니다: ${error.message}`);
    return (data ?? []) as unknown as CourtSearchItem[];
  };

  const [tennisRows, badmintonRows] = await Promise.all([
    searchSport('tennis'),
    searchSport('badminton'),
  ]);
  const rowsBySport: Record<AppSportType, CourtSearchItem[]> = {
    tennis: tennisRows,
    badminton: badmintonRows,
  };
  // 웹 검색과 동일하게 현재 종목을 먼저 배치하고 종목별 최대 개수를 보장한다.
  const sportOrder: AppSportType[] = preferredSportType
    ? [preferredSportType, ...(['tennis', 'badminton'] as AppSportType[]).filter((sport) => sport !== preferredSportType)]
    : ['tennis', 'badminton'];
  return sportOrder.flatMap((sport) => searchAppCourtIndex(
    rowsBySport[sport],
    trimmed,
    limitPerSport,
    sport
  ));
}

function normalizeCourt(row: Omit<AppCourt, 'rules'>, rules: NotificationBookingRule[] = []): AppCourt {
  return { ...row, rules };
}

async function hydrateRules(rows: Array<Omit<AppCourt, 'rules'>>) {
  if (rows.length === 0) return [];
  const rules = await fetchActiveRulesFromWebApi(rows.map((row) => row.id));
  const byCourt = new Map<string, NotificationBookingRule[]>();
  for (const rule of rules) byCourt.set(rule.court_id, [...(byCourt.get(rule.court_id) ?? []), rule]);
  return rows.map((row) => normalizeCourt(row, byCourt.get(row.id) ?? []));
}

export async function fetchAppCourtPage({
  sportType = 'tennis',
  offset = 0,
  limit = 30,
  sort = 'recent',
  filters = {},
  courtIds,
}: {
  sportType?: AppSportType;
  offset?: number;
  limit?: number;
  sort?: CourtListSort;
  filters?: CourtListFilters;
  courtIds?: string[];
} = {}): Promise<CourtPage> {
  if (courtIds && courtIds.length === 0) return { courts: [], total: 0, hasMore: false };
  const params = new URLSearchParams({
    sportType,
    offset: String(offset),
    limit: String(limit),
    sort: sort === 'opening' ? 'upcoming' : sort,
  });
  if (filters.region) params.set('region', filters.region);
  if (filters.city) params.set('city', filters.city);
  if (filters.query?.trim()) params.set('query', filters.query.trim());
  if (filters.courtTypes?.length) params.set('courtTypes', filters.courtTypes.join(','));
  if (filters.courtEnvironments?.length) {
    params.set('courtEnvironments', filters.courtEnvironments.join(','));
  }
  if (filters.ownerTypes?.length) params.set('ownerTypes', filters.ownerTypes.join(','));
  if (filters.feeTypes?.length) params.set('feeTypes', filters.feeTypes.join(','));
  if (filters.priceRange) {
    params.set('priceMin', String(filters.priceRange[0]));
    params.set('priceMax', String(filters.priceRange[1]));
  }
  if (courtIds?.length) params.set('courtIds', courtIds.join(','));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${APP_WEB_ORIGIN}/api/courts?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`체육시설 서버 응답 오류 (${response.status})`);
    const payload = await response.json() as {
      courts?: Array<{ id: string }>;
      total?: number;
      hasMore?: boolean;
      error?: string;
    };
    if (payload.error) throw new Error(payload.error);
    const courts = await fetchAppCourtsByIds((payload.courts ?? []).map((court) => court.id), sportType);
    return {
      courts,
      total: Number(payload.total ?? 0),
      hasMore: Boolean(payload.hasMore),
    };
  } finally {
    clearTimeout(timeout);
  }
}

type NearbyCourtRow = {
  court_id: string;
  distance_meters: number;
};

export async function fetchNearbyCourtPage({
  sportType = 'tennis',
  latitude,
  longitude,
  offset = 0,
  limit = 30,
  filters = {},
}: {
  sportType?: AppSportType;
  latitude: number;
  longitude: number;
  offset?: number;
  limit?: number;
  filters?: CourtListFilters;
}): Promise<CourtPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${APP_WEB_ORIGIN}/api/courts/nearby`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        sportType,
        offset,
        limit,
        region: filters.region,
        city: filters.city,
        courtTypes: filters.courtTypes ?? [],
        courtEnvironments: filters.courtEnvironments ?? [],
        ownerTypes: filters.ownerTypes ?? [],
        feeTypes: filters.feeTypes ?? [],
        priceRange: filters.priceRange ?? [0, 500_000],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`가까운 체육시설 서버 응답 오류 (${response.status})`);
    const payload = await response.json() as { rows?: NearbyCourtRow[]; total?: number; hasMore?: boolean; error?: string };
    if (payload.error) throw new Error(payload.error);
    const rows = payload.rows ?? [];
    const courts = await fetchAppCourtsByIds(rows.map((row) => row.court_id), sportType);
    const distances = new Map(rows.map((row) => [row.court_id, Number(row.distance_meters)]));
    return {
      courts: courts.map((court) => ({ ...court, distance_meters: distances.get(court.id) ?? null })),
      total: Number(payload.total ?? 0),
      hasMore: Boolean(payload.hasMore),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAppCourtFilterOptions(sportType: AppSportType = 'tennis'): Promise<CourtFilterOptions> {
  const rows: Array<{ basic_region: string | null; basic_city: string | null }> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await publicSupabase
      .from('courtinfo')
      .select('basic_region,basic_city')
      .eq('sport_type', sportType)
      .eq('use_or_not', true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`지역 정보를 불러오지 못했습니다: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const citySets = new Map<string, Set<string>>();
  for (const row of rows) {
    const region = row.basic_region?.trim();
    const city = row.basic_city?.trim();
    if (!region) continue;
    if (!citySets.has(region)) citySets.set(region, new Set());
    if (city) citySets.get(region)?.add(city);
  }
  const regions = [...citySets.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
  const citiesByRegion = Object.fromEntries(
    regions.map((region) => [region, [...(citySets.get(region) ?? [])].sort((a, b) => a.localeCompare(b, 'ko'))])
  );
  return { regions, citiesByRegion };
}

export async function fetchAppCourtsByIds(ids: string[], sportType?: AppSportType) {
  if (ids.length === 0) return [];
  let query = publicSupabase
    .from('courtinfo')
    .select(COURT_SELECT)
    .in('id', ids)
    .eq('use_or_not', true);
  if (sportType) query = query.eq('sport_type', sportType);
  const { data, error } = await query;
  if (error) throw new Error(`체육시설 목록을 불러오지 못했습니다: ${error.message}`);
  const hydrated = await hydrateRules((data ?? []) as unknown as Array<Omit<AppCourt, 'rules'>>);
  const order = new Map(ids.map((id, index) => [id, index]));
  return hydrated.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

export async function fetchAllAppCourts(sportType: AppSportType = 'tennis'): Promise<AppCourt[]> {
  const rows: Array<Omit<AppCourt, 'rules'>> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await publicSupabase.from('courtinfo').select(COURT_SELECT)
      .eq('sport_type', sportType).eq('use_or_not', true)
      .order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`체육시설 목록을 불러오지 못했습니다: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Array<Omit<AppCourt, 'rules'>>));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  return hydrateRules(rows);
}

export async function fetchAppCourt(routeKey: string): Promise<CourtDetail> {
  const field = /^[0-9a-f-]{36}$/i.test(routeKey) ? 'id' : 'slug';
  const { data, error } = await publicSupabase.from('courtinfo').select(COURT_SELECT)
    .eq(field, routeKey).in('sport_type', ['tennis', 'badminton']).eq('use_or_not', true).maybeSingle();
  if (error || !data) throw new Error('체육시설 정보를 불러오지 못했습니다.');
  const row = data as unknown as Omit<AppCourt, 'rules'>;
  const rules = await fetchActiveRulesFromWebApi([row.id]);
  const ruleIds = rules.map((rule) => rule.id);
  const [feeResult, blogResult, relatedResult] = await Promise.all([
    ruleIds.length
      ? publicSupabase.from('court_booking_rule_fees').select('*').in('booking_rule_id', ruleIds)
      : Promise.resolve({ data: [], error: null }),
    publicSupabase.from('court_blog_links').select('*').eq('court_id', row.id)
      .order('sort_order', { ascending: true }).limit(3),
    row.basic_map_link
      ? publicSupabase.from('courtinfo').select(COURT_SELECT)
          .eq('sport_type', row.sport_type).eq('use_or_not', true)
          .eq('basic_map_link', row.basic_map_link).neq('id', row.id).limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (feeResult.error) throw new Error(`요금 정보를 불러오지 못했습니다: ${feeResult.error.message}`);
  if (blogResult.error) throw new Error(`후기를 불러오지 못했습니다: ${blogResult.error.message}`);
  if (relatedResult.error) throw new Error(`연관 시설을 불러오지 못했습니다: ${relatedResult.error.message}`);
  return {
    ...normalizeCourt(row, rules),
    fees: (feeResult.data ?? []) as CourtFee[],
    blogLinks: (blogResult.data ?? []) as CourtBlogLink[],
    relatedCourts: ((relatedResult.data ?? []) as unknown as Array<Omit<AppCourt, 'rules'>>)
      .map((item) => normalizeCourt(item)),
  };
}

export function courtRoute(court: Pick<AppCourt, 'id' | 'slug'>) {
  return `/courts/${court.slug || court.id}` as const;
}

export function courtSurfaceSummary(court: AppCourt) {
  const items = [
    ['하드', (court.court_count_hard_indoor ?? 0) + (court.court_count_hard_outdoor ?? 0)],
    ['인조잔디', (court.court_count_grass_indoor ?? 0) + (court.court_count_grass_outdoor ?? 0)],
    ['클레이', (court.court_count_clay_indoor ?? 0) + (court.court_count_clay_outdoor ?? 0)],
  ] as const;
  return items.filter(([, count]) => count > 0).map(([label, count]) => `${label} ${count}면`).join(' · ');
}

export async function trackRecentCourt(courtId: string) {
  const current = JSON.parse((await AsyncStorage.getItem(RECENT_STORAGE_KEY)) ?? '[]') as string[];
  await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([courtId, ...current.filter((id) => id !== courtId)].slice(0, 20)));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('recent_viewed_courts').upsert(
    { user_id: user.id, court_id: courtId, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,court_id' }
  );
}

export async function fetchRecentCourtIds() {
  const local = JSON.parse((await AsyncStorage.getItem(RECENT_STORAGE_KEY)) ?? '[]') as string[];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return local;
  const { data } = await supabase.from('recent_viewed_courts').select('court_id')
    .eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(20);
  return (data?.map((row) => row.court_id) ?? local) as string[];
}

export async function clearLocalRecentCourts() {
  await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
}

export async function fetchFavoriteCourtIds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('favorite_courts').select('court_id').eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.court_id as string);
}

export async function setCourtFavorite(courtId: string, favorite: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  const query = favorite
    ? supabase.from('favorite_courts').upsert({ user_id: user.id, court_id: courtId }, { onConflict: 'user_id,court_id' })
    : supabase.from('favorite_courts').delete().eq('user_id', user.id).eq('court_id', courtId);
  const { error } = await query;
  if (error) throw error;
}
