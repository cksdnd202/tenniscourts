import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CourtFilter } from "./CourtFilter";
import type { Court, CourtBookingRule } from "./types";
import { CourtSearchHeader } from "./CourtSearchHeader";

export const revalidate = 60;

const COURT_CARD_SELECT =
  "id, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_site_link, basic_map_link, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal";

async function attachBookingRules(courts: Court[]) {
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  if (courtIds.length === 0) return courts.map((court) => ({ ...court, court_booking_rules: [] }));

  const { data: rules } = await getSupabaseAdmin()
    .from("court_booking_rules")
    .select("*")
    .in("court_id", courtIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rulesByCourtId = new Map<string, NonNullable<Court["court_booking_rules"]>>();
  const bookingRules = (rules ?? []) as CourtBookingRule[];
  for (const rule of bookingRules) {
    const courtId = rule.court_id;
    if (!courtId) continue;
    const current = rulesByCourtId.get(courtId) ?? [];
    current.push(rule as NonNullable<Court["court_booking_rules"]>[number]);
    rulesByCourtId.set(courtId, current);
  }

  return courts.map((court) => ({
    ...court,
    court_booking_rules: rulesByCourtId.get(court.id) ?? [],
  }));
}

export default async function Home() {
  // 타입 지정
  const { data, error } = await supabase
    .from("courtinfo")
    .select(COURT_CARD_SELECT)
    .eq("use_or_not", true)
    .order("basic_court_name", { ascending: true });
  
  const typedData = data as Court[] | null;

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">🎾 Courts Korea</h1>
        <p className="text-red-8600">에러: {error.message}</p>
      </main>
    );
  }

  const list = await attachBookingRules(typedData ?? []); // 안전하게 기본값

  return (
    <>
      {/* 상단 헤더 + 검색 */}
      <CourtSearchHeader courts={list} />
      <main className="w-auto mx-auto h-screen flex flex-col overflow-hidden pt-[73px] bg-[#000000]">
        {/* 코트 필터 및 리스트 */}
        <CourtFilter courts={list} />
      </main>
    </>
  );
}
