import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const COURT_CARD_SELECT =
  "id, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_site_link, basic_map_link, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal";
const MAX_COURT_IDS = 100;

async function attachBookingRules<T extends { id?: string | null }>(courts: T[]) {
  const ids = courts.map((court) => court.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return courts.map((court) => ({ ...court, court_booking_rules: [] }));

  const { data: rules } = await getSupabaseAdmin()
    .from("court_booking_rules")
    .select("*")
    .in("court_id", ids)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rulesByCourtId = new Map<string, unknown[]>();
  for (const rule of rules ?? []) {
    const courtId = (rule as { court_id?: string | null }).court_id;
    if (!courtId) continue;
    const current = rulesByCourtId.get(courtId) ?? [];
    current.push(rule);
    rulesByCourtId.set(courtId, current);
  }

  return courts.map((court) => ({
    ...court,
    court_booking_rules: court.id ? rulesByCourtId.get(court.id) ?? [] : [],
  }));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string").slice(0, MAX_COURT_IDS)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ courts: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase
    .from("courtinfo")
    .select(COURT_CARD_SELECT)
    .in("id", ids)
    .eq("use_or_not", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const courtsWithRules = await attachBookingRules(data ?? []);

  return NextResponse.json(
    { courts: courtsWithRules },
    { headers: { "Cache-Control": "no-store" } }
  );
}
