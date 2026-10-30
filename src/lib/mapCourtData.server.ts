import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Court, CourtBlogLink, CourtBookingRule } from "@/app/types";
import { MAP_COURTS_CACHE_TAG } from "@/lib/homeCourtsCache.server";

const MAP_TEST_COURT_SELECT =
  "id, sport_type, created_at, slug, use_or_not, basic_court_name, basic_owner_type, basic_address, basic_region, basic_city, booking_site_link, basic_map_link, basic_latitude, basic_longitude, court_count_hard_indoor, court_count_hard_outdoor, court_count_grass_indoor, court_count_grass_outdoor, court_count_clay_indoor, court_count_clay_outdoor, booking_rule_type, booking_lottery_desc, booking_open_type, booking_eligibility_first, booking_eligibility_second, booking_open_offset, booking_open_day_of_month, booking_open_day_of_week, booking_open_ordinal, booking_open_day_owner, booking_open_time_owner, booking_open_day_normal, booking_open_time_normal, booking_normal_iscurrentmonth, court_surface_counts(id, court_id, surface_type, indoor_count, outdoor_count)";

function chunkCourtIds(courts: Court[]) {
  const courtIds = courts.map((court) => court.id).filter(Boolean);
  return Array.from(
    { length: Math.ceil(courtIds.length / 100) },
    (_, index) => courtIds.slice(index * 100, index * 100 + 100)
  );
}

async function attachBookingRules(courts: Court[]) {
  const courtIdChunks = chunkCourtIds(courts);
  if (courtIdChunks.length === 0) {
    return courts.map((court) => ({ ...court, court_booking_rules: [] }));
  }

  const bookingRuleChunks = await Promise.all(
    courtIdChunks.map(async (idChunk) => {
      const { data: rules, error } = await getSupabaseAdmin()
        .from("court_booking_rules")
        .select("*")
        .in("court_id", idChunk)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw new Error(error.message);
      return (rules ?? []) as CourtBookingRule[];
    })
  );

  const rulesByCourtId = new Map<string, CourtBookingRule[]>();
  for (const rule of bookingRuleChunks.flat()) {
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
  const courtIdChunks = chunkCourtIds(courts);
  if (courtIdChunks.length === 0) {
    return courts.map((court) => ({ ...court, court_blog_links: [] }));
  }

  const blogLinkChunks = await Promise.all(
    courtIdChunks.map(async (idChunk) => {
      const { data: blogLinks, error } = await getSupabaseAdmin()
        .from("court_blog_links")
        .select("*")
        .in("court_id", idChunk)
        .order("sort_order", { ascending: true });

      if (error) throw new Error(error.message);
      return (blogLinks ?? []) as CourtBlogLink[];
    })
  );

  const linksByCourtId = new Map<string, CourtBlogLink[]>();
  for (const link of blogLinkChunks.flat()) {
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

async function fetchMapCourtBase(sportType?: "tennis" | "badminton") {
  let courtRequest = getSupabaseAdmin()
    .from("courtinfo")
    .select(MAP_TEST_COURT_SELECT)
    .eq("use_or_not", true);

  courtRequest = sportType
    ? courtRequest.eq("sport_type", sportType)
    : courtRequest.in("sport_type", ["tennis", "badminton"]);

  const { data, error } = await courtRequest.order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as Court[];
}

const cacheOptions = { revalidate: 60, tags: [MAP_COURTS_CACHE_TAG] };
const getCachedMapCourtBase = unstable_cache(fetchMapCourtBase, ["map-court-base-v1"], cacheOptions);

// The complete map exceeds Next.js's 2 MiB cache-entry limit. Enrich/cache bounded
// chunks while preserving the original court order and every field used by the client.
const getCachedMapCourtChunk = unstable_cache(async (courts: Court[]) => {
  const courtsWithRules = await attachBookingRules(courts);
  return attachBlogLinks(courtsWithRules);
}, ["map-court-chunk-v1"], cacheOptions);

// Only public data is shared. URL, selection, login and app state remain outside the cache.
export async function getCachedMapCourts(sportType?: "tennis" | "badminton") {
  const courts = await getCachedMapCourtBase(sportType);
  const chunks: Court[][] = [];
  for (let index = 0; index < courts.length; index += 100) {
    chunks.push(courts.slice(index, index + 100));
  }
  return (await Promise.all(chunks.map((chunk) => getCachedMapCourtChunk(chunk)))).flat();
}
