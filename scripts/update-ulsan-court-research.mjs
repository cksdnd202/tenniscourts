import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase 환경 변수가 필요합니다.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 울산 시설정보 공식자료 재검증]";
const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const courts = [
  {
    id: "e4ff02fa-426c-42dc-b0d4-72509511cd6f",
    name: "남산테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "관리사무실 방문 신청 · 문의 052-256-6386",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 2,
    },
    note: "실외 하드코트 2면이며 06:00~22:00 운영합니다. 매주 월요일, 1월 1일, 설·추석 당일은 휴무입니다. 테니스 일일 이용은 관리사무실 방문 신청 방식입니다.",
    rule: {
      rule_type: "on_site",
      booking_round_label: "관리사무실 방문 신청",
      usage_period_label: "당일 이용",
    },
    fee: {
      is_free: false,
      price_basis_hours: 1,
      outdoor_weekday_price: 4000,
      outdoor_weekend_price: 4000,
      lighting_fee_separate: true,
      lighting_fee_amount: 2500,
      lighting_fee_basis_hours: 1,
    },
  },
  {
    id: "988bcd8c-f1f7-42e4-a66b-fbc381da8d7f",
    name: "야음테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "방문 또는 울산남구 체육시설예약서비스 신청 · 관리자 승인 · 정확한 오픈 일정 확인 필요",
      booking_site_link: "https://crs.uncmc.or.kr",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 8,
      court_count_grass_outdoor: 2,
    },
    note: "총 10면으로 하드 8면·인조잔디 2면입니다. 이 중 4면에는 막구조 지붕과 조명이 설치되어 있으나 완전한 실내 코트가 아니므로 실외로 분류했습니다. 하절기(4~9월) 06:00~22:00, 동절기(10~3월) 08:00~22:00이며 대표시간은 하절기로 저장했습니다. 매주 월요일, 1월 1일, 설·추석 당일은 휴무입니다.",
    rule: {
      rule_type: "irregular",
      booking_round_label: "방문 또는 온라인 신청 후 관리자 승인",
      usage_period_label: "시설 예약 화면에서 이용 가능 일정 확인",
      reservation_url: "https://crs.uncmc.or.kr",
    },
    fee: {
      is_free: false,
      price_basis_hours: 1,
      outdoor_weekday_price: 3000,
      outdoor_weekend_price: 3000,
      lighting_fee_separate: true,
      lighting_fee_amount: 2500,
      lighting_fee_basis_hours: 1,
    },
  },
  {
    id: "685da158-5d30-4c60-91a2-a1719cd30f73",
    name: "울산과학기술원 야외 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 신청 · 관리자 승인 · 문의 052-217-1166",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "17:00:00",
      basic_time_of_use_weekday_to: "23:59:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "23:59:00",
    },
    note: "외부 대관 안내 기준 평일 야간 17:00~24:00, 휴일·방학 중 06:00~24:00입니다. DB 시간형 호환을 위해 종료 시각은 23:59로 저장했습니다. 공식 등록 사진에서 하드·클레이 코트가 보이지만 문서에 정확한 면수가 없어 코트 수는 추정 입력하지 않았습니다.",
    rule: {
      rule_type: "phone",
      booking_round_label: "전화 문의 후 신청·관리자 승인",
      usage_period_label: "상시 운영 · 이용 일정 관리자 문의",
      reservation_url: "052-217-1166",
    },
    fee: {
      is_free: false,
      price_basis_hours: 1,
      outdoor_weekday_price: 70000,
      outdoor_weekend_price: 100000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 1,
    },
  },
  {
    id: "a4189bf5-2034-4b13-a3b7-90a3abdde1a9",
    name: "한국도로공사 서울산지사 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "공유누리 선착순 신청 후 관리자 승인 · 이용일 10일 전부터 3일 전까지 신청",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "08:30:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
      court_count_grass_outdoor: 1,
    },
    note: "실외 인조구장 1면이며 월·수·금 06:00~08:30만 개방합니다. 토·일·공휴일은 미개방입니다. 공유누리의 게시 접수기간은 2025년 말 종료된 값이므로 고정 오픈일로 저장하지 않고, 이용일 10일 전부터 3일 전까지라는 승인 기준을 보존했습니다.",
    rule: {
      rule_type: "checking",
      booking_round_label: "이용일 10일 전부터 3일 전까지 선착순 신청",
      usage_period_label: "월·수·금 06:00~08:30",
    },
    fee: { is_free: true },
  },
  {
    id: "097107d0-139c-4713-bbdf-5dd79fb063b2",
    name: "한국수력원자력㈜ 새울원자력본부 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "052-715-2804 연락 후 이용신청서 수령·제출 및 관리자 승인",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "22:30:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "22:30:00",
    },
    note: "평일·토요일·공휴일 07:00~22:30 운영하며 일요일은 미개방입니다. 외부 이용자는 전화로 이용신청서를 받아 제출한 뒤 승인을 받아야 합니다. 공식 문서에 정확한 면수와 재질이 없어 추정 입력하지 않았습니다.",
    rule: {
      rule_type: "phone",
      booking_round_label: "전화 문의 후 이용신청서 제출·승인",
      usage_period_label: "평일·토요일·공휴일 이용",
      reservation_url: "052-715-2804",
    },
    fee: { is_free: true },
  },
  {
    id: "b7b9a39c-24e7-48e1-ad63-5f5c05522cc2",
    name: "본사-테니스코트1,2",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      // courtinfo의 레거시 컬럼은 주차 enum이라 25일을 저장할 수 없다.
      // 실제 일자 기반 규칙은 court_booking_rules.open_day_of_month에 저장한다.
      booking_open_day_of_month: null,
      booking_open_time_normal: "13:00:00",
      booking_open_offset: "다음달",
      booking_reception_time: "매월 25일 13:00 다음 달 이용분 온라인 신청 오픈 · 신청 후 승인",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
    },
    note: "코트 2면이며 표면 재질은 공식 문서에 없어 구조화하지 않았습니다. 최신 한국동서발전 안내 기준 휴일·공휴일 10:00~17:00 이용하며, 다음 달 이용분은 매월 25일 13:00부터 온라인 신청합니다. 과거 ALIO의 매월 1일 안내보다 최신 운영기관 자료를 적용했습니다.",
    rule: {
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 25,
      open_time: "13:00:00",
      open_offset: "다음달",
      booking_round_label: "매월 25일 13:00 온라인 신청",
      usage_period_label: "다음 달 이용분",
    },
    fee: { is_free: true },
  },
  {
    id: "1ef2a1c5-6e19-47f4-b808-b07fddeaf63c",
    name: "안전보건공단 본부(울산) 테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_open_day_of_month: null,
      booking_open_time_normal: "00:00:00",
      booking_open_offset: "30",
      booking_reception_time: "매일 00:00 한 달 이내 일정 온라인 선착순 오픈 · 관리자 승인",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "테니스 코트는 총 2면이지만 공식 안내상 입구 안쪽 B면 1면만 일반 개방합니다. 표면 재질은 미표기입니다. 주말·공휴일 06:00~18:00에 3시간씩 4타임 운영하며, 매일 00:00에 현재일부터 한 달 이내 일정을 선착순 신청한 후 관리자 승인을 받습니다. 동일인은 하루 1면·1타임만 이용할 수 있습니다.",
    rule: {
      rule_type: "rolling",
      open_time: "00:00:00",
      open_offset: "30",
      booking_round_label: "매일 00:00 선착순 오픈",
      usage_period_label: "현재일부터 한 달 이내 · 주말·공휴일 3시간 회차",
    },
    fee: { is_free: true },
  },
];

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const resetRuleFields = {
  open_type: null,
  open_day_of_month: null,
  open_day_of_week: null,
  open_ordinal: null,
  open_time: null,
  open_offset: null,
  interval_weeks: null,
  anchor_date: null,
  lottery_desc: null,
  open_date_adjustment: "none",
  target_condition: null,
};

const ids = courts.map(({ id }) => id);
const { data: existingCourts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,etc_desc,booking_site_link")
  .in("id", ids);
if (courtReadError) throw courtReadError;
if (existingCourts.length !== courts.length) throw new Error(`대상 시설 수 불일치: ${existingCourts.length}/${courts.length}`);

const { data: existingRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,reservation_url")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;
const ruleByCourt = new Map();
for (const rule of existingRules) if (!ruleByCourt.has(rule.court_id)) ruleByCourt.set(rule.court_id, rule);

console.log(`대상 ${courts.length}개 · 적용 모드: ${shouldApply ? "YES" : "NO (dry-run)"}`);
if (!shouldApply) {
  console.table(courts.map(({ name, values, fee }) => ({
    name,
    rule: values.booking_rule_type,
    weekday: values.basic_time_of_use_weekday_from ? `${values.basic_time_of_use_weekday_from}-${values.basic_time_of_use_weekday_to}` : "-",
    weekend: values.basic_time_of_use_weekend_from ? `${values.basic_time_of_use_weekend_from}-${values.basic_time_of_use_weekend_to}` : "-",
    fee: fee.is_free ? "무료" : "유료",
  })));
  process.exit(0);
}

for (const config of courts) {
  const existing = existingCourts.find(({ id }) => id === config.id);
  const existingRule = ruleByCourt.get(config.id);
  if (!existingRule) throw new Error(`${config.name}의 활성 예약 규칙이 없습니다.`);

  const { error: courtUpdateError } = await supabase
    .from("courtinfo")
    .update({
      ...config.values,
      etc_desc: appendNote(existing.etc_desc, config.note),
      updated_at: now,
    })
    .eq("id", config.id);
  if (courtUpdateError) throw new Error(`${config.name} 시설 갱신 실패: ${courtUpdateError.message}`);

  const { error: ruleUpdateError } = await supabase
    .from("court_booking_rules")
    .update({
      ...resetRuleFields,
      label: "전체",
      eligibility: "normal",
      is_active: true,
      sort_order: 10,
      reservation_url: config.values.booking_site_link ?? existingRule.reservation_url ?? existing.booking_site_link,
      booking_round_label: null,
      usage_period_label: null,
      ...config.rule,
      updated_at: now,
    })
    .eq("id", existingRule.id);
  if (ruleUpdateError) throw new Error(`${config.name} 예약 규칙 갱신 실패: ${ruleUpdateError.message}`);

  const fee = {
    booking_rule_id: existingRule.id,
    is_free: config.fee.is_free,
    price_basis_hours: config.fee.price_basis_hours ?? 1,
    outdoor_weekday_price: config.fee.outdoor_weekday_price ?? null,
    outdoor_weekend_price: config.fee.outdoor_weekend_price ?? null,
    indoor_weekday_price: null,
    indoor_weekend_price: null,
    lighting_fee_separate: config.fee.lighting_fee_separate ?? false,
    lighting_fee_amount: config.fee.lighting_fee_amount ?? null,
    lighting_fee_basis_hours: config.fee.lighting_fee_basis_hours ?? null,
    lighting_start_time: null,
    updated_at: now,
  };
  const { error: feeError } = await supabase
    .from("court_booking_rule_fees")
    .upsert(fee, { onConflict: "booking_rule_id" });
  if (feeError) throw new Error(`${config.name} 요금 갱신 실패: ${feeError.message}`);

  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,basic_time_of_use_weekday_from,basic_time_of_use_weekday_to,basic_time_of_use_weekend_from,basic_time_of_use_weekend_to,court_count_hard_outdoor,court_count_grass_outdoor,etc_desc")
  .in("id", ids)
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,open_day_of_month,open_time,open_offset,is_active")
  .in("court_id", ids)
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,lighting_fee_separate,lighting_fee_amount,lighting_fee_basis_hours")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const invalidNotes = verifiedCourts.filter(({ etc_desc }) => !etc_desc?.includes(marker));
if (verifiedCourts.length !== 7 || verifiedRules.length !== 7 || verifiedFees.length !== 7 || invalidNotes.length) {
  throw new Error(`검증 실패: courts=${verifiedCourts.length}, rules=${verifiedRules.length}, fees=${verifiedFees.length}, notes=${invalidNotes.length}`);
}

console.log(JSON.stringify({
  verifiedCourts: verifiedCourts.length,
  verifiedRules: verifiedRules.length,
  verifiedFees: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({ ...acc, [rule_type]: (acc[rule_type] ?? 0) + 1 }), {}),
}, null, 2));
