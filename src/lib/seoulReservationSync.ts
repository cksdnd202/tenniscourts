import type { Court, CourtBookingRule } from "@/app/types";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SEOUL_RESERVATION_PROVIDER,
  buildLatestSeoulReservationMap,
  buildNextSeoulReservationLooseMap,
  compareSeoulReservationRowsForNext,
  extractXmlTag,
  fetchAllSeoulTennisReservations,
  getCourtStoredSeoulLooseMatchKey,
  getCourtStoredSeoulMatchKey,
  getSeoulReservationSource,
  isExpiredSeoulReservationRow,
  normalizeSeoulReservationIdentityName,
  type SeoulReservationRow,
} from "@/lib/seoulReservation";

function normalizeRuleText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, "").trim();
}

function normalizeCourtIdentity(value: string | null | undefined) {
  return normalizeSeoulReservationIdentityName(value)
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateDay(value: string) {
  const match = value.match(/\d{4}[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  return { month: Number(match[1]), day: Number(match[2]) };
}

function inferUsagePeriodLabelFromRaw(row: SeoulReservationRow) {
  const start = extractXmlTag(row.raw, "USEBGNDT");
  const end = extractXmlTag(row.raw, "USEENDDT");
  const startDate = parseDateDay(start);
  const endDate = parseDateDay(end);

  if (!startDate || !endDate || startDate.month !== endDate.month) return "";
  if (startDate.day === 1 && endDate.day >= 28) return "해당월 전체 이용분";
  return `${startDate.day}일~${endDate.day >= 28 ? "말일" : `${endDate.day}일`} 이용분`;
}

function inferUsagePeriodLabelFromServiceName(row: SeoulReservationRow) {
  const text = row.svcName.replace(/\s+/g, "");
  const match = text.match(/(?:\d{1,2}월)?(\d{1,2})일~(?:(\d{1,2})일|말일)/);
  if (!match) return "";

  const startDay = Number(match[1]);
  const endText = match[2] ? `${Number(match[2])}일` : "말일";
  const endDay = match[2] ? Number(match[2]) : null;
  return `${startDay}일~${endDay != null && endDay >= 28 ? "말일" : endText} 이용분`;
}

function inferUsagePeriodLabel(row: SeoulReservationRow) {
  return inferUsagePeriodLabelFromRaw(row) || inferUsagePeriodLabelFromServiceName(row);
}

function getReservationPeriodBucket(value: string | null | undefined) {
  const text = normalizeRuleText(value);
  if (!text) return "";
  if (/1일~15일|1일부터15일|1차/.test(text)) return "first-half";
  if (/16일~말일|16일~31일|16일~30일|16일부터말일|16일부터31일|16일부터30일|2차/.test(text)) {
    return "second-half";
  }
  if (/전체|해당월/.test(text)) return "full-month";
  return text;
}

function getRuleReservationPeriodBucket(rule: CourtBookingRule) {
  return (
    getReservationPeriodBucket(rule.usage_period_label) ||
    getReservationPeriodBucket(rule.booking_round_label) ||
    getReservationPeriodBucket(rule.label)
  );
}

function getRowReservationPeriodBucket(row: SeoulReservationRow) {
  return (
    getReservationPeriodBucket(inferUsagePeriodLabel(row)) ||
    getReservationPeriodBucket(row.svcName)
  );
}

function isSameSeoulCourtReservation(court: Court, row: SeoulReservationRow) {
  const area = court.source_area_name || court.basic_city;
  if (area && row.areaName && area !== row.areaName) return false;

  const rowIdentity = normalizeCourtIdentity(row.svcName);
  const courtIdentity = normalizeCourtIdentity(court.basic_court_name);
  const sourceIdentity = normalizeCourtIdentity(court.source_service_name);

  if (courtIdentity) {
    return rowIdentity === courtIdentity;
  }

  return Boolean(sourceIdentity && rowIdentity === sourceIdentity);
}

function findBestRuleRow(
  court: Court,
  rule: CourtBookingRule,
  rows: SeoulReservationRow[]
) {
  const ruleBucket = getRuleReservationPeriodBucket(rule);
  const candidates = rows.filter((row) => {
    if (!isSameSeoulCourtReservation(court, row)) return false;

    const rowBucket = getRowReservationPeriodBucket(row);
    if (ruleBucket && rowBucket) return ruleBucket === rowBucket;
    if (ruleBucket || rowBucket) return false;

    return true;
  });

  return candidates.reduce<SeoulReservationRow | null>((best, row) => {
    if (!best) return row;
    return compareSeoulReservationRowsForNext(row, best) < 0 ? row : best;
  }, null);
}

export async function syncSeoulReservationLinks() {
  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
  const rows = await fetchAllSeoulTennisReservations(apiKey);
  const activeRows = rows.filter((row) => !isExpiredSeoulReservationRow(row));
  const latestByMatchKey = buildLatestSeoulReservationMap(activeRows);
  const latestByLooseMatchKey = buildNextSeoulReservationLooseMap(activeRows);
  const latestByUrl = new Map(
    activeRows.map((row) => [row.svcUrl.trim(), { row, source: getSeoulReservationSource(row) }])
  );

  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  const courts = ((data ?? []) as Court[]).filter(
    (court) =>
      court.source_provider === SEOUL_RESERVATION_PROVIDER ||
      (court.basic_region === "서울" && court.booking_booking_provide === "public_site")
  );
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  const { data: rulesData, error: rulesError } = courtIds.length
    ? await getSupabaseAdmin()
        .from("court_booking_rules")
        .select("id,court_id,label,eligibility,booking_round_label,usage_period_label,reservation_url,is_active,sort_order")
        .in("court_id", courtIds)
    : { data: [], error: null };

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  const rulesByCourtId = new Map<string, CourtBookingRule[]>();
  for (const rule of (rulesData ?? []) as CourtBookingRule[]) {
    if (!rule.court_id) continue;
    const current = rulesByCourtId.get(rule.court_id) ?? [];
    current.push(rule);
    rulesByCourtId.set(rule.court_id, current);
  }

  const results: Array<{
    id: string;
    name: string | null;
    previousUrl: string | null;
    nextUrl: string;
  }> = [];
  const ruleResults: Array<{
    courtId: string;
    courtName: string | null;
    ruleId: string;
    ruleLabel: string | null;
    previousUrl: string | null;
    nextUrl: string;
  }> = [];

  for (const court of courts) {
    const currentUrl = court.booking_site_link?.trim();
    const urlMatch = currentUrl ? latestByUrl.get(currentUrl) : null;
    if (urlMatch && court.source_match_key !== urlMatch.source.source_match_key) {
      const { error: backfillError } = await getSupabaseAdmin()
        .from("courtinfo")
        .update({
          ...urlMatch.source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", court.id);

      if (backfillError) {
        throw new Error(backfillError.message);
      }

      court.source_match_key = urlMatch.source.source_match_key;
      court.source_provider = urlMatch.source.source_provider;
      court.source_service_id = urlMatch.source.source_service_id;
      court.source_service_name = urlMatch.source.source_service_name;
      court.source_place_name = urlMatch.source.source_place_name;
      court.source_area_name = urlMatch.source.source_area_name;
      court.source_time_min = urlMatch.source.source_time_min;
      court.source_time_max = urlMatch.source.source_time_max;
      court.source_synced_at = urlMatch.source.source_synced_at;
    }

    const matchKey = getCourtStoredSeoulMatchKey(court);
    const looseMatchKey = getCourtStoredSeoulLooseMatchKey(court);
    const match = latestByMatchKey.get(matchKey) ?? latestByLooseMatchKey.get(looseMatchKey);
    if (!match) continue;

    const nextUrl = match.row.svcUrl.trim();
    if (!nextUrl || nextUrl === court.booking_site_link?.trim()) continue;

    const { error: updateError } = await getSupabaseAdmin()
      .from("courtinfo")
      .update({
        booking_site_link: nextUrl,
        ...match.source,
        updated_at: new Date().toISOString(),
      })
      .eq("id", court.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    results.push({
      id: court.id,
      name: court.basic_court_name,
      previousUrl: court.booking_site_link,
      nextUrl,
    });
  }

  for (const court of courts) {
    const rules = (rulesByCourtId.get(court.id) ?? [])
      .filter((rule) => rule.is_active)
      .sort((a, b) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return (a.label ?? "").localeCompare(b.label ?? "", "ko");
      });

    for (const rule of rules) {
      const match = findBestRuleRow(court, rule, activeRows);
      const nextUrl = match?.svcUrl.trim();
      if (!nextUrl || nextUrl === rule.reservation_url?.trim()) continue;

      const { error: ruleUpdateError } = await getSupabaseAdmin()
        .from("court_booking_rules")
        .update({
          reservation_url: nextUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id);

      if (ruleUpdateError) {
        throw new Error(ruleUpdateError.message);
      }

      ruleResults.push({
        courtId: court.id,
        courtName: court.basic_court_name,
        ruleId: rule.id,
        ruleLabel: rule.label,
        previousUrl: rule.reservation_url ?? null,
        nextUrl,
      });
    }
  }

  return {
    checkedCourts: courts.length,
    updatedCourts: results.length,
    updatedRules: ruleResults.length,
    updates: results,
    ruleUpdates: ruleResults,
  };
}
