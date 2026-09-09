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

const daytimeFeeCatalog = [
  {
    city: "의정부시",
    name: "녹양테니스장, 의정부종합운동장테니스장",
    fees: {
      citizen: { outdoorWeekday: 4400, outdoorWeekend: 6600 },
      normal: { outdoorWeekday: 6600, outdoorWeekend: 9900 },
    },
    lightingStartTime: "18:00:00",
  },
  {
    city: "의정부시",
    name: "장암테니스장",
    fees: {
      citizen: { outdoorWeekday: 1100, outdoorWeekend: 1650 },
      normal: { outdoorWeekday: 1650, outdoorWeekend: 2480 },
    },
    lightingStartTime: "18:00:00",
  },
  {
    city: "의정부시",
    name: "송산테니스장",
    fees: {
      citizen: {
        outdoorWeekday: 5500,
        outdoorWeekend: 8250,
        indoorWeekday: 20000,
      },
      normal: { outdoorWeekday: 8250, outdoorWeekend: 12400 },
    },
    lightingStartTime: "18:00:00",
  },
  {
    city: "의정부시",
    name: "푸른마당테니스장",
    fees: {
      citizen: { outdoorWeekday: 8250, outdoorWeekend: 8250 },
      normal: { outdoorWeekday: 8250, outdoorWeekend: 12400 },
    },
    lightingStartTime: "18:00:00",
  },
  {
    city: "의정부시",
    name: "호원테니스장",
    fees: {
      citizen: { indoorWeekday: 20000, indoorWeekend: 20000 },
      normal: { indoorWeekday: 30000, indoorWeekend: 30000 },
    },
  },
  {
    city: "의정부시",
    name: "모두의 운동장(테니스장 A코트), 의정부시청테니스장",
    fees: {
      normal: { outdoorWeekday: 20000, outdoorWeekend: 20000 },
    },
  },
  {
    city: "의정부시",
    name: "모두의 운동장(테니스장 B코트), 의정부시청테니스장",
    fees: {
      normal: { outdoorWeekday: 20000, outdoorWeekend: 20000 },
    },
  },
  {
    city: "포천시",
    name: "소흘생활체육공원-테니스장",
    basisHours: 2,
    fees: {
      citizen: { outdoorWeekday: 10000, outdoorWeekend: 15000 },
      normal: { outdoorWeekday: 10000, outdoorWeekend: 15000 },
    },
    hasVariableNightRate: true,
  },
  {
    city: "포천시",
    name: "포천 종합운동장 테니스장",
    basisHours: 2,
    fees: {
      normal: { outdoorWeekday: 10000, outdoorWeekend: 15000 },
    },
    hasVariableNightRate: true,
  },
];

const names = daytimeFeeCatalog.map(({ name }) => name);
const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name")
  .in("basic_city", ["의정부시", "포천시"])
  .in("basic_court_name", names)
  .eq("use_or_not", true);

if (courtError) throw new Error(`테니스장 조회 실패: ${courtError.message}`);
if (courts.length !== daytimeFeeCatalog.length) {
  throw new Error(`대상 ${daytimeFeeCatalog.length}건 중 ${courts.length}건만 조회됐습니다.`);
}

const courtByKey = new Map(
  courts.map((court) => [`${court.basic_city}:${court.basic_court_name}`, court])
);
const courtIds = courts.map(({ id }) => id);
const { data: rules, error: ruleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,eligibility,label,is_active")
  .in("court_id", courtIds)
  .eq("is_active", true);

if (ruleError) throw new Error(`예약 규칙 조회 실패: ${ruleError.message}`);

const now = new Date().toISOString();
const feeRows = [];

for (const definition of daytimeFeeCatalog) {
  const court = courtByKey.get(`${definition.city}:${definition.name}`);
  if (!court) throw new Error(`${definition.city} ${definition.name}을 찾지 못했습니다.`);

  const courtRules = rules.filter((rule) => rule.court_id === court.id);
  const expectedEligibilities = Object.keys(definition.fees).sort();
  const actualEligibilities = courtRules.map((rule) => rule.eligibility).sort();

  if (JSON.stringify(expectedEligibilities) !== JSON.stringify(actualEligibilities)) {
    throw new Error(
      `${definition.name} 규칙 불일치: 기대 ${expectedEligibilities.join(", ")}, 현재 ${actualEligibilities.join(", ")}`
    );
  }

  for (const rule of courtRules) {
    const fee = definition.fees[rule.eligibility];
    const hasLightingRate = Boolean(
      definition.lightingStartTime || definition.hasVariableNightRate
    );

    feeRows.push({
      booking_rule_id: rule.id,
      is_free: false,
      price_basis_hours: definition.basisHours ?? 1,
      outdoor_weekday_price: fee.outdoorWeekday ?? null,
      outdoor_weekend_price: fee.outdoorWeekend ?? null,
      indoor_weekday_price: fee.indoorWeekday ?? null,
      indoor_weekend_price: fee.indoorWeekend ?? null,
      lighting_fee_separate: hasLightingRate,
      // 요일에 따라 야간 가산액이 달라 단일 금액으로 저장하지 않는다.
      lighting_fee_amount: null,
      lighting_fee_basis_hours: null,
      lighting_start_time: definition.lightingStartTime ?? null,
      updated_at: now,
    });
  }
}

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        courts: daytimeFeeCatalog.length,
        feeRows: feeRows.length,
        excluded: ["의정부배수지 테니스장(비활성·현재 요금 미확인)"],
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

const ruleIds = feeRows.map(({ booking_rule_id }) => booking_rule_id);
const { data: savedFees, error: verifyError } = await supabase
  .from("court_booking_rule_fees")
  .select(
    "booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount,lighting_fee_basis_hours,lighting_start_time"
  )
  .in("booking_rule_id", ruleIds);

if (verifyError) throw new Error(`저장 검증 실패: ${verifyError.message}`);
if (savedFees.length !== feeRows.length) {
  throw new Error(`검증 실패: ${feeRows.length}건 중 ${savedFees.length}건만 저장됐습니다.`);
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      courts: daytimeFeeCatalog.length,
      feeRows: savedFees.length,
      lightingSeparateRows: savedFees.filter((fee) => fee.lighting_fee_separate).length,
    },
    null,
    2
  )
);
