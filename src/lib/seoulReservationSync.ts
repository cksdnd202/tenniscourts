import type { Court } from "@/app/types";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SEOUL_RESERVATION_PROVIDER,
  buildLatestSeoulReservationMap,
  fetchAllSeoulTennisReservations,
  getCourtStoredSeoulMatchKey,
  getSeoulReservationSource,
} from "@/lib/seoulReservation";

export async function syncSeoulReservationLinks() {
  const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
  const rows = await fetchAllSeoulTennisReservations(apiKey);
  const latestByMatchKey = buildLatestSeoulReservationMap(rows);
  const latestByUrl = new Map(rows.map((row) => [row.svcUrl.trim(), { row, source: getSeoulReservationSource(row) }]));

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

  const results: Array<{
    id: string;
    name: string | null;
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
    const match = latestByMatchKey.get(matchKey);
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

  return {
    checkedCourts: courts.length,
    updatedCourts: results.length,
    updates: results,
  };
}
