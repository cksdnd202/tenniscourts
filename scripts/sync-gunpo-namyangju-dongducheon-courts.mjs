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
const researchMarker = "[2026-09 경기 북부 시설 리서치]";
const namyangjuBookingUrl = "https://www.nyj.go.kr/rent";
const naverSearch = (query) =>
  `https://map.naver.com/p/search/${encodeURIComponent(query)}`;

const zeroCourtCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const facilityGroups = [
  {
    key: "namyangju-standard-byeollae-dong",
    city: "남양주시",
    names: [
      "별내동 테니스장 A코트(별내체육공원테니스장)",
      "별내동 테니스장 B코트(별내체육공원테니스장)",
      "별내동 테니스장 C코트(별내체육공원테니스장)",
      "별내동 테니스장 D코트(별내체육공원테니스장)",
      "별내동 테니스장 E코트(별내체육공원테니스장)",
    ],
    update: {
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약에서 수시접수 · 예약 달력의 회차별 이용시간 확인",
      booking_online_reserve_possible: true,
      booking_booking_provide: "public_site",
    },
    note: "별내택지지구체육공원 실외 5면입니다. 코트별 예약 항목으로 운영되며 고정 월 오픈일은 공개되지 않았습니다.",
    fee: { weekday: 10000, weekend: 20000, lighting: 10000, lightingBasis: 2 },
  },
  {
    key: "namyangju-standard-byeollae-myeon",
    city: "남양주시",
    names: [
      "별내면 테니스장 A코트(광전리 테니스장)",
      "별내면 테니스장 B코트(광전리 테니스장)",
      "별내면 테니스장 C코트(광전리 테니스장)",
      "별내면 테니스장 D코트(광전리 테니스장)",
      "별내면 테니스장 E코트(광전리 테니스장)",
    ],
    update: {
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 수시접수 · 관리자 승인 후 확정",
      booking_online_reserve_possible: true,
      booking_booking_provide: "public_site",
    },
    note: "별내면 광전리 실외 5면입니다. 코트별 예약 항목으로 운영되며 신청 후 관리자 승인을 거칩니다.",
    fee: { weekday: 10000, weekend: 20000, lighting: 10000, lightingBasis: 2 },
  },
  {
    key: "namyangju-discounted",
    city: "남양주시",
    names: [
      "약대울 체육시설 테니스장A",
      "약대울 체육시설 테니스장B",
      "약대울 체육시설 테니스장C",
      "퇴계원 테니스장",
    ],
    update: {
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약에서 수시접수 · 예약 달력의 회차별 이용시간 확인",
      booking_online_reserve_possible: true,
      booking_booking_provide: "public_site",
    },
    note: "실외 코트이며 고정 월 오픈일은 공개되지 않았습니다. 이용시간은 예약 달력의 회차를 확인해야 합니다.",
    fee: { weekday: 5000, weekend: 10000, lighting: 5000, lightingBasis: 2 },
  },
  {
    key: "namyangju-standard-other",
    city: "남양주시",
    names: [
      "가운동 테니스장",
      "북한강테니스장",
      "양골체육시설 테니스장",
      "월문리 체육시설 (테니스장, 족구장)",
      "지금배수지테니스장",
      "체육공원2호 (테니스코트)",
    ],
    update: {
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약에서 수시접수 · 예약 달력의 회차별 이용시간 확인",
      booking_online_reserve_possible: true,
      booking_booking_provide: "public_site",
    },
    note: "실외 코트이며 고정 월 오픈일은 공개되지 않았습니다. 이용시간은 예약 달력의 회차를 확인해야 합니다.",
    fee: { weekday: 10000, weekend: 20000, lighting: 10000, lightingBasis: 2 },
  },
  {
    key: "namyangju-hwado",
    city: "남양주시",
    names: ["화도테니스장"],
    update: {
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약에서 수시접수 · B코트 및 잔여분 일반 예약",
      booking_online_reserve_possible: true,
      booking_booking_provide: "public_site",
    },
    note: "실외 3면입니다. A·C코트는 등록 동호회 우선 이용, B코트와 잔여분은 일반 예약 대상입니다.",
    fee: { weekday: 10000, weekend: 20000, lighting: 10000, lightingBasis: 1 },
  },
];

const newCourts = [
  {
    key: "janghyeon",
    city: "남양주시",
    name: "장현배수지 생활체육시설 테니스장",
    slug: "janghyeon-reservoir-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 진접읍 장현리 산25-1",
      basic_map_link: naverSearch("장현배수지 생활체육시설 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "남양주시 통합예약 수시접수 · 선착순 확정 · 1회 2시간",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n공식 시설안내 기준 실외 3면이며 표면 재질은 미공개입니다. 예약 화면의 코트 표기 수와 차이가 있어 공식 안내 수를 기준으로 기록했습니다.`,
    },
    ruleType: "irregular",
    fee: { weekday: 5000, weekend: 10000, lighting: 5000, lightingBasis: 2 },
  },
  {
    key: "bupyeong-ri",
    city: "남양주시",
    name: "부평리 생활체육시설 테니스장",
    slug: "bupyeong-ri-sports-facility-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 진접읍 부평리 498-3",
      basic_map_link: naverSearch("부평리 생활체육시설 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "남양주시 통합예약 수시접수 · 1회 2시간",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n실외 2면이며 표면 재질과 고정 월 오픈일은 공식 자료에 공개되지 않았습니다.`,
    },
    ruleType: "irregular",
    fee: { weekday: 5000, weekend: 10000, lighting: 5000, lightingBasis: 2 },
  },
  {
    key: "yangji-ri",
    city: "남양주시",
    name: "양지리 생활체육공원 테니스장",
    slug: "yangji-ri-sports-park-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 오남읍 양지리 105-1",
      basic_map_link: naverSearch("양지리 생활체육공원 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "남양주시 통합예약 수시접수 · 1회 2시간",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n실외 4면이며 표면 재질과 고정 월 오픈일은 공식 자료에 공개되지 않았습니다.`,
    },
    ruleType: "irregular",
    fee: { weekday: 5000, weekend: 10000, lighting: 5000, lightingBasis: 2 },
  },
  {
    key: "hopyeong",
    city: "남양주시",
    name: "호평동 생활체육시설 테니스장",
    slug: "hopyeong-sports-facility-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 호평동 295-2",
      basic_map_link: naverSearch("호평동 생활체육시설 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "무료개방 · 고정 예약 오픈 일정 미공개",
      booking_rule_type: "on_site",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n국도 46호선 교량 하부의 실외 2면 무료개방 시설입니다. 표면 재질은 공식 자료에 공개되지 않았습니다.`,
    },
    ruleType: "on_site",
    isFree: true,
  },
  {
    key: "gaun-water",
    city: "남양주시",
    name: "가운푸른물센터 테니스장",
    slug: "gaun-water-center-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 다산동 689",
      basic_map_link: naverSearch("가운푸른물센터 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "남양주시 통합예약 수시접수 · 무료",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n실외 1면 무료 시설입니다. 고정 월 오픈일과 표면 재질은 공식 자료에 공개되지 않았습니다.`,
    },
    ruleType: "irregular",
    isFree: true,
  },
  {
    key: "nyj-sports-center",
    city: "남양주시",
    name: "남양주체육문화센터 테니스장",
    slug: "namyangju-sports-culture-center-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 남양주시 다산지금로 91",
      basic_map_link: naverSearch("남양주체육문화센터 테니스장"),
      basic_region: "경기",
      basic_city: "남양주시",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "20:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      court_count_grass_outdoor: 5,
      booking_site_link: namyangjuBookingUrl,
      booking_reception_time: "센터 대관·일일입장 일정 확인 · 고정 월 오픈일 미공개",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매월 1·3주 일요일",
      etc_desc: `${researchMarker}\n인조잔디 실외 5면과 조명시설이 있습니다. 평일 06:00~22:00, 토요일 06:00~20:00, 공휴일 09:00~17:00 운영하며 매월 1·3주 일요일은 휴관합니다. 문의 031-560-1301~2.`,
    },
    ruleType: "irregular",
    fee: { weekday: 10000, weekend: 20000, lighting: 10000, lightingBasis: 2 },
  },
  {
    key: "ddc-stadium",
    city: "동두천시",
    name: "동두천 종합운동장 테니스장",
    slug: "dongducheon-stadium-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 동두천시 어등로 45",
      basic_map_link: naverSearch("동두천 종합운동장 테니스장"),
      basic_region: "경기",
      basic_city: "동두천시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_reception_time: "예약 오픈 일정과 접수 방법 공식 공개자료 확인 필요",
      booking_rule_type: "checking",
      booking_online_reserve_possible: null,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n총 8면입니다. 2025년 2월 기준 4면은 인조잔디로 교체되고 막구조 지붕이 설치됐으며, 나머지 4면의 최신 표면 재질은 공식 자료에서 확인되지 않았습니다. 운영시간과 이용요금은 추정 입력하지 않았습니다.`,
    },
    ruleType: "checking",
  },
  {
    key: "soyo-sports-park",
    city: "동두천시",
    name: "소요생활체육공원 테니스장",
    slug: "soyo-sports-park-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 동두천시 봉동로 27",
      basic_map_link: naverSearch("소요생활체육공원 테니스장"),
      basic_region: "경기",
      basic_city: "동두천시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "21:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_reception_time: "연중 07:00~21:00 무료 · 방문 신청",
      booking_rule_type: "on_site",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      etc_desc: `${researchMarker}\n연중 매일 07:00~21:00 운영하는 무료 방문 신청 시설입니다. 2025년 2월까지 캐노피 설치와 인조잔디 교체가 확인되지만 공식 공개자료에 총 면수는 없어 추정 입력하지 않았습니다.`,
    },
    ruleType: "on_site",
    isFree: true,
  },
];

function mergeResearchNote(existing, note) {
  const base = (existing ?? "").split(`\n\n${researchMarker}`)[0].trim();
  return [base, `${researchMarker}\n${note}`].filter(Boolean).join("\n\n");
}

async function readTargets() {
  const { data, error } = await supabase
    .from("courtinfo")
    .select("*")
    .in("basic_city", ["군포시", "남양주시", "동두천시"])
    .eq("use_or_not", true);
  if (error) throw new Error(`대상 테니스장 조회 실패: ${error.message}`);
  return data ?? [];
}

async function saveCourt(payload, id) {
  const query = id
    ? supabase.from("courtinfo").update(payload).eq("id", id)
    : supabase.from("courtinfo").insert(payload);
  const { data, error } = await query.select("id,basic_city,basic_court_name,slug").single();
  if (error) throw new Error(`${payload.basic_court_name ?? id} 저장 실패: ${error.message}`);
  return data;
}

async function upsertRule(courtId, { label, eligibility = "normal", ruleType, reservationUrl, roundLabel, usageLabel }) {
  const { data: existing, error: readError } = await supabase
    .from("court_booking_rules")
    .select("id")
    .eq("court_id", courtId)
    .eq("label", label)
    .maybeSingle();
  if (readError) throw new Error(`${label} 예약 규칙 조회 실패: ${readError.message}`);

  const payload = {
    court_id: courtId,
    label,
    eligibility,
    rule_type: ruleType,
    open_type: null,
    open_day_of_month: null,
    open_day_of_week: null,
    open_ordinal: null,
    open_time: null,
    open_offset: null,
    open_date_adjustment: "none",
    interval_weeks: null,
    anchor_date: null,
    lottery_desc: null,
    reservation_url: reservationUrl ?? null,
    booking_round_label: roundLabel ?? (ruleType === "on_site" ? "현장 이용" : "수시접수"),
    usage_period_label: usageLabel ?? "예약 달력에서 이용일시 확인",
    is_active: true,
    sort_order: 10,
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existing.id);
    if (error) throw new Error(`${label} 예약 규칙 갱신 실패: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("court_booking_rules")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`${label} 예약 규칙 등록 실패: ${error.message}`);
  return data.id;
}

async function upsertFee(ruleId, fee) {
  const isFree = fee?.isFree === true;
  const hasSeparateLighting = !isFree && (fee.lighting != null || fee.lightingSeparate === true);
  const payload = {
    booking_rule_id: ruleId,
    is_free: isFree,
    price_basis_hours: 2,
    outdoor_weekday_price: isFree ? null : fee.weekday,
    outdoor_weekend_price: isFree ? null : fee.weekend,
    indoor_weekday_price: null,
    indoor_weekend_price: null,
    lighting_fee_separate: hasSeparateLighting,
    lighting_fee_amount: !isFree ? fee.lighting ?? null : null,
    lighting_fee_basis_hours: !isFree && fee.lighting != null ? fee.lightingBasis : null,
    lighting_start_time: null,
    updated_at: now,
  };
  const { error } = await supabase
    .from("court_booking_rule_fees")
    .upsert(payload, { onConflict: "booking_rule_id" });
  if (error) throw new Error(`요금 저장 실패: ${error.message}`);
}

const before = await readTargets();
const byName = new Map(before.map((court) => [`${court.basic_city}:${court.basic_court_name}`, court]));

for (const group of facilityGroups) {
  for (const name of group.names) {
    if (!byName.has(`${group.city}:${name}`)) throw new Error(`기존 테니스장 누락: ${group.city} ${name}`);
  }
}

const existingNewCourts = newCourts.filter((court) => byName.has(`${court.city}:${court.name}`));
const plannedInsertCount = newCourts.length - existingNewCourts.length;

if (!shouldApply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    existingCourtUpdates: facilityGroups.reduce((sum, group) => sum + group.names.length, 0) + 6,
    newCourtInserts: plannedInsertCount,
    idempotentNewCourtUpdates: existingNewCourts.length,
    excluded: ["중앙근린공원 테니스 연습장(일반 테니스 코트 여부 미확인)"],
  }, null, 2));
  process.exit(0);
}

const savedCourts = [];
const feeRuleIds = [];

for (const group of facilityGroups) {
  for (const name of group.names) {
    const court = byName.get(`${group.city}:${name}`);
    const saved = await saveCourt({
      ...group.update,
      etc_desc: mergeResearchNote(court.etc_desc, group.note),
      updated_at: now,
    }, court.id);
    savedCourts.push(saved);
    const ruleId = await upsertRule(court.id, {
      label: "전체 예약",
      ruleType: "irregular",
      reservationUrl: court.booking_site_link ?? namyangjuBookingUrl,
    });
    await upsertFee(ruleId, group.fee);
    feeRuleIds.push(ruleId);
  }
}

const gunpo = before.filter((court) => court.basic_city === "군포시");
const gunpoRulesResult = await supabase
  .from("court_booking_rules")
  .select("id,court_id")
  .in("court_id", gunpo.map((court) => court.id))
  .eq("is_active", true);
if (gunpoRulesResult.error) throw new Error(`군포 예약 규칙 조회 실패: ${gunpoRulesResult.error.message}`);

const gunpoFeeByName = new Map([
  ["산본IC체육공원 테니스장", { isFree: true }],
  ["송정체육공원 테니스장", { isFree: true }],
  ["한얼근린공원 하부 테니스장", { isFree: true }],
  // 평일/주말 조명료가 각각 2,000원/3,000원이라 단일 금액 칼럼에는
  // 추정값을 넣지 않고 '별도'로만 표시하며 정확한 금액은 시설 설명에 보존한다.
  ["시민체육광장 테니스장", { weekday: 3000, weekend: 5000, lightingSeparate: true }],
]);
for (const court of gunpo) {
  const fee = gunpoFeeByName.get(court.basic_court_name);
  if (!fee) continue;
  for (const rule of gunpoRulesResult.data.filter((item) => item.court_id === court.id)) {
    await upsertFee(rule.id, fee);
    feeRuleIds.push(rule.id);
  }
}

const ddcBranch = byName.get("동두천시:동두천지사 테니스장");
if (!ddcBranch) throw new Error("기존 동두천지사 테니스장을 찾지 못했습니다.");
savedCourts.push(await saveCourt({
  time_of_use_same: false,
  basic_time_of_use_weekday_from: "18:00:00",
  basic_time_of_use_weekday_to: "19:00:00",
  basic_time_of_use_weekend_from: null,
  basic_time_of_use_weekend_to: null,
  booking_rule_type: "irregular",
  booking_reception_time: "공유누리 예약 가능 · 평일 18:00~19:00 · 고정 오픈 일정 미공개",
  booking_online_reserve_possible: true,
  booking_today_booking_possible: null,
  booking_booking_provide: "public_site",
  etc_desc: mergeResearchNote(ddcBranch.etc_desc, "지역 주민 이용 대상이며 평일 18:00~19:00 이용 가능합니다. 요금과 코트 재질·면수는 공식 공개자료에 없어 추정 입력하지 않았습니다."),
  updated_at: now,
}, ddcBranch.id));
await upsertRule(ddcBranch.id, {
  label: "주민 예약",
  eligibility: "citizen",
  ruleType: "irregular",
  reservationUrl: ddcBranch.booking_site_link,
  usageLabel: "평일 18:00~19:00",
});

for (const definition of newCourts) {
  const existing = byName.get(`${definition.city}:${definition.name}`);
  const payload = {
    basic_court_name: definition.name,
    slug: definition.slug,
    ...definition.values,
    updated_at: now,
  };
  const saved = await saveCourt(payload, existing?.id);
  savedCourts.push(saved);
  const label = definition.ruleType === "on_site" ? "무료 현장 이용" : "전체 예약";
  const ruleId = await upsertRule(saved.id, {
    label,
    ruleType: definition.ruleType,
    reservationUrl: definition.values.booking_site_link,
    roundLabel: definition.ruleType === "checking" ? "공개 예약 경로 확인 중" : undefined,
    usageLabel: definition.values.booking_reception_time,
  });
  if (definition.isFree) {
    await upsertFee(ruleId, { isFree: true });
    feeRuleIds.push(ruleId);
  } else if (definition.fee) {
    await upsertFee(ruleId, definition.fee);
    feeRuleIds.push(ruleId);
  }
}

const savedIds = [...new Set(savedCourts.map((court) => court.id))];
const { data: verifiedCourts, error: courtVerifyError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name,booking_rule_type,booking_reception_time,use_or_not")
  .in("id", savedIds);
if (courtVerifyError) throw new Error(`테니스장 검증 실패: ${courtVerifyError.message}`);

const { data: verifiedFees, error: feeVerifyError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,lighting_fee_amount,lighting_fee_basis_hours")
  .in("booking_rule_id", [...new Set(feeRuleIds)]);
if (feeVerifyError) throw new Error(`요금 검증 실패: ${feeVerifyError.message}`);

const after = await readTargets();
console.log(JSON.stringify({
  mode: "applied",
  beforeActiveCourtCount: before.length,
  afterActiveCourtCount: after.length,
  insertedCourtCount: after.length - before.length,
  updatedOrInsertedCourtCount: verifiedCourts.length,
  verifiedFeeCount: verifiedFees.length,
  cities: Object.fromEntries(["군포시", "남양주시", "동두천시"].map((city) => [city, after.filter((court) => court.basic_city === city).length])),
  excluded: ["중앙근린공원 테니스 연습장"],
}, null, 2));
