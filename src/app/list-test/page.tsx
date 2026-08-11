import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AdminAuthGate } from "../admin/AdminAuthGate";
import { CourtFilter } from "../CourtFilter";
import { CourtSearchHeader } from "../CourtSearchHeader";
import type { Court, CourtBookingRule } from "../types";

export const revalidate = 60;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const COURT_CARD_SELECT =
  "id, created_at, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_site_link, basic_map_link, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal";

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

export default async function ListTestPage() {
  const { data, error } = await supabase
    .from("courtinfo")
    .select(COURT_CARD_SELECT)
    .eq("use_or_not", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Courts Korea</h1>
        <p className="text-red-500">에러: {error.message}</p>
      </main>
    );
  }

  const list = await attachBookingRules((data ?? []) as Court[]);

  return (
    <AdminAuthGate>
      <CourtSearchHeader courts={list} />
      <main className="mx-auto flex h-screen w-auto flex-col overflow-hidden bg-black pt-[73px]">
        <CourtFilter courts={list} showViewToggle />
      </main>
    </AdminAuthGate>
  );
}
