import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const editableFields = [
  "court_id",
  "label",
  "eligibility",
  "rule_type",
  "open_type",
  "open_day_of_month",
  "open_day_of_week",
  "open_ordinal",
  "open_time",
  "open_offset",
  "open_date_adjustment",
  "interval_weeks",
  "anchor_date",
  "lottery_desc",
  "reservation_url",
  "booking_round_label",
  "usage_period_label",
  "is_active",
  "sort_order",
] as const;

const numberFields = new Set([
  "open_day_of_month",
  "open_day_of_week",
  "open_ordinal",
  "interval_weeks",
  "sort_order",
]);

function normalizePayload(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (!(field in input)) continue;

    const value = input[field];
    if (field === "is_active") {
      payload[field] = value === null || value === undefined ? true : Boolean(value);
      continue;
    }

    if (numberFields.has(field)) {
      if (value === "" || value === null || value === undefined) {
        payload[field] = field === "sort_order" ? 0 : null;
        continue;
      }

      const numberValue = Number(value);
      payload[field] = Number.isFinite(numberValue) ? numberValue : null;
      continue;
    }

    payload[field] = value === "" ? null : value ?? null;
  }

  return payload;
}

function adminApiError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "예약 규칙 API 처리 중 오류가 발생했습니다." },
    { status: 500 }
  );
}

async function touchCourtUpdatedAt(courtId: string, updatedAt: string) {
  if (!courtId) return;

  const { error } = await getSupabaseAdmin()
    .from("courtinfo")
    .update({ updated_at: updatedAt })
    .eq("id", courtId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const courtId = req.nextUrl.searchParams.get("courtId");

    if (!courtId) {
      return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .select("*")
      .eq("court_id", courtId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const courtId = typeof body.court_id === "string" ? body.court_id : "";

    if (!courtId) {
      return NextResponse.json({ error: "court_id가 필요합니다." }, { status: 400 });
    }

    const updatedAt = new Date().toISOString();
    const payload = {
      ...normalizePayload(body),
      court_id: courtId,
      updated_at: updatedAt,
    };

    const { data, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await touchCourtUpdatedAt(courtId, updatedAt);

    return NextResponse.json({ rule: data }, { status: 201 });
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

    const updatedAt = new Date().toISOString();
    const payload = normalizePayload(body);
    delete payload.court_id;
    payload.updated_at = updatedAt;

    const { data, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courtId = typeof data?.court_id === "string" ? data.court_id : "";
    await touchCourtUpdatedAt(courtId, updatedAt);

    return NextResponse.json({ rule: data });
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

    const updatedAt = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin()
      .from("court_booking_rules")
      .delete()
      .eq("id", id)
      .select("court_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const courtId = typeof data?.court_id === "string" ? data.court_id : "";
    await touchCourtUpdatedAt(courtId, updatedAt);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminApiError(error);
  }
}
