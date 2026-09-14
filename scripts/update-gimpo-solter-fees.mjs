import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { data: candidates, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_city,use_or_not")
  .eq("basic_city", "김포시")
  .ilike("basic_court_name", "%솔터%")
  .order("basic_court_name");

if (courtError) throw new Error(`솔터 테니스장 조회 실패: ${courtError.message}`);

const exactNames = new Set(["김포 솔터테니스장", "김포 솔터실내테니스장"]);
const targets = (candidates ?? []).filter((court) => exactNames.has(court.basic_court_name));

if (targets.length !== 1) {
  throw new Error(
    `정확한 대상은 1건이어야 하지만 ${targets.length}건입니다. 후보: ${JSON.stringify(candidates)}`
  );
}

const target = targets[0];
const { data: rules, error: ruleError } = await supabase
  .from("court_booking_rules")
  .select("id,label,eligibility,is_active,sort_order")
  .eq("court_id", target.id)
  .eq("is_active", true)
  .order("sort_order");

if (ruleError) throw new Error(`예약 규칙 조회 실패: ${ruleError.message}`);
if (!rules?.length) throw new Error("요금을 연결할 활성 예약 규칙이 없습니다.");

const ruleIds = rules.map(({ id }) => id);
const { data: beforeFees, error: beforeError } = await supabase
  .from("court_booking_rule_fees")
  .select(
    "booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount,lighting_fee_basis_hours,lighting_start_time"
  )
  .in("booking_rule_id", ruleIds);

if (beforeError) throw new Error(`기존 요금 조회 실패: ${beforeError.message}`);

const now = new Date().toISOString();
const feeRows = ruleIds.map((bookingRuleId) => ({
  booking_rule_id: bookingRuleId,
  is_free: false,
  price_basis_hours: 2,
  outdoor_weekday_price: 10000,
  outdoor_weekend_price: 20000,
  indoor_weekday_price: 50000,
  indoor_weekend_price: 60000,
  lighting_fee_separate: true,
  lighting_fee_amount: 10000,
  lighting_fee_basis_hours: 2,
  lighting_start_time: "18:00:00",
  updated_at: now,
}));

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        target,
        rules,
        beforeFees,
        proposedFees: feeRows,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const { error: upsertError } = await supabase
  .from("court_booking_rule_fees")
  .upsert(feeRows, { onConflict: "booking_rule_id" });

if (upsertError) throw new Error(`요금 저장 실패: ${upsertError.message}`);

const { data: savedFees, error: verifyError } = await supabase
  .from("court_booking_rule_fees")
  .select(
    "booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount,lighting_fee_basis_hours,lighting_start_time"
  )
  .in("booking_rule_id", ruleIds)
  .order("booking_rule_id");

if (verifyError) throw new Error(`요금 검증 실패: ${verifyError.message}`);

const expected = feeRows.map(({ updated_at: _updatedAt, ...fee }) => fee);
const normalize = (rows) =>
  [...rows]
    .sort((a, b) => a.booking_rule_id.localeCompare(b.booking_rule_id))
    .map((row) => ({ ...row, lighting_start_time: row.lighting_start_time?.slice(0, 8) ?? null }));

if (JSON.stringify(normalize(savedFees ?? [])) !== JSON.stringify(normalize(expected))) {
  throw new Error(`저장 검증값이 기대와 다릅니다: ${JSON.stringify(savedFees)}`);
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      target,
      rules,
      savedFees,
    },
    null,
    2
  )
);
