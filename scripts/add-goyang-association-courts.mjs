import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase 환경변수가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const sourceCourtName = "충장테니스장";

const courtCountDefaults = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const courts = [
  {
    name: "삼송저류지 테니스장",
    slug: "samsong-reservoir-tennis-court",
    address: "경기 고양시 덕양구 동산동 331",
    latitude: 37.6427437320249,
    longitude: 126.879494238116,
    mapLink: "https://map.naver.com/p/search/%EC%82%BC%EC%86%A1%EC%A0%80%EB%A5%98%EC%A7%80%20%ED%85%8C%EB%8B%88%EC%8A%A4%EC%9E%A5",
    reservationUrl: "https://www.gytennis.or.kr/daily/2",
    sourceId: "2",
    counts: { court_count_grass_outdoor: 5 },
    description: "인조잔디 실외코트 5면. 유수지 시설로 기상특보·호우 시 운영이 제한될 수 있습니다.",
  },
  {
    name: "성사시립테니스장 실외코트",
    slug: "seongsa-municipal-outdoor-tennis-court",
    address: "경기 고양시 덕양구 호국로 876",
    latitude: 37.6621961261214,
    longitude: 126.843850406383,
    mapLink: "https://map.naver.com/p/search/%EC%84%B1%EC%82%AC%EC%8B%9C%EB%A6%BD%ED%85%8C%EB%8B%88%EC%8A%A4%EC%9E%A5",
    reservationUrl: "https://www.gytennis.or.kr/daily/5",
    sourceId: "5",
    counts: { court_count_hard_outdoor: 8 },
    description: "성사시립테니스장 전체 12면 중 전천후 4면을 제외한 실외코트 8면입니다.",
  },
  {
    name: "성사시립테니스장 전천후코트",
    slug: "seongsa-municipal-all-weather-tennis-court",
    address: "경기 고양시 덕양구 호국로 876",
    latitude: 37.6621961261214,
    longitude: 126.843850406383,
    mapLink: "https://map.naver.com/p/search/%EC%84%B1%EC%82%AC%EC%8B%9C%EB%A6%BD%ED%85%8C%EB%8B%88%EC%8A%A4%EC%9E%A5",
    reservationUrl: "https://www.gytennis.or.kr/daily/4",
    sourceId: "4",
    counts: { court_count_hard_indoor: 4 },
    description: "막구조와 조명시설을 갖춘 전천후코트 4면입니다.",
  },
  {
    name: "킨텍스저류지 테니스장",
    slug: "kintex-reservoir-tennis-court",
    address: "경기 고양시 일산서구 대화동 2709",
    latitude: 37.6635782115096,
    longitude: 126.735785436572,
    mapLink: "https://map.naver.com/p/search/%ED%82%A8%ED%85%8D%EC%8A%A4%EC%A0%80%EB%A5%98%EC%A7%80%20%ED%85%8C%EB%8B%88%EC%8A%A4%EC%9E%A5",
    reservationUrl: "https://www.gytennis.or.kr/daily/8",
    sourceId: "8",
    counts: { court_count_grass_outdoor: 5 },
    description: "인조잔디 실외코트 5면. 유수지 시설로 우기·호우 시 운영이 제한될 수 있습니다.",
  },
];

const bookingFieldsToClone = [
  "booking_reception_time",
  "booking_rule_type",
  "booking_online_reserve_possible",
  "booking_booking_provide",
  "booking_open_time_local",
  "booking_open_day_owner",
  "booking_open_offset",
  "booking_today_booking_possible",
  "booking_holiday_week",
  "booking_eligibility_first",
  "booking_eligibility_second",
  "booking_open_day_normal",
  "booking_open_time_owner",
  "booking_open_time_normal",
  "booking_open_type",
  "booking_open_day_of_month",
  "booking_open_day_of_week",
  "booking_open_ordinal",
  "booking_normal_iscurrentmonth",
  "booking_lottery_desc",
];

const { data: sourceCourt, error: sourceCourtError } = await supabase
  .from("courtinfo")
  .select("*")
  .eq("basic_court_name", sourceCourtName)
  .single();

if (sourceCourtError) {
  throw new Error(`${sourceCourtName} 조회 실패: ${sourceCourtError.message}`);
}

const { data: sourceRules, error: sourceRulesError } = await supabase
  .from("court_booking_rules")
  .select("*")
  .eq("court_id", sourceCourt.id)
  .order("sort_order", { ascending: true });

if (sourceRulesError) {
  throw new Error(`${sourceCourtName} 예약 규칙 조회 실패: ${sourceRulesError.message}`);
}

if (!sourceRules?.length) {
  throw new Error(`${sourceCourtName}에 복제할 예약 규칙이 없습니다.`);
}

const clonedBookingFields = Object.fromEntries(
  bookingFieldsToClone.map((field) => [field, sourceCourt[field] ?? null])
);

async function upsertCourt(court) {
  const { data: existingRows, error: existingError } = await supabase
    .from("courtinfo")
    .select("id,basic_court_name")
    .eq("basic_court_name", court.name);

  if (existingError) {
    throw new Error(`${court.name} 중복 검사 실패: ${existingError.message}`);
  }

  if ((existingRows?.length ?? 0) > 1) {
    throw new Error(`${court.name} 행이 2개 이상 있어 자동 처리할 수 없습니다.`);
  }

  const payload = {
    basic_court_name: court.name,
    slug: court.slug,
    basic_owner_type: "시립",
    basic_address: court.address,
    basic_map_link: court.mapLink,
    basic_latitude: court.latitude,
    basic_longitude: court.longitude,
    basic_region: "경기",
    basic_city: "고양시",
    time_of_use_same: sourceCourt.time_of_use_same,
    basic_time_of_use_weekday_from: sourceCourt.basic_time_of_use_weekday_from,
    basic_time_of_use_weekday_to: sourceCourt.basic_time_of_use_weekday_to,
    basic_time_of_use_weekend_from: sourceCourt.basic_time_of_use_weekend_from,
    basic_time_of_use_weekend_to: sourceCourt.basic_time_of_use_weekend_to,
    use_or_not: true,
    ...courtCountDefaults,
    ...court.counts,
    booking_site_link: court.reservationUrl,
    ...clonedBookingFields,
    etc_desc: [sourceCourt.etc_desc, court.description].filter(Boolean).join("\n"),
    source_provider: "goyang_tennis_association",
    source_service_id: court.sourceId,
    source_service_name: court.name,
    source_place_name: court.name,
    source_area_name: "경기 고양시",
    source_match_key: `gytennis:${court.sourceId}`,
    source_synced_at: now,
    updated_at: now,
  };

  if (existingRows?.[0]?.id) {
    const { data, error } = await supabase
      .from("courtinfo")
      .update(payload)
      .eq("id", existingRows[0].id)
      .select("id,basic_court_name")
      .single();
    if (error) throw new Error(`${court.name} 수정 실패: ${error.message}`);
    return { ...data, action: "updated" };
  }

  const { data, error } = await supabase
    .from("courtinfo")
    .insert(payload)
    .select("id,basic_court_name")
    .single();
  if (error) throw new Error(`${court.name} 추가 실패: ${error.message}`);
  return { ...data, action: "inserted" };
}

async function cloneRules(courtId) {
  const results = [];

  for (const sourceRule of sourceRules) {
    const {
      id: _id,
      court_id: _courtId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...ruleFields
    } = sourceRule;
    const payload = { ...ruleFields, court_id: courtId, updated_at: now };

    const { data: existing, error: existingError } = await supabase
      .from("court_booking_rules")
      .select("id")
      .eq("court_id", courtId)
      .eq("label", sourceRule.label)
      .maybeSingle();
    if (existingError) throw new Error(`예약 규칙 중복 검사 실패: ${existingError.message}`);

    if (existing?.id) {
      const { error } = await supabase
        .from("court_booking_rules")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(`예약 규칙 수정 실패: ${error.message}`);
      results.push({ id: existing.id, label: sourceRule.label, action: "updated" });
      continue;
    }

    const { data, error } = await supabase
      .from("court_booking_rules")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`예약 규칙 추가 실패: ${error.message}`);
    results.push({ id: data.id, label: sourceRule.label, action: "inserted" });
  }

  return results;
}

const writes = [];
for (const court of courts) {
  const savedCourt = await upsertCourt(court);
  const rules = await cloneRules(savedCourt.id);
  writes.push({ ...savedCourt, rules });
}

const savedIds = writes.map((court) => court.id);
const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select(
    "id,basic_court_name,basic_address,court_count_hard_indoor,court_count_hard_outdoor,court_count_grass_outdoor,booking_site_link,booking_reception_time,booking_open_day_owner,booking_open_time_owner,booking_open_day_normal,booking_open_time_normal,booking_today_booking_possible,use_or_not"
  )
  .in("id", savedIds)
  .order("basic_court_name");
if (verifyCourtError) throw new Error(`코트 검증 실패: ${verifyCourtError.message}`);

const { data: verifiedRules, error: verifyRulesError } = await supabase
  .from("court_booking_rules")
  .select(
    "court_id,label,eligibility,rule_type,open_type,open_day_of_month,open_time,open_offset,open_date_adjustment,is_active,sort_order"
  )
  .in("court_id", savedIds)
  .order("court_id")
  .order("sort_order");
if (verifyRulesError) throw new Error(`예약 규칙 검증 실패: ${verifyRulesError.message}`);

const ruleCounts = Object.fromEntries(
  savedIds.map((id) => [id, verifiedRules.filter((rule) => rule.court_id === id).length])
);
if (verifiedCourts.length !== courts.length || Object.values(ruleCounts).some((count) => count !== sourceRules.length)) {
  throw new Error("삽입 후 코트 또는 예약 규칙 수가 예상과 다릅니다.");
}

console.log(
  JSON.stringify(
    {
      sourceCourt: {
        name: sourceCourt.basic_court_name,
        bookingReceptionTime: sourceCourt.booking_reception_time,
        ruleCount: sourceRules.length,
      },
      writes,
      verifiedCourts,
      verifiedRules,
    },
    null,
    2
  )
);
