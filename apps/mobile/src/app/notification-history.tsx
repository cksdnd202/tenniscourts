import { StatusBar } from 'expo-status-bar';
import { Image as ExpoImage } from 'expo-image';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  type ImageSourcePropType,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationArrow } from '@/components/NavigationArrow';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import courtNotificationIcon from '@/assets/images/notification-history/icon_notification_court.svg';
import noticeNotificationIcon from '@/assets/images/notification-history/icon_notification_noti.svg';
import inquiryNotificationIcon from '@/assets/images/notification-history/icon_notification_question.svg';
import { trackEvent } from '@/lib/analytics';
import {
  fetchNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotificationItem,
  type AppNotificationType,
} from '@/lib/notificationInbox';

const typeCopy: Record<AppNotificationType, { label: string; icon: ImageSourcePropType; color: string }> = {
  booking_open: { label: '예약 오픈', icon: courtNotificationIcon, color: '#1E835B' },
  notice: { label: '공지사항', icon: noticeNotificationIcon, color: '#696969' },
  inquiry_reply: { label: '문의 답변', icon: inquiryNotificationIcon, color: '#696969' },
};

function relativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '방금 전';
  if (diff < 60 * 60_000) return `${Math.max(1, Math.floor(diff / 60_000))}분 전`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}시간 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

export default function NotificationHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      setItems(await fetchNotificationInbox());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const unreadIds = useMemo(() => items.filter((item) => !item.read_at).map((item) => item.id), [items]);

  const openItem = async (item: AppNotificationItem) => {
    if (!item.read_at) {
      setItems((current) => current.map((value) => value.id === item.id
        ? { ...value, read_at: new Date().toISOString() }
        : value));
      try { await markNotificationRead(item.id); } catch { /* Navigation remains available offline. */ }
    }
    trackEvent('notification_inbox_item_clicked', { notification_type: item.type });
    router.push(item.path as Href);
  };

  const markAll = async () => {
    if (!unreadIds.length) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    try {
      await markAllNotificationsRead(unreadIds);
      trackEvent('notification_inbox_all_read', { count: unreadIds.length });
    } catch {
      Alert.alert('읽음 처리하지 못했습니다', '잠시 후 다시 시도해 주세요.');
      void load();
    }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={styles.header}>
      <Pressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.back}>
        <NavigationArrow direction="left" />
      </Pressable>
      <Text style={styles.headerTitle}>알림함</Text>
      <Pressable
        accessibilityRole="button"
        disabled={!unreadIds.length}
        onPress={() => void markAll()}
        style={styles.readAllButton}
      >
        <Text style={[styles.readAllText, !unreadIds.length && styles.readAllDisabled]}>모두 읽음</Text>
      </Pressable>
    </View>

    {loading ? <LoadingState style={styles.state} /> : error ? (
      <ErrorState
        title="알림을 불러오지 못했습니다"
        description="네트워크 연결을 확인하고 다시 시도해 주세요."
        onAction={() => void load()}
        style={styles.state}
      />
    ) : !items.length ? (
      <EmptyState
        title="아직 도착한 알림이 없어요"
        description="예약 오픈과 새로운 소식이 생기면 이곳에서 알려드릴게요."
        style={styles.state}
      />
    ) : (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#30C27C" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const copy = typeCopy[item.type];
          return <Pressable
            accessibilityRole="button"
            onPress={() => void openItem(item)}
            style={({ pressed }) => [styles.row, !item.read_at && styles.unreadRow, pressed && styles.pressed]}
          >
            <ExpoImage source={copy.icon} contentFit="contain" style={styles.typeIcon} />
            <View style={styles.copy}>
              <View style={styles.metaRow}>
                <Text style={[styles.typeLabel, { color: copy.color }]}>{copy.label}</Text>
                <Text style={styles.time}>{relativeTime(item.occurred_at)}</Text>
              </View>
              <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.body}>{item.body}</Text>
            </View>
          </Pressable>;
        }}
      />
    )}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  back: { width: 32, height: 40, justifyContent: 'center' },
  headerTitle: {
    marginLeft: 12, color: '#1A1A1A', fontSize: 22, lineHeight: 30,
    fontFamily: 'Pretendard-Bold',
  },
  readAllButton: { marginLeft: 'auto', height: 40, justifyContent: 'center', paddingLeft: 14 },
  readAllText: { color: '#1E835B', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-SemiBold' },
  readAllDisabled: { color: '#B4B8BD' },
  state: { flex: 1 },
  list: { paddingTop: 18, paddingBottom: 28 },
  row: {
    minHeight: 105, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24,
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, backgroundColor: '#FFFFFF',
  },
  unreadRow: { backgroundColor: '#F7FCF8' },
  pressed: { opacity: 0.62 },
  typeIcon: { width: 24, height: 24 },
  copy: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeLabel: { fontSize: 12, lineHeight: 18, fontFamily: 'Pretendard-SemiBold' },
  time: { color: '#949494', fontSize: 12, lineHeight: 18, fontFamily: 'Pretendard-Regular' },
  title: {
    marginTop: 4, color: '#1A1A1A', fontSize: 16, lineHeight: 24,
    fontFamily: 'Pretendard-Regular',
  },
  body: {
    marginTop: 3, color: '#8F8F8F', fontSize: 12, lineHeight: 16,
    fontFamily: 'Pretendard-Regular',
  },
});
