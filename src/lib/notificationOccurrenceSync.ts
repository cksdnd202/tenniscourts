import type { Court, CourtBookingRule } from "@/app/types";
import { getNextBookingRuleOpen } from "@/lib/nextBookingOpen";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { notificationRowsByIds } from "@/lib/notificationScopedRows";

const DEFAULT_HORIZON_DAYS = 45;
const MAX_OCCURRENCES_PER_RULE = 64;
const PAGE_SIZE = 500;
const WRITE_BATCH_SIZE = 500;
const ID_BATCH_SIZE = 100;

type BookingOpenOccurrenceInsert = {
  booking_rule_id: string;
  opens_at: string;
  status: "scheduled";
  cancelled_at: null;
  updated_at: string;
};

type ExistingOccurrence = {
  id: string;
  booking_rule_id: string;
  opens_at: string;
};

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function occurrenceKey(bookingRuleId: string, opensAt: string) {
  return `${bookingRuleId}:${new Date(opensAt).toISOString()}`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchVisibleCourts(courtIds?: string[]) {
  if (courtIds !== undefined) {
    return notificationRowsByIds<Court>("courtinfo", "*", "id", courtIds,
      [["sport_type", "tennis"], ["use_or_not", true]]);
  }
  const supabase = getSupabaseAdmin();
  const courts: Court[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("courtinfo")
      .select("*")
      .eq("sport_type", "tennis")
      .eq("use_or_not", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`알림 대상 테니스장 조회 실패: ${error.message}`);

    const page = (data ?? []) as Court[];
    courts.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return courts;
}

async function fetchActiveBookingRules(ruleIds?: string[]) {
  if (ruleIds !== undefined) {
    return notificationRowsByIds<CourtBookingRule>("court_booking_rules", "*", "id", ruleIds,
      [["is_active", true]]);
  }
  const supabase = getSupabaseAdmin();
  const rules: CourtBookingRule[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("court_booking_rules")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`활성 예약 규칙 조회 실패: ${error.message}`);

    const page = (data ?? []) as CourtBookingRule[];
    rules.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rules;
}

function calculateRuleOccurrences(
  court: Court,
  rule: CourtBookingRule,
  from: Date,
  horizonEnd: Date
) {
  const occurrences: BookingOpenOccurrenceInsert[] = [];
  let cursor = new Date(from);

  for (let count = 0; count < MAX_OCCURRENCES_PER_RULE; count += 1) {
    const nextOpen = getNextBookingRuleOpen(court, rule, cursor);
    if (!nextOpen) break;

    const opensAt = nextOpen.instant;
    if (opensAt.getTime() <= cursor.getTime()) break;
    if (opensAt.getTime() > horizonEnd.getTime()) break;

    occurrences.push({
      booking_rule_id: rule.id,
      opens_at: opensAt.toISOString(),
      status: "scheduled",
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    });

    cursor = new Date(opensAt.getTime() + 1000);
  }

  return occurrences;
}

async function fetchScheduledOccurrences(
  bookingRuleIds: string[],
  from: Date,
  horizonEnd: Date
) {
  const supabase = getSupabaseAdmin();
  const occurrences: ExistingOccurrence[] = [];

  for (const ruleIdBatch of chunk(bookingRuleIds, ID_BATCH_SIZE)) {
    for (let fromIndex = 0; ; fromIndex += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("booking_open_occurrences")
        .select("id,booking_rule_id,opens_at")
        .in("booking_rule_id", ruleIdBatch)
        .eq("status", "scheduled")
        .gte("opens_at", from.toISOString())
        .lte("opens_at", horizonEnd.toISOString())
        .order("id")
        .range(fromIndex, fromIndex + PAGE_SIZE - 1);

      if (error) throw new Error(`기존 예약 오픈 시각 조회 실패: ${error.message}`);
      occurrences.push(...((data ?? []) as ExistingOccurrence[]));
      if ((data?.length ?? 0) < PAGE_SIZE) break;
    }
  }

  return occurrences;
}

export type NotificationOccurrenceSyncResult = {
  startedAt: string;
  horizonEnd: string;
  visibleCourtCount: number;
  activeRuleCount: number;
  calculableRuleCount: number;
  skippedRuleCount: number;
  scheduledOccurrenceCount: number;
  cancelledOccurrenceCount: number;
};

export async function syncNotificationOccurrences(options?: {
  now?: Date;
  horizonDays?: number;
  bookingRuleIds?: string[];
}): Promise<NotificationOccurrenceSyncResult> {
  const now = options?.now ?? new Date();
  const horizonDays = options?.horizonDays ?? DEFAULT_HORIZON_DAYS;

  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    throw new Error("알림 오픈 시각 생성 범위는 1~90일이어야 합니다.");
  }

  const horizonEnd = addDays(now, horizonDays);
  // Full scheduled syncs retain their original scope; minute dispatches only load subscribed rules.
  const activeRules = await fetchActiveBookingRules(options?.bookingRuleIds);
  const courts = await fetchVisibleCourts(options?.bookingRuleIds === undefined
    ? undefined : activeRules.map((rule) => rule.court_id));
  const courtById = new Map(courts.map((court) => [court.id, court]));
  const requestedRules = options?.bookingRuleIds ? new Set(options.bookingRuleIds) : null;
  const relevantRules = activeRules.filter((rule) => courtById.has(rule.court_id)
    && (!requestedRules || requestedRules.has(rule.id)));
  const plannedOccurrences: BookingOpenOccurrenceInsert[] = [];
  let calculableRuleCount = 0;

  for (const rule of relevantRules) {
    const court = courtById.get(rule.court_id);
    if (!court) continue;

    const ruleOccurrences = calculateRuleOccurrences(court, rule, now, horizonEnd);
    if (ruleOccurrences.length === 0) continue;

    calculableRuleCount += 1;
    plannedOccurrences.push(...ruleOccurrences);
  }

  const supabase = getSupabaseAdmin();
  for (const occurrenceBatch of chunk(plannedOccurrences, WRITE_BATCH_SIZE)) {
    const { error } = await supabase
      .from("booking_open_occurrences")
      .upsert(occurrenceBatch, { onConflict: "booking_rule_id,opens_at" });

    if (error) throw new Error(`예약 오픈 시각 저장 실패: ${error.message}`);
  }

  const plannedKeys = new Set(
    plannedOccurrences.map((occurrence) =>
      occurrenceKey(occurrence.booking_rule_id, occurrence.opens_at)
    )
  );
  const existingOccurrences = relevantRules.length
    ? await fetchScheduledOccurrences(
        relevantRules.map((rule) => rule.id),
        now,
        horizonEnd
      )
    : [];
  const staleOccurrenceIds = existingOccurrences
    .filter(
      (occurrence) =>
        !plannedKeys.has(occurrenceKey(occurrence.booking_rule_id, occurrence.opens_at))
    )
    .map((occurrence) => occurrence.id);

  for (const occurrenceIdBatch of chunk(staleOccurrenceIds, ID_BATCH_SIZE)) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("booking_open_occurrences")
      .update({
        status: "cancelled",
        cancelled_at: timestamp,
        updated_at: timestamp,
      })
      .in("id", occurrenceIdBatch);

    if (error) throw new Error(`변경된 예약 오픈 시각 취소 실패: ${error.message}`);
  }

  return {
    startedAt: now.toISOString(),
    horizonEnd: horizonEnd.toISOString(),
    visibleCourtCount: courts.length,
    activeRuleCount: relevantRules.length,
    calculableRuleCount,
    skippedRuleCount: relevantRules.length - calculableRuleCount,
    scheduledOccurrenceCount: plannedOccurrences.length,
    cancelledOccurrenceCount: staleOccurrenceIds.length,
  };
}
