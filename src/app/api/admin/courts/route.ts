import { NextRequest, NextResponse } from "next/server";
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

function isLocalhost(req: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(req.nextUrl.hostname);
}

function denyUnlessLocal(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || !isLocalhost(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return null;
}

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

export async function GET(req: NextRequest) {
  const denied = denyUnlessLocal(req);
  if (denied) return denied;

  const { data, error } = await getSupabaseAdmin()
    .from("courtinfo")
    .select("*")
    .order("basic_court_name", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ courts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = denyUnlessLocal(req);
  if (denied) return denied;

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

  return NextResponse.json({ court: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const denied = denyUnlessLocal(req);
  if (denied) return denied;

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

  return NextResponse.json({ court: data });
}

export async function DELETE(req: NextRequest) {
  const denied = denyUnlessLocal(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from("courtinfo").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
