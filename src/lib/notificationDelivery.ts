import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { syncNotificationOccurrences } from "@/lib/notificationOccurrenceSync";
import { notificationRowsByIds } from "@/lib/notificationScopedRows";
import {
  bookingPushMessage,
  expoRequest,
  groupedBookingPushMessage,
  type ExpoResult,
} from "@/lib/expoPush";
import { reminderDue, NOTIFICATION_GRACE_MS as GRACE_MS } from "@/lib/notificationPolicy";

type Subscription = { id: string; user_id: string; booking_rule_id: string; lead_minutes: number; created_at: string; is_enabled: boolean };
type Token = { id: string; user_id: string; expo_push_token: string; is_enabled: boolean };
type Occurrence = { id: string; booking_rule_id: string; opens_at: string; status: string };
type Rule = {
  id: string;
  court_id: string;
  is_active: boolean;
  eligibility: string | null;
  target_condition: string | null;
};
type Court = {
  id: string;
  slug: string | null;
  basic_court_name: string;
  sport_type: "tennis" | "badminton";
  use_or_not: boolean;
};
type Delivery = { id: string; subscription_id: string; occurrence_id: string; device_push_token_id: string | null; scheduled_for: string; provider_ticket_id: string | null; attempt_count: number };
type ScheduledTestJob = { id: string; subscription_id: string; device_push_token_id: string; scheduled_for: string; provider_ticket_id: string | null; attempt_count: number };
type PreparedDelivery = {
  delivery: Delivery;
  subscription: Subscription;
  token: Token;
  occurrence: Occurrence;
  rule: Rule;
  court: Court;
};
const BATCH = 100;

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function rows<T>(table: string, select: string, field?: string, value?: boolean) {
  const output: T[] = [];
  for (let from = 0; ; from += 500) {
    let query = getSupabaseAdmin().from(table).select(select).order("id").range(from, from + 499);
    if (field) query = query.eq(field, value);
    const { data, error } = await query;
    check(error);
    output.push(...data as unknown as T[]);
    if ((data?.length ?? 0) < 500) break;
  }
  return output;
}

async function disableToken(id: string) {
  const timestamp = new Date().toISOString();
  const { error } = await getSupabaseAdmin().from("device_push_tokens")
    .update({ is_enabled: false, disabled_at: timestamp, updated_at: timestamp }).eq("id", id);
  check(error);
}

async function bookingNotificationsEnabled(userId: string) {
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  const preferences = data.user?.user_metadata?.notification_preferences as
    | { booking_open_enabled?: boolean }
    | undefined;
  return preferences?.booking_open_enabled !== false;
}

export async function checkNotificationReceipts() {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const { data, error } = await db.from("notification_deliveries")
    .select("id,provider_ticket_id,device_push_token_id")
    .eq("status", "sent").is("error_message", null)
    .not("provider_ticket_id", "is", null)
    .lte("sent_at", new Date(now - 15 * 60_000).toISOString())
    .gte("sent_at", new Date(now - 23 * 3600_000).toISOString())
    .order("sent_at").limit(100);
  check(error);
  if (!data?.length) return 0;
  const receipts = await expoRequest<Record<string, ExpoResult>>("getReceipts", {
    ids: [...new Set(data.map((row) => row.provider_ticket_id))],
  });
  for (const row of data) {
    const receipt = receipts[row.provider_ticket_id];
    if (!receipt) continue;
    const { error: updateError } = await db.from("notification_deliveries").update({
      status: receipt.status === "ok" ? "sent" : "failed",
      error_message: receipt.status === "ok" ? "receipt:ok"
        : `receipt:${receipt.details?.error ?? "unknown"}`,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("status", "sent");
    check(updateError);
    if (receipt.details?.error === "DeviceNotRegistered" && row.device_push_token_id) {
      await disableToken(row.device_push_token_id);
    }
  }
  return data.length;
}

async function checkScheduledTestReceipts() {
  const db = getSupabaseAdmin();
  const now = Date.now();
  const { data, error } = await db.from("notification_scheduled_test_jobs")
    .select("id,provider_ticket_id,device_push_token_id")
    .eq("status", "sent").is("error_message", null)
    .not("provider_ticket_id", "is", null)
    .lte("sent_at", new Date(now - 15 * 60_000).toISOString())
    .gte("sent_at", new Date(now - 23 * 3600_000).toISOString())
    .order("sent_at").limit(100);
  check(error);
  if (!data?.length) return 0;
  const receipts = await expoRequest<Record<string, ExpoResult>>("getReceipts", {
    ids: data.map((row) => row.provider_ticket_id),
  });
  for (const row of data) {
    const receipt = receipts[row.provider_ticket_id];
    if (!receipt) continue;
    const { error: updateError } = await db.from("notification_scheduled_test_jobs").update({
      status: receipt.status === "ok" ? "sent" : "failed",
      error_message: receipt.status === "ok" ? "receipt:ok"
        : `receipt:${receipt.details?.error ?? "unknown"}`,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id).eq("status", "sent");
    check(updateError);
    if (receipt.details?.error === "DeviceNotRegistered") await disableToken(row.device_push_token_id);
  }
  return data.length;
}

async function dispatchScheduledTests(input: {
  now: Date;
  subscriptionById: Map<string, Subscription>;
  tokenById: Map<string, Token>;
  ruleById: Map<string, Rule>;
  courtById: Map<string, Court>;
}) {
  const db = getSupabaseAdmin();
  const cutoff = new Date(input.now.getTime() - GRACE_MS).toISOString();
  const { error: expiredError } = await db.from("notification_scheduled_test_jobs").update({
    status: "cancelled", error_message: "expired_before_dispatch", updated_at: input.now.toISOString(),
  }).eq("status", "pending").lt("scheduled_for", cutoff);
  check(expiredError);

  const { data, error } = await db.from("notification_scheduled_test_jobs").select("*")
    .eq("status", "pending").lte("scheduled_for", input.now.toISOString())
    .gte("scheduled_for", cutoff).order("scheduled_for").limit(10);
  check(error);
  let acceptedByExpo = 0;
  for (const job of (data ?? []) as ScheduledTestJob[]) {
    const { data: claimed, error: claimError } = await db.from("notification_scheduled_test_jobs").update({
      status: "processing", attempt_count: job.attempt_count + 1,
      last_attempted_at: input.now.toISOString(), updated_at: input.now.toISOString(),
    }).eq("id", job.id).eq("status", "pending").select("id");
    check(claimError);
    if (!claimed?.length) continue;

    const sub = input.subscriptionById.get(job.subscription_id);
    const token = input.tokenById.get(job.device_push_token_id);
    const rule = sub ? input.ruleById.get(sub.booking_rule_id) : null;
    const court = rule ? input.courtById.get(rule.court_id) : null;
    const [liveSub, liveToken, liveRule, liveCourt] = await Promise.all([
      db.from("notification_subscriptions").select("is_enabled,user_id").eq("id", job.subscription_id).maybeSingle(),
      db.from("device_push_tokens").select("is_enabled,user_id").eq("id", job.device_push_token_id).maybeSingle(),
      db.from("court_booking_rules").select("is_active").eq("id", rule?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
      db.from("courtinfo").select("sport_type,use_or_not")
        .eq("id", court?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
    ]);
    for (const result of [liveSub, liveToken, liveRule, liveCourt]) check(result.error);
    if (!sub || !token || !rule || !court || !liveSub.data?.is_enabled
      || !liveToken.data?.is_enabled || liveToken.data.user_id !== liveSub.data.user_id
      || !liveRule.data?.is_active || liveCourt.data?.sport_type !== "tennis"
      || !liveCourt.data?.use_or_not) {
      const { error: cancelError } = await db.from("notification_scheduled_test_jobs").update({
        status: "cancelled", error_message: "target_no_longer_active", updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "processing");
      check(cancelError);
      continue;
    }

    let result: ExpoResult;
    try {
      const tickets = await expoRequest<ExpoResult[]>("send", [bookingPushMessage({
        token: token.expo_push_token, courtName: court.basic_court_name,
        slug: court.slug || court.id, ruleId: sub.booking_rule_id,
        opensAt: job.scheduled_for, leadMinutes: sub.lead_minutes,
        eligibility: rule.eligibility, targetCondition: rule.target_condition,
        deliveryId: job.id, test: true,
      })]);
      result = tickets[0];
      if (!result) throw new Error("Expo ticket missing");
    } catch {
      const { error: failedError } = await db.from("notification_scheduled_test_jobs").update({
        status: "failed", error_message: "provider_response_unknown:manual_review", updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "processing");
      check(failedError);
      continue;
    }
    const timestamp = new Date().toISOString();
    const { error: sentError } = await db.from("notification_scheduled_test_jobs").update({
      status: result.status === "ok" ? "sent" : "failed",
      sent_at: result.status === "ok" ? timestamp : null,
      provider_ticket_id: result.id ?? null,
      error_message: result.status === "ok" ? null : `ticket:${result.details?.error ?? "unknown"}`,
      updated_at: timestamp,
    }).eq("id", job.id).eq("status", "processing");
    check(sentError);
    if (result.status === "ok") acceptedByExpo++;
    if (result.details?.error === "DeviceNotRegistered") await disableToken(token.id);
  }
  return acceptedByExpo;
}

export async function dispatchBookingNotifications() {
  const db = getSupabaseAdmin();
  const [receiptsChecked, scheduledTestReceiptsChecked] = await Promise.all([
    checkNotificationReceipts(), checkScheduledTestReceipts(),
  ]);
  const allSubscriptions = await rows<Subscription>("notification_subscriptions", "*", "is_enabled", true);
  const userPreferenceEntries = await Promise.all(
    [...new Set(allSubscriptions.map((subscription) => subscription.user_id))]
      .map(async (userId) => [userId, await bookingNotificationsEnabled(userId)] as const)
  );
  const bookingEnabledByUser = new Map(userPreferenceEntries);
  const subscriptions = allSubscriptions.filter(
    (subscription) => bookingEnabledByUser.get(subscription.user_id) !== false
  );
  if (!subscriptions.length) return { subscriptions: 0, acceptedByExpo: 0,
    scheduledTestsAcceptedByExpo: 0, receiptsChecked, scheduledTestReceiptsChecked };
  await syncNotificationOccurrences({ horizonDays: 2,
    bookingRuleIds: [...new Set(subscriptions.map((sub) => sub.booking_rule_id))] });
  const now = new Date();
  const ruleIds = [...new Set(subscriptions.map((sub) => sub.booking_rule_id))];
  const [tokens, rules] = await Promise.all([
    notificationRowsByIds<Token>("device_push_tokens", "id,user_id,expo_push_token,is_enabled",
      "user_id", subscriptions.map((sub) => sub.user_id), [["is_enabled", true]]),
    notificationRowsByIds<Rule>("court_booking_rules",
      "id,court_id,is_active,eligibility,target_condition", "id", ruleIds, [["is_active", true]]),
  ]);
  const courts = await notificationRowsByIds<Court>("courtinfo",
    "id,slug,basic_court_name,sport_type,use_or_not", "id", rules.map((rule) => rule.court_id),
    [["sport_type", "tennis"], ["use_or_not", true]]);
  const courtById = new Map(courts.map((court) => [court.id, court]));
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
  const subscriptionById = new Map(subscriptions.map((sub) => [sub.id, sub]));
  const tokenById = new Map(tokens.map((token) => [token.id, token]));
  const scheduledTestsAcceptedByExpo = await dispatchScheduledTests({
    now, subscriptionById, tokenById, ruleById, courtById,
  });
  const occurrences: Occurrence[] = [];
  for (let index = 0; index < ruleIds.length; index += 100) {
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from("booking_open_occurrences").select("id,booking_rule_id,opens_at,status")
        .in("booking_rule_id", ruleIds.slice(index, index + 100))
        .eq("status", "scheduled").gt("opens_at", now.toISOString())
        .lte("opens_at", new Date(now.getTime() + 1440 * 60_000).toISOString())
        .order("id").range(from, from + 499);
      check(error);
      occurrences.push(...data as Occurrence[]);
      if ((data?.length ?? 0) < 500) break;
    }
  }
  occurrences.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const occurrenceById = new Map(occurrences.map((item) => [item.id, item]));
  const candidates = [];
  for (const sub of subscriptions) {
    const rule = ruleById.get(sub.booking_rule_id);
    if (!rule || !courtById.has(rule.court_id)) continue;
    for (const occurrence of occurrences) {
      if (occurrence.booking_rule_id !== rule.id || !reminderDue(occurrence.opens_at, sub.lead_minutes, sub.created_at, now)) continue;
      for (const token of tokens.filter((item) => item.user_id === sub.user_id)) {
        candidates.push({ subscription_id: sub.id, occurrence_id: occurrence.id,
          device_push_token_id: token.id,
          scheduled_for: new Date(Date.parse(occurrence.opens_at) - sub.lead_minutes * 60_000).toISOString() });
      }
    }
  }
  for (let i = 0; i < candidates.length; i += BATCH) {
    const { error } = await db.from("notification_deliveries").upsert(candidates.slice(i, i + BATCH), {
      onConflict: "subscription_id,occurrence_id,device_push_token_id", ignoreDuplicates: true,
    });
    check(error);
  }
  const { data: pending, error } = await db.from("notification_deliveries").select("*")
    .eq("status", "pending").lte("scheduled_for", now.toISOString())
    .gte("scheduled_for", new Date(now.getTime() - GRACE_MS).toISOString())
    .order("scheduled_for").limit(BATCH);
  check(error);
  const preparedDeliveries: PreparedDelivery[] = [];
  for (const delivery of (pending ?? []) as Delivery[]) {
    // Atomic compare-and-set prevents overlapping workers from sending the same row.
    const { data: claimed, error: claimError } = await db.from("notification_deliveries").update({
      status: "processing", attempt_count: delivery.attempt_count + 1,
      last_attempted_at: now.toISOString(), updated_at: now.toISOString(),
    }).eq("id", delivery.id).eq("status", "pending").select("id");
    check(claimError);
    if (!claimed?.length) continue;
    const sub = subscriptionById.get(delivery.subscription_id);
    const token = delivery.device_push_token_id ? tokenById.get(delivery.device_push_token_id) : null;
    const occurrence = occurrenceById.get(delivery.occurrence_id);
    const rule = sub ? ruleById.get(sub.booking_rule_id) : null;
    const court = rule ? courtById.get(rule.court_id) : null;
    // Recheck live state immediately before sending (unsubscribe, logout, rule edits).
    const [liveSub, liveToken, liveOccurrence, liveRule, liveCourt] = await Promise.all([
      db.from("notification_subscriptions").select("is_enabled,user_id").eq("id", sub?.id ?? delivery.subscription_id).maybeSingle(),
      db.from("device_push_tokens").select("is_enabled,user_id").eq("id", token?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
      db.from("booking_open_occurrences").select("status").eq("id", delivery.occurrence_id).maybeSingle(),
      db.from("court_booking_rules").select("is_active").eq("id", rule?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
      db.from("courtinfo").select("sport_type,use_or_not")
        .eq("id", court?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
    ]);
    for (const result of [liveSub, liveToken, liveOccurrence, liveRule, liveCourt]) check(result.error);
    if (!sub || !token || !occurrence || !rule || !court || !liveSub.data?.is_enabled
      || !liveToken.data?.is_enabled || liveToken.data.user_id !== liveSub.data.user_id
      || liveOccurrence.data?.status !== "scheduled" || !liveRule.data?.is_active
      || liveCourt.data?.sport_type !== "tennis" || !liveCourt.data?.use_or_not
      || !reminderDue(occurrence.opens_at, sub.lead_minutes, sub.created_at, new Date())) {
      const { error: cancelError } = await db.from("notification_deliveries").update({ status: "cancelled" }).eq("id", delivery.id);
      check(cancelError);
      continue;
    }

    preparedDeliveries.push({ delivery, subscription: sub, token, occurrence, rule, court });
  }

  const groupedDeliveries = new Map<string, PreparedDelivery[]>();
  for (const item of preparedDeliveries) {
    const scheduledMinute = Math.floor(Date.parse(item.delivery.scheduled_for) / 60_000);
    const key = `${item.token.id}:${scheduledMinute}`;
    const group = groupedDeliveries.get(key) ?? [];
    group.push(item);
    groupedDeliveries.set(key, group);
  }

  let acceptedByExpo = 0;
  let acceptedDeliveryCount = 0;
  let groupedPushCount = 0;
  for (const group of groupedDeliveries.values()) {
    const first = group[0];
    if (!first) continue;
    const deliveryIds = group.map((item) => item.delivery.id);
    let result: ExpoResult;
    try {
      const message = group.length === 1
        ? bookingPushMessage({
            token: first.token.expo_push_token,
            courtName: first.court.basic_court_name,
            slug: first.court.slug || first.court.id,
            ruleId: first.subscription.booking_rule_id,
            opensAt: first.occurrence.opens_at,
            leadMinutes: first.subscription.lead_minutes,
            eligibility: first.rule.eligibility,
            targetCondition: first.rule.target_condition,
            deliveryId: first.delivery.id,
          })
        : groupedBookingPushMessage({
            token: first.token.expo_push_token,
            reminders: group.map((item) => ({
              courtName: item.court.basic_court_name,
              opensAt: item.occurrence.opens_at,
              leadMinutes: item.subscription.lead_minutes,
            })),
          });
      const tickets = await expoRequest<ExpoResult[]>("send", [message]);
      result = tickets[0];
      if (!result) throw new Error("Expo ticket missing");
    } catch {
      // A network timeout may have happened AFTER Expo accepted the push. Do not
      // automatically resend an ambiguous attempt, which could cause duplicates.
      const { error: failedError } = await db.from("notification_deliveries").update({
        status: "failed", error_message: "provider_response_unknown:manual_review", updated_at: new Date().toISOString(),
      }).in("id", deliveryIds).eq("status", "processing");
      check(failedError);
      continue;
    }
    const timestamp = new Date().toISOString();
    const { error: sentError } = await db.from("notification_deliveries").update({
      status: result.status === "ok" ? "sent" : "failed",
      sent_at: result.status === "ok" ? timestamp : null,
      provider_ticket_id: result.id ?? null,
      error_message: result.status === "ok" ? null : `ticket:${result.details?.error ?? "unknown"}`,
      updated_at: timestamp,
    }).in("id", deliveryIds).eq("status", "processing");
    check(sentError);
    if (result.status === "ok") {
      acceptedByExpo++;
      acceptedDeliveryCount += group.length;
      if (group.length > 1) groupedPushCount++;
    }
    if (result.details?.error === "DeviceNotRegistered") await disableToken(first.token.id);
  }
  return { subscriptions: subscriptions.length, candidates: candidates.length, acceptedByExpo,
    acceptedDeliveryCount, groupedPushCount,
    scheduledTestsAcceptedByExpo, receiptsChecked, scheduledTestReceiptsChecked };
}
