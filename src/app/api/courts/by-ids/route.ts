import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const COURT_CARD_SELECT =
  "id, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_site_link, basic_map_link, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal";
const MAX_COURT_IDS = 100;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string").slice(0, MAX_COURT_IDS)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ courts: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select(COURT_CARD_SELECT)
    .in("id", ids)
    .eq("use_or_not", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ courts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
