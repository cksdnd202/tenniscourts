import * as Notifications from 'expo-notifications';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_NAV_HEIGHT } from '@/components/AppBottomNav';
import { NotificationPermissionDialog } from '@/components/NotificationPermissionDialog';
import { NotificationInboxButton } from '@/components/NotificationInboxButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenState';
import { getAppErrorCopy, type AppErrorCopy } from '@/lib/appError';
import {
  fetchCurrentUserReminderMap,
  fetchNotificationCourts,
  countActiveReminders,
  getNotificationReminderRevision,
  getRuleScheduleLabel,
  getRuleTargetLabel,
  isNotificationLimitError,
  MAX_ACTIVE_REMINDERS,
  REMINDER_OPTIONS,
  saveRuleReminders,
  type NotificationBookingRule,
  type NotificationCourt,
  type ReminderMinutes,
} from '@/lib/courtNotifications';
import { savePushTokenForCurrentUser } from '@/lib/devicePushTokens';
import { signInWithKakao } from '@/lib/mobileAuth';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';

const reminderLabels: Record<ReminderMinutes, string> = { 1440: '1일 전', 10: '10분 전' };
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type RuleAgenda = {
  rule: NotificationBookingRule;
  opensAt: Date | null;
  reminders: number[];
};

type CourtAgenda = {
  court: NotificationCourt;
  opensAt: Date | null;
  rules: RuleAgenda[];
};

type AgendaSection = {
  dateKey: string;
  title: string;
  date: Date | null;
  data: CourtAgenda[];
};

const NOTIFICATION_CACHE_TTL_MS = 60_000;
let notificationScreenCache: {
  userId: string;
  courts: NotificationCourt[];
  reminders: Record<string, number[]>;
  fetchedAt: number;
  reminderRevision: number;
} | null = null;

type CalendarDay = {
  date: Date;
  key: string;
  year: number;
  month: number;
  day: number;
  weekday: string;
};

type CalendarPage = {
  key: string;
  days: Array<CalendarDay | null>;
};

function parseTime(value: string | null) {
  const [hour, minute] = (value ?? '').split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? { hour, minute } : null;
}

function seoulYmd(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

function dateKey(date: Date) {
  const { year, month, day } = seoulYmd(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function seoulDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

function addDays(year: number, month: number, day: number, count: number) {
  const value = seoulDate(year, month, day, 12, 0);
  value.setUTCDate(value.getUTCDate() + count);
  return seoulYmd(value);
}

function nextRuleOpenAt(rule: NotificationBookingRule, from = new Date()): Date | null {
  const time = parseTime(rule.open_time);
  if (!time) return null;
  const today = seoulYmd(from);

  if (rule.rule_type === 'rolling') {
    let candidate = seoulDate(today.year, today.month, today.day, time.hour, time.minute);
    if (candidate <= from) {
      const next = addDays(today.year, today.month, today.day, 1);
      candidate = seoulDate(next.year, next.month, next.day, time.hour, time.minute);
    }
    return candidate;
  }

  if (rule.rule_type === 'fixed_schedule' && rule.open_type === 'day' && rule.open_day_of_month) {
    for (let offset = 0; offset < 14; offset += 1) {
      const first = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
      const year = first.getUTCFullYear();
      const month = first.getUTCMonth() + 1;
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const day = rule.open_day_of_month === -1 ? last : Math.min(rule.open_day_of_month, last);
      const candidate = seoulDate(year, month, day, time.hour, time.minute);
      if (candidate > from) return candidate;
    }
  }

  if (rule.rule_type === 'fixed_schedule' && rule.open_type === 'week' && rule.open_day_of_week) {
    const wanted = rule.open_day_of_week === 7 ? 0 : rule.open_day_of_week;
    if (!rule.open_ordinal) {
      const current = seoulDate(today.year, today.month, today.day, 12, 0).getUTCDay();
      let delta = (wanted - current + 7) % 7;
      let next = addDays(today.year, today.month, today.day, delta);
      let candidate = seoulDate(next.year, next.month, next.day, time.hour, time.minute);
      if (candidate <= from) {
        delta += 7;
        next = addDays(today.year, today.month, today.day, delta);
        candidate = seoulDate(next.year, next.month, next.day, time.hour, time.minute);
      }
      return candidate;
    }

    for (let offset = 0; offset < 14; offset += 1) {
      const first = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
      const year = first.getUTCFullYear();
      const month = first.getUTCMonth() + 1;
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const days = Array.from({ length: last }, (_, index) => index + 1)
        .filter((day) => seoulDate(year, month, day, 12, 0).getUTCDay() === wanted);
      const day = rule.open_ordinal === -1 ? days.at(-1) : days[rule.open_ordinal - 1];
      if (day) {
        const candidate = seoulDate(year, month, day, time.hour, time.minute);
        if (candidate > from) return candidate;
      }
    }
  }

  if (rule.rule_type === 'interval_weekly' && rule.open_day_of_week) {
    const wanted = rule.open_day_of_week === 7 ? 0 : rule.open_day_of_week;
    const interval = Math.max(1, rule.interval_weeks ?? 1);
    const anchor = rule.anchor_date ? new Date(`${rule.anchor_date.slice(0, 10)}T00:00:00+09:00`) : null;
    for (let delta = 0; delta < 370; delta += 1) {
      const ymd = addDays(today.year, today.month, today.day, delta);
      if (seoulDate(ymd.year, ymd.month, ymd.day, 12, 0).getUTCDay() !== wanted) continue;
      const candidate = seoulDate(ymd.year, ymd.month, ymd.day, time.hour, time.minute);
      if (candidate <= from) continue;
      if (!anchor || interval === 1) return candidate;
      const weeks = Math.floor((candidate.getTime() - anchor.getTime()) / (7 * DAY_MS));
      if (weeks >= 0 && weeks % interval === 0) return candidate;
    }
  }

  if (rule.rule_type === 'monthly_relative') {
    const offset = Number(rule.open_offset);
    if (!Number.isFinite(offset)) return null;
    for (let monthOffset = 1; monthOffset < 14; monthOffset += 1) {
      const month = new Date(Date.UTC(today.year, today.month - 1 + monthOffset, 1));
      const candidate = seoulDate(month.getUTCFullYear(), month.getUTCMonth() + 1, 1, time.hour, time.minute);
      candidate.setUTCDate(candidate.getUTCDate() - offset);
      if (candidate > from) return candidate;
    }
  }

  return null;
}

function relativeDayLabel(date: Date) {
  const now = seoulYmd(new Date());
  const target = seoulYmd(date);
  const days = Math.round(
    (Date.UTC(target.year, target.month - 1, target.day) - Date.UTC(now.year, now.month - 1, now.day)) / DAY_MS
  );
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  return `D-${days}`;
}

function sectionTitle(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long',
  }).format(date);
}

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function BrandHeader({ onSearch }: { onSearch: () => void }) {
  return <View style={styles.brandHeader}>
    <Text style={styles.headerTitle}>오픈 알림</Text>
    <View style={styles.headerActions}>
      <Pressable accessibilityLabel="테니스장 검색" onPress={onSearch} style={styles.headerIconButton}>
        <Image
          source={require('../../assets/images/header/icon_search_dark.png')}
          resizeMode="contain"
          style={styles.searchIcon}
        />
      </Pressable>
      <NotificationInboxButton />
    </View>
  </View>;
}

function TennisMarker() {
  return <Image
    source={require('@/assets/images/tennis-ball-marker.png')}
    accessibilityLabel="테니스장"
    resizeMode="contain"
    style={styles.tennisMarker}
  />;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const listRef = useRef<SectionList<CourtAgenda, AgendaSection> | null>(null);
  const calendarRef = useRef<FlatList<CalendarPage> | null>(null);
  const loadIdRef = useRef(0);
  const [courts, setCourts] = useState<NotificationCourt[]>([]);
  const [reminders, setReminders] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCourt, setSavingCourt] = useState(false);
  const [error, setError] = useState<AppErrorCopy | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [editingCourt, setEditingCourt] = useState<NotificationCourt | null>(null);
  const [draftReminders, setDraftReminders] = useState<Record<string, ReminderMinutes[]>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
  const [calendarPageIndex, setCalendarPageIndex] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey(new Date()));

  const load = useCallback(async (refresh = false) => {
    const loadId = ++loadIdRef.current;
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const [permissionResult, { data: { session } }] = await Promise.all([
        Notifications.getPermissionsAsync(),
        supabase.auth.getSession(),
      ]);
      const nextPermissionGranted = permissionResult.granted;
      if (loadId !== loadIdRef.current) return;
      setPermissionGranted(nextPermissionGranted);
      if (!session) {
        setNeedsLogin(true);
        setCourts([]);
        setReminders({});
        notificationScreenCache = null;
        return;
      }
      setNeedsLogin(false);

      const cached = notificationScreenCache?.userId === session.user.id
        ? notificationScreenCache
        : null;
      if (cached && !refresh) {
        setCourts(cached.courts);
        setReminders(cached.reminders);
        setLoading(false);
        if (
          cached.reminderRevision === getNotificationReminderRevision() &&
          Date.now() - cached.fetchedAt < NOTIFICATION_CACHE_TTL_MS
        ) return;
      } else if (!cached) {
        setLoading(true);
      }

      const nextReminders = await fetchCurrentUserReminderMap();
      if (loadId !== loadIdRef.current) return;
      const activeIds = Object.entries(nextReminders)
        .filter(([, values]) => values.length > 0)
        .map(([id]) => id);
      setReminders(nextReminders);
      if (!activeIds.length) {
        setCourts([]);
        notificationScreenCache = {
          userId: session.user.id,
          courts: [],
          reminders: nextReminders,
          fetchedAt: Date.now(),
          reminderRevision: getNotificationReminderRevision(),
        };
        return;
      }
      const nextCourts = await fetchNotificationCourts(activeIds);
      if (loadId !== loadIdRef.current) return;
      setCourts(nextCourts);
      notificationScreenCache = {
        userId: session.user.id,
        courts: nextCourts,
        reminders: nextReminders,
        fetchedAt: Date.now(),
        reminderRevision: getNotificationReminderRevision(),
      };
    } catch (cause) {
      if (loadId !== loadIdRef.current) return;
      setError(getAppErrorCopy(cause, '알림 신청 내역을 불러오지 못했습니다.'));
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { loadIdRef.current += 1; };
  }, [load]));

  const sections = useMemo<AgendaSection[]>(() => {
    const now = new Date();
    const dated = new Map<string, { date: Date; courts: Map<string, CourtAgenda> }>();
    const unknown = new Map<string, CourtAgenda>();

    for (const court of courts) {
      for (const rule of court.rules) {
        const activeReminders = reminders[rule.id] ?? [];
        if (!activeReminders.length) continue;
        const opensAt = nextRuleOpenAt(rule, now);
        const agendaRule: RuleAgenda = { rule, opensAt, reminders: activeReminders };

        if (!opensAt) {
          const existing = unknown.get(court.id) ?? { court, opensAt: null, rules: [] };
          existing.rules.push(agendaRule);
          unknown.set(court.id, existing);
          continue;
        }

        const key = dateKey(opensAt);
        const dateGroup = dated.get(key) ?? { date: opensAt, courts: new Map<string, CourtAgenda>() };
        const courtGroup = dateGroup.courts.get(court.id) ?? { court, opensAt, rules: [] };
        courtGroup.rules.push(agendaRule);
        if (!courtGroup.opensAt || opensAt < courtGroup.opensAt) courtGroup.opensAt = opensAt;
        dateGroup.courts.set(court.id, courtGroup);
        dated.set(key, dateGroup);
      }
    }

    const result: AgendaSection[] = [...dated.entries()]
      .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
      .map(([key, group]) => ({
        dateKey: key,
        title: sectionTitle(group.date),
        date: group.date,
        data: [...group.courts.values()].sort(
          (a, b) => (a.opensAt?.getTime() ?? 0) - (b.opensAt?.getTime() ?? 0)
        ),
      }));

    if (unknown.size) {
      result.push({ dateKey: 'unknown', title: '일정 확인 필요', date: null, data: [...unknown.values()] });
    }
    return result;
  }, [courts, reminders]);

  const eventDateKeys = useMemo(
    () => new Set(sections.filter((section) => section.date).map((section) => section.dateKey)),
    [sections]
  );

  const calendarPages = useMemo<CalendarPage[]>(() => {
    const today = seoulYmd(new Date());
    const monthAfterNext = new Date(Date.UTC(today.year, today.month + 2, 1));
    const rangeEnd = new Date(monthAfterNext.getTime() - DAY_MS);
    const rangeEndYmd = {
      year: rangeEnd.getUTCFullYear(),
      month: rangeEnd.getUTCMonth() + 1,
      day: rangeEnd.getUTCDate(),
    };
    const dayCount = Math.round(
      (Date.UTC(rangeEndYmd.year, rangeEndYmd.month - 1, rangeEndYmd.day)
        - Date.UTC(today.year, today.month - 1, today.day)) / DAY_MS
    ) + 1;
    const days: CalendarDay[] = Array.from({ length: dayCount }, (_, index) => {
      const ymd = addDays(today.year, today.month, today.day, index);
      const date = seoulDate(ymd.year, ymd.month, ymd.day, 12, 0);
      return {
        date,
        key: dateKey(date),
        year: ymd.year,
        month: ymd.month,
        day: ymd.day,
        weekday: WEEKDAYS[date.getUTCDay()],
      };
    });
    return Array.from({ length: Math.ceil(days.length / 7) }, (_, pageIndex) => {
      const pageDays: Array<CalendarDay | null> = days.slice(pageIndex * 7, pageIndex * 7 + 7);
      while (pageDays.length < 7) pageDays.push(null);
      return { key: `calendar-page-${pageIndex}`, days: pageDays };
    });
  }, []);

  const calendarPageWidth = Math.max(1, windowWidth - 24);

  const login = async () => {
    try {
      const session = await signInWithKakao();
      if (session && mountedRef.current) await load();
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('로그인하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    }
  };

  const openEditor = (court: NotificationCourt) => {
    setPermissionPromptVisible(false);
    setEditingCourt(court);
    setDraftReminders(Object.fromEntries(court.rules.map((rule) => [
      rule.id,
      (reminders[rule.id] ?? []).filter(
        (value): value is ReminderMinutes => REMINDER_OPTIONS.includes(value as ReminderMinutes)
      ),
    ])));
  };

  const toggleDraft = (ruleId: string, minutes: ReminderMinutes) => {
    setDraftReminders((previous) => {
      const values = previous[ruleId] ?? [];
      return {
        ...previous,
        [ruleId]: values.includes(minutes)
          ? values.filter((value) => value !== minutes)
          : [...values, minutes],
      };
    });
  };

  const persistEditor = async () => {
    if (!editingCourt || savingCourt) return;
    const nextReminderMap = { ...reminders, ...draftReminders };
    const nextCount = countActiveReminders(nextReminderMap);

    if (nextCount > MAX_ACTIVE_REMINDERS) {
      Alert.alert(
        `예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`,
        '기존 알림을 해제한 뒤 다시 설정해 주세요.'
      );
      return;
    }

    setSavingCourt(true);
    try {
      const token = await registerForPushNotifications();
      await savePushTokenForCurrentUser(token);

      // 먼저 해제되는 알림을 저장해야 현재 30개인 사용자가
      // 다른 규칙으로 알림을 옮길 때 일시적으로 한도를 넘지 않는다.
      const rulesInSaveOrder = [...editingCourt.rules].sort((left, right) => {
        const leftDelta = (draftReminders[left.id] ?? []).length - (reminders[left.id] ?? []).length;
        const rightDelta = (draftReminders[right.id] ?? []).length - (reminders[right.id] ?? []).length;
        return leftDelta - rightDelta;
      });

      for (const rule of rulesInSaveOrder) {
        await saveRuleReminders(rule.id, draftReminders[rule.id] ?? []);
      }
      if (!mountedRef.current) return;
      setReminders((previous) => ({ ...previous, ...draftReminders }));
      if (!editingCourt.rules.some((rule) => (draftReminders[rule.id] ?? []).length)) {
        setCourts((previous) => previous.filter((court) => court.id !== editingCourt.id));
      }
      setEditingCourt(null);
      notificationScreenCache = null;
    } catch (cause) {
      if (!mountedRef.current) return;
      if (isNotificationLimitError(cause)) {
        Alert.alert(
          `예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`,
          '기존 알림을 해제한 뒤 다시 설정해 주세요.'
        );
      } else {
        Alert.alert('알림을 저장하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setSavingCourt(false);
    }
  };

  const saveEditor = async () => {
    if (!editingCourt || savingCourt) return;
    const nextCount = countActiveReminders({ ...reminders, ...draftReminders });
    if (nextCount > MAX_ACTIVE_REMINDERS) {
      Alert.alert(
        `예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`,
        '기존 알림을 해제한 뒤 다시 설정해 주세요.'
      );
      return;
    }
    try {
      const permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted) {
        setPermissionPromptVisible(true);
        return;
      }
      await persistEditor();
    } catch (cause) {
      Alert.alert('알림 권한을 확인하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    }
  };

  const deleteEditor = async () => {
    if (!editingCourt || savingCourt) return;
    setSavingCourt(true);
    try {
      await Promise.all(editingCourt.rules.map((rule) => saveRuleReminders(rule.id, [])));
      if (!mountedRef.current) return;
      setReminders((previous) => ({
        ...previous,
        ...Object.fromEntries(editingCourt.rules.map((rule) => [rule.id, []])),
      }));
      setCourts((previous) => previous.filter((court) => court.id !== editingCourt.id));
      setConfirmingDelete(false);
      setEditingCourt(null);
      notificationScreenCache = null;
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('알림을 삭제하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setSavingCourt(false);
    }
  };

  const selectDate = (key: string) => {
    setSelectedDateKey(key);
    const sectionIndex = sections.findIndex((section) => section.dateKey === key);
    if (sectionIndex < 0) return;
    listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewPosition: 0, animated: true });
  };

  const selectedCalendarDay = useMemo(
    () => calendarPages.flatMap((page) => page.days).find((day) => day?.key === selectedDateKey) ?? null,
    [calendarPages, selectedDateKey]
  );

  const moveCalendarPage = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= calendarPages.length) return;
    const firstDay = calendarPages[nextIndex].days.find((day): day is CalendarDay => Boolean(day));
    setCalendarPageIndex(nextIndex);
    if (firstDay) selectDate(firstDay.key);
    calendarRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const settleCalendarPage = (offsetX: number) => {
    const nextIndex = Math.max(
      0,
      Math.min(calendarPages.length - 1, Math.round(offsetX / calendarPageWidth))
    );
    setCalendarPageIndex(nextIndex);
    const page = calendarPages[nextIndex];
    if (!page.days.some((day) => day?.key === selectedDateKey)) {
      const firstDay = page.days.find((day): day is CalendarDay => Boolean(day));
      if (firstDay) selectDate(firstDay.key);
    }
  };

  const todayKey = dateKey(new Date());
  const hasDraftReminder = Object.values(draftReminders).some((values) => values.length > 0);

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <StatusBar style="dark" />
    <BrandHeader
      onSearch={() => router.replace('/')}
    />

    {!needsLogin && !loading && sections.length > 0 ? <View style={styles.calendarWrap}>
      <View style={styles.calendarTop}>
        <Pressable
          accessibilityLabel="이전 날짜"
          disabled={calendarPageIndex === 0}
          onPress={() => moveCalendarPage(calendarPageIndex - 1)}
          style={[styles.weekArrow, calendarPageIndex === 0 && styles.weekArrowDisabled]}
        >
          <Image
            source={require('../../assets/images/calendar/icon_arrow_left.png')}
            style={styles.weekArrowIcon}
          />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit={false} style={styles.monthLabel}>
          {selectedCalendarDay ? `${selectedCalendarDay.year}년 ${selectedCalendarDay.month}월` : ''}
        </Text>
        <Pressable
          accessibilityLabel="다음 날짜"
          disabled={calendarPageIndex === calendarPages.length - 1}
          onPress={() => moveCalendarPage(calendarPageIndex + 1)}
          style={[
            styles.weekArrow,
            calendarPageIndex === calendarPages.length - 1 && styles.weekArrowDisabled,
          ]}
        >
          <Image
            source={require('../../assets/images/calendar/icon_arrow_right.png')}
            style={styles.weekArrowIcon}
          />
        </Pressable>
      </View>
      <FlatList
        ref={calendarRef}
        data={calendarPages}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        keyExtractor={(page) => page.key}
        getItemLayout={(_, index) => ({ length: calendarPageWidth, offset: calendarPageWidth * index, index })}
        onMomentumScrollEnd={(event) => settleCalendarPage(event.nativeEvent.contentOffset.x)}
        showsHorizontalScrollIndicator={false}
        style={styles.calendarPager}
        renderItem={({ item: page }) => <View style={[styles.weekRow, { width: calendarPageWidth }]}>
          {page.days.map((item, index) => {
            if (!item) return <View key={`empty-${index}`} style={styles.dayButton} />;
            const selected = item.key === selectedDateKey;
            const today = item.key === todayKey;
            const hasEvent = eventDateKeys.has(item.key);
            return <Pressable key={item.key} onPress={() => selectDate(item.key)} style={styles.dayButton}>
              <Text style={[styles.weekday, selected && styles.weekdaySelected]}>{item.weekday}</Text>
              <View style={[
                styles.dayCircle,
                selected && styles.dayCircleSelected,
                today && styles.dayCircleToday,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  selected && !today && styles.dayNumberSelected,
                  today && styles.dayNumberToday,
                ]}>{item.day}</Text>
              </View>
              <View style={[styles.eventDot, hasEvent && styles.eventDotVisible]} />
            </Pressable>;
          })}
        </View>}
      />
    </View> : null}

    <SectionList
      ref={listRef}
      sections={sections}
      keyExtractor={(item, index) => `${item.court.id}-${item.opensAt?.getTime() ?? 'unknown'}-${index}`}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 24 },
      ]}
      ListHeaderComponent={<View>
        {needsLogin ? <View style={styles.loginCard}>
          <Text style={styles.loginTitle}>로그인이 필요한 기능입니다.</Text>
          <Text style={styles.loginDescription}>카카오로 로그인하면 신청한 알림 내역을 확인할 수 있습니다.</Text>
          <Pressable onPress={() => void login()} style={styles.loginButton}>
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </Pressable>
        </View> : null}

        {!needsLogin && permissionGranted === false ? <View style={styles.permissionBanner}>
          <Text numberOfLines={1} style={styles.permissionTitle}>알림이 꺼져있어 예약 알림을 받을 수 없습니다.</Text>
          <Pressable onPress={() => void Linking.openSettings()} style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>설정</Text>
          </Pressable>
        </View> : null}

        {loading ? <LoadingState style={[styles.loading, { minHeight: Math.max(300, windowHeight - 160) }]} /> : null}
        {error ? <ErrorState description={error.description} onAction={() => void load()} title={error.title} /> : null}
      </View>}
      ListEmptyComponent={!loading && !error && !needsLogin ? <EmptyState
        actionLabel="테니스장 찾기"
        description={'자주 이용하는 테니스장의\n예약 오픈 시간을 놓치지 마세요.'}
        onAction={() => router.replace('/')}
        title="아직 설정한 오픈 알림이 없어요"
      /> : null}
      renderSectionHeader={({ section }) => <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>}
      renderItem={({ item }) => {
        const reminderValues = [...new Set(item.rules.flatMap((entry) => entry.reminders))];
        return <View style={styles.agendaRow}>
          <View style={styles.timelineColumn}>
            <TennisMarker />
            <Text style={styles.timelineTime}>{item.opensAt ? timeLabel(item.opensAt) : '--:--'}</Text>
          </View>
          <View style={styles.agendaCard}>
            <Pressable
              onPress={() => router.push(`/courts/${encodeURIComponent(item.court.slug || item.court.id)}` as Href)}
              style={styles.cardMain}
            >
              <Text numberOfLines={1} style={styles.courtName}>{item.court.name}</Text>
              <Text numberOfLines={1} style={styles.courtMeta}>{[item.court.region, item.court.city].filter(Boolean).join(' ') || item.court.address}</Text>
            </Pressable>
            <View style={styles.cardBottomRow}>
              <View style={styles.reminderBadges}>
                {reminderValues.map((value) => <View key={value} style={styles.reminderBadge}>
                  <Text style={styles.reminderBadgeText}>{reminderLabels[value as ReminderMinutes] ?? `${value}분 전`}</Text>
                </View>)}
              </View>
              <Pressable onPress={() => openEditor(item.court)} hitSlop={10} style={styles.editButton}>
                <Text style={styles.editButtonText}>편집</Text>
              </Pressable>
            </View>
          </View>
        </View>;
      }}
      onScrollToIndexFailed={() => undefined}
    />


    <Modal
      visible={Boolean(editingCourt)}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (savingCourt) return;
        if (permissionPromptVisible) setPermissionPromptVisible(false);
        else setEditingCourt(null);
      }}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={() => !savingCourt && setEditingCourt(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text numberOfLines={2} style={styles.modalTitle}>{editingCourt?.name}</Text>
            </View>
            <Pressable disabled={savingCourt} onPress={() => { setConfirmingDelete(false); setEditingCourt(null); }} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (!editingCourt) return;
              const path = `/courts/${encodeURIComponent(editingCourt.slug || editingCourt.id)}` as Href;
              setEditingCourt(null);
              router.push(path);
            }}
            style={styles.detailLink}
          >
            <Text style={styles.detailLinkText}>상세페이지 보기</Text>
          </Pressable>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {editingCourt?.rules.map((rule) => <View key={rule.id} style={styles.modalRule}>
              <Text style={styles.modalRuleTarget}>{getRuleTargetLabel(rule)}</Text>
              <Text style={styles.modalRuleSchedule}>{getRuleScheduleLabel(rule) || '예약 오픈 시간 확인 중'}</Text>
              <View style={styles.optionRow}>
                {REMINDER_OPTIONS.map((minutes) => {
                  const selected = (draftReminders[rule.id] ?? []).includes(minutes);
                  return <Pressable
                    key={minutes}
                    onPress={() => toggleDraft(rule.id, minutes)}
                    style={[styles.optionButton, selected && styles.optionButtonSelected]}
                  >
                    <ExpoImage
                      source={selected
                        ? require('../../assets/images/notifications/icon_check_checked.svg')
                        : require('../../assets/images/notifications/icon_check_unchecked.svg')}
                      contentFit="contain"
                      style={styles.optionCheckIcon}
                    />
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{reminderLabels[minutes]}</Text>
                  </Pressable>;
                })}
              </View>
            </View>)}
          </ScrollView>

          <View style={[
            styles.modalFooter,
            {
              minHeight: 52 + Math.max(insets.bottom, 42),
              paddingBottom: Math.max(insets.bottom, 42),
            },
          ]}>
            <Pressable disabled={savingCourt} onPress={() => setConfirmingDelete(true)} style={styles.deleteButton}>
              <ExpoImage
                source={require('../../assets/images/notifications/icon_trash.svg')}
                contentFit="contain"
                style={styles.trashIcon}
              />
              <Text style={styles.deleteButtonText}>삭제</Text>
            </Pressable>
            <Pressable
              disabled={savingCourt || !hasDraftReminder}
              onPress={() => void saveEditor()}
              style={[styles.saveButton, !hasDraftReminder && styles.saveButtonDisabled]}
            >
              {savingCourt ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.saveButtonText, !hasDraftReminder && styles.saveButtonTextDisabled]}>저장</Text>}
            </Pressable>
          </View>

        </View>

        {confirmingDelete ? <View style={styles.confirmLayer}>
          <Pressable style={styles.confirmBackdrop} onPress={() => !savingCourt && setConfirmingDelete(false)} />
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmTitle}>알림을 삭제하시겠습니까?</Text>
            <View style={styles.confirmActions}>
              <Pressable disabled={savingCourt} onPress={() => setConfirmingDelete(false)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>취소</Text>
              </Pressable>
              <Pressable disabled={savingCourt} onPress={() => void deleteEditor()} style={styles.confirmDelete}>
                {savingCourt ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmDeleteText}>삭제</Text>}
              </Pressable>
            </View>
          </View>
        </View> : null}

        <NotificationPermissionDialog
          visible={permissionPromptVisible}
          onCancel={() => setPermissionPromptVisible(false)}
          onGranted={async () => {
            setPermissionGranted(true);
            setPermissionPromptVisible(false);
            await persistEditor();
          }}
        />
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  brandHeader: { height: 63, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECECEC', backgroundColor: '#FFFFFF' },
  headerTitle: { color: '#282828', fontSize: 22, lineHeight: 30, letterSpacing: -0.22, fontFamily: 'Pretendard-Bold' },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchIcon: { width: 22, height: 22 },

  calendarWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F1F1', backgroundColor: '#F7F8F7' },
  calendarTop: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  weekArrow: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  weekArrowDisabled: { opacity: 0.2 },
  weekArrowIcon: { width: 16, height: 16 },
  monthLabel: { minWidth: 108, color: '#697B87', textAlign: 'center', fontSize: 14, lineHeight: 20, letterSpacing: -0.14, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  calendarPager: { width: '100%' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayButton: { flex: 1, height: 78, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: '#9A9D9C', fontSize: 14, lineHeight: 14, fontFamily: 'Pretendard-Regular' },
  weekdaySelected: { color: '#7F8883' },
  dayCircle: { width: 38, height: 38, marginTop: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, overflow: 'hidden' },
  dayCircleToday: { borderRadius: 10, backgroundColor: '#CDEDD8', overflow: 'hidden' },
  dayCircleSelected: { borderRadius: 10, backgroundColor: '#ECEDEC', overflow: 'hidden' },
  dayNumber: { color: '#555958', fontSize: 19, lineHeight: 19, fontFamily: 'Pretendard-Regular' },
  dayNumberSelected: { color: '#555958' },
  dayNumberToday: { color: '#4C6255' },
  eventDot: { width: 4, height: 4, marginTop: 3, borderRadius: 2, backgroundColor: 'transparent' },
  eventDotVisible: { backgroundColor: '#20B864' },

  content: { paddingTop: 10, backgroundColor: '#FFFFFF' },
  loginCard: { padding: 18, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, backgroundColor: '#F7F8F7', borderWidth: 1, borderColor: '#E4E6E5' },
  loginTitle: { color: '#303030', fontSize: 16, fontFamily: 'Pretendard-ExtraBold' },
  loginDescription: { marginTop: 8, color: '#858A87', fontSize: 13, lineHeight: 20 },
  loginButton: { height: 46, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#2F9461' },
  loginButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard-ExtraBold' },
  permissionBanner: { height: 62, paddingHorizontal: 17, marginHorizontal: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#FFF7E5', borderWidth: 1, borderColor: '#F2C55B' },
  permissionTitle: { flex: 1, color: '#BD7D00', fontSize: 14, lineHeight: 20, letterSpacing: -0.28, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  settingsButton: { width: 43, height: 28, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFDEA0' },
  settingsButtonText: { color: '#241B0D', fontSize: 13, lineHeight: 18, letterSpacing: -0.2, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  loading: { minHeight: 270, alignItems: 'center', justifyContent: 'center' },
  errorCard: { padding: 16, marginHorizontal: 16, marginBottom: 14, borderRadius: 10, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F0B5B5' },
  errorText: { color: '#B53838', fontSize: 13, lineHeight: 20 },
  retry: { marginTop: 12, color: '#303030', fontSize: 13, fontFamily: 'Pretendard-ExtraBold' },

  sectionHeader: { height: 50, paddingHorizontal: 15, justifyContent: 'center' },
  sectionTitle: { color: '#949896', fontSize: 14, lineHeight: 20, letterSpacing: -0.35, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  agendaRow: { minHeight: 106, marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  timelineColumn: { width: 58, marginLeft: -3, marginRight: 3, alignItems: 'center', justifyContent: 'center' },
  tennisMarker: { width: 30, height: 30 },
  timelineTime: { marginTop: 4, color: '#929693', fontSize: 14, lineHeight: 19, fontFamily: 'Pretendard-Bold' },
  agendaCard: {
    flex: 1,
    minHeight: 106,
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 1px 10px 0px rgba(0, 0, 0, 0.10)',
  },
  cardMain: { paddingRight: 40 },
  courtName: { color: '#3B3D3C', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-ExtraBold' },
  courtMeta: { marginTop: 3, color: '#A6AAA7', fontSize: 12, lineHeight: 16 },
  cardBottomRow: { marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reminderBadge: { minHeight: 23, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#E5F7EC' },
  reminderBadgeText: { color: '#30C27C', fontSize: 13, lineHeight: 13, fontFamily: 'Pretendard-Bold' },
  editButton: { minWidth: 30, height: 28, alignItems: 'flex-end', justifyContent: 'center' },
  editButtonText: { color: '#999D9A', fontSize: 12, lineHeight: 12, fontFamily: 'Pretendard-Regular' },

  empty: { paddingTop: 88, alignItems: 'center' },
  emptyCalendar: { width: 50, height: 48, borderRadius: 9, borderWidth: 2, borderColor: '#3A8055' },
  emptyCalendarTop: { height: 11, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#2F9461' },
  emptyCalendarDotRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyCalendarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#53A978' },
  emptyTitle: { marginTop: 20, color: '#303030', fontSize: 18, fontFamily: 'Pretendard-Black' },
  emptyText: { marginTop: 10, color: '#8A8F98', textAlign: 'center', fontSize: 13, lineHeight: 21 },
  searchButton: { minWidth: 148, height: 46, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#2F9461' },
  searchButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard-Black' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.46)' },
  modalSheet: { height: '80.3%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 20, paddingTop: 29, paddingBottom: 6, flexDirection: 'row', alignItems: 'flex-start' },
  modalHeaderText: { flex: 1 },
  modalTitle: { paddingRight: 10, color: '#3A3B3A', fontSize: 22, lineHeight: 29, fontFamily: 'Pretendard-ExtraBold' },
  closeButton: { width: 36, height: 36, marginTop: -6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F4F4' },
  closeButtonText: { color: '#303030', fontSize: 27, lineHeight: 30, fontFamily: 'Pretendard-Light' },
  detailLink: { alignSelf: 'flex-start', minHeight: 36, marginLeft: 20, justifyContent: 'center' },
  detailLinkText: { color: '#A3A5A4', fontSize: 14, lineHeight: 14, fontFamily: 'Pretendard-Regular' },
  modalScroll: { flexShrink: 1 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 12 },
  modalRule: { paddingTop: 11, paddingBottom: 10 },
  modalRuleTarget: { color: '#9A9D9B', fontSize: 14, lineHeight: 18, fontFamily: 'Pretendard-Regular' },
  modalRuleSchedule: { marginTop: 3, color: '#3B3C3B', fontSize: 16, lineHeight: 21, fontFamily: 'Pretendard-ExtraBold' },
  optionRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  optionButton: { flex: 1, height: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 3, borderWidth: 1, borderColor: '#D4D6D5', backgroundColor: '#FFFFFF' },
  optionButtonSelected: { borderColor: '#B3E8C8', backgroundColor: '#F0FBF5' },
  optionCheckIcon: { width: 24, height: 24 },
  optionText: { color: '#3F4140', fontSize: 16, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  optionTextSelected: { color: '#25B96A' },
  modalFooter: { paddingHorizontal: 20, flexDirection: 'row', gap: 10, backgroundColor: '#FFFFFF' },
  deleteButton: { width: 107, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 4, backgroundColor: '#E53737' },
  trashIcon: { width: 20, height: 20 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  saveButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#333333' },
  saveButtonDisabled: { backgroundColor: '#E3E3E3' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  saveButtonTextDisabled: { color: '#A7A7A7' },
  confirmLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  confirmBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.48)' },
  confirmDialog: { width: 350, height: 162, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF' },
  confirmTitle: { color: '#393A39', fontSize: 22, lineHeight: 29, fontFamily: 'Pretendard-ExtraBold' },
  confirmActions: { marginTop: 34, flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#D2D4D3', backgroundColor: '#FFFFFF' },
  confirmCancelText: { color: '#3D3E3D', fontSize: 16, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  confirmDelete: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#E53737' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 16, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
});
