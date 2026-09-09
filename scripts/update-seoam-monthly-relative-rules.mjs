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

const courtNames = [1, 2, 3].map((number) => `서암생활체육공원 테니스장 (${number}번)`);
const now = new Date().toISOString();

const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,booking_reception_time")
  .eq("basic_city", "김포시")
  .in("basic_court_name", courtNames)
  .order("basic_court_name");

if (courtError) throw new Error(`서암 코트 조회 실패: ${courtError.message}`);
if (courts.length !== 3) throw new Error(`서암 코트는 3건이어야 하지만 ${courts.length}건입니다.`);

const courtIds = courts.map(({ id }) => id);
const { data: rules, error: ruleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,eligibility,rule_type,open_time,open_offset,anchor_date,is_active")
  .in("court_id", courtIds)
  .eq("is_active", true)
  .order("court_id")
  .order("sort_order");

if (ruleError) throw new Error(`서암 예약 규칙 조회 실패: ${ruleError.message}`);
if (rules.length !== 6) throw new Error(`서암 활성 예약 규칙은 6건이어야 하지만 ${rules.length}건입니다.`);

if (!shouldApply) {
  console.log(JSON.stringify({ mode: "dry-run", courts, rules }, null, 2));
  process.exit(0);
}

const receptionTime = "다음 달 1일 기준 7일 전 18:00 오픈 · 이용일 14~1일 전 신청";
const { data: updatedCourts, error: updateCourtError } = await supabase
  .from("courtinfo")
  .update({
    booking_reception_time: receptionTime,
    updated_at: now,
  })
  .in("id", courtIds)
  .select("id,basic_court_name,booking_rule_type,booking_reception_time");

if (updateCourtError) throw new Error(`서암 코트 갱신 실패: ${updateCourtError.message}`);
if (updatedCourts.length !== 3) throw new Error(`서암 코트 갱신 수 불일치: ${updatedCourts.length}`);

const ruleIds = rules.map(({ id }) => id);
const { data: updatedRules, error: updateRuleError } = await supabase
  .from("court_booking_rules")
  .update({
    rule_type: "monthly_relative",
    open_type: null,
    open_day_of_month: null,
    open_day_of_week: null,
    open_ordinal: null,
    open_time: "18:00:00",
    open_offset: "7",
    open_date_adjustment: "none",
    interval_weeks: null,
    anchor_date: "2022-09-01",
    lottery_desc: null,
    booking_round_label: "다음 달 일정 온라인 선착순",
    usage_period_label: "2022년 9월부터 월 단위 · 다음 달 1일 기준 7일 전 18:00",
    updated_at: now,
  })
  .in("id", ruleIds)
  .select("id,court_id,label,eligibility,rule_type,open_time,open_offset,anchor_date,open_date_adjustment");

if (updateRuleError) throw new Error(`서암 예약 규칙 갱신 실패: ${updateRuleError.message}`);
if (updatedRules.length !== 6) throw new Error(`서암 예약 규칙 갱신 수 불일치: ${updatedRules.length}`);

const invalidRules = updatedRules.filter(
  (rule) =>
    rule.rule_type !== "monthly_relative" ||
    rule.open_time !== "18:00:00" ||
    rule.open_offset !== "7" ||
    rule.anchor_date !== "2022-09-01" ||
    rule.open_date_adjustment !== "none"
);
if (invalidRules.length) throw new Error(`서암 예약 규칙 검증 실패: ${JSON.stringify(invalidRules)}`);

console.log(
  JSON.stringify(
    {
      mode: "applied",
      updatedCourtCount: updatedCourts.length,
      updatedRuleCount: updatedRules.length,
      updatedCourts,
      updatedRules,
    },
    null,
    2
  )
);
