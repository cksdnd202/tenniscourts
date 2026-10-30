import { StatusBar } from 'expo-status-bar';
import { Image as ExpoImage } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import listCardIcon from '@/assets/images/list-card.png';
import listListIcon from '@/assets/images/list-list.png';
import filterIcon from '@/assets/images/filter/icon_filter.svg';
import resetIcon from '@/assets/images/filter/icon_reset_dark.svg';
import chipBookmarkIcon from '@/assets/images/home/icon_chip_bookmark.svg';
import chipMyPlaceIcon from '@/assets/images/home/icon_chip_myplace.svg';
import badmintonSportIcon from '@/assets/images/home/icon_sport_badminton.svg';
import tennisSportIcon from '@/assets/images/home/icon_sport_tennis.svg';
import searchIcon from '@/assets/images/header/icon_search_dark.png';
import topIcon from '@/assets/images/icon_top.svg';
import { BOTTOM_NAV_HEIGHT } from '@/components/AppBottomNav';
import { CourtCard } from '@/components/CourtCard';
import { LocationPermissionDialog } from '@/components/LocationPermissionDialog';
import { NotificationInboxButton } from '@/components/NotificationInboxButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { SportLoadingIndicator } from '@/components/SportLoadingIndicator';
import { getAppErrorCopy, type AppErrorCopy } from '@/lib/appError';
import { trackEvent } from '@/lib/analytics';
import {
  getFreshLocationAsync,
  getLocationCoordinates,
  getRecentLocationAsync,
  hasMeaningfulLocationChange,
} from '@/lib/currentLocation';
import {
  fetchAppCourtFilterOptions,
  fetchAppCourtPage,
  fetchFavoriteCourtIds,
  fetchNearbyCourtPage,
  courtRoute,
  searchAppCourts,
  setCourtFavorite,
  type AppCourt,
  type AppSportType,
  type CourtFilterOptions,
  type CourtListFilters,
  type CourtSearchItem,
  type CourtSurfaceFilter,
} from '@/lib/courtData';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 30;

type HomeListMode = 'all' | 'nearby' | 'favorites';
type LocationListState = 'idle' | 'checking' | 'ready' | 'prompt' | 'blocked' | 'services' | 'error';
type HomeListItem =
  | { kind: 'toolbar'; key: 'toolbar' }
  | { kind: 'count'; key: 'count' }
  | { kind: 'court'; key: string; court: AppCourt }
  | { kind: 'state'; key: 'state' };

const listModes: Array<{ key: HomeListMode; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'nearby', label: '내 주변' },
  { key: 'favorites', label: '찜' },
];

const sportOptions: Array<{ key: AppSportType; label: string; icon: typeof tennisSportIcon }> = [
  { key: 'tennis', label: '테니스장', icon: tennisSportIcon },
  { key: 'badminton', label: '배드민턴장', icon: badmintonSportIcon },
];

const tennisCourtTypeOptions: Array<{ key: CourtSurfaceFilter; label: string }> = [
  { key: 'hard', label: '하드' },
  { key: 'grass', label: '잔디' },
  { key: 'clay', label: '클레이' },
];

const badmintonCourtTypeOptions: Array<{ key: CourtSurfaceFilter; label: string }> = [
  { key: 'wood', label: '목재 마루' },
  { key: 'synthetic', label: 'PVC·전용 매트' },
  { key: 'urethane', label: '우레탄·탄성 포장' },
  { key: 'artificial_grass', label: '인조잔디' },
  { key: 'clay_soil', label: '흙·클레이' },
  { key: 'modular', label: '모듈형 스포츠 바닥' },
  { key: 'concrete', label: '콘크리트·시멘트' },
  { key: 'other', label: '기타' },
  { key: 'pending', label: '확인중' },
];

const ownerOptions = ['시립', '구립', '사설'];
const environmentOptions = [
  { key: 'indoor', label: '실내' },
  { key: 'outdoor', label: '실외' },
] as const;
const feeTypeOptions = [
  { key: 'free', label: '무료' },
  { key: 'paid', label: '유료' },
] as const;
const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 500_000;
const PRICE_RANGE_STEP = 1_000;
const PRICE_RANGE_MARKS = [
  { value: 0, label: '0' },
  { value: 10_000, label: '1만' },
  { value: 30_000, label: '3만' },
  { value: 50_000, label: '5만' },
  { value: 500_000, label: '최대' },
] as const;
const DEFAULT_PRICE_RANGE: [number, number] = [PRICE_RANGE_MIN, PRICE_RANGE_MAX];

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function hasActiveFilters(filters: CourtListFilters) {
  return Boolean(
    filters.region
    || filters.city
    || filters.query?.trim()
    || filters.courtTypes?.length
    || filters.courtEnvironments?.length
    || filters.ownerTypes?.length
    || filters.feeTypes?.length
  );
}

function formatKoreanPrice(value: number) {
  if (value === 0) return '0';
  const tenThousands = Math.floor(value / 10_000);
  const thousands = Math.floor((value % 10_000) / 1_000);
  if (tenThousands > 0 && thousands > 0) return `${tenThousands}만 ${thousands}천원`;
  if (tenThousands > 0) return `${tenThousands}만원`;
  return `${thousands}천원`;
}

function formatPriceRange([minimum, maximum]: [number, number]) {
  if (minimum === 0) return maximum === 0 ? '0' : `~${formatKoreanPrice(maximum)}`;
  return `${formatKoreanPrice(minimum)} ~ ${formatKoreanPrice(maximum)}`;
}

function priceToPercentage(value: number) {
  const clamped = Math.min(PRICE_RANGE_MAX, Math.max(PRICE_RANGE_MIN, value));
  const lastMarkIndex = PRICE_RANGE_MARKS.length - 1;
  for (let index = 0; index < lastMarkIndex; index += 1) {
    const start = PRICE_RANGE_MARKS[index].value;
    const end = PRICE_RANGE_MARKS[index + 1].value;
    if (clamped <= end) {
      return ((index + (clamped - start) / (end - start)) / lastMarkIndex) * 100;
    }
  }
  return 100;
}

function percentageToPrice(percentage: number) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const lastMarkIndex = PRICE_RANGE_MARKS.length - 1;
  if (clamped === 100) return PRICE_RANGE_MAX;
  const scaled = (clamped / 100) * lastMarkIndex;
  const segmentIndex = Math.min(lastMarkIndex - 1, Math.floor(scaled));
  const segmentRatio = scaled - segmentIndex;
  const start = PRICE_RANGE_MARKS[segmentIndex].value;
  const end = PRICE_RANGE_MARKS[segmentIndex + 1].value;
  return Math.round((start + (end - start) * segmentRatio) / PRICE_RANGE_STEP) * PRICE_RANGE_STEP;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requestId = useRef(0);
  const mountedRef = useRef(true);
  const listRef = useRef<FlatList<HomeListItem>>(null);
  const topButtonShownRef = useRef(false);
  const topButtonX = useRef(new Animated.Value(72)).current;
  const [courts, setCourts] = useState<AppCourt[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppErrorCopy | null>(null);
  const [sportType, setSportType] = useState<AppSportType>('tennis');
  const [listMode, setListMode] = useState<HomeListMode>('all');
  const [filters, setFilters] = useState<CourtListFilters>({});
  const [filterOptions, setFilterOptions] = useState<CourtFilterOptions>({ regions: [], citiesByRegion: {} });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<LocationListState>('idle');
  const [locationDialogMode, setLocationDialogMode] = useState<'permission' | 'services'>('permission');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [topButtonVisible, setTopButtonVisible] = useState(false);
  const sportVenueLabel = sportType === 'badminton' ? '배드민턴장' : '테니스장';
  const homeListItems = useMemo<HomeListItem[]>(() => [
    { kind: 'toolbar', key: 'toolbar' },
    { kind: 'count', key: 'count' },
    ...courts.map((court) => ({ kind: 'court' as const, key: court.id, court })),
    ...(courts.length === 0 ? [{ kind: 'state' as const, key: 'state' as const }] : []),
  ], [courts]);

  const setTopButtonShown = useCallback((visible: boolean) => {
    if (topButtonShownRef.current === visible) return;
    topButtonShownRef.current = visible;
    setTopButtonVisible(visible);
    Animated.timing(topButtonX, {
      toValue: visible ? 0 : 72,
      duration: visible ? 280 : 240,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [topButtonX]);

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (!topButtonShownRef.current && offsetY > 160) setTopButtonShown(true);
    else if (topButtonShownRef.current && offsetY <= 4) setTopButtonShown(false);
  }, [setTopButtonShown]);

  const scrollToTop = useCallback(() => {
    trackEvent('top_button_clicked', { screen: 'court_list' });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const resolveNearbyLocation = useCallback(async ({ requestPermission = false } = {}) => {
    setLocationState('checking');
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && requestPermission && permission.canAskAgain) {
        trackEvent('location_permission_requested', { source: 'home_nearby' });
        permission = await Location.requestForegroundPermissionsAsync();
        trackEvent(permission.granted ? 'location_permission_granted' : 'location_permission_denied', { source: 'home_nearby' });
      }

      if (!permission.granted) {
        setLocationCoords(null);
        setLocationState(permission.canAskAgain ? 'prompt' : 'blocked');
        return null;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationCoords(null);
        setLocationState('services');
        return null;
      }

      const recentLocation = await getRecentLocationAsync();
      const recentCoords = recentLocation ? getLocationCoordinates(recentLocation) : null;

      if (recentCoords) {
        setLocationCoords(recentCoords);
        setLocationState('ready');
        trackEvent('current_location_cache_used', { source: 'home_nearby' });
      }

      try {
        const freshLocation = await getFreshLocationAsync();
        const freshCoords = getLocationCoordinates(freshLocation);
        if (!recentLocation || hasMeaningfulLocationChange(recentLocation, freshLocation)) {
          setLocationCoords(freshCoords);
        }
        setLocationState('ready');
        trackEvent('current_location_success', {
          source: 'home_nearby',
          location_source: recentLocation ? 'background_refresh' : 'fresh',
        });
        return freshCoords;
      } catch (cause) {
        if (recentCoords) {
          trackEvent('current_location_refresh_failed', {
            source: 'home_nearby',
            reason: cause instanceof Error ? cause.message : 'unknown',
          });
          return recentCoords;
        }
        throw cause;
      }
    } catch (cause) {
      setLocationCoords(null);
      setLocationState('error');
      trackEvent('current_location_failed', {
        source: 'home_nearby',
        reason: cause instanceof Error ? cause.message : 'unknown',
      });
      return null;
    }
  }, []);

  const favoriteIdKey = listMode === 'favorites' ? [...favoriteIds].join(',') : '';
  const listPrerequisitesReady = listMode !== 'favorites' || favoritesReady;

  const load = useCallback(async ({ append = false, refresh = false } = {}) => {
    if (listMode === 'nearby' && !locationCoords) {
      setCourts([]);
      setTotal(0);
      setHasMore(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!listPrerequisitesReady) return;

    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const offset = append ? courts.length : 0;
      const page = listMode === 'nearby' && locationCoords
        ? await fetchNearbyCourtPage({
            sportType,
            latitude: locationCoords.latitude,
            longitude: locationCoords.longitude,
            offset,
            limit: PAGE_SIZE,
            filters,
          })
        : await fetchAppCourtPage({
            sportType,
            offset,
            limit: PAGE_SIZE,
            sort: 'recent',
            filters,
            courtIds: listMode === 'favorites' ? favoriteIdKey.split(',').filter(Boolean) : undefined,
          });
      if (!mountedRef.current || id !== requestId.current) return;
      setCourts((current) => append ? [...current, ...page.courts.filter((court) => !current.some((item) => item.id === court.id))] : page.courts);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (!mountedRef.current || id !== requestId.current) return;
      setError(getAppErrorCopy(cause, `${sportVenueLabel} 목록을 불러오지 못했습니다.`));
    } finally {
      if (mountedRef.current && id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [courts.length, favoriteIdKey, filters, listMode, listPrerequisitesReady, locationCoords, sportType, sportVenueLabel]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && listMode === 'nearby' && (locationState === 'blocked' || locationState === 'services')) {
        void resolveNearbyLocation();
      }
    });
    return () => subscription.remove();
  }, [listMode, locationState, resolveNearbyLocation]);

  useEffect(() => { void load(); }, [favoriteIdKey, filters, listMode, listPrerequisitesReady, locationCoords, sportType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchFavoriteCourtIds()
      .then((ids) => {
        if (!mountedRef.current) return;
        setFavoriteIds(new Set(ids));
        setFavoritesReady(true);
      })
      .catch(() => {
        if (mountedRef.current) setFavoritesReady(true);
      });
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAppCourtFilterOptions(sportType)
      .then((options) => {
        if (active && mountedRef.current) setFilterOptions(options);
      })
      .catch(() => {
        if (active && mountedRef.current) setFilterOptions({ regions: [], citiesByRegion: {} });
      });
    return () => { active = false; };
  }, [sportType]);

  const toggleFavorite = useCallback(async (court: AppCourt) => {
    const wasFavorite = favoriteIds.has(court.id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(court.id); else next.add(court.id);
      return next;
    });
    if (wasFavorite && listMode === 'favorites') {
      setCourts((current) => current.filter((item) => item.id !== court.id));
      setTotal((current) => Math.max(0, current - 1));
    }
    try {
      await setCourtFavorite(court.id, !wasFavorite);
      trackEvent('favorite_clicked', {
        court_id: court.id,
        favorite: !wasFavorite,
        source: 'court_list',
      });
    } catch (cause) {
      if (!mountedRef.current) return;
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(court.id); else next.delete(court.id);
        return next;
      });
      if (wasFavorite && listMode === 'favorites') void load({ refresh: true });
      Alert.alert('찜을 변경하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    }
  }, [favoriteIds, listMode, load]);

  const selectListMode = useCallback((nextMode: HomeListMode) => {
    if (nextMode === listMode) return;
    trackEvent('home_scope_selected', { scope: nextMode, sport_type: sportType });
    requestId.current += 1;
    setListMode(nextMode);
    setCourts([]);
    setTotal(0);
    setHasMore(false);
    setTopButtonShown(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (nextMode === 'nearby') void resolveNearbyLocation();
  }, [listMode, resolveNearbyLocation, setTopButtonShown, sportType]);

  const selectSport = useCallback((nextSportType: AppSportType) => {
    if (nextSportType === sportType) return;
    trackEvent('home_sport_selected', { sport_type: nextSportType });
    requestId.current += 1;
    setSportType(nextSportType);
    setFilters((current) => ({ ...current, courtTypes: undefined }));
    setCourts([]);
    setTotal(0);
    setHasMore(false);
    setTopButtonShown(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [setTopButtonShown, sportType]);

  const handleLocationAction = useCallback(() => {
    if (locationState === 'blocked') {
      setLocationDialogMode('permission');
      setLocationDialogOpen(true);
      return;
    }
    if (locationState === 'services') {
      setLocationDialogMode('services');
      setLocationDialogOpen(true);
      return;
    }
    void resolveNearbyLocation({ requestPermission: true });
  }, [locationState, resolveNearbyLocation]);

  const confirmLocationDialog = useCallback(async () => {
    if (locationBusy) return;
    setLocationBusy(true);
    try {
      if (locationDialogMode === 'services' && Platform.OS === 'android') {
        await Location.enableNetworkProviderAsync();
        setLocationDialogOpen(false);
        await resolveNearbyLocation();
        return;
      }
      trackEvent('location_settings_opened', { source: 'home_nearby', setting_type: locationDialogMode });
      await Linking.openSettings();
      setLocationDialogOpen(false);
    } finally {
      if (mountedRef.current) setLocationBusy(false);
    }
  }, [locationBusy, locationDialogMode, resolveNearbyLocation]);

  const refreshList = useCallback(() => {
    if (listMode === 'nearby') {
      setRefreshing(true);
      void resolveNearbyLocation().finally(() => {
        if (mountedRef.current) setRefreshing(false);
      });
      return;
    }
    void load({ refresh: true });
  }, [listMode, load, resolveNearbyLocation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.homeHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="체육시설 검색 열기"
          onPress={() => {
          trackEvent('search_opened', { source: 'court_list' });
          setSearchOpen(true);
          }}
          style={({ pressed }) => [styles.homeSearchButton, pressed && styles.homeSearchButtonPressed]}>
          <Image alt="" source={searchIcon} resizeMode="contain" style={styles.homeSearchIcon} />
          <Text style={styles.homeSearchText}>체육시설을 검색해 보세요</Text>
        </Pressable>
        <NotificationInboxButton />
      </View>

      <FlatList
        ref={listRef}
        data={homeListItems}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={[1]}
        contentContainerStyle={[styles.list, { paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 84 }]}
        ListHeaderComponent={(
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportSelectorContent}
            style={styles.sportSelector}
            accessibilityRole="tablist">
            {sportOptions.map((option) => {
              const selected = sportType === option.key;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  disabled={selected}
                  onPress={() => selectSport(option.key)}
                  style={({ pressed }) => [styles.sportOption, pressed && styles.buttonPressed]}>
                  <ExpoImage alt="" source={option.icon} contentFit="contain" style={styles.sportIcon} />
                  <Text style={[styles.sportLabel, selected ? styles.sportLabelActive : styles.sportLabelInactive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        renderItem={({ item }) => {
          if (item.kind === 'toolbar') {
            return (
              <View style={styles.toolbar}>
                <View style={styles.sorts}>
                  {listModes.map((option) => (
                    <Pressable
                      key={option.key}
                      disabled={listMode === option.key}
                      onPress={() => selectListMode(option.key)}
                      style={({ pressed }) => [
                        styles.sortButton,
                        listMode === option.key && styles.sortButtonActive,
                        pressed && styles.buttonPressed,
                      ]}>
                      {option.key === 'nearby' ? (
                        <ExpoImage alt="" source={chipMyPlaceIcon} contentFit="contain" style={styles.sortIcon} />
                      ) : null}
                      {option.key === 'favorites' ? (
                        <ExpoImage alt="" source={chipBookmarkIcon} contentFit="contain" style={styles.sortIcon} />
                      ) : null}
                      <Text style={[styles.sortText, listMode === option.key && styles.sortActive]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={viewMode === 'card' ? '목록형으로 보기' : '카드형으로 보기'}
                  onPress={() => setViewMode((current) => {
                    const next = current === 'card' ? 'list' : 'card';
                    trackEvent('court_view_changed', { view_mode: next });
                    return next;
                  })}
                  style={({ pressed }) => [styles.viewIconWrap, pressed && styles.buttonPressed]}>
                  <Image alt="" source={viewMode === 'card' ? listCardIcon : listListIcon} resizeMode="contain" style={styles.viewIcon} />
                </Pressable>
              </View>
            );
          }
          if (item.kind === 'count') {
            return (
              <View style={styles.countRow}>
                <Text style={styles.count}><Text style={styles.countStrong}>{total.toLocaleString()}</Text>개의 코트</Text>
              </View>
            );
          }
          if (item.kind === 'court') {
            return (
              <View style={styles.courtRow}>
                <CourtCard
                  court={item.court}
                  compact={viewMode === 'list'}
                  favorite={favoriteIds.has(item.court.id)}
                  onOpen={(court) => {
                    trackEvent('court_card_clicked', { court_id: court.id, source: 'court_list', sport_type: court.sport_type });
                    router.push(courtRoute(court));
                  }}
                  onToggleFavorite={toggleFavorite}
                />
              </View>
            );
          }
          return (
            <View style={styles.stateRow}>
              {loading || (listMode === 'nearby' && locationState === 'checking') ? (
                <LoadingState label={listMode === 'nearby' ? '현재 위치를 확인하고 있어요' : undefined} style={styles.state} />
              ) : error ? (
                <ErrorState description={error.description} onAction={() => void load()} style={styles.state} title={error.title} />
              ) : listMode === 'nearby' && !locationCoords ? (
                <EmptyState
                  actionLabel={locationState === 'blocked' ? '설정으로 이동' : locationState === 'services' ? '위치 켜기' : '위치 허용'}
                  description={locationState === 'services'
                    ? '휴대폰의 위치 기능을 켜면 가까운 순서대로 보여드릴게요.'
                    : '위치 권한을 허용하면 가까운 순서대로 보여드릴게요.'}
                  onAction={handleLocationAction}
                  style={styles.state}
                  title={locationState === 'services' ? '휴대폰 위치가 꺼져 있어요' : `내 주변 ${sportVenueLabel}을 보려면 위치 권한이 필요해요`}
                />
              ) : listMode === 'favorites' ? (
                <EmptyState
                  actionLabel={hasActiveFilters(filters) ? '필터 초기화' : '전체 코트 보기'}
                  description={hasActiveFilters(filters)
                    ? `필터를 초기화하고 찜한 ${sportVenueLabel}을 다시 확인해 보세요.`
                    : `관심 있는 ${sportVenueLabel}을 찜하면 여기에서 모아볼 수 있어요.`}
                  onAction={() => {
                    if (hasActiveFilters(filters)) setFilters({});
                    else selectListMode('all');
                  }}
                  style={styles.state}
                  title={hasActiveFilters(filters) ? `필터 조건에 맞는 찜한 ${sportVenueLabel}이 없어요` : `아직 찜한 ${sportVenueLabel}이 없어요`}
                />
              ) : (
                <EmptyState
                  actionLabel="필터 초기화"
                  description="다른 지역이나 조건으로 다시 찾아보세요."
                  onAction={() => setFilters({})}
                  style={styles.state}
                  title={`조건에 맞는 ${sportVenueLabel}이 없어요`}
                />
              )}
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshList} tintColor="#30C27C" />}
        onEndReached={() => { if (hasMore && !loadingMore) void load({ append: true }); }}
        onEndReachedThreshold={0.35}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
        ListFooterComponent={loadingMore ? <SportLoadingIndicator style={styles.moreLoader} /> : null}
      />

      <Pressable accessibilityRole="button" accessibilityLabel="필터 열기" onPress={() => {
        trackEvent('filter_opened', { source: 'court_list' });
        setFilterOpen(true);
      }} style={({ pressed }) => [styles.filterButton, { bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 20 }, pressed && styles.buttonPressed]}>
        <ExpoImage alt="" source={filterIcon} contentFit="contain" style={styles.filterIcon} />
        <Text style={styles.filterText}>필터</Text>
      </Pressable>

      <Animated.View
        pointerEvents={topButtonVisible ? 'auto' : 'none'}
        style={[
          styles.topButtonWrap,
          { bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 20, transform: [{ translateX: topButtonX }] },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="목록 최상단으로 이동"
          onPress={scrollToTop}
          style={({ pressed }) => [styles.topButton, pressed && styles.buttonPressed]}>
          <ExpoImage alt="" source={topIcon} contentFit="contain" style={styles.topIcon} />
        </Pressable>
      </Animated.View>

      <SearchModal
        preferredSportType={sportType}
        visible={searchOpen}
        value={searchText}
        onChange={setSearchText}
        onClose={() => setSearchOpen(false)}
      />
      <FilterModal
        key={filterOpen ? JSON.stringify(filters) : 'filter-closed'}
        visible={filterOpen}
        sportType={sportType}
        value={filters}
        options={filterOptions}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          trackEvent('main_filter_clicked', {
            region: next.region ?? 'all',
            city: next.city ?? 'all',
            court_types: next.courtTypes ?? [],
            court_environments: next.courtEnvironments ?? [],
            owner_types: next.ownerTypes ?? [],
            fee_types: next.feeTypes ?? [],
            price_range: next.priceRange ?? DEFAULT_PRICE_RANGE,
            sport_type: sportType,
          });
          setFilters(next);
          setFilterOpen(false);
        }}
      />
      <LocationPermissionDialog
        busy={locationBusy}
        mode={locationDialogMode}
        onCancel={() => setLocationDialogOpen(false)}
        onConfirm={confirmLocationDialog}
        visible={locationDialogOpen}
      />
    </SafeAreaView>
  );
}

function SearchModal({
  preferredSportType,
  visible,
  value,
  onChange,
  onClose,
}: {
  preferredSportType: AppSportType;
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const searchRequestId = useRef(0);
  const searchResultsRef = useRef<ScrollView>(null);
  const searchSectionOffsets = useRef<Partial<Record<AppSportType, number>>>({});
  const searchPendingAnchor = useRef<{ sport: AppSportType; y: number } | null>(null);
  const searchAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<CourtSearchItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState<AppErrorCopy | null>(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const [activeResultSport, setActiveResultSport] = useState<AppSportType>(preferredSportType);
  const query = visible ? value.trim() : '';
  const searchSportOrder = useMemo<AppSportType[]>(
    () => [preferredSportType, ...sportOptions.map((option) => option.key).filter((sport) => sport !== preferredSportType)],
    [preferredSportType]
  );
  const groupedResults = useMemo<Record<AppSportType, CourtSearchItem[]>>(() => ({
    tennis: results.filter((court) => court.sport_type === 'tennis').slice(0, 10),
    badminton: results.filter((court) => court.sport_type === 'badminton').slice(0, 10),
  }), [results]);

  useEffect(() => () => {
    if (searchAnchorTimer.current) clearTimeout(searchAnchorTimer.current);
  }, []);

  useEffect(() => {
    const requestId = ++searchRequestId.current;

    if (!query) return;

    const timer = setTimeout(() => {
      if (searchRequestId.current !== requestId) return;
      setLoadingResults(true);
      setSearchError(null);
      void searchAppCourts(query, 10, preferredSportType)
        .then((nextResults) => {
          if (searchRequestId.current !== requestId) return;
          setResults(nextResults);
          trackEvent('search_performed', {
            query_length: query.length,
            result_count: nextResults.length,
          });
        })
        .catch((cause) => {
          if (searchRequestId.current !== requestId) return;
          setResults([]);
          setSearchError(getAppErrorCopy(cause, '검색 결과를 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (searchRequestId.current === requestId) setLoadingResults(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      if (searchRequestId.current === requestId) searchRequestId.current += 1;
    };
  }, [preferredSportType, query, searchRevision]);

  const selectCourt = (court: CourtSearchItem) => {
    trackEvent('search_result_clicked', {
      court_id: court.id,
      sport_type: court.sport_type,
      result_position: Math.max(0, results.findIndex((item) => item.id === court.id)) + 1,
    });
    onClose();
    router.push(courtRoute(court));
  };

  const captureSearchSection = (sport: AppSportType, event: LayoutChangeEvent) => {
    searchSectionOffsets.current[sport] = event.nativeEvent.layout.y;
  };

  const syncActiveResultSport = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const pendingAnchor = searchPendingAnchor.current;
    if (pendingAnchor) {
      if (Math.abs(offsetY - pendingAnchor.y) <= 2) searchPendingAnchor.current = null;
      else return;
    }
    const detectionLine = offsetY + 24;
    let nextSport = searchSportOrder[0];
    for (const sport of searchSportOrder) {
      const sectionOffset = searchSectionOffsets.current[sport];
      if (typeof sectionOffset === 'number' && sectionOffset <= detectionLine) nextSport = sport;
    }
    setActiveResultSport((current) => current === nextSport ? current : nextSport);
  };

  const scrollToResultSport = (sport: AppSportType) => {
    const sectionOffset = searchSectionOffsets.current[sport];
    if (typeof sectionOffset !== 'number') return;
    if (searchAnchorTimer.current) clearTimeout(searchAnchorTimer.current);
    searchPendingAnchor.current = { sport, y: Math.max(0, sectionOffset) };
    setActiveResultSport(sport);
    searchResultsRef.current?.scrollTo({ y: Math.max(0, sectionOffset), animated: true });
    searchAnchorTimer.current = setTimeout(() => {
      searchPendingAnchor.current = null;
    }, 700);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        searchSectionOffsets.current = {};
        searchPendingAnchor.current = null;
        setActiveResultSport(preferredSportType);
      }}>
      <SafeAreaView style={styles.searchModalSafe}>
        <View style={styles.searchModalHeader}>
          <Text style={styles.searchModalTitle}>코트 검색</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="검색 닫기" onPress={onClose} style={({ pressed }) => [styles.searchCloseButton, pressed && styles.buttonPressed]}>
            <View style={styles.searchCloseIcon}>
              <View style={[styles.searchCloseLine, styles.searchCloseLineForward]} />
              <View style={[styles.searchCloseLine, styles.searchCloseLineBackward]} />
            </View>
          </Pressable>
        </View>

        <View style={styles.searchModalBody}>
          <View style={styles.searchInputWrap}>
            <Image
              alt=""
              source={searchIcon}
              resizeMode="contain"
              style={[
                styles.searchInputIcon,
                { tintColor: preferredSportType === 'badminton' ? '#375AE6' : '#2C8B56' },
              ]}
            />
            <TextInput
              autoFocus
              value={value}
              onChangeText={(nextValue) => {
                searchSectionOffsets.current = {};
                searchPendingAnchor.current = null;
                setActiveResultSport(preferredSportType);
                onChange(nextValue);
              }}
              returnKeyType="search"
              placeholder={`${preferredSportType === 'badminton' ? '배드민턴장' : '테니스장'}을 검색해주세요`}
              placeholderTextColor="#949494"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.searchResults}>
            {query && loadingResults ? <LoadingState compact style={styles.searchLoading} /> : null}
            {query && !loadingResults && searchError ? (
              <ErrorState
                compact
                description={searchError.description}
                onAction={() => setSearchRevision((current) => current + 1)}
                title={searchError.title}
              />
            ) : null}
            {!query ? <Text style={styles.searchEmptyText}>검색어를 입력하면 코트 목록이 표시됩니다.</Text> : null}
            {query && !loadingResults && !searchError && results.length === 0 ? (
              <EmptyState compact description="다른 이름이나 지역명으로 검색해 보세요." title="검색 결과가 없어요" />
            ) : null}
            {query && !loadingResults && !searchError && results.length > 0 ? (
              <View style={styles.searchResultsCard}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.searchSportChipsContent}
                  style={styles.searchSportChips}
                  accessibilityRole="tablist">
                  {searchSportOrder.map((sport) => {
                    const active = sport === activeResultSport;
                    const option = sportOptions.find((candidate) => candidate.key === sport)!;
                    return (
                      <Pressable
                        key={sport}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        onPress={() => scrollToResultSport(sport)}
                        style={({ pressed }) => [
                          styles.searchSportChip,
                          active && (sport === 'badminton' ? styles.searchSportChipBadminton : styles.searchSportChipTennis),
                          pressed && styles.buttonPressed,
                        ]}>
                        <ExpoImage alt="" source={option.icon} contentFit="contain" style={styles.searchSportChipIcon} />
                        <Text style={[styles.searchSportChipText, active && styles.searchSportChipTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <ScrollView
                  ref={searchResultsRef}
                  onScroll={syncActiveResultSport}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  style={styles.searchResultsScroll}
                  contentContainerStyle={styles.searchResultsContent}>
                  {searchSportOrder.map((sport, index) => (
                    <View
                      key={sport}
                      onLayout={(event) => captureSearchSection(sport, event)}
                      style={[styles.searchResultSection, index < searchSportOrder.length - 1 && styles.searchResultSectionDivider]}>
                      <Text style={styles.searchResultSectionTitle}>{sport === 'badminton' ? '배드민턴장' : '테니스장'}</Text>
                      {groupedResults[sport].length > 0 ? groupedResults[sport].map((court) => (
                        <Pressable
                          key={court.id}
                          onPress={() => selectCourt(court)}
                          style={({ pressed }) => [styles.searchResultRow, pressed && styles.searchResultRowPressed]}>
                          <Text numberOfLines={2} style={styles.searchResultName}>{court.basic_court_name || '이름 없는 체육시설'}</Text>
                          <Text numberOfLines={1} style={styles.searchResultRegion}>
                            {[court.basic_region, court.basic_city].filter(Boolean).join(' ') || court.basic_address || '지역 정보 없음'}
                          </Text>
                        </Pressable>
                      )) : <Text style={styles.searchResultSectionEmpty}>검색 결과가 없습니다.</Text>}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function FilterModal({
  sportType,
  visible,
  value,
  options,
  onClose,
  onApply,
}: {
  sportType: AppSportType;
  visible: boolean;
  value: CourtListFilters;
  options: CourtFilterOptions;
  onClose: () => void;
  onApply: (value: CourtListFilters) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CourtListFilters>(value);
  const [openSelect, setOpenSelect] = useState<'region' | 'city' | null>(null);
  const [priceInfoOpen, setPriceInfoOpen] = useState(false);
  const cities = draft.region ? options.citiesByRegion[draft.region] ?? [] : [];
  const priceRange = draft.priceRange ?? DEFAULT_PRICE_RANGE;
  const courtTypeOptions = sportType === 'badminton' ? badmintonCourtTypeOptions : tennisCourtTypeOptions;

  const applyMyRegion = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('로그인이 필요합니다', '내 지역을 적용하려면 먼저 로그인해 주세요.');
      return;
    }
    const profiles = supabase.from('profiles');
    const { data } = await profiles.select('home_region,home_city').eq('id', user.id).maybeSingle();
    const region = (data as { home_region?: string | null } | null)?.home_region?.trim();
    const city = (data as { home_city?: string | null } | null)?.home_city?.trim();
    if (!region) {
      Alert.alert('내 지역을 설정해 주세요', '마이페이지의 프로필 정보에서 내 지역을 먼저 설정해 주세요.');
      return;
    }
    if (!options.regions.includes(region)) {
      Alert.alert('적용할 수 없는 지역입니다', `현재 코트 목록에서 '${region}' 지역을 찾지 못했습니다.`);
      return;
    }
    const availableCities = options.citiesByRegion[region] ?? [];
    setDraft((current) => ({
      ...current,
      region,
      city: city && availableCities.includes(city) ? city : undefined,
    }));
    setOpenSelect(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>필터</Text><Pressable onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
        <ScrollView contentContainerStyle={[styles.filterContent, { paddingBottom: 110 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <FilterSection title="지역" action={<Pressable onPress={() => void applyMyRegion()} style={styles.myRegionButton}><Text style={styles.myRegionText}>내 지역 적용</Text></Pressable>}>
            <SelectField
              label={draft.region || '시/도 전체'}
              open={openSelect === 'region'}
              onPress={() => setOpenSelect((current) => current === 'region' ? null : 'region')}
              options={['', ...options.regions]}
              renderLabel={(item) => item || '시/도 전체'}
              selected={draft.region ?? ''}
              onSelect={(region) => { setDraft((current) => ({ ...current, region: region || undefined, city: undefined })); setOpenSelect(null); }}
            />
            <SelectField
              label={draft.city || '시/군/구 전체'}
              open={openSelect === 'city'}
              disabled={!draft.region}
              onPress={() => draft.region && setOpenSelect((current) => current === 'city' ? null : 'city')}
              options={['', ...cities]}
              renderLabel={(item) => item || '시/군/구 전체'}
              selected={draft.city ?? ''}
              onSelect={(city) => { setDraft((current) => ({ ...current, city: city || undefined })); setOpenSelect(null); }}
            />
          </FilterSection>
          <FilterSection title={sportType === 'badminton' ? '바닥 종류' : '코트 종류'}><View style={styles.checkList}>{courtTypeOptions.map((option) => <CheckChip key={option.key} label={option.label} selected={draft.courtTypes?.includes(option.key) ?? false} onPress={() => setDraft((current) => ({ ...current, courtTypes: toggle(current.courtTypes ?? [], option.key) }))} />)}</View></FilterSection>
          <FilterSection title="실내/실외"><View style={styles.checkList}>{environmentOptions.map((option) => <CheckChip key={option.key} label={option.label} selected={draft.courtEnvironments?.includes(option.key) ?? false} onPress={() => setDraft((current) => ({ ...current, courtEnvironments: toggle(current.courtEnvironments ?? [], option.key) }))} />)}</View></FilterSection>
          <FilterSection
            title="이용금액"
            titleAccessory={(
              <View style={styles.priceHelpAnchor}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이용금액 필터 기준 안내"
                  accessibilityState={{ expanded: priceInfoOpen }}
                  hitSlop={8}
                  onPress={() => setPriceInfoOpen((open) => !open)}
                  style={styles.priceHelpButton}>
                  <Text style={styles.priceHelpText}>?</Text>
                </Pressable>
                {priceInfoOpen ? (
                  <View accessibilityRole="text" style={styles.priceTooltip}>
                    <Text style={styles.priceTooltipText}>이용금액은 1시간 기준으로 필터링 됩니다</Text>
                    <View style={styles.priceTooltipArrow} />
                  </View>
                ) : null}
              </View>
            )}>
            <View style={styles.checkList}>
              {feeTypeOptions.map((option) => (
                <CheckChip
                  key={option.key}
                  label={option.label}
                  selected={draft.feeTypes?.includes(option.key) ?? false}
                  onPress={() => setDraft((current) => ({
                    ...current,
                    feeTypes: toggle(current.feeTypes ?? [], option.key),
                  }))}
                />
              ))}
            </View>
            {draft.feeTypes?.includes('paid') ? (
              <PriceRangeSlider
                value={priceRange}
                onChange={(nextRange) => setDraft((current) => ({ ...current, priceRange: nextRange }))}
                onReset={() => setDraft((current) => ({ ...current, priceRange: DEFAULT_PRICE_RANGE }))}
              />
            ) : null}
          </FilterSection>
          <FilterSection title="운영 구분"><View style={styles.checkList}>{ownerOptions.map((option) => <CheckChip key={option} label={option} selected={draft.ownerTypes?.includes(option) ?? false} onPress={() => setDraft((current) => ({ ...current, ownerTypes: toggle(current.ownerTypes ?? [], option) }))} />)}</View></FilterSection>
          <Pressable onPress={() => setDraft({})} style={styles.filterReset}><Text style={styles.filterResetText}>필터 초기화</Text></Pressable>
        </ScrollView>
        <View style={[styles.filterFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable onPress={() => onApply(draft)} style={styles.applyButton}><Text style={styles.applyText}>확인</Text></Pressable></View>
      </SafeAreaView>
    </Modal>
  );
}

function FilterSection({ title, titleAccessory, action, children }: { title: string; titleAccessory?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) { return <View style={styles.filterSection}><View style={styles.filterSectionHeader}><View style={styles.filterSectionTitleRow}><Text style={styles.filterSectionTitle}>{title}</Text>{titleAccessory}</View>{action}</View>{children}</View>; }
function SelectField({ label, open, disabled = false, onPress, options, renderLabel, selected, onSelect }: { label: string; open: boolean; disabled?: boolean; onPress: () => void; options: string[]; renderLabel: (value: string) => string; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.selectGroup}>
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.selectField, disabled && styles.selectFieldDisabled, pressed && !disabled && styles.selectFieldPressed]}>
      <Text style={[styles.selectFieldText, disabled && styles.selectFieldTextDisabled]}>{label}</Text><Text style={styles.selectChevron}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    {open ? <View style={styles.selectOptions}><ScrollView nestedScrollEnabled style={styles.selectOptionsScroll} keyboardShouldPersistTaps="handled">{options.map((option) => <Pressable key={option || 'all'} onPress={() => onSelect(option)} style={[styles.selectOption, selected === option && styles.selectOptionSelected]}><Text style={[styles.selectOptionText, selected === option && styles.selectOptionTextSelected]}>{renderLabel(option)}</Text></Pressable>)}</ScrollView></View> : null}
  </View>;
}
function CheckChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.checkChip}><View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <Text style={styles.checkmark}>✓</Text> : null}</View><Text style={styles.checkLabel}>{label}</Text></Pressable>; }

function PriceRangeHandle({
  type,
  value,
  range,
  trackWidth,
  onChange,
}: {
  type: 'minimum' | 'maximum';
  value: number;
  range: [number, number];
  trackWidth: number;
  onChange: (range: [number, number]) => void;
}) {
  const updateValue = useCallback((nextValue: number) => {
    const [minimum, maximum] = range;
    if (type === 'minimum') onChange([Math.min(nextValue, maximum), maximum]);
    else onChange([minimum, Math.max(nextValue, minimum)]);
  }, [onChange, range, type]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_event, gesture) => {
      if (trackWidth <= 0) return;
      const nextPercentage = priceToPercentage(value) + (gesture.dx / trackWidth) * 100;
      updateValue(percentageToPrice(nextPercentage));
    },
  }), [trackWidth, updateValue, value]);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={type === 'minimum' ? '최소 이용요금' : '최대 이용요금'}
      accessibilityValue={{
        min: PRICE_RANGE_MIN,
        max: PRICE_RANGE_MAX,
        now: value,
        text: formatKoreanPrice(value),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const delta = event.nativeEvent.actionName === 'increment' ? PRICE_RANGE_STEP : -PRICE_RANGE_STEP;
        updateValue(Math.max(PRICE_RANGE_MIN, Math.min(PRICE_RANGE_MAX, value + delta)));
      }}
      style={[styles.priceHandleHitArea, { left: `${priceToPercentage(value)}%` }]}
      {...panResponder.panHandlers}>
      <View style={styles.priceHandle} />
    </View>
  );
}

function PriceRangeSlider({ value, onChange, onReset }: { value: [number, number]; onChange: (range: [number, number]) => void; onReset: () => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [minimum, maximum] = value;
  const start = priceToPercentage(minimum);
  const end = priceToPercentage(maximum);

  return (
    <View style={styles.priceSlider}>
      <View style={styles.priceSliderHeader}>
        <Text style={styles.priceRangeText}>{formatPriceRange(value)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="가격 범위 초기화" onPress={onReset} style={styles.priceResetButton}>
          <ExpoImage alt="" source={resetIcon} contentFit="contain" style={styles.priceResetIcon} />
        </Pressable>
      </View>
      <View style={styles.priceTrackInset}>
        <Pressable
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onPress={(event) => {
            if (trackWidth <= 0) return;
            const nextPrice = percentageToPrice((event.nativeEvent.locationX / trackWidth) * 100);
            if (Math.abs(nextPrice - minimum) <= Math.abs(nextPrice - maximum)) {
              onChange([Math.min(nextPrice, maximum), maximum]);
            } else {
              onChange([minimum, Math.max(nextPrice, minimum)]);
            }
          }}
          style={styles.priceTrackTouchArea}>
          <View style={styles.priceTrack}>
            <View style={[styles.priceTrackActive, { left: `${start}%`, width: `${Math.max(0, end - start)}%` }]} />
          </View>
          <PriceRangeHandle type="minimum" value={minimum} range={value} trackWidth={trackWidth} onChange={onChange} />
          <PriceRangeHandle type="maximum" value={maximum} range={value} trackWidth={trackWidth} onChange={onChange} />
        </Pressable>
        <View style={styles.priceMarks}>
          {PRICE_RANGE_MARKS.map((mark, index) => (
            <Text
              key={mark.value}
              style={[
                styles.priceMark,
                { left: `${(index / (PRICE_RANGE_MARKS.length - 1)) * 100}%` },
                index === 0 && styles.priceMarkFirst,
                index === PRICE_RANGE_MARKS.length - 1 && styles.priceMarkLast,
              ]}>
              {mark.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  homeHeader: { height: 80, paddingTop: 8, paddingLeft: 16, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF' },
  homeSearchButton: { flex: 1, height: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 25, backgroundColor: '#FFFFFF', boxShadow: '0 0 15px rgba(0, 0, 0, 0.18)' },
  homeSearchButtonPressed: { backgroundColor: '#F7F7F7' },
  homeSearchIcon: { width: 20, height: 20 },
  homeSearchText: { color: '#202020', fontSize: 16, lineHeight: 22, letterSpacing: -0.32, fontFamily: 'Pretendard-Medium', includeFontPadding: false },
  sportSelector: { flexGrow: 0, height: 76, backgroundColor: '#FFFFFF' },
  sportSelectorContent: { minWidth: '100%', height: 76, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 14 },
  sportOption: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sportIcon: { width: 24, height: 24 },
  sportLabel: { fontSize: 22, lineHeight: 30, letterSpacing: -0.44, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  sportLabelActive: { color: '#3A3A3A' },
  sportLabelInactive: { color: '#C2C2C2' },
  toolbar: { height: 68, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  sorts: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortButton: { height: 32, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#D8D8D8', borderRadius: 8, backgroundColor: '#FFFFFF' },
  sortButtonActive: { borderColor: '#1A1A1A', backgroundColor: '#1A1A1A' },
  sortIcon: { width: 16, height: 16 },
  sortText: { color: '#626262', fontSize: 14, lineHeight: 20, letterSpacing: -0.28, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  sortActive: { color: '#FFFFFF' },
  viewIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewIcon: { width: 32, height: 32 },
  list: { backgroundColor: '#FFFFFF' },
  countRow: { minHeight: 42, marginBottom: 12, paddingHorizontal: 16, paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  courtRow: { paddingHorizontal: 16 },
  stateRow: { minHeight: 420, paddingHorizontal: 16 },
  count: { color: '#949494', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  countStrong: { fontFamily: 'Pretendard-Regular' },
  state: { flex: 1, minHeight: 300, paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: '#777777', fontSize: 15, textAlign: 'center' },
  resetButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 11, borderWidth: 1, borderColor: '#D8D8D8', borderRadius: 8 },
  resetText: { color: '#303030', fontFamily: 'Pretendard-SemiBold' },
  moreLoader: { alignSelf: 'center', marginVertical: 22 },
  filterButton: { position: 'absolute', alignSelf: 'center', width: 100, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 22, backgroundColor: '#1A1A1A', boxShadow: '0 1px 10px rgba(0, 0, 0, 0.10)' },
  filterIcon: { width: 20, height: 20 },
  filterText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-Medium', includeFontPadding: false },
  topButtonWrap: { position: 'absolute', right: 16, width: 44, height: 44 },
  topButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topIcon: { width: 44, height: 44 },
  buttonPressed: { opacity: 0.72 },
  modalSafe: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { height: 60, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  modalTitle: { flex: 1, color: '#202020', fontSize: 20, lineHeight: 28, fontFamily: 'Pretendard-Bold' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#202020', fontSize: 38, lineHeight: 40, fontFamily: 'Pretendard-Light' },
  searchModalSafe: { flex: 1, backgroundColor: '#FFFFFF' },
  searchModalHeader: { height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECECEC' },
  searchModalTitle: { color: '#282828', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  searchCloseButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  searchCloseIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  searchCloseLine: { position: 'absolute', width: 17, height: 2, borderRadius: 1, backgroundColor: '#777777' },
  searchCloseLineForward: { transform: [{ rotate: '45deg' }] },
  searchCloseLineBackward: { transform: [{ rotate: '-45deg' }] },
  searchModalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  searchInputWrap: { height: 42, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D8D8D8', borderRadius: 21, backgroundColor: '#F7F7F7' },
  searchInputIcon: { width: 18, height: 18, tintColor: '#777777' },
  searchInput: { flex: 1, height: 42, paddingVertical: 0, color: '#282828', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  searchResults: { flex: 1, minHeight: 0, marginTop: 16 },
  searchResultsCard: { flex: 1, minHeight: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#DEDEDE', borderRadius: 12, backgroundColor: '#FFFFFF' },
  searchSportChips: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#E5E5E5', backgroundColor: '#FAFAFA' },
  searchSportChipsContent: { paddingHorizontal: 12, paddingVertical: 16, gap: 8 },
  searchSportChip: { height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E3E3E3', borderRadius: 20, backgroundColor: '#FFFFFF' },
  searchSportChipTennis: { borderColor: '#30C27C', backgroundColor: '#30C27C' },
  searchSportChipBadminton: { borderColor: '#375AE6', backgroundColor: '#375AE6' },
  searchSportChipIcon: { width: 22, height: 22 },
  searchSportChipText: { color: '#1A1A1A', fontSize: 15, lineHeight: 20, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  searchSportChipTextActive: { color: '#FFFFFF' },
  searchResultsScroll: { flex: 1, minHeight: 0 },
  searchResultsContent: { paddingHorizontal: 12 },
  searchLoading: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  searchEmptyText: { marginTop: 16, color: '#777777', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Regular' },
  searchResultSection: { paddingVertical: 18 },
  searchResultSectionDivider: { borderBottomWidth: 1, borderBottomColor: '#D8D8D8' },
  searchResultSectionTitle: { marginBottom: 8, color: '#777777', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  searchResultSectionEmpty: { paddingVertical: 8, color: '#A0A0A0', fontSize: 12, lineHeight: 17, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  searchResultRow: { minHeight: 61, marginHorizontal: -8, paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center', gap: 3, borderRadius: 6 },
  searchResultRowPressed: { backgroundColor: '#F4F4F4' },
  searchResultName: { color: '#282828', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Medium', includeFontPadding: false },
  searchResultRegion: { color: '#777777', fontSize: 12, lineHeight: 17, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  filterContent: { paddingHorizontal: 24, paddingTop: 4 },
  filterSection: { marginTop: 24 },
  filterSectionHeader: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterSectionTitle: { color: '#202020', fontSize: 18, lineHeight: 25, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  myRegionButton: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#84DAB0', borderRadius: 6 },
  myRegionText: { color: '#20A866', fontSize: 12, fontFamily: 'Pretendard-SemiBold' },
  selectGroup: { marginBottom: 8 },
  selectField: { height: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D8DADD', borderRadius: 6, backgroundColor: '#FFFFFF' },
  selectFieldDisabled: { opacity: 0.5, backgroundColor: '#F4F4F4' },
  selectFieldPressed: { backgroundColor: '#F7F7F7' },
  selectFieldText: { flex: 1, color: '#606060', fontSize: 14, fontFamily: 'Pretendard-Regular' },
  selectFieldTextDisabled: { color: '#A0A0A0' },
  selectChevron: { marginLeft: 8, color: '#777777', fontSize: 16 },
  selectOptions: { maxHeight: 190, marginTop: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#D8DADD', borderRadius: 6, backgroundColor: '#FFFFFF' },
  selectOptionsScroll: { maxHeight: 190 },
  selectOption: { minHeight: 42, paddingHorizontal: 12, justifyContent: 'center' },
  selectOptionSelected: { backgroundColor: '#ECF9F2' },
  selectOptionText: { color: '#606060', fontSize: 14, fontFamily: 'Pretendard-Regular' },
  selectOptionTextSelected: { color: '#20A866', fontFamily: 'Pretendard-SemiBold' },
  checkList: { gap: 4 },
  checkChip: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#52525B', borderRadius: 2 },
  checkboxSelected: { borderColor: '#303030', backgroundColor: '#303030' },
  checkmark: { color: '#FFFFFF', fontSize: 11, lineHeight: 12, fontFamily: 'Pretendard-Bold' },
  checkLabel: { color: '#303030', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Regular' },
  priceHelpAnchor: { position: 'relative', zIndex: 20 },
  priceHelpButton: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#737982', borderRadius: 9 },
  priceHelpText: { color: '#737982', fontSize: 11, lineHeight: 14, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  priceTooltip: { position: 'absolute', left: -92, bottom: 28, width: 264, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: '#2C2C2C', zIndex: 40, elevation: 8, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)' },
  priceTooltipText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, textAlign: 'center', fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  priceTooltipArrow: { position: 'absolute', bottom: -7, left: 96, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2C2C2C' },
  priceSlider: { marginTop: 18 },
  priceSliderHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceRangeText: { flexShrink: 1, color: '#303030', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  priceResetButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#303030', borderRadius: 16 },
  priceResetIcon: { width: 12, height: 12 },
  priceTrackInset: { marginHorizontal: 24, marginTop: 8 },
  priceTrackTouchArea: { position: 'relative', height: 44, justifyContent: 'center' },
  priceTrack: { height: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: '#CACACA' },
  priceTrackActive: { position: 'absolute', top: 0, bottom: 0, borderRadius: 2, backgroundColor: '#303030' },
  priceHandleHitArea: { position: 'absolute', top: 0, width: 44, height: 44, marginLeft: -22, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  priceHandle: { width: 24, height: 24, borderWidth: 1, borderColor: '#303030', borderRadius: 12, backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)' },
  priceMarks: { position: 'relative', height: 22, marginTop: 1 },
  priceMark: { position: 'absolute', width: 48, marginLeft: -24, color: '#606060', fontSize: 11, lineHeight: 16, textAlign: 'center', fontFamily: 'Pretendard-Medium', includeFontPadding: false },
  priceMarkFirst: { marginLeft: 0, textAlign: 'left' },
  priceMarkLast: { marginLeft: -48, textAlign: 'right' },
  filterReset: { height: 42, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D8D8D8', borderRadius: 4 },
  filterResetText: { color: '#303030', fontSize: 14, fontFamily: 'Pretendard-Medium' },
  filterFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ECECEC', backgroundColor: '#FFFFFF' },
  applyButton: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#2F9461' },
  applyText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard-Medium' },
});
