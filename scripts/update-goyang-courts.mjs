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

const sharedAssociationDescription = [
  "고양특례시테니스협회 운영 공공코트.",
  "온라인 예약만 가능하며 전화예약은 불가합니다.",
  "1일 1회, 최대 2시간 예약 가능합니다.",
  "고양시민 우선예약이며 타지역 이용자는 사용료가 50% 가산됩니다.",
  "대회, 시설 정비, 기상 상황에 따라 이용이 제한될 수 있습니다.",
].join("\n");

const associationCourts = [
  {
    id: "932aba46-880e-4e72-bf1f-1fb8c138269b",
    name: "대화테니스장",
    url: "https://www.gytennis.or.kr/daily/1",
    counts: { court_count_hard_outdoor: 4 },
  },
  {
    id: "0ac3348c-bd30-47b8-93f8-17f8c263ed48",
    name: "성라테니스장",
    url: "https://www.gytennis.or.kr/daily/3",
    counts: { court_count_grass_outdoor: 3 },
  },
  {
    id: "bcd53edc-b8e7-42fd-95f4-74352f34e5f6",
    name: "중산테니스장",
    url: "https://www.gytennis.or.kr/daily/6",
    counts: { court_count_hard_outdoor: 3 },
  },
  {
    id: "04fa54a5-e47c-4229-bf3a-198bc1d9843f",
    name: "충장테니스장",
    url: "https://www.gytennis.or.kr/daily/7",
    counts: { court_count_hard_outdoor: 4 },
  },
  {
    id: "5099fb42-f718-45dd-8847-55de1c58ad71",
    name: "토당테니스장",
    url: "https://www.gytennis.or.kr/daily/9",
    counts: { court_count_hard_outdoor: 6 },
  },
  {
    id: "1bffacab-5d24-4a20-a74c-4ec500d4c374",
    name: "화정테니스장",
    url: "https://www.gytennis.or.kr/daily/10",
    counts: { court_count_hard_outdoor: 3 },
  },
];

const zeroCourtCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const courtUpdates = [
  ...associationCourts.map((court) => ({
    id: court.id,
    name: court.name,
    values: {
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCourtCounts,
      ...court.counts,
      booking_site_link: court.url,
      booking_reception_time: "고양시민 매월 25일 22:00, 타지역 매월 27일 07:00",
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: 25,
      booking_open_time_owner: "22:00:00",
      booking_open_day_normal: 27,
      booking_open_time_normal: "07:00:00",
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: sharedAssociationDescription,
      updated_at: now,
    },
  })),
  {
    id: "25ec6a82-15c6-45b9-9ba5-eb7d52896320",
    name: "성저테니스장",
    values: {
      ...zeroCourtCounts,
      court_count_hard_outdoor: 4,
      booking_site_link: "https://yeyak.gys.or.kr/fmcs/41",
      booking_reception_time: "매월 25일 10:00 익월분 오픈",
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      booking_open_day_owner: 25,
      booking_open_time_owner: "10:00:00",
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: [
        "고양스포츠타운에서 운영하는 성저테니스장입니다.",
        "실외 하드코트 4면.",
        "개인당 1일 1회 1코트만 신청 가능하며 신청 당일 24시까지 결제하지 않으면 자동 취소됩니다.",
        "시설 운영시간과 정기휴무는 예약 공지에서 재확인이 필요합니다.",
      ].join("\n"),
      updated_at: now,
    },
  },
  {
    id: "758bc918-3ca1-462b-a0d7-ed2f4f913f30",
    name: "백석 테니스장",
    values: {
      ...zeroCourtCounts,
      court_count_clay_outdoor: 3,
      booking_site_link: "https://yeyak.gys.or.kr/fmcs/1?companyCode=GYS10",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: [
        "백석생활체육시설 실외 클레이코트 3면.",
        "고양도시관리공사 통합예약을 이용합니다.",
        "대관 오픈 시각, 당일 예약 여부, 정기휴무는 시설별 공고에서 재확인이 필요합니다.",
      ].join("\n"),
      updated_at: now,
    },
  },
  {
    id: "34c45d33-4358-432e-8e6c-4fa38306cdce",
    name: "고양백석체육센터 테니스",
    values: {
      ...zeroCourtCounts,
      court_count_clay_outdoor: 3,
      booking_site_link: "https://yeyak.gys.or.kr/fmcs/1?companyCode=GYS03",
      booking_reception_time: "홈페이지에서 수시 대기등록 후 관리자 배정",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매월 1·3주 일요일, 법정공휴일, 1월 1일, 설·추석 연휴",
      etc_desc: [
        "백석체육센터 테니스 강습 프로그램입니다.",
        "홈페이지에서 수시로 대기등록한 뒤 관리자 배정 및 안내를 받아 결제합니다.",
        "백석 테니스장 행과 동일 생활체육시설의 강습/대관 명칭으로 중복 수집되었을 가능성이 있습니다.",
      ].join("\n"),
      updated_at: now,
    },
  },
  ...[
    {
      id: "5eee2c9d-a9ab-4c98-adae-c4163dea7637",
      name: "국토안전관리원 수도권지역본부 테니스장1",
      resourceNo: "GG15J1256530",
    },
    {
      id: "e12f9b06-42e4-4f2f-9bd5-110bbe4135be",
      name: "국토안전관리원 수도권지역본부 테니스장2",
      resourceNo: "GG15J1857191",
    },
  ].map((court) => ({
    id: court.id,
    name: court.name,
    values: {
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      booking_site_link: `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${court.resourceNo}`,
      booking_reception_time: "09:00~12:00, 12:00~15:00, 15:00~18:00 (3시간 단위)",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      booking_holiday_week: "없음 (평일·주말·공휴일 운영)",
      etc_desc: [
        "국토안전관리원 수도권지역본부 개방 체육시설입니다.",
        "일반시민 누구나 무료로 이용할 수 있습니다.",
        "테니스장 전체 2면을 09:00~12:00, 12:00~15:00, 15:00~18:00의 3회차로 운영합니다.",
        "코트 표면, 예약 오픈 시점, 당일 예약 가능 여부는 공유누리 상세 안내에서 재확인이 필요합니다.",
      ].join("\n"),
      updated_at: now,
    },
  })),
];

const bookingRules = [
  ...associationCourts.flatMap((court) => [
    {
      court_id: court.id,
      label: "고양시민 우선",
      eligibility: "citizen",
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 25,
      open_time: "22:00:00",
      open_offset: "다음달",
      reservation_url: court.url,
      booking_round_label: "고양시민 우선예약",
      usage_period_label: "익월 이용분",
      is_active: true,
      sort_order: 10,
      updated_at: now,
    },
    {
      court_id: court.id,
      label: "타지역 일반",
      eligibility: "normal",
      rule_type: "fixed_schedule",
      open_type: "day",
      open_day_of_month: 27,
      open_time: "07:00:00",
      open_offset: "다음달",
      reservation_url: court.url,
      booking_round_label: "타지역 거주자 예약",
      usage_period_label: "익월 이용분",
      is_active: true,
      sort_order: 20,
      updated_at: now,
    },
  ]),
  {
    court_id: "25ec6a82-15c6-45b9-9ba5-eb7d52896320",
    label: "일반 예약",
    eligibility: "normal",
    rule_type: "fixed_schedule",
    open_type: "day",
    open_day_of_month: 25,
    open_time: "10:00:00",
    open_offset: "다음달",
    reservation_url: "https://yeyak.gys.or.kr/fmcs/41",
    booking_round_label: "성저테니스장 대관",
    usage_period_label: "익월 이용분",
    is_active: true,
    sort_order: 10,
    updated_at: now,
  },
];

async function updateCourt(update) {
  const { data, error } = await supabase
    .from("courtinfo")
    .update(update.values)
    .eq("id", update.id)
    .select("id,basic_court_name")
    .single();

  if (error) throw new Error(`${update.name} 업데이트 실패: ${error.message}`);
  return data;
}

async function upsertRule(rule) {
  const { data: existing, error: readError } = await supabase
    .from("court_booking_rules")
    .select("id")
    .eq("court_id", rule.court_id)
    .eq("label", rule.label)
    .maybeSingle();

  if (readError) throw new Error(`예약 규칙 조회 실패: ${readError.message}`);

  if (existing?.id) {
    const { error } = await supabase
      .from("court_booking_rules")
      .update(rule)
      .eq("id", existing.id);
    if (error) throw new Error(`예약 규칙 수정 실패: ${error.message}`);
    return { action: "updated", id: existing.id };
  }

  const { data, error } = await supabase
    .from("court_booking_rules")
    .insert(rule)
    .select("id")
    .single();
  if (error) throw new Error(`예약 규칙 추가 실패: ${error.message}`);
  return { action: "inserted", id: data.id };
}

const updatedCourts = [];
for (const update of courtUpdates) {
  updatedCourts.push(await updateCourt(update));
}

const updatedRules = [];
for (const rule of bookingRules) {
  updatedRules.push(await upsertRule(rule));
}

console.log(
  JSON.stringify(
    {
      updatedCourtCount: updatedCourts.length,
      updatedCourts,
      bookingRuleCount: updatedRules.length,
      bookingRuleActions: updatedRules,
    },
    null,
    2
  )
);
