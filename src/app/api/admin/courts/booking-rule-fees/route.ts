import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type FeeInput = {
  booking_rule_id?: unknown;
  is_free?: unknown;
  price_basis_hours?: unknown;
  outdoor_weekday_price?: unknown;
  outdoor_weekend_price?: unknown;
  indoor_weekday_price?: unknown;
  indoor_weekend_price?: unknown;
  lighting_fee_separate?: unknown;
  lighting_fee_amount?: unknown;
  lighting_fee_basis_hours?: unknown;
  lighting_start_time?: unknown;
};

function adminApiError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "요금정보 API 처리 중 오류가 발생했습니다." },
    { status: 500 }
  );
}

function normalizePrice(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const price = Number(value);
  if (!Number.isSafeInteger(price) || price < 0 || price > 2_147_483_647) {
    throw new Error("요금은 0원 이상의 숫자로 입력해주세요.");
  }
  return price;
}

function normalizePriceBasisHours(value: unknown): 1 | 2 | 3 {
  const hours = value === null || value === undefined || value === "" ? 1 : Number(value);
  if (hours !== 1 && hours !== 2 && hours !== 3) {
    throw new Error("요금 기준 시간은 1시간, 2시간, 3시간 중에서 선택해주세요.");
  }
  return hours;
}

function normalizeNullablePriceBasisHours(value: unknown): 1 | 2 | 3 | null {
  if (value === null || value === undefined || value === "") return null;
  return normalizePriceBasisHours(value);
}

function normalizeTime(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("조명 적용 시작 시간 형식이 올바르지 않습니다.");
  }

  const time = value.trim();
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    throw new Error("조명 적용 시작 시간은 HH:MM 형식으로 입력해주세요.");
  }
  return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
}

async function getCourtRuleIds(courtId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("court_booking_rules")
    .select("id")
    .eq("court_id", courtId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((rule) => rule.id as string);
}

async function getFees(ruleIds: string[]) {
  if (ruleIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("court_booking_rule_fees")
    .select("*")
    .in("booking_rule_id", ruleIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const courtId = req.nextUrl.searchParams.get("courtId")?.trim();
    if (!courtId) {
      return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
    }

    const ruleIds = await getCourtRuleIds(courtId);
    const fees = await getFees(ruleIds);
    return NextResponse.json({ fees }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { courtId?: unknown; fees?: unknown };
    const courtId = typeof body.courtId === "string" ? body.courtId.trim() : "";
    if (!courtId) {
      return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
    }

    const feeInputs = Array.isArray(body.fees) ? (body.fees as FeeInput[]) : [];
    const ruleIds = await getCourtRuleIds(courtId);
    const allowedRuleIds = new Set(ruleIds);
    const submittedRuleIds = new Set<string>();
    const updatedAt = new Date().toISOString();

    const normalizedFees = feeInputs.map((fee) => {
      const bookingRuleId =
        typeof fee.booking_rule_id === "string" ? fee.booking_rule_id.trim() : "";
      if (!bookingRuleId || !allowedRuleIds.has(bookingRuleId)) {
        throw new Error("이 테니스장에 속하지 않은 예약 규칙이 포함되어 있습니다.");
      }
      if (submittedRuleIds.has(bookingRuleId)) {
        throw new Error("같은 예약 규칙의 요금정보가 중복되었습니다.");
      }
      submittedRuleIds.add(bookingRuleId);

      const isFree = fee.is_free === true;
      const prices = isFree
        ? {
            outdoorWeekdayPrice: null,
            outdoorWeekendPrice: null,
            indoorWeekdayPrice: null,
            indoorWeekendPrice: null,
          }
        : {
            outdoorWeekdayPrice: normalizePrice(fee.outdoor_weekday_price),
            outdoorWeekendPrice: normalizePrice(fee.outdoor_weekend_price),
            indoorWeekdayPrice: normalizePrice(fee.indoor_weekday_price),
            indoorWeekendPrice: normalizePrice(fee.indoor_weekend_price),
          };
      if (!isFree && Object.values(prices).every((price) => price === null)) {
        throw new Error(
          "유료 요금정보에는 실외 또는 실내의 평일/주말·공휴일 요금을 하나 이상 입력해주세요."
        );
      }

      const lightingFeeSeparate = !isFree && fee.lighting_fee_separate === true;
      const lightingFeeAmount = lightingFeeSeparate
        ? normalizePrice(fee.lighting_fee_amount)
        : null;
      const lightingFeeBasisHours = lightingFeeSeparate
        ? normalizeNullablePriceBasisHours(fee.lighting_fee_basis_hours) ??
          (lightingFeeAmount === null ? null : normalizePriceBasisHours(fee.price_basis_hours))
        : null;
      const lightingStartTime = lightingFeeSeparate
        ? normalizeTime(fee.lighting_start_time)
        : null;

      return {
        booking_rule_id: bookingRuleId,
        is_free: isFree,
        price_basis_hours: normalizePriceBasisHours(fee.price_basis_hours),
        outdoor_weekday_price: prices.outdoorWeekdayPrice,
        outdoor_weekend_price: prices.outdoorWeekendPrice,
        indoor_weekday_price: prices.indoorWeekdayPrice,
        indoor_weekend_price: prices.indoorWeekendPrice,
        lighting_fee_separate: lightingFeeSeparate,
        lighting_fee_amount: lightingFeeAmount,
        lighting_fee_basis_hours: lightingFeeBasisHours,
        lighting_start_time: lightingStartTime,
        updated_at: updatedAt,
      };
    });

    if (normalizedFees.length > 0) {
      const { error } = await getSupabaseAdmin()
        .from("court_booking_rule_fees")
        .upsert(normalizedFees, { onConflict: "booking_rule_id" });
      if (error) throw new Error(error.message);
    }

    const removedRuleIds = ruleIds.filter((ruleId) => !submittedRuleIds.has(ruleId));
    if (removedRuleIds.length > 0) {
      const { error } = await getSupabaseAdmin()
        .from("court_booking_rule_fees")
        .delete()
        .in("booking_rule_id", removedRuleIds);
      if (error) throw new Error(error.message);
    }

    const { error: touchError } = await getSupabaseAdmin()
      .from("courtinfo")
      .update({ updated_at: updatedAt })
      .eq("id", courtId);
    if (touchError) throw new Error(touchError.message);

    const fees = await getFees(ruleIds);
    return NextResponse.json({ fees });
  } catch (error) {
    return adminApiError(error);
  }
}
