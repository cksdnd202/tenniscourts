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

const now = new Date().toISOString();
const eticketUrl = "https://www.eticket.or.kr";
const pocheonSoheulUrl = "https://res.pcuc.kr/res/fclt/rental/list/3/003";
const pocheonStadiumUrl = "https://res.pcuc.kr/res/fclt/rental/list/1/003";

const cityCorpCourts = [
  { name: "녹양테니스장", todayPossible: false },
  { name: "송산테니스장", todayPossible: true },
  { name: "장암테니스장", todayPossible: false },
  { name: "푸른마당테니스장", todayPossible: false },
  { name: "호원테니스장", todayPossible: true },
];

const courtDefinitions = [
  ...cityCorpCourts.map(({ name, todayPossible }) => ({
    city: "의정부시",
    name,
    update: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time:
        "의정부시민 매월 25일 09:00, 전체 매월 27일 09:00 다음 달 예약 · ID당 누적 8시간, 1회 최대 3시간",
      booking_site_link: eticketUrl,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: todayPossible,
      booking_open_type: "day",
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: 25,
      booking_open_time_owner: "09:00:00",
      booking_open_day_normal: 27,
      booking_open_time_normal: "09:00:00",
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
      booking_holiday_week: "매월 마지막주 월요일, 설·추석 당일",
    },
    rules: [
      {
        label: "시민 우선예약",
        eligibility: "citizen",
        openDay: 25,
        openTime: "09:00:00",
        sortOrder: 10,
        roundLabel: "의정부시민 우선예약",
      },
      {
        label: "전체 예약",
        eligibility: "normal",
        openDay: 27,
        openTime: "09:00:00",
        sortOrder: 20,
        roundLabel: "전체 예약",
      },
    ],
  })),
  {
    city: "의정부시",
    name: "모두의 운동장(테니스장 A코트)",
    update: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time:
        "매월 1일 10:00 당월분 오픈 · 신청일 기준 14일 이내 · 당일 예약 가능, 이용 1시간 전 마감",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_open_type: "day",
      booking_eligibility_first: null,
      booking_eligibility_second: "normal",
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: 1,
      booking_open_time_normal: "10:00:00",
      booking_normal_iscurrentmonth: true,
      booking_open_offset: "당월",
      booking_holiday_week: "매월 첫째주 월요일, 설날·추석 연휴",
    },
    rules: [
      {
        label: "전체 예약",
        eligibility: "normal",
        openDay: 1,
        openTime: "10:00:00",
        openOffset: "당월",
        sortOrder: 10,
        roundLabel: "당월 예약",
        usageLabel: "당월 이용분 · 신청일 기준 14일 이내",
      },
    ],
  },
  {
    city: "의정부시",
    name: "모두의 운동장(테니스장 B코트)",
    update: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time:
        "매월 1일 10:00 당월분 오픈 · 신청일 기준 14일 이내 · 당일 예약 가능, 이용 1시간 전 마감",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_open_type: "day",
      booking_eligibility_first: null,
      booking_eligibility_second: "normal",
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: 1,
      booking_open_time_normal: "10:00:00",
      booking_normal_iscurrentmonth: true,
      booking_open_offset: "당월",
      booking_holiday_week: "매월 첫째주 월요일, 설날·추석 연휴",
    },
    rules: [
      {
        label: "전체 예약",
        eligibility: "normal",
        openDay: 1,
        openTime: "10:00:00",
        openOffset: "당월",
        sortOrder: 10,
        roundLabel: "당월 예약",
        usageLabel: "당월 이용분 · 신청일 기준 14일 이내",
      },
    ],
  },
  {
    city: "포천시",
    name: "소흘생활체육공원-테니스장",
    update: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time:
        "포천시민 매월 24일 09:00~26일 다음 달 우선예약 · 전체 매월 27일부터 · 당일 예약 불가",
      booking_site_link: pocheonSoheulUrl,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_open_type: "day",
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: 24,
      booking_open_time_owner: "09:00:00",
      booking_open_day_normal: 27,
      booking_open_time_normal: null,
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
    },
    rules: [
      {
        label: "시민 우선예약",
        eligibility: "citizen",
        openDay: 24,
        openTime: "09:00:00",
        sortOrder: 10,
        roundLabel: "포천시민 우선예약",
        usageLabel: "다음 달 이용분 · 24~26일",
      },
      {
        label: "전체 예약",
        eligibility: "normal",
        openDay: 27,
        openTime: null,
        sortOrder: 20,
        roundLabel: "전체 예약",
        usageLabel: "다음 달 이용분 · 27일부터",
      },
    ],
  },
];

const holdDefinitions = [
  {
    city: "의정부시",
    name: "의정부배수지 테니스장",
    update: {
      booking_rule_type: "checking",
      booking_reception_time: "공식 운영기간 종료(2025-04-18) · 현재 예약 마감 · 운영 재개 확인 필요",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: false,
    },
  },
  {
    city: "포천시",
    name: "종합운동장-테니스장",
    update: {
      booking_rule_type: "checking",
      booking_reception_time: "코트별 온라인 접수 · 정확한 월 예약 오픈일 확인 필요",
      booking_site_link: pocheonStadiumUrl,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
    },
  },
];

const allDefinitions = [...courtDefinitions, ...holdDefinitions];
const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name")
  .in("basic_city", ["의정부시", "포천시"])
  .in(
    "basic_court_name",
    allDefinitions.map(({ name }) => name)
  )
  .eq("use_or_not", true);

if (courtError) throw new Error(`대상 코트 조회 실패: ${courtError.message}`);
if (courts.length !== allDefinitions.length) {
  throw new Error(`대상 코트는 ${allDefinitions.length}건이어야 하지만 ${courts.length}건입니다.`);
}

const courtByKey = new Map(courts.map((court) => [`${court.basic_city}:${court.basic_court_name}`, court]));
const resolved = allDefinitions.map((definition) => {
  const court = courtByKey.get(`${definition.city}:${definition.name}`);
  if (!court) throw new Error(`${definition.city} ${definition.name}을 찾지 못했습니다.`);
  return { ...definition, court };
});

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        courtUpdates: resolved.length,
        activeRuleCourts: courtDefinitions.length,
        ruleWrites: courtDefinitions.reduce((sum, definition) => sum + definition.rules.length, 0),
        heldCourts: holdDefinitions.map(({ name }) => name),
      },
      null,
      2
    )
  );
  process.exit(0);
}

for (const { court, update } of resolved) {
  const { error } = await supabase
    .from("courtinfo")
    .update({ ...update, updated_at: now })
    .eq("id", court.id);
  if (error) throw new Error(`${court.basic_court_name} 갱신 실패: ${error.message}`);
}

const ruleWrites = [];
for (const definition of courtDefinitions) {
  const court = courtByKey.get(`${definition.city}:${definition.name}`);
  for (const rule of definition.rules) {
    const payload = {
      court_id: court.id,
      label: rule.label,
      eligibility: rule.eligibility,
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: rule.openDay,
      open_day_of_week: null,
      open_ordinal: null,
      open_time: rule.openTime,
      open_offset: rule.openOffset ?? "다음달",
      open_date_adjustment: "none",
      interval_weeks: null,
      anchor_date: null,
      lottery_desc: null,
      reservation_url: definition.update.booking_site_link ?? eticketUrl,
      booking_round_label: rule.roundLabel,
      usage_period_label: rule.usageLabel ?? "다음 달 이용분",
      is_active: true,
      sort_order: rule.sortOrder,
      updated_at: now,
    };

    const { data: existing, error: readError } = await supabase
      .from("court_booking_rules")
      .select("id")
      .eq("court_id", court.id)
      .eq("label", rule.label)
      .maybeSingle();
    if (readError) throw new Error(`${definition.name} ${rule.label} 조회 실패: ${readError.message}`);

    if (existing) {
      const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existing.id);
      if (error) throw new Error(`${definition.name} ${rule.label} 갱신 실패: ${error.message}`);
      ruleWrites.push({ court: definition.name, label: rule.label, action: "updated" });
    } else {
      const { error } = await supabase.from("court_booking_rules").insert(payload);
      if (error) throw new Error(`${definition.name} ${rule.label} 등록 실패: ${error.message}`);
      ruleWrites.push({ court: definition.name, label: rule.label, action: "inserted" });
    }
  }
}

const targetIds = courts.map(({ id }) => id);
const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name,booking_rule_type,booking_reception_time,booking_site_link")
  .in("id", targetIds)
  .order("basic_city")
  .order("basic_court_name");
if (verifyCourtError) throw new Error(`코트 검증 실패: ${verifyCourtError.message}`);

const activeRuleCourtIds = courtDefinitions.map(
  (definition) => courtByKey.get(`${definition.city}:${definition.name}`).id
);
const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,eligibility,rule_type,open_day_of_month,open_time,open_offset,is_active")
  .in("court_id", activeRuleCourtIds)
  .eq("is_active", true);
if (verifyRuleError) throw new Error(`예약 규칙 검증 실패: ${verifyRuleError.message}`);

const expectedRuleCount = courtDefinitions.reduce((sum, definition) => sum + definition.rules.length, 0);
if (verifiedRules.length !== expectedRuleCount) {
  throw new Error(`활성 예약 규칙은 ${expectedRuleCount}건이어야 하지만 ${verifiedRules.length}건입니다.`);
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      updatedCourtCount: verifiedCourts.length,
      activeRuleCourtCount: activeRuleCourtIds.length,
      activeRuleCount: verifiedRules.length,
      ruleWrites,
      verifiedCourts,
    },
    null,
    2
  )
);
