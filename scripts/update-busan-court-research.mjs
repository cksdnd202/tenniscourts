import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase 환경 변수가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const marker = "[2026-09 부산 시설정보 공식자료 재검증]";
const now = new Date().toISOString();
const sharing = (resourceId) =>
  `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`;

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
    id: "9ac18770-1bdd-4e81-9e14-d523fee1c373",
    name: "대저차량사업소 테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      booking_open_day_of_month: 1,
      booking_open_time_normal: "09:00:00",
      booking_open_offset: "다음달",
      booking_reception_time: "매월 1일 09:00~20일 접수 · 22일까지 승인 · 25일까지 결제",
      booking_site_link: "https://data.humetro.busan.kr/homepage/default/page/subLocation.do?menu_no=1001020701",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "10:00:00",
      basic_time_of_use_weekday_to: "16:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "13:00:00",
      ...zeroCounts,
      court_count_clay_outdoor: 3,
    },
    note: "화·목·금 10:00~16:00, 일요일 09:00~13:00 운영입니다. 부산 생활체육시설 자료의 클레이 3면을 입력했습니다. 2025년 인조잔디 정비 계획이 있어 최신 표면은 재확인이 필요합니다. 표준 사용료는 미정이며 2026년 10월 말까지 임시 무료 운영 안내가 있어 영구 무료 요금으로 등록하지 않았습니다.",
    rule: {
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 1,
      open_time: "09:00:00",
      open_offset: "다음달",
      booking_round_label: "매월 1일 09:00부터 20일까지 접수",
      usage_period_label: "다음 달 이용분",
      reservation_url: "https://data.humetro.busan.kr/homepage/default/page/subLocation.do?menu_no=1001020701",
    },
  },
  {
    id: "86834506-c270-411f-9f72-d9c7ac453034",
    name: "부산경남본부(렛츠런파크부산경남) 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "렛츠런파크 부산경남 홈페이지 대관신청 · 정확한 오픈 일정 확인 필요",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "10:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "수·목·토 10:00~18:00 운영하며 월·화·금·일요일 및 공휴일은 휴관합니다. 공개자료에서 코트 면수와 표면은 확인되지 않았습니다.",
    fee: { is_free: true },
  },
  {
    id: "8f42f5ea-c2bc-4999-bd60-c3015a9b4acb",
    name: "부산환경공단 생곡사업단 테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "현장 선착순 이용 · 행사 사용은 051-309-7111 문의",
      ...zeroCounts,
      court_count_clay_outdoor: 2,
    },
    note: "실외 마사토 2면입니다. 일반 이용은 현장 선착순이며 행사 사용은 사업단 문의가 필요합니다. 운영시간은 공개자료에 없어 입력하지 않았습니다.",
    rule: { rule_type: "on_site", booking_round_label: "현장 선착순 이용", reservation_url: sharing("BK30O0024856") },
    fee: { is_free: true },
  },
  {
    id: "4952a956-377a-4dd8-a2ea-2d972ad38c47",
    name: "부산환경공단 서부사업소 테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "현장 선착순 이용 · 행사 사용은 051-970-0414 문의",
      ...zeroCounts,
      court_count_clay_outdoor: 1,
    },
    note: "실외 마사토 1면입니다. 일반 이용은 현장 선착순이며 행사 사용은 사업소 문의가 필요합니다. 운영시간은 공개자료에 없어 입력하지 않았습니다.",
    rule: { rule_type: "on_site", booking_round_label: "현장 선착순 이용", reservation_url: sharing("BK30O0547739") },
    fee: { is_free: true },
  },
  {
    id: "1dd7fd83-d838-4e2b-ad2c-c3086632b895",
    name: "고리원자력본부 사택 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "사택 주민·동호회 우선 · 외부 이용자는 전화 문의 및 승인 필요",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "10:00:00",
      basic_time_of_use_weekday_to: "17:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "평일 10:00~17:00 운영하고 주말은 휴관합니다. 5번 코트를 외부에 개방한다는 안내가 있으나 전체 면수와 표면은 확인되지 않았습니다. ALIO는 유료(금액 미표기), 공유누리는 무료로 서로 달라 요금은 등록하지 않았습니다.",
    rule: { rule_type: "phone", booking_round_label: "전화 문의 후 승인", reservation_url: "02-726-3926" },
  },
  {
    id: "bb2af5e5-2a19-4337-94d3-bb2a61ea49cb",
    name: "부산환경공단 기장사업소 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "부산환경공단 홈페이지 인터넷 선착순 예약 · 오픈 일정 확인 필요",
      booking_site_link: "https://www.beco.or.kr/kor/CMS/FacilityPark/Area04/appInfo.do?mCode=MN0263",
      ...zeroCounts,
      court_count_grass_outdoor: 3,
    },
    note: "실외 인조잔디 3면이며 인터넷 선착순 예약 시설입니다. 고정 오픈 시각과 운영시간은 공개자료에서 확정하지 못했습니다.",
    fee: { is_free: true },
  },
  {
    id: "93a20ef9-b811-4238-83bc-100e78506d2a",
    name: "부산환경공단 정관사업소 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "부산환경공단 홈페이지 인터넷 선착순 예약 · 오픈 일정 확인 필요",
      booking_site_link: "https://www.beco.or.kr/kor/CMS/FacilityPark/Area05/appInfo.do?mCode=MN0264",
      ...zeroCounts,
      court_count_grass_outdoor: 2,
    },
    note: "실외 인조잔디 2면이며 인터넷 선착순 예약 시설입니다. 고정 오픈 시각과 운영시간은 공개자료에서 확정하지 못했습니다.",
    fee: { is_free: true },
  },
  {
    id: "f8592f41-09da-4132-a5c7-ec223de4ae53",
    name: "부산환경공단 남부사업소 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "부산환경공단 홈페이지 인터넷 예약 · 오픈 일정 확인 필요",
      booking_site_link: "https://www.beco.or.kr/kor/CMS/FacilityPark/Area02/appInfo.do?mCode=MN0261",
      ...zeroCounts,
      court_count_grass_outdoor: 5,
    },
    note: "실외 인조잔디 5면이며 인터넷 예약 시설입니다. 고정 오픈 시각과 운영시간은 공개자료에서 확정하지 못했습니다.",
    fee: { is_free: true },
  },
  {
    id: "567cfb36-7d89-43fa-a4ac-3a4ae5a9d524",
    name: "부산환경공단 수영사업단 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "부산환경공단 홈페이지 인터넷 예약 · 오픈 일정 확인 필요",
      booking_site_link: "https://www.beco.or.kr/kor/CMS/FacilityPark/Area01/appInfo.do?mCode=MN0259",
      ...zeroCounts,
      court_count_grass_outdoor: 3,
    },
    note: "실외 인조잔디 3면이며 인터넷 예약 시설입니다. 비공식 최신 안내에는 매월 1일·16일 09:00 오픈으로 소개되지만 공식 페이지에서 재확인되지 않아 구조화된 예약규칙에는 넣지 않았습니다.",
    fee: { is_free: true },
  },
  {
    id: "0d344432-b2bc-44cf-9832-3661c52b00b6",
    name: "부산환경공단 중앙사업소 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "부산환경공단 홈페이지 인터넷 예약 · 오픈 일정 확인 필요",
      booking_site_link: "https://www.beco.or.kr/kor/CMS/FacilityPark/Area03/appInfo.do?mCode=MN0262",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "17:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
      court_count_grass_outdoor: 1,
    },
    note: "공식 공개자료 기준 평일 09:00~17:00, 실외 인조잔디 1면입니다. 일부 자료에 2면 표기가 있어 최신 면수 재확인이 필요합니다.",
    fee: { is_free: true },
  },
  {
    id: "8ffcc68e-1c71-4bd4-a9ef-c5a6c6774a60",
    name: "국립해양조사원 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "사용신청서 제출 후 심사·승인 · 정확한 접수 일정 확인 필요",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
    },
    note: "토·일·공휴일 09:00~12:00, 14:00~17:00 운영입니다. DB가 하루 한 구간만 지원해 주말 대표 범위를 09:00~17:00로 입력하고 12:00~14:00 휴게시간은 이 비고에 보존했습니다. 면수와 표면은 확인되지 않았습니다.",
    fee: { is_free: true },
  },
  {
    id: "2b98a00e-eeeb-490b-97ef-11f2e423c42c",
    name: "본원 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "기관·단체 공문 신청 후 승인 · 정확한 접수 일정 확인 필요",
    },
    note: "한국해양과학기술원 기관·단체 대상 시설로 공문 신청 후 승인을 받습니다. 공휴일과 7월 1일은 휴관하며 운영시간·면수·표면은 공개자료에서 확인되지 않았습니다.",
    fee: { is_free: true },
  },
  {
    id: "3850707c-b044-4941-8a29-2738b111e80e",
    name: "한국해양수산연수원 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "단체 교육 사용 문의 · 교육생 우선 · 현재 공사로 이용 제한",
    },
    note: "테니스장 2면이며 현재 공사로 이용이 제한됩니다. 표면 재질을 확인하지 못해 구조화된 코트 종류에는 넣지 않았습니다. 공유누리 상단은 무료, 상세 설명은 20,000원으로 충돌해 요금은 등록하지 않았습니다.",
  },
  {
    id: "aac261c3-89c3-4526-ac90-6acd46441685",
    name: "해돋이배수지 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_open_type: "week",
      booking_open_day_of_week: 3,
      booking_open_time_normal: "09:00:00",
      booking_open_offset: "다음주",
      booking_reception_time: "매주 수요일 09:00~18:00 전화 접수 · 다음 주 월~일 이용분",
      ...zeroCounts,
      court_count_grass_outdoor: 1,
    },
    note: "실외 인조잔디 1면입니다. 매주 수요일 09:00~18:00에 다음 주 월~일 이용분을 전화(051-419-4151) 접수합니다.",
    rule: {
      rule_type: "interval_weekly",
      open_type: "week",
      open_day_of_week: 3,
      open_time: "09:00:00",
      open_offset: "다음주",
      interval_weeks: 1,
      anchor_date: "2026-09-16",
      booking_round_label: "매주 수요일 09:00~18:00 전화 접수",
      usage_period_label: "다음 주 월요일~일요일 이용분",
      reservation_url: "051-419-4151",
    },
    fee: { is_free: true },
  },
  {
    id: "726fc22d-2c10-44d8-912d-040ea1468e58",
    name: "해양경찰서 구민테니스장",
    values: {
      booking_rule_type: "checking",
      booking_open_type: "week",
      booking_open_day_of_week: 3,
      booking_open_time_normal: "09:00:00",
      booking_open_offset: "다음주",
      booking_reception_time: "매주 수요일 09:00~18:00 전화 접수 · 다음 주 월~일 이용분",
      ...zeroCounts,
      court_count_grass_outdoor: 2,
    },
    note: "실외 인조잔디 총 2면이며 이 중 1면만 구민 개방, 1면은 해양경찰 전용입니다. 매주 수요일 09:00~18:00에 다음 주 월~일 이용분을 전화(051-419-4151) 접수합니다.",
    rule: {
      rule_type: "interval_weekly",
      open_type: "week",
      open_day_of_week: 3,
      open_time: "09:00:00",
      open_offset: "다음주",
      interval_weeks: 1,
      anchor_date: "2026-09-16",
      booking_round_label: "매주 수요일 09:00~18:00 전화 접수",
      usage_period_label: "다음 주 월요일~일요일 이용분",
      reservation_url: "051-419-4151",
    },
    fee: { is_free: true },
  },
  ...[
    ["a5cd14bf-cd51-43b4-b029-9608d8acb49d", "반송테니스장", 2, "clay", "DB28Q4936112"],
    ["6a87788c-ac31-4de8-a907-94a2331a9f6b", "센텀테니스장", 3, "clay", "DB28Q4356211"],
    ["0fc46aff-536c-466d-964c-bd82a4ddf90e", "송정테니스파크", 6, "grass", "DB28Q5734681"],
    ["1957fafa-98f3-425e-a06e-df0bc9121a66", "좌동1배수지 테니스장", 3, "clay", "DB28Q5348680"],
    ["8b34259f-69d7-4e87-a765-099e4622a609", "좌동테니스장", 5, "clay", "DB28Q3520512"],
  ].map(([id, name, count, surface, resourceId]) => ({
    id,
    name,
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "공유누리 예약 신청 후 관리자 승인 · 정확한 오픈 일정 확인 필요",
      ...zeroCounts,
      [surface === "grass" ? "court_count_grass_outdoor" : "court_count_clay_outdoor"]: count,
    },
    note: `실외 ${surface === "grass" ? "인조잔디" : "흙·클레이"} ${count}면입니다. 공유누리 기본요금은 3,000원으로 안내되지만 이용 기준시간이 없어 구조화된 요금표에는 넣지 않고 비고에 보존했습니다. 운영시간은 관리기관 문의가 필요합니다.`,
    rule: { rule_type: "checking", booking_round_label: "공유누리 신청 후 관리자 승인", reservation_url: sharing(resourceId) },
  })),
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
  .select("id,basic_court_name,etc_desc")
  .in("id", ids);
if (courtReadError) throw courtReadError;
if (existingCourts.length !== courts.length) {
  const found = new Set(existingCourts.map(({ id }) => id));
  throw new Error(`DB에서 찾지 못한 시설: ${courts.filter(({ id }) => !found.has(id)).map(({ name }) => name).join(", ")}`);
}

const { data: existingRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,reservation_url")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;

const ruleByCourt = new Map();
for (const rule of existingRules) {
  if (!ruleByCourt.has(rule.court_id)) ruleByCourt.set(rule.court_id, rule);
}

console.log(`대상 ${courts.length}개 · 적용 모드: ${shouldApply ? "YES" : "NO (dry-run)"}`);
if (!shouldApply) {
  console.table(courts.map(({ name, values, fee }) => ({
    name,
    rule: values.booking_rule_type,
    weekday: values.basic_time_of_use_weekday_from ? `${values.basic_time_of_use_weekday_from}-${values.basic_time_of_use_weekday_to}` : "-",
    weekend: values.basic_time_of_use_weekend_from ? `${values.basic_time_of_use_weekend_from}-${values.basic_time_of_use_weekend_to}` : "-",
    fee: fee?.is_free ? "무료" : "미등록/비고",
  })));
  process.exit(0);
}

for (const config of courts) {
  const existing = existingCourts.find(({ id }) => id === config.id);
  const update = {
    ...config.values,
    etc_desc: appendNote(existing.etc_desc, config.note),
    updated_at: now,
  };
  const { error: courtUpdateError } = await supabase.from("courtinfo").update(update).eq("id", config.id);
  if (courtUpdateError) throw new Error(`${config.name} courtinfo 갱신 실패: ${courtUpdateError.message}`);

  const existingRule = ruleByCourt.get(config.id);
  if (!existingRule) throw new Error(`${config.name}의 활성 예약 규칙이 없습니다.`);
  const rule = config.rule ?? {
    rule_type: config.values.booking_rule_type,
    booking_round_label: config.values.booking_reception_time,
    reservation_url: config.values.booking_site_link ?? existingRule.reservation_url,
  };
  const { error: ruleUpdateError } = await supabase
    .from("court_booking_rules")
    .update({
      ...resetRuleFields,
      label: "전체",
      eligibility: "normal",
      is_active: true,
      sort_order: 10,
      booking_round_label: null,
      usage_period_label: null,
      reservation_url: config.values.booking_site_link ?? existingRule.reservation_url ?? null,
      ...rule,
      updated_at: now,
    })
    .eq("id", existingRule.id);
  if (ruleUpdateError) throw new Error(`${config.name} 예약 규칙 갱신 실패: ${ruleUpdateError.message}`);

  if (config.fee) {
    const fee = {
      booking_rule_id: existingRule.id,
      is_free: config.fee.is_free,
      price_basis_hours: 1,
      outdoor_weekday_price: null,
      outdoor_weekend_price: null,
      indoor_weekday_price: null,
      indoor_weekend_price: null,
      lighting_fee_separate: false,
      lighting_fee_amount: null,
      lighting_fee_basis_hours: null,
      lighting_start_time: null,
      updated_at: now,
    };
    const { error: feeError } = await supabase
      .from("court_booking_rule_fees")
      .upsert(fee, { onConflict: "booking_rule_id" });
    if (feeError) throw new Error(`${config.name} 요금 갱신 실패: ${feeError.message}`);
  } else {
    const { error: feeDeleteError } = await supabase
      .from("court_booking_rule_fees")
      .delete()
      .eq("booking_rule_id", existingRule.id);
    if (feeDeleteError) throw new Error(`${config.name} 미확정 요금 정리 실패: ${feeDeleteError.message}`);
  }
  console.log(`완료: ${config.name}`);
}

const { data: verifyCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,basic_time_of_use_weekday_from,basic_time_of_use_weekday_to,basic_time_of_use_weekend_from,basic_time_of_use_weekend_to,court_count_hard_indoor,court_count_hard_outdoor,court_count_grass_indoor,court_count_grass_outdoor,court_count_clay_indoor,court_count_clay_outdoor")
  .in("id", ids)
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const { data: verifyRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,open_day_of_month,open_day_of_week,open_time,interval_weeks,is_active")
  .in("court_id", ids)
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifyFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free")
  .in("booking_rule_id", verifyRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

console.log(JSON.stringify({
  verifiedCourts: verifyCourts.length,
  verifiedRules: verifyRules.length,
  verifiedFees: verifyFees.length,
  freeFees: verifyFees.filter(({ is_free }) => is_free).length,
  ruleTypes: verifyRules.reduce((counts, { rule_type }) => ({ ...counts, [rule_type]: (counts[rule_type] ?? 0) + 1 }), {}),
}, null, 2));
