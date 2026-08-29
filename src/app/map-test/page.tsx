import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Court, CourtBlogLink, CourtBookingRule } from "../types";
import { MapTestClient } from "./MapTestClient";

export const revalidate = 60;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const MAP_TEST_COURT_SELECT =
  "id, created_at, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_site_link, basic_map_link, basic_latitude, basic_longitude, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth";

async function attachBookingRules(courts: Court[]) {
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  if (courtIds.length === 0) return courts.map((court) => ({ ...court, court_booking_rules: [] }));

  const bookingRules: CourtBookingRule[] = [];
  for (let index = 0; index < courtIds.length; index += 100) {
    const idChunk = courtIds.slice(index, index + 100);
    const { data: rules, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .select("*")
      .in("court_id", idChunk)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    bookingRules.push(...((rules ?? []) as CourtBookingRule[]));
  }

  const rulesByCourtId = new Map<string, CourtBookingRule[]>();
  for (const rule of bookingRules) {
    if (!rule.court_id) continue;
    const current = rulesByCourtId.get(rule.court_id) ?? [];
    current.push(rule);
    rulesByCourtId.set(rule.court_id, current);
  }

  return courts.map((court) => ({
    ...court,
    court_booking_rules: rulesByCourtId.get(court.id) ?? [],
  }));
}

async function attachBlogLinks(courts: Court[]) {
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  if (courtIds.length === 0) return courts.map((court) => ({ ...court, court_blog_links: [] }));

  const allBlogLinks: CourtBlogLink[] = [];
  for (let index = 0; index < courtIds.length; index += 100) {
    const idChunk = courtIds.slice(index, index + 100);
    const { data: blogLinks, error } = await getSupabaseAdmin()
      .from("court_blog_links")
      .select("*")
      .in("court_id", idChunk)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    allBlogLinks.push(...((blogLinks ?? []) as CourtBlogLink[]));
  }

  const linksByCourtId = new Map<string, CourtBlogLink[]>();
  for (const link of allBlogLinks) {
    if (!link.court_id) continue;
    const current = linksByCourtId.get(link.court_id) ?? [];
    current.push(link);
    linksByCourtId.set(link.court_id, current);
  }

  return courts.map((court) => ({
    ...court,
    court_blog_links: linksByCourtId.get(court.id) ?? [],
  }));
}

export default async function MapTestPage() {
  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select(MAP_TEST_COURT_SELECT)
    .eq("use_or_not", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
          지도 테스트 데이터를 불러오지 못했습니다: {error.message}
        </p>
      </main>
    );
  }

  const courtsWithRules = await attachBookingRules((data ?? []) as Court[]);
  const courts = await attachBlogLinks(courtsWithRules);

  return <MapTestClient courts={courts} />;
}
