import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SEOUL_RESERVATION_PROVIDER,
  buildFallbackSeoulMatchKeyFromCourt,
  fetchAllSeoulTennisReservations,
  getCourtStoredSeoulMatchKey,
  getSeoulReservationSource,
  normalizeSeoulServiceName,
} from "@/lib/seoulReservation";
import type { Court } from "@/app/types";

function redirectTo(url: string) {
  return NextResponse.redirect(url, {
    status: 307,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeLoose(value: string | null | undefined) {
  return normalizeSeoulServiceName(value)
    .replace(/테니스장|테니스|야외코트|실내코트|코트|대관/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function scoreFallbackMatch(court: Court, source: ReturnType<typeof getSeoulReservationSource>) {
  let score = 0;

  if (court.basic_city && source.source_area_name && court.basic_city === source.source_area_name) {
    score += 3;
  }

  const courtName = normalizeLoose(court.source_service_name || court.basic_court_name);
  const serviceName = normalizeLoose(source.source_service_name);
  if (courtName && serviceName && (courtName.includes(serviceName) || serviceName.includes(courtName))) {
    score += 4;
  }

  const fallbackKey = buildFallbackSeoulMatchKeyFromCourt(court);
  if (fallbackKey === source.source_match_key) {
    score += 6;
  }

  if (
    court.basic_time_of_use_weekday_from &&
    source.source_time_min &&
    String(court.basic_time_of_use_weekday_from).slice(0, 5) === source.source_time_min
  ) {
    score += 1;
  }

  if (
    court.basic_time_of_use_weekday_to &&
    source.source_time_max &&
    String(court.basic_time_of_use_weekday_to).slice(0, 5) === source.source_time_max
  ) {
    score += 1;
  }

  return score;
}

export async function GET(req: NextRequest) {
  const courtId = req.nextUrl.searchParams.get("courtId") ?? "";

  if (!courtId) {
    return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
  }

  const { data: court, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select("*")
    .eq("id", courtId)
    .single();

  if (error || !court) {
    return NextResponse.json({ error: error?.message ?? "테니스장 정보를 찾지 못했습니다." }, { status: 404 });
  }

  const typedCourt = court as Court;
  const fallbackUrl = typedCourt.booking_site_link?.trim();

  if (!fallbackUrl) {
    return NextResponse.json({ error: "예약 링크가 없습니다." }, { status: 404 });
  }

  const shouldResolveSeoul =
    typedCourt.source_provider === SEOUL_RESERVATION_PROVIDER ||
    (typedCourt.basic_region === "서울" && typedCourt.booking_booking_provide === "public_site");

  if (!shouldResolveSeoul) {
    return redirectTo(fallbackUrl);
  }

  try {
    const apiKey = process.env.SEOUL_OPENAPI_KEY ?? "7248745a74636b733837426b724e4b";
    const rows = await fetchAllSeoulTennisReservations(apiKey);
    const currentMatchKey = getCourtStoredSeoulMatchKey(typedCourt);
    const sources = rows.map((row) => ({ row, source: getSeoulReservationSource(row) }));

    const exactMatch = sources.find(({ source }) => source.source_match_key === currentMatchKey);
    const fallbackMatch =
      exactMatch ??
      sources
        .map((item) => ({ ...item, score: scoreFallbackMatch(typedCourt, item.source) }))
        .filter((item) => item.score >= 7)
        .sort((a, b) => b.score - a.score)[0];

    if (!fallbackMatch) {
      return redirectTo(fallbackUrl);
    }

    const nextUrl = fallbackMatch.row.svcUrl.trim();
    if (nextUrl && nextUrl !== fallbackUrl) {
      await getSupabaseAdmin()
        .from("courtinfo")
        .update({
          booking_site_link: nextUrl,
          ...fallbackMatch.source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", typedCourt.id);
    }

    return redirectTo(nextUrl || fallbackUrl);
  } catch {
    return redirectTo(fallbackUrl);
  }
}
