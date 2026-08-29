import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const editableFields = [
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

    if (value === "") {
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

function adminApiError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "어드민 API 처리 중 오류가 발생했습니다." },
    { status: 500 }
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

async function attachBookingRulesToCourt<T extends { id?: string | null }>(court: T) {
  const [courtWithRules] = await attachBookingRules([court]);
  return courtWithRules;
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("courtinfo")
      .select("*")
      .order("basic_court_name", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courts = await attachBookingRules(data ?? []);

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

    const court = await attachBookingRulesToCourt(data);

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

    const court = await attachBookingRulesToCourt(data);

    return NextResponse.json({ court });
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiError(error);
  }
}
