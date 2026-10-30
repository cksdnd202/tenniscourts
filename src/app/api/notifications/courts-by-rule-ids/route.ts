import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_RULE_IDS = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RuleRow = {
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
  open_date_adjustment: string | null;
  interval_weeks: number | null;
  anchor_date: string | null;
  lottery_desc: string | null;
  reservation_url: string | null;
  sort_order: number;
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

const RULE_SELECT = [
  "id",
  "court_id",
  "label",
  "eligibility",
  "target_condition",
  "booking_round_label",
  "usage_period_label",
  "rule_type",
  "open_type",
  "open_day_of_month",
  "open_day_of_week",
  "open_ordinal",
  "open_time",
  "open_offset",
  "open_date_adjustment",
  "interval_weeks",
  "anchor_date",
  "lottery_desc",
  "reservation_url",
  "sort_order",
].join(",");

const COURT_SELECT = [
  "id",
  "basic_court_name",
  "slug",
  "basic_region",
  "basic_city",
  "basic_address",
  "booking_site_link",
].join(",");

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { ruleIds?: unknown } | null;
  const ruleIds = Array.isArray(body?.ruleIds)
    ? [...new Set(body.ruleIds.filter(
      (id): id is string => typeof id === "string" && UUID_PATTERN.test(id)
    ))].slice(0, MAX_RULE_IDS)
    : [];

  if (ruleIds.length === 0) {
    return NextResponse.json({ courts: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const database = getSupabaseAdmin();
  const { data: rules, error: rulesError } = await database
    .from("court_booking_rules")
    .select(RULE_SELECT)
    .in("id", ruleIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  const ruleRows = (rules ?? []) as unknown as RuleRow[];
  const courtIds = [...new Set(ruleRows.map((rule) => rule.court_id).filter(Boolean))];
  if (courtIds.length === 0) {
    return NextResponse.json({ courts: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const { data: courts, error: courtsError } = await database
    .from("courtinfo")
    .select(COURT_SELECT)
    .in("id", courtIds)
    .eq("sport_type", "tennis")
    .eq("use_or_not", true);

  if (courtsError) {
    return NextResponse.json({ error: courtsError.message }, { status: 500 });
  }

  const courtRows = (courts ?? []) as unknown as CourtRow[];
  const rulesByCourtId = new Map<string, RuleRow[]>();
  for (const rule of ruleRows) {
    const current = rulesByCourtId.get(rule.court_id) ?? [];
    current.push(rule);
    rulesByCourtId.set(rule.court_id, current);
  }

  return NextResponse.json(
    {
      courts: courtRows.map((court) => ({
        ...court,
        court_booking_rules: rulesByCourtId.get(court.id) ?? [],
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
