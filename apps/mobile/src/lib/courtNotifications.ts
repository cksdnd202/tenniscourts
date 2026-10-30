import { publicSupabase, supabase } from '@/lib/supabase';
import { APP_WEB_ORIGIN } from '@/lib/webOrigin';

export const REMINDER_OPTIONS = [1440, 10] as const;
export const MAX_ACTIVE_REMINDERS = 30;
export const NOTIFICATION_LIMIT_ERROR = 'notification_subscription_limit_reached';

let notificationReminderRevision = 0;

export type ReminderMinutes = (typeof REMINDER_OPTIONS)[number];

export class NotificationLimitError extends Error {
  constructor() {
    super(`예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있습니다.`);
    this.name = 'NotificationLimitError';
  }
}

export function countActiveReminders(reminders: Record<string, readonly number[]>) {
  return Object.values(reminders).reduce((total, values) => total + new Set(values).size, 0);
}

export function isNotificationLimitError(error: unknown) {
  return error instanceof NotificationLimitError ||
    (error instanceof Error && error.message.includes(NOTIFICATION_LIMIT_ERROR));
}

export function getNotificationReminderRevision() {
  return notificationReminderRevision;
}

export type NotificationBookingRule = {
  id: string;
  court_id: string;
  label: string | null;
  eligibility: string | null;
  target_condition: string | null;
  booking_round_label: string | null;
  usage_period_label: string | null;
  rule_type: string | null;
  open_type: string | null;
  open_day_of_month: number | null;
  open_day_of_week: number | null;
  open_ordinal: number | null;
  open_time: string | null;
  open_offset: string | null;
  open_date_adjustment?: string | null;
  interval_weeks: number | null;
  anchor_date: string | null;
  lottery_desc?: string | null;
  reservation_url: string | null;
  sort_order: number;
};

export type NotificationCourt = {
  id: string;
  name: string;
  slug: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  bookingSiteLink: string | null;
  rules: NotificationBookingRule[];
};

type CourtRow = {
  id: string;
  basic_court_name: string | null;
  slug: string | null;
  basic_region: string | null;
  basic_city: string | null;
  basic_address: string | null;
  booking_site_link: string | null;
};

type SubscriptionRow = {
  id: string;
  booking_rule_id: string;
  lead_minutes: number;
  is_enabled: boolean;
};

const WEB_API_BATCH_SIZE = 100;
const WEB_API_CONCURRENCY = 3;
const WEB_API_BASE_URL = APP_WEB_ORIGIN;

export async function fetchNotificationCourts(ruleIds: string[], attempt = 0): Promise<NotificationCourt[]> {
  if (ruleIds.length === 0) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${WEB_API_BASE_URL}/api/notifications/courts-by-rule-ids`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleIds }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`오픈 알림 서버 응답 오류 (${response.status})`);
    }

    const payload = (await response.json()) as {
      courts?: Array<CourtRow & { court_booking_rules?: NotificationBookingRule[] }>;
      error?: string;
    };
    if (payload.error) throw new Error(payload.error);
    return (payload.courts ?? []).map((court) => ({
      id: court.id,
      name: court.basic_court_name?.trim() || '이름 없는 테니스장',
      slug: court.slug,
      region: court.basic_region,
      city: court.basic_city,
      address: court.basic_address,
      bookingSiteLink: court.booking_site_link,
      rules: court.court_booking_rules ?? [],
    }));
  } catch (error) {
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetchNotificationCourts(ruleIds, attempt + 1);
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('오픈 알림 서버 연결 시간이 초과됐습니다. 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchActiveRulesFromWebApi(courtIds: string[]) {
  if (courtIds.length === 0) return [];
  const batches: string[][] = [];
  for (let index = 0; index < courtIds.length; index += WEB_API_BATCH_SIZE) {
    batches.push(courtIds.slice(index, index + WEB_API_BATCH_SIZE));
  }

  const responses: Array<NotificationBookingRule[][]> = [];
  for (let index = 0; index < batches.length; index += WEB_API_CONCURRENCY) {
    responses.push(await Promise.all(batches
      .slice(index, index + WEB_API_CONCURRENCY)
      .map((ids) => fetchRuleBatch(ids))));
  }

  return responses
    .flat()
    .flat()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

async function fetchRuleBatch(ids: string[], attempt = 0): Promise<NotificationBookingRule[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${WEB_API_BASE_URL}/api/courts/by-ids`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`테니스장 예약 정보 서버 응답 오류 (${response.status})`);
    const payload = await response.json() as {
      courts?: Array<{ court_booking_rules?: NotificationBookingRule[] }>;
      error?: string;
    };
    if (payload.error) throw new Error(payload.error);
    return (payload.courts ?? []).flatMap((court) => court.court_booking_rules ?? []);
  } catch (error) {
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return fetchRuleBatch(ids, attempt + 1);
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('테니스장 예약 정보 서버 연결 시간이 초과됐습니다. 다시 시도해 주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCurrentUserReminderMap() {
  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select('id,booking_rule_id,lead_minutes,is_enabled')
    .eq('is_enabled', true);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SubscriptionRow[];

  const reminders: Record<string, number[]> = {};
  for (const row of rows) {
    reminders[row.booking_rule_id] = [
      ...(reminders[row.booking_rule_id] ?? []),
      row.lead_minutes,
    ];
  }
  return reminders;
}

export async function saveRuleReminders(
  bookingRuleId: string,
  leadMinutes: readonly ReminderMinutes[]
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('알림을 설정하려면 다시 로그인해 주세요.');

  const { data: currentRows, error: currentError } = await supabase
    .from('notification_subscriptions')
    .select('id,lead_minutes,is_enabled')
    .eq('user_id', user.id)
    .eq('booking_rule_id', bookingRuleId);

  if (currentError) throw new Error(`현재 알림 설정을 확인하지 못했습니다: ${currentError.message}`);

  const wanted = new Set<number>(leadMinutes);
  const { count: activeCount, error: countError } = await supabase
    .from('notification_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_enabled', true);

  if (countError) throw new Error(`현재 알림 개수를 확인하지 못했습니다: ${countError.message}`);

  const currentRuleActiveCount = (currentRows ?? []).filter((row) => row.is_enabled).length;
  const nextActiveCount = (activeCount ?? 0) - currentRuleActiveCount + wanted.size;
  if (nextActiveCount > MAX_ACTIVE_REMINDERS) throw new NotificationLimitError();

  const rowsToDelete = (currentRows ?? [])
    .filter((row) => !wanted.has(row.lead_minutes))
    .map((row) => row.id);

  if (rowsToDelete.length > 0) {
    const { error } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .in('id', rowsToDelete);
    if (error) throw new Error(`알림 설정을 해제하지 못했습니다: ${error.message}`);
  }

  if (leadMinutes.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabase.from('notification_subscriptions').upsert(
      leadMinutes.map((minutes) => ({
        user_id: user.id,
        booking_rule_id: bookingRuleId,
        lead_minutes: minutes,
        is_enabled: true,
        updated_at: now,
      })),
      { onConflict: 'user_id,booking_rule_id,lead_minutes' }
    );
    if (error) {
      if (error.message.includes(NOTIFICATION_LIMIT_ERROR)) throw new NotificationLimitError();
      throw new Error(`알림 설정을 저장하지 못했습니다: ${error.message}`);
    }
  }

  notificationReminderRevision += 1;
}

export function getRuleTargetLabel(rule: NotificationBookingRule) {
  const eligibilityLabels: Record<string, string> = {
    resident: '구민',
    citizen: '시민',
    inhabitant: '주민',
    normal: '누구나',
    non_resident: '타지역',
    none: '없음',
  };
  const key = rule.eligibility?.trim() || 'normal';
  const target = eligibilityLabels[key] ?? key;
  const legacyLabel = rule.label?.trim() ?? '';
  const condition = typeof rule.target_condition === 'string'
    ? rule.target_condition.trim()
    : /팀|소속|클럽|동호회/.test(legacyLabel)
      ? legacyLabel.replace(/^(구민|시민|주민|관내)[,·\s]+/, '').replace(/\s*(우선|정규대관)$/, '').trim()
      : '';
  if (condition && (key === 'none' || /소속.*클럽/.test(condition))) return condition;
  return condition ? `${target} · ${condition}` : target;
}

export async function fetchNotificationCourt(slug: string): Promise<NotificationCourt> {
  const { data: court, error } = await publicSupabase.from('courtinfo')
    .select('id,basic_court_name,slug,basic_region,basic_city,basic_address,booking_site_link')
    .eq(/^[0-9a-f-]{36}$/i.test(slug) ? 'id' : 'slug', slug)
    .eq('sport_type', 'tennis').eq('use_or_not', true).maybeSingle();
  if (error || !court) throw new Error('테니스장 정보를 불러오지 못했습니다.');
  return {
    id: court.id, name: court.basic_court_name || '테니스장', slug: court.slug,
    region: court.basic_region, city: court.basic_city, address: court.basic_address,
    bookingSiteLink: court.booking_site_link, rules: await fetchActiveRulesFromWebApi([court.id]),
  };
}

export async function sendBookingTestPush(ruleId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('다시 로그인해 주세요.');
  const response = await fetch(`${WEB_API_BASE_URL}/api/notifications/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ ruleId }),
  });
  if (response.status === 404) throw new Error('테스트 알림 서버가 아직 배포되지 않았습니다.');
  const payload = await response.json() as { error?: string; accepted?: number };
  if (!response.ok || payload.error) throw new Error(payload.error || '테스트 알림을 보내지 못했습니다.');
  return payload.accepted ?? 0;
}

export function getRuleScheduleLabel(rule: NotificationBookingRule) {
  const formatTime = (value: string | null) => value?.split(':').slice(0, 2).join(':') ?? '';
  const formatWeekday = (value: number | null) => ({
    0: '일요일', 1: '월요일', 2: '화요일', 3: '수요일',
    4: '목요일', 5: '금요일', 6: '토요일', 7: '일요일',
  } as Record<number, string>)[value ?? -99] ?? '';
  const appendAdjustment = (text: string) =>
    rule.open_date_adjustment === 'next_weekday' ? `${text} (주말이면 다음 평일)` : text;
  const time = formatTime(rule.open_time);
  const offset = rule.open_offset?.trim();

  if (rule.rule_type === 'phone') return '전화 예약';
  if (rule.rule_type === 'on_site') return '현장 예약';
  if (rule.rule_type === 'irregular') return '비정기 예약';
  if (rule.rule_type === 'checking') return '예약 정보 확인 중';
  if (rule.rule_type === 'rolling') {
    return `매일 ${time ? `${time}, ` : ''}${offset ? `+${offset}일 ` : ''}예약 오픈`.trim();
  }
  if (rule.rule_type === 'interval_weekly') {
    const interval = rule.interval_weeks && rule.interval_weeks > 1 ? `${rule.interval_weeks}주마다` : '매주';
    return `${[interval, formatWeekday(rule.open_day_of_week), time].filter(Boolean).join(' ')}${offset ? `, ${offset}` : ''} 예약 오픈`.trim();
  }
  if (rule.rule_type === 'monthly_relative') {
    return `다음 달 ${offset ? `${offset}일 전` : '이전'}${time ? `, ${time}` : ''} 예약 오픈`;
  }
  if (rule.rule_type === 'lottery' && rule.lottery_desc?.trim()) return rule.lottery_desc.trim();

  if (rule.rule_type === 'ordinal') {
    const ordinal = ({ 1: '첫번째', 2: '두번째', 3: '세번째', 4: '네번째', 5: '다섯번째', [-1]: '마지막', [-2]: '첫번째 영업일' } as Record<number, string>)[rule.open_ordinal ?? -99]
      ?? (rule.open_ordinal == null ? '' : `${rule.open_ordinal}번째`);
    const prefix = [ordinal, formatWeekday(rule.open_day_of_week)].filter(Boolean).join(' ');
    return appendAdjustment(`${[prefix, time].filter(Boolean).join(' ')}${offset ? `, ${offset}` : ''} 예약 오픈`.trim());
  }

  if (rule.open_type === 'week') {
    const week = ({ 1: '첫째주', 2: '둘째주', 3: '셋째주', 4: '넷째주', 5: '다섯째주', [-1]: '마지막주' } as Record<number, string>)[rule.open_day_of_month ?? -99]
      ?? (rule.open_day_of_month == null ? '' : `${rule.open_day_of_month}주차`);
    const prefix = [week, formatWeekday(rule.open_day_of_week)].filter(Boolean).join(' ');
    return appendAdjustment(`${[prefix, time].filter(Boolean).join(' ')}${offset ? `, ${offset}` : ''} 예약 오픈`.trim());
  }

  const day = rule.open_day_of_month == null ? '' : rule.open_day_of_month === -1 ? '말일' : `${rule.open_day_of_month}일`;
  return appendAdjustment(`${[day, time].filter(Boolean).join(' ')}${offset ? `, ${offset}` : ''} 예약 오픈`.trim());
}
