import { normalizeCourtDescription } from "@/lib/normalizeCourtDescription";
import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { invalidateHomeCourtsCache } from "@/lib/homeCourtsCache.server";

import { CourtAmenityValidationError, parseCourtAmenities } from "@/lib/courtAmenities";

const editableFields = [
  "sport_type",
  "slug",
  "basic_court_name",
  "basic_owner_type",
  "basic_address",
  "basic_map_link",
  "basic_latitude",
  "basic_longitude",
  "basic_region",
  "basic_city",
  "time_of_use_same",
  "basic_time_of_use_weekday_from",
  "basic_time_of_use_weekday_to",
  "basic_time_of_use_weekend_from",
  "basic_time_of_use_weekend_to",
  "use_or_not",
  "court_count_hard_indoor",
  "court_count_hard_outdoor",
  "court_count_grass_indoor",
  "court_count_grass_outdoor",
  "court_count_clay_indoor",
  "court_count_clay_outdoor",
  "booking_site_link",
  "booking_reception_time",
  "booking_rule_type",
  "booking_lottery_desc",
  "booking_open_type",
  "booking_eligibility_first",
  "booking_eligibility_second",
  "booking_open_day_of_month",
  "booking_open_day_of_week",
  "booking_open_ordinal",
  "booking_open_day_owner",
  "booking_open_time_owner",
  "booking_open_day_normal",
  "booking_open_time_normal",
  "booking_normal_iscurrentmonth",
  "booking_open_time_local",
  "booking_open_offset",
  "booking_online_reserve_possible",
  "booking_holiday_week",
  "booking_today_booking_possible",
  "booking_booking_provide",
  "etc_desc",
  "source_provider",
  "source_service_id",
  "source_service_name",
  "source_place_name",
  "source_area_name",
  "source_time_min",
  "source_time_max",
  "source_match_key",
  "source_synced_at",
] as const;

const validSportTypes = new Set(["tennis", "badminton"]);
const validSurfaceTypes = new Set([
  "hard",
  "grass",
  "clay",
  "wood",
  "urethane",
  "synthetic",
  "artificial_grass",
  "clay_soil",
  "modular",
  "concrete",
  "pending",
  "other",
]);

const numberFields = new Set([
  "court_count_hard_indoor",
  "court_count_hard_outdoor",
  "court_count_grass_indoor",
  "court_count_grass_outdoor",
  "court_count_clay_indoor",
  "court_count_clay_outdoor",
  "booking_open_day_of_month",
  "booking_open_day_of_week",
  "booking_open_ordinal",
  "booking_open_day_owner",
  "booking_open_day_normal",
  "basic_latitude",
  "basic_longitude",
]);

const nonNegativeNumberFields = new Set([
  "court_count_hard_indoor",
  "court_count_hard_outdoor",
  "court_count_grass_indoor",
  "court_count_grass_outdoor",
  "court_count_clay_indoor",
  "court_count_clay_outdoor",
]);

const booleanFields = new Set([
  "use_or_not",
  "time_of_use_same",
  "booking_normal_iscurrentmonth",
  "booking_online_reserve_possible",
  "booking_today_booking_possible",
]);

function normalizePayload(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (!(field in input)) continue;

    const value = input[field];

    if (field === "sport_type") {
      payload[field] = validSportTypes.has(String(value)) ? String(value) : "tennis";
    } else if (field === "etc_desc") {
      payload[field] = normalizeCourtDescription(typeof value === "string" ? value : null) || null;
    } else if (value === "") {
      payload[field] = nonNegativeNumberFields.has(field) ? 0 : null;
    } else if (numberFields.has(field)) {
      const numberValue =
        value === null || value === undefined
          ? nonNegativeNumberFields.has(field)
            ? 0
            : null
          : Number(value);
      payload[field] =
        numberValue === null
          ? null
          : nonNegativeNumberFields.has(field)
            ? Math.max(0, numberValue)
            : numberValue;
    } else if (booleanFields.has(field)) {
      payload[field] = value === null || value === undefined ? null : Boolean(value);
    } else {
      payload[field] = value ?? null;
    }
  }

  return payload;
}

function normalizeSurfaceCounts(input: unknown) {
  if (!Array.isArray(input)) return undefined;

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const surfaceType = String(row.surface_type ?? "");
      if (!validSurfaceTypes.has(surfaceType)) return null;
      return {
        surface_type: surfaceType,
        indoor_count: Math.max(0, Math.trunc(Number(row.indoor_count) || 0)),
        outdoor_count: Math.max(0, Math.trunc(Number(row.outdoor_count) || 0)),
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

function adminApiError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "어드민 API 처리 중 오류가 발생했습니다." },
    { status: error instanceof CourtAmenityValidationError ? 400 : 500 }
  );
}

async function attachBookingRules<T extends { id?: string | null }>(courts: T[]) {
  const ids = courts.map((court) => court.id).filter((id): id is string => Boolean(id));
  if (!ids.length) return courts.map((court) => ({ ...court, court_booking_rules: [] }));

  const rules: Record<string, unknown>[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const idChunk = ids.slice(index, index + 100);
    const { data, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .select("*")
      .in("court_id", idChunk)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    rules.push(...(data ?? []));
  }

  const rulesByCourtId = new Map<string, unknown[]>();
  for (const rule of rules) {
    const courtId = typeof rule.court_id === "string" ? rule.court_id : "";
    if (!courtId) continue;
    const currentRules = rulesByCourtId.get(courtId) ?? [];
    currentRules.push(rule);
    rulesByCourtId.set(courtId, currentRules);
  }

  return courts.map((court) => ({
    ...court,
    court_booking_rules: court.id ? rulesByCourtId.get(court.id) ?? [] : [],
  }));
}

async function attachSurfaceCounts<T extends { id?: string | null }>(courts: T[]) {
  const ids = courts.map((court) => court.id).filter((id): id is string => Boolean(id));
  if (!ids.length) return courts.map((court) => ({ ...court, court_surface_counts: [] }));

  const rows: Record<string, unknown>[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await getSupabaseAdmin()
      .from("court_surface_counts")
      .select("*")
      .in("court_id", ids.slice(index, index + 100))
      .order("surface_type", { ascending: true });
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }

  const byCourtId = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const courtId = typeof row.court_id === "string" ? row.court_id : "";
    if (!courtId) continue;
    byCourtId.set(courtId, [...(byCourtId.get(courtId) ?? []), row]);
  }
  return courts.map((court) => ({
    ...court,
    court_surface_counts: court.id ? byCourtId.get(court.id) ?? [] : [],
  }));
}

async function attachAmenities<T extends { id?: string | null }>(courts: T[]) {
  const ids = courts.map((court) => court.id).filter((id): id is string => Boolean(id));
  const byCourtId = new Map<string, Record<string, unknown>[]>();
  // At most 800 rows per request, below the Data API row limit.
  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await getSupabaseAdmin()
      .from("court_amenities")
      .select("court_id, amenity_key, status, checked_at")
      .in("court_id", ids.slice(index, index + 100));
    if (error) throw new Error(`편의시설을 불러오지 못했습니다: ${error.message}`);
    for (const row of data ?? []) {
      byCourtId.set(row.court_id, [...(byCourtId.get(row.court_id) ?? []), row]);
    }
  }
  return courts.map((court) => ({
    ...court,
    court_amenities: court.id ? byCourtId.get(court.id) ?? [] : [],
  }));
}

async function saveAmenities(courtId: string, rows: ReturnType<typeof parseCourtAmenities>) {
  if (rows === undefined) return;
  const { error } = await getSupabaseAdmin().from("court_amenities").upsert(
    rows.map((row) => ({
      ...row,
      court_id: courtId,
      checked_at: new Date().toISOString(),
    })),
    { onConflict: "court_id,amenity_key" }
  );
  if (error) throw new Error(`편의시설을 저장하지 못했습니다: ${error.message}`);
}

async function attachCourtRelations<T extends { id?: string | null }>(courts: T[]) {
  return attachAmenities(await attachSurfaceCounts(await attachBookingRules(courts)));
}

async function attachCourtRelationsToCourt<T extends { id?: string | null }>(court: T) {
  const [courtWithRelations] = await attachCourtRelations([court]);
  return courtWithRelations;
}

async function replaceSurfaceCounts(
  courtId: string,
  rows: ReturnType<typeof normalizeSurfaceCounts>
) {
  if (rows === undefined) return;
  const admin = getSupabaseAdmin();
  const { error: deleteError } = await admin
    .from("court_surface_counts")
    .delete()
    .eq("court_id", courtId);
  if (deleteError) throw new Error(deleteError.message);
  if (rows.length === 0) return;
  const { error: insertError } = await admin
    .from("court_surface_counts")
    .insert(rows.map((row) => ({ ...row, court_id: courtId })));
  if (insertError) throw new Error(insertError.message);
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const courtId = req.nextUrl.searchParams.get("id")?.trim();

    if (courtId) {
      const { data, error } = await getSupabaseAdmin()
        .from("courtinfo")
        .select("*")
        .eq("id", courtId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "테니스장을 찾을 수 없습니다." }, { status: 404 });
      }

      const court = await attachCourtRelationsToCourt(data);
      return NextResponse.json({ court }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .select("*")
      .order("basic_court_name", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courts = await attachCourtRelations(data ?? []);

    return NextResponse.json({ courts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const amenities = parseCourtAmenities(body.court_amenities);
    const surfaceCounts = normalizeSurfaceCounts(body.court_surface_counts);
    const payload = {
      ...normalizePayload(body),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await saveAmenities(data.id, amenities);
    await replaceSurfaceCounts(data.id, surfaceCounts);
    const court = await attachCourtRelationsToCourt(data);
    invalidateHomeCourtsCache();

    return NextResponse.json({ court }, { status: 201 });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const amenities = parseCourtAmenities(body.court_amenities);
    const surfaceCounts = normalizeSurfaceCounts(body.court_surface_counts);
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const payload = normalizePayload(body);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await saveAmenities(data.id, amenities);
    await replaceSurfaceCounts(data.id, surfaceCounts);
    const court = await attachCourtRelationsToCourt(data);
    invalidateHomeCourtsCache();

    return NextResponse.json({ court });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { ids?: unknown; use_or_not?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
      : [];
    const useOrNot = body.use_or_not;

    if (ids.length === 0) {
      return NextResponse.json({ error: "변경할 테니스장을 선택해주세요." }, { status: 400 });
    }

    if (typeof useOrNot !== "boolean") {
      return NextResponse.json({ error: "use_or_not 값이 필요합니다." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .update({ use_or_not: useOrNot, updated_at: new Date().toISOString() })
      .in("id", ids)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courts = await attachCourtRelations(data ?? []);
    invalidateHomeCourtsCache();

    return NextResponse.json({ courts, updatedCount: courts.length });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin().from("courtinfo").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateHomeCourtsCache();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiError(error);
  }
}
