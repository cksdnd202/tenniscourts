/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export type AppNotificationType = 'booking_open' | 'notice' | 'inquiry_reply';

export type AppNotificationItem = {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  path: string;
  occurred_at: string;
  read_at: string | null;
};

type NotificationRow = Omit<AppNotificationItem, 'read_at'>;

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('알림함을 확인하려면 로그인이 필요합니다.');
  return data.user.id;
}

async function visibleNotificationRows(limit = 80) {
  const now = new Date().toISOString();
  const { data, error } = await (supabase.from('app_notifications' as never) as any)
    .select('id,type,title,body,path,occurred_at')
    .lte('occurred_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function fetchNotificationInbox(limit = 80): Promise<AppNotificationItem[]> {
  const userId = await currentUserId();
  const rows = await visibleNotificationRows(limit);
  if (!rows.length) return [];

  const { data, error } = await (supabase.from('app_notification_reads' as never) as any)
    .select('notification_id,read_at')
    .eq('user_id', userId)
    .in('notification_id', rows.map((item) => item.id));
  if (error) throw error;

  const readAtById = new Map<string, string>(
    (data ?? []).map((item: { notification_id: string; read_at: string }) => [item.notification_id, item.read_at])
  );
  return rows.map((item) => ({ ...item, read_at: readAtById.get(item.id) ?? null }));
}

export async function hasUnreadNotifications() {
  const items = await fetchNotificationInbox(100);
  return items.some((item) => !item.read_at);
}

export async function markNotificationRead(notificationId: string) {
  const userId = await currentUserId();
  const { error } = await (supabase.from('app_notification_reads' as never) as any).upsert(
    { notification_id: notificationId, user_id: userId, read_at: new Date().toISOString() },
    { onConflict: 'notification_id,user_id' }
  );
  if (error) throw error;
}

export async function markAllNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return;
  const userId = await currentUserId();
  const readAt = new Date().toISOString();
  const { error } = await (supabase.from('app_notification_reads' as never) as any).upsert(
    notificationIds.map((notificationId) => ({ notification_id: notificationId, user_id: userId, read_at: readAt })),
    { onConflict: 'notification_id,user_id' }
  );
  if (error) throw error;
}

export async function markBookingNotificationReadByDeliveryId(deliveryId: string) {
  // A device can receive Expo's push a fraction earlier than the server writes
  // the accepted delivery into the inbox. Retry briefly so opening the push
  // still marks the matching inbox row as read.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await (supabase.from('app_notifications' as never) as any)
      .select('id')
      .eq('type', 'booking_open')
      .contains('metadata', { delivery_ids: [deliveryId] })
      .maybeSingle();
    if (!error && data?.id) {
      await markNotificationRead(data.id);
      return;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 600));
  }
}
