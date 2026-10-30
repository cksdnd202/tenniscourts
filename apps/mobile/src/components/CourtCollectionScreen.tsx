import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CourtCard } from '@/components/CourtCard';
import { NavigationArrow } from '@/components/NavigationArrow';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { getAppErrorCopy, type AppErrorCopy } from '@/lib/appError';
import {
  fetchAppCourtsByIds,
  fetchFavoriteCourtIds,
  fetchRecentCourtIds,
  setCourtFavorite,
  type AppCourt,
} from '@/lib/courtData';
import { useMountedRef } from '@/lib/useMountedRef';

export function CourtCollectionScreen({ type }: { type: 'favorites' | 'recent' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const loadIdRef = useRef(0);
  const [courts, setCourts] = useState<AppCourt[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppErrorCopy | null>(null);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true); setError(null);
    try {
      const [ids, favorites] = await Promise.all([
        type === 'favorites' ? fetchFavoriteCourtIds() : fetchRecentCourtIds(),
        fetchFavoriteCourtIds(),
      ]);
      const nextCourts = await fetchAppCourtsByIds(ids);
      if (!mountedRef.current || loadId !== loadIdRef.current) return;
      setCourts(nextCourts);
      setFavoriteIds(new Set(favorites));
    } catch (cause) {
      if (!mountedRef.current || loadId !== loadIdRef.current) return;
      setError(getAppErrorCopy(cause, '목록을 불러오지 못했습니다.'));
    } finally {
      if (mountedRef.current && loadId === loadIdRef.current) setLoading(false);
    }
  }, [mountedRef, type]);

  useEffect(() => {
    void load();
    return () => { loadIdRef.current += 1; };
  }, [load]);

  const toggleFavorite = async (court: AppCourt) => {
    const previous = favoriteIds.has(court.id);
    setFavoriteIds((current) => { const next = new Set(current); if (previous) next.delete(court.id); else next.add(court.id); return next; });
    if (type === 'favorites' && previous) setCourts((current) => current.filter((item) => item.id !== court.id));
    try { await setCourtFavorite(court.id, !previous); }
    catch (cause) {
      if (!mountedRef.current) return;
      Alert.alert('찜을 변경하지 못했습니다', cause instanceof Error ? cause.message : '다시 시도해 주세요.');
      void load();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <AppHeader title={type === 'favorites' ? '찜한 테니스장' : '최근 본 테니스장'} left={<Pressable onPress={() => router.back()} style={styles.back}><NavigationArrow direction="left" /></Pressable>} />
      {loading ? <LoadingState style={styles.center} /> : error ? <ErrorState description={error.description} onAction={() => void load()} style={styles.center} title={error.title} /> : (
        <FlatList
          data={courts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 20 }, courts.length === 0 && styles.emptyList]}
          renderItem={({ item }) => <CourtCard court={item} compact favorite={favoriteIds.has(item.id)} onToggleFavorite={toggleFavorite} />}
          ListEmptyComponent={<EmptyState
            actionLabel="테니스장 찾기"
            description={type === 'favorites' ? '마음에 드는 테니스장을 찜해 보세요.' : '테니스장 상세정보를 확인하면 여기에 표시됩니다.'}
            onAction={() => router.replace('/')}
            style={styles.center}
            title={type === 'favorites' ? '아직 찜한 테니스장이 없어요' : '아직 최근 본 테니스장이 없어요'}
          />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 18 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, minHeight: 300, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#777777', fontSize: 14, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 7, backgroundColor: '#303030' },
  retryText: { color: '#FFFFFF', fontFamily: 'Pretendard-Bold' },
  emptyTitle: { color: '#777777', fontSize: 15, textAlign: 'center' },
  findButton: { height: 46, marginTop: 22, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#2F9461' },
  findText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard-Bold' },
});
