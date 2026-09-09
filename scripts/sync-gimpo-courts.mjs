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
const cityGuideUrl = "https://www.gimpo.go.kr/portal/contents.do?key=2720";
const solterBookingUrl = "https://yeyak.guc.or.kr/fmcs/";
const sportsComplexGuideUrl = "https://www.guc.or.kr/facility/health_sportscomplex.asp";
const parcosBookingUrl = "http://www.gimposports.or.kr/bbs/orderCourse.php";
const associationUrl = "https://www.kptennis.com/page/page31";

const naverSearch = (query) => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;

const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const existingCourts = [
  ...Array.from({ length: 8 }, (_, index) => ({
    key: `solter_outdoor_${index + 1}`,
    name: `김포생활체육관 솔터테니스장 ${index + 1}번코트`,
    values: {
      basic_owner_type: "시립",
      ...zeroCounts,
      court_count_hard_outdoor: 1,
      booking_site_link: solterBookingUrl,
      booking_reception_time:
        "매일 13:00에 당일 포함 8일째 일정 오픈 · 1회 최대 2시간 · 1일 최대 2회(4시간)",
      booking_rule_type: "rolling",
      booking_open_time_normal: "13:00:00",
      booking_open_offset: "7",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      etc_append: [
        "김포도시공사 온라인 선착순 예약 시설입니다.",
        "매일 13:00에 당일 포함 8일째 일정이 열리며, 예약 후 1시간 안에 결제하지 않으면 자동 취소됩니다.",
        "1회 최대 2시간, 1일 최대 2회(4시간)까지 이용할 수 있습니다.",
        "2시간 기준 구민 평일 10,000원·주말/공휴일 20,000원이며 야간 조명비 10,000원이 별도입니다. 타지역 이용자는 50% 가산됩니다.",
      ],
    },
  })),
  ...[506, 521, 522].map((serviceId, index) => ({
    key: `seoam_${index + 1}`,
    name: `서암생활체육공원 테니스장 (${index + 1}번)`,
    values: {
      basic_owner_type: "시립",
      ...zeroCounts,
      court_count_hard_outdoor: 1,
      booking_site_link: `https://www.gimpo.go.kr/reserve/webErntView.do?key=115&searchErntGroup=120054&searchErntNo=${serviceId}`,
      booking_reception_time:
        "다음 달 1일 기준 7일 전 18:00 오픈 · 이용일 14~1일 전 신청",
      booking_rule_type: "irregular",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      etc_append: [
        "김포시 통합예약 온라인 선착순 시설이며 1일 1코트, 최대 2시간 이용할 수 있습니다.",
        "다음 달 일정은 다음 달 1일 기준 7일 전 18:00에 열리는 것으로 계산합니다.",
        "2시간 기준 구민 평일 10,000원·주말/공휴일 20,000원이며 야간 조명비 10,000원이 별도입니다. 타지역 이용자는 50% 가산됩니다.",
        "김포시테니스협회는 시설 전체를 5면으로 표기하지만, 김포시 통합예약에서 일반 예약 가능한 1~3번만 확인됩니다.",
      ],
    },
  })),
  {
    key: "sports_complex",
    name: "종합운동장 테니스장",
    values: {
      basic_owner_type: "시립",
      ...zeroCounts,
      court_count_clay_outdoor: 3,
      booking_site_link: sportsComplexGuideUrl,
      booking_reception_time: "유선예약 031-986-7430 · 운영 06:00~22:00",
      booking_rule_type: "phone",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: null,
      booking_booking_provide: null,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      etc_append: [
        "김포도시공사 공식 시설안내 기준 클레이코트 3면과 연습코트 1면이 있으며, 대표 코트 수에는 정규 3면을 반영했습니다.",
        "예약은 031-986-7430으로 문의해야 합니다.",
        "2시간 기준 구민 평일 10,000원·주말/공휴일 20,000원이며 야간 조명비 10,000원이 별도입니다. 타지역 이용자는 50% 가산됩니다.",
      ],
    },
  },
];

const newCourts = [
  {
    key: "solter_indoor",
    name: "김포 솔터실내테니스장",
    slug: "gimpo-solter-indoor-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 김포시 김포한강3로 385",
      basic_map_link: naverSearch("김포솔터 실내테니스장"),
      basic_latitude: 37.6405033,
      basic_longitude: 126.6460575,
      basic_region: "경기",
      basic_city: "김포시",
      ...zeroCounts,
      court_count_hard_indoor: 4,
      use_or_not: true,
      booking_site_link: solterBookingUrl,
      booking_reception_time:
        "매일 13:00에 당일 포함 8일째 일정 오픈 · 1회 최대 2시간 · 1일 최대 2회(4시간)",
      booking_rule_type: "rolling",
      booking_open_time_normal: "13:00:00",
      booking_open_offset: "7",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      etc_desc: [
        "김포시와 김포도시공사 운영 안내 기준 실내 하드코트 4면입니다.",
        "매일 13:00에 당일 포함 8일째 일정이 열리며, 예약 후 1시간 안에 결제하지 않으면 자동 취소됩니다.",
        "1회 최대 2시간, 1일 최대 2회(4시간)까지 이용할 수 있습니다.",
        "2시간 기준 구민 평일 50,000원·주말/공휴일 60,000원이며 야간 조명비 10,000원이 별도입니다. 타지역 이용자는 50% 가산됩니다.",
      ].join("\n"),
      source_provider: "gimpo_urban_corporation",
      source_service_id: "solter-indoor",
      source_service_name: "김포 솔터실내테니스장",
      source_place_name: "김포솔터 실내테니스장",
      source_area_name: "경기 김포시 마산동",
      source_match_key: "guc:solter-indoor",
      source_synced_at: now,
    },
  },
  ...[703, 704].map((serviceId, index) => ({
    key: `pungnyeon_${index + 1}`,
    name: `풍년근린공원 테니스장 (${index + 1}번)`,
    slug: `pungnyeon-neighborhood-park-tennis-court-${index + 1}`,
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 김포시 김포대로926번길 113 풍년공원",
      basic_map_link: naverSearch("풍년공원테니스장"),
      basic_latitude: 37.6245047,
      basic_longitude: 126.7205483,
      basic_region: "경기",
      basic_city: "김포시",
      ...zeroCounts,
      court_count_hard_outdoor: 1,
      use_or_not: true,
      booking_site_link: `https://www.gimpo.go.kr/reserve/webErntView.do?key=115&searchErntNo=${serviceId}`,
      booking_reception_time:
        "매월 세 번째 월요일 10:00~수요일 17:00 다음 달 접수 · 금요일 10:00~13:00 취소분 추가접수",
      booking_rule_type: "ordinal",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_eligibility_first: "resident",
      etc_desc: [
        "김포시민만 신청할 수 있는 온라인 선착순 예약 코트입니다.",
        "다음 달 전체 일정은 매월 세 번째 월요일 10:00부터 수요일 17:00까지 접수하며, 취소분은 금요일 10:00~13:00에 추가 접수합니다.",
        "1일 1회, 월 4회, 1회 최대 2시간까지 이용할 수 있습니다.",
        "공식 예약 페이지에서 고정 이용요금을 확인하지 못해 요금정보는 등록하지 않았습니다.",
      ].join("\n"),
      source_provider: "gimpo_city_reservation",
      source_service_id: String(serviceId),
      source_service_name: `풍년근린공원 테니스장 ${index + 1}번`,
      source_place_name: "풍년공원테니스장",
      source_area_name: "경기 김포시 북변동",
      source_match_key: `gimpo-reserve:${serviceId}`,
      source_synced_at: now,
    },
  })),
  {
    key: "gochon_parcos",
    name: "고촌 파르코스 테니스장",
    slug: "gochon-parcos-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 김포시 고촌읍 신곡로 114-13",
      basic_map_link: naverSearch("고촌체육공원테니스장"),
      basic_latitude: 37.6084915,
      basic_longitude: 126.7671439,
      basic_region: "경기",
      basic_city: "김포시",
      ...zeroCounts,
      court_count_grass_outdoor: 8,
      use_or_not: true,
      booking_site_link: parcosBookingUrl,
      booking_reception_time:
        "1~15일 이용분 전월 20일 17:00 오픈 · 16일~말일 이용분 당월 5일 17:00 오픈",
      booking_rule_type: "fixed_schedule",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      etc_desc: [
        "김포시 체육시설 운영 안내 및 김포시테니스협회 기준 인조잔디 실외코트 8면입니다.",
        "1~15일 이용분은 전월 20일 17:00, 16일~말일 이용분은 당월 5일 17:00에 열립니다. 이용 1시간 전까지 신청할 수 있습니다.",
        "2시간 기준 구민 평일 10,000원·주말/공휴일 20,000원이며 야간 조명비 10,000원이 별도입니다. 타지역 이용자는 50% 가산됩니다.",
      ].join("\n"),
      source_provider: "gimpo_sports_council",
      source_service_id: "gochon-parcos",
      source_service_name: "고촌 파르코스 테니스장",
      source_place_name: "고촌체육공원테니스장",
      source_area_name: "경기 김포시 고촌읍",
      source_match_key: "gimposports:gochon-parcos",
      source_synced_at: now,
    },
  },
  {
    key: "yanggok",
    name: "양곡테니스장",
    slug: "yanggok-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 김포시 양촌읍 양곡4로 160",
      basic_map_link: naverSearch("양곡테니스클럽"),
      basic_latitude: 37.660092,
      basic_longitude: 126.626082,
      basic_region: "경기",
      basic_city: "김포시",
      ...zeroCounts,
      court_count_hard_outdoor: 2,
      use_or_not: true,
      booking_site_link: associationUrl,
      booking_reception_time: "공개 예약 경로 확인 중 · 운영 문의 070-4647-0741",
      booking_rule_type: "checking",
      booking_online_reserve_possible: null,
      booking_today_booking_possible: null,
      booking_booking_provide: null,
      etc_desc: [
        "김포시 체육시설 운영 안내와 김포시테니스협회 현황에서 운영 중인 공공 테니스장으로 확인했습니다.",
        "협회 현황 기준 실외 2면입니다.",
        "공개 온라인 예약 경로는 확인되지 않아 예약정보 확인 중으로 등록했습니다. 운영 문의 070-4647-0741.",
      ].join("\n"),
      source_provider: "gimpo_tennis_association",
      source_service_id: "yanggok",
      source_service_name: "양곡테니스장",
      source_place_name: "양곡테니스클럽",
      source_area_name: "경기 김포시 양촌읍",
      source_match_key: "kptennis:yanggok",
      source_synced_at: now,
    },
  },
];

const rules = [];

for (const court of existingCourts.filter(({ key }) => key.startsWith("solter_outdoor_"))) {
  for (const [eligibility, label, order, feeTier] of [
    ["resident", "구민", 10, "resident"],
    ["normal", "타지역", 20, "non_resident"],
  ]) {
    rules.push({
      courtKey: court.key,
      label,
      eligibility,
      rule_type: "rolling",
      open_time: "13:00:00",
      open_offset: "7",
      reservation_url: solterBookingUrl,
      booking_round_label: "매일 13:00 선착순",
      usage_period_label: "당일 포함 8일째 일정 · 1회 최대 2시간",
      sort_order: order,
      fee: outdoorFee(feeTier),
    });
  }
}

for (const court of existingCourts.filter(({ key }) => key.startsWith("seoam_"))) {
  for (const [eligibility, label, order, feeTier] of [
    ["resident", "구민", 10, "resident"],
    ["normal", "타지역", 20, "non_resident"],
  ]) {
    rules.push({
      courtKey: court.key,
      label,
      eligibility,
      rule_type: "monthly_relative",
      open_time: "18:00:00",
      open_offset: "7",
      anchor_date: "2022-09-01",
      reservation_url: court.values.booking_site_link,
      booking_round_label: "다음 달 일정 온라인 선착순",
      usage_period_label: "2022년 9월부터 월 단위 · 다음 달 1일 기준 7일 전 18:00",
      sort_order: order,
      fee: outdoorFee(feeTier),
    });
  }
}

for (const [eligibility, label, order, feeTier] of [
  ["resident", "구민", 10, "resident"],
  ["normal", "타지역", 20, "non_resident"],
]) {
  rules.push({
    courtKey: "sports_complex",
    label,
    eligibility,
    rule_type: "phone",
    booking_round_label: "전화 예약 031-986-7430",
    usage_period_label: "운영 06:00~22:00",
    sort_order: order,
    fee: outdoorFee(feeTier),
  });

  rules.push({
    courtKey: "solter_indoor",
    label,
    eligibility,
    rule_type: "rolling",
    open_time: "13:00:00",
    open_offset: "7",
    reservation_url: solterBookingUrl,
    booking_round_label: "매일 13:00 선착순",
    usage_period_label: "당일 포함 8일째 일정 · 1회 최대 2시간",
    sort_order: order,
    fee: indoorFee(feeTier),
  });
}

for (const courtKey of ["pungnyeon_1", "pungnyeon_2"]) {
  const reservationUrl = newCourts.find(({ key }) => key === courtKey).values.booking_site_link;
  rules.push(
    {
      courtKey,
      label: "다음 달 정기접수",
      eligibility: "resident",
      rule_type: "ordinal",
      open_type: "week",
      open_day_of_week: 1,
      open_ordinal: 3,
      open_time: "10:00:00",
      open_offset: "다음달",
      reservation_url: reservationUrl,
      booking_round_label: "세 번째 월요일 10:00~수요일 17:00",
      usage_period_label: "다음 달 전체 일정 · 김포시민만",
      sort_order: 10,
    },
    {
      courtKey,
      label: "취소분 추가접수",
      eligibility: "resident",
      rule_type: "irregular",
      reservation_url: reservationUrl,
      booking_round_label: "금요일 10:00~13:00",
      usage_period_label: "취소 발생 잔여분 · 김포시민만",
      sort_order: 20,
    }
  );
}

for (const [eligibility, eligibilityLabel, eligibilityOrder, feeTier] of [
  ["resident", "구민", 0, "resident"],
  ["normal", "타지역", 10, "non_resident"],
]) {
  rules.push(
    {
      courtKey: "gochon_parcos",
      label: `${eligibilityLabel} 1~15일 이용분`,
      eligibility,
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 20,
      open_time: "17:00:00",
      open_offset: "다음달",
      reservation_url: parcosBookingUrl,
      booking_round_label: "전월 20일 17:00 오픈",
      usage_period_label: "다음 달 1~15일 이용분",
      sort_order: 10 + eligibilityOrder,
      fee: outdoorFee(feeTier),
    },
    {
      courtKey: "gochon_parcos",
      label: `${eligibilityLabel} 16일~말일 이용분`,
      eligibility,
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 5,
      open_time: "17:00:00",
      open_offset: "당월",
      reservation_url: parcosBookingUrl,
      booking_round_label: "당월 5일 17:00 오픈",
      usage_period_label: "당월 16일~말일 이용분",
      sort_order: 30 + eligibilityOrder,
      fee: outdoorFee(feeTier),
    }
  );
}

rules.push({
  courtKey: "yanggok",
  label: "예약정보 확인 중",
  eligibility: "normal",
  rule_type: "checking",
  reservation_url: associationUrl,
  booking_round_label: "공개 예약 경로 확인 중",
  usage_period_label: "운영 문의 070-4647-0741",
  sort_order: 10,
});

function outdoorFee(eligibility) {
  const multiplier = eligibility === "non_resident" ? 1.5 : 1;
  return {
    is_free: false,
    price_basis_hours: 2,
    outdoor_weekday_price: 10000 * multiplier,
    outdoor_weekend_price: 20000 * multiplier,
    indoor_weekday_price: null,
    indoor_weekend_price: null,
    lighting_fee_separate: true,
    lighting_fee_amount: 10000 * multiplier,
    lighting_fee_basis_hours: 2,
    lighting_start_time: null,
  };
}

function indoorFee(eligibility) {
  const multiplier = eligibility === "non_resident" ? 1.5 : 1;
  return {
    is_free: false,
    price_basis_hours: 2,
    outdoor_weekday_price: null,
    outdoor_weekend_price: null,
    indoor_weekday_price: 50000 * multiplier,
    indoor_weekend_price: 60000 * multiplier,
    lighting_fee_separate: true,
    lighting_fee_amount: 10000 * multiplier,
    lighting_fee_basis_hours: 2,
    lighting_start_time: null,
  };
}

function mergeDescription(original, additions = []) {
  const parts = (original ?? "").split("\n").map((part) => part.trim()).filter(Boolean);
  for (const addition of additions) {
    if (!parts.includes(addition)) parts.push(addition);
  }
  return parts.join("\n");
}

async function findCourtByName(name) {
  const { data, error } = await supabase
    .from("courtinfo")
    .select("id,basic_court_name,slug,etc_desc")
    .eq("basic_city", "김포시")
    .eq("basic_court_name", name);
  if (error) throw new Error(`${name} 조회 실패: ${error.message}`);
  if ((data?.length ?? 0) > 1) throw new Error(`${name} 중복 행 ${data.length}개를 발견했습니다.`);
  return data?.[0] ?? null;
}

async function preflight() {
  const targets = [];
  for (const court of [...existingCourts, ...newCourts]) {
    targets.push({ key: court.key, name: court.name, existing: await findCourtByName(court.name) });
  }

  const missingExisting = targets.filter(
    ({ key, existing }) => existingCourts.some((court) => court.key === key) && !existing
  );
  if (missingExisting.length) {
    throw new Error(`기존 코트를 찾지 못했습니다: ${missingExisting.map(({ name }) => name).join(", ")}`);
  }

  const targetSlugs = newCourts.map(({ slug }) => slug);
  const { data: slugRows, error: slugError } = await supabase
    .from("courtinfo")
    .select("id,basic_court_name,slug")
    .in("slug", targetSlugs);
  if (slugError) throw new Error(`슬러그 중복 검사 실패: ${slugError.message}`);

  const allowedIds = new Set(targets.map(({ existing }) => existing?.id).filter(Boolean));
  const conflicts = (slugRows ?? []).filter(({ id }) => !allowedIds.has(id));
  if (conflicts.length) throw new Error(`다른 코트와 슬러그 충돌: ${JSON.stringify(conflicts)}`);

  return targets;
}

async function saveExistingCourt(court) {
  const existing = await findCourtByName(court.name);
  const { etc_append: additions, ...values } = court.values;
  const payload = {
    ...values,
    etc_desc: mergeDescription(existing.etc_desc, additions),
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("courtinfo")
    .update(payload)
    .eq("id", existing.id)
    .select("id,basic_court_name,slug")
    .single();
  if (error) throw new Error(`${court.name} 갱신 실패: ${error.message}`);
  return { ...data, action: "updated" };
}

async function saveNewCourt(court) {
  const existing = await findCourtByName(court.name);
  const payload = {
    basic_court_name: court.name,
    slug: court.slug,
    ...court.values,
    updated_at: now,
  };
  if (existing) {
    const { data, error } = await supabase
      .from("courtinfo")
      .update(payload)
      .eq("id", existing.id)
      .select("id,basic_court_name,slug")
      .single();
    if (error) throw new Error(`${court.name} 멱등 갱신 실패: ${error.message}`);
    return { ...data, action: "updated_existing" };
  }

  const { data, error } = await supabase
    .from("courtinfo")
    .insert(payload)
    .select("id,basic_court_name,slug")
    .single();
  if (error) throw new Error(`${court.name} 신규 등록 실패: ${error.message}`);
  return { ...data, action: "inserted" };
}

async function upsertRule(courtId, definition) {
  const { courtKey: _courtKey, fee, ...fields } = definition;
  const payload = {
    court_id: courtId,
    label: fields.label,
    eligibility: fields.eligibility ?? null,
    rule_type: fields.rule_type,
    open_type: fields.open_type ?? null,
    open_day_of_month: fields.open_day_of_month ?? null,
    open_day_of_week: fields.open_day_of_week ?? null,
    open_ordinal: fields.open_ordinal ?? null,
    open_time: fields.open_time ?? null,
    open_offset: fields.open_offset ?? null,
    open_date_adjustment: "none",
    interval_weeks: null,
    anchor_date: fields.anchor_date ?? null,
    lottery_desc: null,
    reservation_url: fields.reservation_url ?? null,
    booking_round_label: fields.booking_round_label ?? null,
    usage_period_label: fields.usage_period_label ?? null,
    is_active: true,
    sort_order: fields.sort_order ?? 0,
    updated_at: now,
  };

  const { data: existing, error: readError } = await supabase
    .from("court_booking_rules")
    .select("id")
    .eq("court_id", courtId)
    .eq("label", fields.label)
    .maybeSingle();
  if (readError) throw new Error(`${fields.label} 규칙 조회 실패: ${readError.message}`);

  let ruleId;
  let action;
  if (existing?.id) {
    const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existing.id);
    if (error) throw new Error(`${fields.label} 규칙 갱신 실패: ${error.message}`);
    ruleId = existing.id;
    action = "updated";
  } else {
    const { data, error } = await supabase
      .from("court_booking_rules")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`${fields.label} 규칙 등록 실패: ${error.message}`);
    ruleId = data.id;
    action = "inserted";
  }

  if (fee) {
    const { error } = await supabase
      .from("court_booking_rule_fees")
      .upsert({ booking_rule_id: ruleId, ...fee, updated_at: now }, { onConflict: "booking_rule_id" });
    if (error) throw new Error(`${fields.label} 요금 등록 실패: ${error.message}`);
  }

  return { id: ruleId, label: fields.label, action, fee: Boolean(fee) };
}

const preflightResult = await preflight();

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        existingUpdates: existingCourts.length,
        newRows: newCourts.length,
        facilityCount: 4,
        bookingRules: rules.length,
        feeRows: rules.filter(({ fee }) => fee).length,
        targets: preflightResult,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const savedByKey = new Map();
const courtWrites = [];

for (const court of existingCourts) {
  const saved = await saveExistingCourt(court);
  savedByKey.set(court.key, saved);
  courtWrites.push({ key: court.key, ...saved });
}

for (const court of newCourts) {
  const saved = await saveNewCourt(court);
  savedByKey.set(court.key, saved);
  courtWrites.push({ key: court.key, ...saved });
}

const ruleWrites = [];
for (const definition of rules) {
  const court = savedByKey.get(definition.courtKey);
  if (!court) throw new Error(`${definition.courtKey} 저장 결과가 없습니다.`);
  ruleWrites.push({ courtKey: definition.courtKey, ...(await upsertRule(court.id, definition)) });
}

const savedIds = courtWrites.map(({ id }) => id);
const { data: verifiedCourts, error: courtVerifyError } = await supabase
  .from("courtinfo")
  .select(
    "id,basic_court_name,basic_address,basic_map_link,basic_latitude,basic_longitude,booking_rule_type,booking_reception_time,booking_site_link,court_count_hard_indoor,court_count_hard_outdoor,court_count_grass_outdoor,court_count_clay_outdoor,use_or_not"
  )
  .in("id", savedIds)
  .order("basic_court_name");
if (courtVerifyError) throw new Error(`코트 검증 실패: ${courtVerifyError.message}`);

const { data: verifiedRules, error: ruleVerifyError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,eligibility,rule_type,open_day_of_month,open_day_of_week,open_ordinal,open_time,open_offset,is_active")
  .in("court_id", savedIds)
  .eq("is_active", true);
if (ruleVerifyError) throw new Error(`규칙 검증 실패: ${ruleVerifyError.message}`);

const verifiedRuleIds = verifiedRules.map(({ id }) => id);
const { data: verifiedFees, error: feeVerifyError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRuleIds);
if (feeVerifyError) throw new Error(`요금 검증 실패: ${feeVerifyError.message}`);

if (verifiedCourts.length !== existingCourts.length + newCourts.length) {
  throw new Error(`검증 코트 수 불일치: ${verifiedCourts.length}`);
}

const expectedRuleKeys = new Set(rules.map(({ courtKey, label }) => `${savedByKey.get(courtKey).id}:${label}`));
const verifiedRuleKeys = new Set(verifiedRules.map(({ court_id, label }) => `${court_id}:${label}`));
const missingRules = [...expectedRuleKeys].filter((key) => !verifiedRuleKeys.has(key));
if (missingRules.length) throw new Error(`누락 예약 규칙: ${missingRules.join(", ")}`);

const expectedFeeRuleIds = new Set(ruleWrites.filter(({ fee }) => fee).map(({ id }) => id));
const verifiedFeeRuleIds = new Set(verifiedFees.map(({ booking_rule_id }) => booking_rule_id));
const missingFees = [...expectedFeeRuleIds].filter((id) => !verifiedFeeRuleIds.has(id));
if (missingFees.length) throw new Error(`누락 요금: ${missingFees.join(", ")}`);

const invalidMaps = verifiedCourts.filter(
  ({ basic_map_link }) => !basic_map_link?.startsWith("https://map.naver.com/")
);
if (invalidMaps.length) {
  throw new Error(`네이버지도 링크 검증 실패: ${invalidMaps.map(({ basic_court_name }) => basic_court_name).join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      courtWrites,
      verifiedCourtCount: verifiedCourts.length,
      verifiedRuleCount: verifiedRules.length,
      verifiedFeeCount: verifiedFees.length,
      verifiedCourts,
    },
    null,
    2
  )
);
