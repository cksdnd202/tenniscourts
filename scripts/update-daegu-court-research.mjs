import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 대구 시설·예약·요금정보 공식자료 재검증]";
const hiddenDuplicateId = "cdca10ed-20be-42e9-96ed-20a82fe460a7";
const dalseongBooking = "https://yeyak.dssiseol.or.kr/index.do?menu_id=00006531";
const dongguBooking = "https://dong.daegu.kr/reserve/contents.do?mid=0206000000";
const eshare = (resourceId) =>
  `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`;
const naverMap = (name, address) =>
  `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`;

const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const paidFee = (priceBasisHours, values) => ({
  is_free: false,
  price_basis_hours: priceBasisHours,
  ...values,
});
const freeFee = (priceBasisHours = 1) => ({ is_free: true, price_basis_hours: priceBasisHours });

const rule = (ruleType, bookingRoundLabel, usagePeriodLabel, reservationUrl, fee = null, extra = {}) => ({
  label: "전체",
  eligibility: "normal",
  rule_type: ruleType,
  booking_round_label: bookingRoundLabel,
  usage_period_label: usagePeriodLabel,
  reservation_url: reservationUrl,
  fee,
  ...extra,
});

const existingCourts = [
  {
    id: "34dc97be-5096-41d9-876c-8e3be2070c12",
    name: "군위종합테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 이용 가능 시간 확인 · 문의 054-380-7982",
      booking_site_link: eshare("BA10A0005180"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_indoor: 4,
      court_count_hard_outdoor: 6,
    },
    note: "실내 하드코트 4면과 실외 하드코트 6면을 한 시설로 반영했습니다. 평일 06:00~22:00, 주말·공휴일 09:00~22:00 운영 안내가 확인됩니다. 실외 개인 사용료는 1면 2시간 기준 평일 주간 8,000원, 평일 야간 10,000원, 주말 주간 10,000원이며 주말 야간은 공개 요금표에서 확인되지 않았습니다. 이용 전 담당자에게 문의해야 합니다.",
    rules: [rule("phone", "전화 문의 후 이용 일정 확인", "평일 06:00~22:00 · 주말·공휴일 09:00~22:00", eshare("BA10A0005180"), paidFee(2, {
      outdoor_weekday_price: 8000,
      outdoor_weekend_price: 10000,
      lighting_fee_separate: true,
      lighting_fee_amount: 2000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    id: "a4bcce4a-8da9-457e-9784-931e85007ef3",
    name: "군위지사 테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "예약 오픈 정보 확인 중 · 이용 전 운영기관 문의",
      booking_site_link: eshare("GG11K812481"),
      booking_online_reserve_possible: null,
      ...zeroCounts,
    },
    note: "한국도로공사 군위지사 개방시설입니다. 국민 이용 가능 시설로는 확인되지만 공식 공개자료에서 정기 예약 오픈 시각, 운영시간, 코트 면수와 정확한 이용료를 확인하지 못해 추정하지 않았습니다.",
    rules: [rule("checking", "예약 오픈 정보 확인 중", "이용 일정 운영기관 확인", eshare("GG11K812481"))],
  },
  {
    id: "7c6dd97c-09f3-4101-9f78-8c9a8b283399",
    name: "한국부동산원 본사 테니스장",
    values: {
      basic_court_name: "한국부동산원 본사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "이용신청서 첨부 후 관리자 승인 · 사용 가능한 코트는 A코트",
      booking_site_link: eshare("GG11K812763"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "13:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "토요일 13:00~17:00에 실외 A코트 1면을 개방합니다. B코트는 현재 사용하지 않습니다. 이용신청서를 첨부해 신청하고 관리자 승인을 받아야 하며 이용료는 무료입니다. 표면 재질은 공식 자료에서 확인되지 않아 구조화하지 않았습니다.",
    rules: [rule("irregular", "이용신청서 제출 후 관리자 승인", "토요일 13:00~17:00 · A코트 1면", eshare("GG11K812763"), freeFee())],
  },
  {
    id: "070c4c34-111f-442b-80a7-3434fbeed340",
    name: "월배테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "운영기관 전화 문의 후 이용 · 계절별 운영시간 확인",
      booking_site_link: eshare("BF11I3201113"),
      booking_online_reserve_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 3,
    },
    note: "실외 아크릴 코트 3면입니다. 5~9월은 05:00~23:00, 10~4월은 06:00~23:00 운영하므로 DB에는 전체 운영범위인 05:00~23:00을 저장했습니다. 일반 대관은 1면 2시간 기준 평일 주간 20,000원, 야간 30,000원으로 확인되며 주말 요금은 공개자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "운영기관 전화 문의", "5~9월 05:00~23:00 · 10~4월 06:00~23:00", eshare("BF11I3201113"), paidFee(2, {
      outdoor_weekday_price: 20000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    id: "fa5f3038-30d2-4742-bc8d-67f5122f3965",
    name: "한국지능정보사회진흥원 대구본원 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "대구 통합예약 신청 후 전화 확인·결제",
      booking_site_link: "https://yeyak.daegu.go.kr/yeyak/facility/facilityListView.do?memId=B0000056",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 1면이며 평일 09:00~18:00에 이용할 수 있고 주말·공휴일은 개방하지 않습니다. 대구 통합예약에서 신청한 뒤 담당자 전화 확인과 결제가 필요합니다. 사용료는 1시간 12,500원입니다. 표면 재질은 공식 자료에서 확인되지 않아 구조화하지 않았습니다.",
    rules: [rule("irregular", "온라인 신청 후 전화 확인·결제", "평일 09:00~18:00", "https://yeyak.daegu.go.kr/yeyak/facility/facilityListView.do?memId=B0000056", paidFee(1, {
      outdoor_weekday_price: 12500,
    }))],
  },
  {
    id: "f515bf67-0bda-41d7-82d4-17b1e4732560",
    name: "한국도로공사 대구경북본부 테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 30일 전부터 공유누리 실시간 예약 · 문의 053-714-6015",
      booking_site_link: eshare("BA10A0007277"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "15:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 3,
      source_service_id: "BA10A0007277",
    },
    note: "실외 인조잔디 코트 3면으로 일요일 15:00~18:00 개방합니다. 공유누리에서 현재일부터 1개월 이내 날짜를 실시간 예약할 수 있고 무료입니다. 최신 공유누리 자원번호 BA10A0007277을 기준으로 갱신했습니다.",
    rules: [rule("rolling", "이용일 30일 전부터 실시간 예약", "일요일 15:00~18:00", eshare("BA10A0007277"), freeFee(3), {
      open_time: "00:00:00",
      open_offset: "30",
    })],
  },
  {
    id: "a063e8af-7d81-4086-b38a-eb438b1a41b0",
    name: "환경자원사업소 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "대구 통합예약 또는 전화 접수 · 문의 053-605-6960",
      booking_site_link: "https://yeyak.daegu.go.kr/",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 3,
      court_count_grass_outdoor: 2,
    },
    note: "실외 코트 5면으로 인조잔디 2면과 데코탑 3면입니다. 4~9월 05:00~23:00, 10~3월 06:00~23:00 운영하므로 DB에는 전체 운영범위를 저장했습니다. 1면 2시간 기준 평일 주간 25,000원·주말 30,000원이며 야간은 각각 35,000원·40,000원입니다.",
    rules: [rule("irregular", "대구 통합예약 또는 전화 접수", "4~9월 05:00~23:00 · 10~3월 06:00~23:00", "https://yeyak.daegu.go.kr/", paidFee(2, {
      outdoor_weekday_price: 25000,
      outdoor_weekend_price: 30000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }))],
  },
];

const daeguPublicFee = paidFee(2, {
  outdoor_weekday_price: 28000,
  outdoor_weekend_price: 37000,
  lighting_fee_separate: true,
  lighting_fee_amount: 27000,
  lighting_fee_basis_hours: 2,
  lighting_start_time: "18:00:00",
});

const newCourts = [
  {
    name: "율하테니스장",
    slug: "daegu-donggu-yulha-tennis-court",
    city: "동구",
    address: "대구 동구 금호강변로 278",
    latitude: 35.8597096813729,
    longitude: 128.694464895474,
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 15일 전부터 3일 전까지 온라인 선착순 예약",
      booking_site_link: dongguBooking,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "율하체육공원 내 테니스장으로 공개 예약 대상은 E코트 1면입니다. 06:00~22:00 운영하며 이용일 15일 전부터 3일 전까지 온라인 선착순으로 접수합니다. 1시간 기준 평일 주간 23,000원·주말 27,000원, 야간은 각각 35,000원·40,000원입니다. DB의 조명비 단일 칼럼에는 평일 차액 12,000원을 저장했고 주말 야간 차액은 13,000원입니다.",
    rules: [rule("rolling", "이용일 15일 전부터 온라인 선착순 오픈", "이용일 3일 전까지 · 06:00~22:00", dongguBooking, paidFee(1, {
      outdoor_weekday_price: 23000,
      outdoor_weekend_price: 27000,
      lighting_fee_separate: true,
      lighting_fee_amount: 12000,
      lighting_fee_basis_hours: 1,
      lighting_start_time: "18:00:00",
    }), { open_time: "00:00:00", open_offset: "15" })],
  },
  {
    name: "도동복합운동장 테니스장",
    slug: "daegu-donggu-dodong-tennis-court",
    city: "동구",
    address: "대구 동구 도동 526",
    latitude: 35.9240042620558,
    longitude: 128.666987774636,
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 15일 전부터 3일 전까지 온라인 선착순 예약",
      booking_site_link: dongguBooking,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "도동복합운동장 내 테니스장으로 B~F 코트 5면이 온라인 예약 대상입니다. 06:00~22:00 운영하며 이용일 15일 전부터 3일 전까지 선착순으로 접수합니다. 1시간 기준 평일 주간 23,000원·주말 27,000원, 야간은 각각 35,000원·40,000원입니다. 표면 재질은 공식 예약 안내에서 확인되지 않아 구조화하지 않았습니다.",
    rules: [rule("rolling", "이용일 15일 전부터 온라인 선착순 오픈", "이용일 3일 전까지 · 06:00~22:00", dongguBooking, paidFee(1, {
      outdoor_weekday_price: 23000,
      outdoor_weekend_price: 27000,
      lighting_fee_separate: true,
      lighting_fee_amount: 12000,
      lighting_fee_basis_hours: 1,
      lighting_start_time: "18:00:00",
    }), { open_time: "00:00:00", open_offset: "15" })],
  },
  {
    name: "진밭골체육센터 테니스장",
    slug: "daegu-suseonggu-jinbatgol-tennis-court",
    city: "수성구",
    address: "대구 수성구 진밭길 14-6",
    latitude: 35.8140064606494,
    longitude: 128.650976060465,
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "수성구 체육시설 온라인 예약 · 예약 가능 일정은 접수 화면 확인",
      booking_site_link: "https://sports.suseong.kr/",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "12:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "테니스코트 2면입니다. 평일은 12:00~15:00와 18:00~22:00, 토요일 06:00~17:00, 일요일 09:00~17:00 운영하므로 DB에는 하루 전체 범위를 저장했습니다. 1시간 기준 평일 주간 6,000원·야간 12,000원, 주말 주간 8,000원입니다. 수성구민은 30% 감면되며 주말 야간 운영은 확인되지 않았습니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 화면에서 일정 확인", "평일 12:00~15:00·18:00~22:00 · 토 06:00~17:00 · 일 09:00~17:00", "https://sports.suseong.kr/", paidFee(1, {
      outdoor_weekday_price: 6000,
      outdoor_weekend_price: 8000,
      lighting_fee_separate: true,
      lighting_fee_amount: 6000,
      lighting_fee_basis_hours: 1,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    name: "남구종합스포츠타운 테니스장",
    slug: "daegu-namgu-sports-town-tennis-court",
    city: "남구",
    address: "대구 남구 봉덕동 산 129-2",
    latitude: 35.832034024256,
    longitude: 128.596966133813,
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "운영기관 문의 후 대관 신청",
      booking_site_link: "https://nam.daegu.kr/",
      booking_online_reserve_possible: false,
      ...zeroCounts,
      court_count_hard_outdoor: 3,
    },
    note: "실외 하드코트 3면입니다. 정기 예약 오픈 날짜와 상시 운영시간은 공개자료에서 확인되지 않아 전화 문의 방식으로 저장했습니다. 1시간 기준 평일 주간 6,000원·야간 12,000원, 주말 주간 8,000원·야간 14,000원입니다.",
    rules: [rule("phone", "운영기관 문의 후 대관 신청", "이용 가능 일정 운영기관 확인", "https://nam.daegu.kr/", paidFee(1, {
      outdoor_weekday_price: 6000,
      outdoor_weekend_price: 8000,
      lighting_fee_separate: true,
      lighting_fee_amount: 6000,
      lighting_fee_basis_hours: 1,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    name: "두류테니스장",
    slug: "daegu-dalseogu-duryu-tennis-court",
    city: "달서구",
    address: "대구 달서구 야외음악당로 194",
    latitude: 35.852474683672924,
    longitude: 128.55715670070146,
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "예약 오픈 정보 확인 중 · 운영기관 문의",
      booking_site_link: "https://www.daegu.go.kr/",
      booking_online_reserve_possible: null,
      ...zeroCounts,
      court_count_hard_outdoor: 6,
      court_count_clay_outdoor: 3,
    },
    note: "실외 하드코트 6면과 클레이코트 3면, 총 9면입니다. 공개 요금 안내상 일반 코트는 1면 2시간 기준 평일 주간 25,000원·주말 30,000원, 야간은 각각 35,000원·40,000원입니다. 현재 운영기관의 정기 예약 오픈 날짜와 시각은 재확인이 필요해 checking으로 저장했습니다.",
    rules: [rule("checking", "예약 오픈 정보 확인 중", "이용 일정 운영기관 확인", "https://www.daegu.go.kr/", paidFee(2, {
      outdoor_weekday_price: 25000,
      outdoor_weekend_price: 30000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    name: "유니버시아드테니스장",
    slug: "daegu-dalseogu-universiade-tennis-court",
    city: "달서구",
    address: "대구 달서구 두류공원로 161",
    latitude: 35.850557253921664,
    longitude: 128.56373059178608,
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 7일 전부터 온라인 선착순 예약 · 당일 빈 코트 현장 접수",
      booking_site_link: "https://www.daegu.go.kr/",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 10,
    },
    note: "실외 하드코트 10면입니다. 일반 이용은 조기 06:00~09:00, 주간 09:00~18:00, 야간 18:00~23:00로 운영합니다. 이용일 7일 전부터 온라인 선착순 예약하며 당일은 빈 코트에 한해 현장 접수합니다. 일반 코트 2시간 기준 평일 주간 25,000원·주말 30,000원, 야간 35,000원·40,000원입니다. 센터코트는 별도 요금으로 평일 주간 70,000원·야간 90,000원, 주말 주간 80,000원·야간 100,000원입니다.",
    rules: [rule("rolling", "이용일 7일 전부터 온라인 선착순 오픈", "당일 빈 코트 현장 접수 가능", "https://www.daegu.go.kr/", paidFee(2, {
      outdoor_weekday_price: 25000,
      outdoor_weekend_price: 30000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }), { open_time: "00:00:00", open_offset: "7" })],
  },
  {
    name: "성서산업단지 테니스장",
    slug: "daegu-dalseogu-seongseo-industrial-tennis-court",
    city: "달서구",
    address: "대구 달서구 성서공단로22길 25",
    latitude: 35.8322683006136,
    longitude: 128.496458109865,
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "온라인 사용 신청서 제출 후 승인",
      booking_site_link: "https://www.dalseo.daegu.kr/",
      booking_online_reserve_possible: true,
      ...zeroCounts,
    },
    note: "성서체육공원 내 테니스장입니다. 온라인 사용 신청서를 제출하고 승인받는 방식이며 정기 오픈 날짜는 공개되지 않았습니다. 일반 사용료는 1면 2시간 기준 평일 주간 25,000원·주말 30,000원, 야간 35,000원·40,000원입니다. 별도 조기 시간대 요금이 있으며 공식 안내의 야간 시간 단위 표기는 운영기관 재확인이 필요합니다.",
    rules: [rule("irregular", "온라인 사용 신청 후 승인", "예약 화면에서 이용 가능 일정 확인", "https://www.dalseo.daegu.kr/", paidFee(2, {
      outdoor_weekday_price: 25000,
      outdoor_weekend_price: 30000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }))],
  },
  {
    name: "서구감삼테니스장",
    slug: "daegu-seogu-gamsam-tennis-court",
    city: "서구",
    address: "대구 서구 서대구로3길 43",
    latitude: 35.8581802286204,
    longitude: 128.551836319898,
    values: { booking_rule_type: "phone", booking_reception_time: "이용 일정 전화 문의 · 문의 053-563-3955", booking_site_link: "https://www.dgs.go.kr/", booking_online_reserve_possible: false, ...zeroCounts, court_count_clay_outdoor: 6 },
    note: "실외 클레이코트 6면입니다. 정기 예약 오픈 시각과 현행 이용료는 공개자료에서 확인되지 않아 전화 문의 방식으로 저장했습니다. 문의 053-563-3955.",
    rules: [rule("phone", "이용 일정 전화 문의", "운영 일정 확인", "053-563-3955")],
  },
  {
    name: "상리테니스장",
    slug: "daegu-seogu-sangri-tennis-court",
    city: "서구",
    address: "대구 서구 평리로17길 45",
    latitude: 35.8627932442222,
    longitude: 128.533160835787,
    values: { booking_rule_type: "phone", booking_reception_time: "이용 일정 전화 문의 · 문의 053-564-5550", booking_site_link: "https://www.dgs.go.kr/", booking_online_reserve_possible: false, ...zeroCounts, court_count_grass_outdoor: 3 },
    note: "실외 인조잔디 코트 3면입니다. 정기 예약 오픈 시각과 현행 이용료는 공개자료에서 확인되지 않아 전화 문의 방식으로 저장했습니다. 문의 053-564-5550.",
    rules: [rule("phone", "이용 일정 전화 문의", "운영 일정 확인", "053-564-5550")],
  },
  {
    name: "상리공원 테니스장",
    slug: "daegu-seogu-sangri-park-tennis-court",
    city: "서구",
    address: "대구 서구 중리동 1177",
    latitude: 35.8631508527002,
    longitude: 128.533963035482,
    values: { booking_rule_type: "phone", booking_reception_time: "이용 일정 전화 문의 · 문의 053-663-2171", booking_site_link: "https://www.dgs.go.kr/", booking_online_reserve_possible: false, ...zeroCounts, court_count_hard_outdoor: 1 },
    note: "실외 우레탄 코트 1면입니다. 정기 예약 오픈 시각과 현행 이용료는 공개자료에서 확인되지 않아 전화 문의 방식으로 저장했습니다. 문의 053-663-2171.",
    rules: [rule("phone", "이용 일정 전화 문의", "운영 일정 확인", "053-663-2171")],
  },
  {
    name: "비산철로변 테니스장",
    slug: "daegu-seogu-bisan-railside-tennis-court",
    city: "서구",
    address: "대구 서구 비산1동 방범초소 인근",
    latitude: 35.8811710278803,
    longitude: 128.568982930677,
    values: { booking_rule_type: "checking", booking_reception_time: "예약 및 운영정보 확인 중", booking_site_link: "https://www.dgs.go.kr/", booking_online_reserve_possible: null, ...zeroCounts, court_count_clay_outdoor: 1 },
    note: "비산1동 철로변의 실외 마사토 코트 1면입니다. 마사토는 DB 코트 분류상 클레이로 구조화했습니다. 세부 주소, 정기 예약 오픈 시각과 현행 이용료는 공개자료에서 확인되지 않아 checking으로 저장했습니다. 좌표는 비산1동 중심값이므로 추후 정밀 위치 확인이 필요합니다.",
    rules: [rule("checking", "예약 오픈 정보 확인 중", "운영 일정 확인 중", "https://www.dgs.go.kr/")],
  },
  {
    name: "한국전력 대구본부 자재센터 테니스장",
    slug: "daegu-seogu-kepco-material-center-tennis-court",
    city: "서구",
    address: "대구 서구 북비산로 27 (이현동) 대구본부 자재센터",
    latitude: 35.8788787610559,
    longitude: 128.535927973982,
    values: { booking_rule_type: "irregular", booking_reception_time: "사전 사용 신청 후 관리자 승인", booking_site_link: "https://www.alioplus.go.kr/", booking_online_reserve_possible: true, time_of_use_same: false, basic_time_of_use_weekday_from: "09:00:00", basic_time_of_use_weekday_to: "18:00:00", basic_time_of_use_weekend_from: null, basic_time_of_use_weekend_to: null, ...zeroCounts },
    note: "한국전력공사 대구본부 자재센터 개방시설입니다. 평일 09:00~18:00 운영하고 주말·공휴일은 개방하지 않습니다. 사전 신청 후 승인이 필요하며 이용료는 무료입니다. 코트 면수와 표면 재질은 공식 자료에서 확인되지 않아 추정하지 않았습니다.",
    rules: [rule("irregular", "사전 사용 신청 후 관리자 승인", "평일 09:00~18:00", "https://www.alioplus.go.kr/", freeFee())],
  },
  {
    name: "달성종합스포츠파크 테니스장",
    slug: "daegu-dalseonggun-sports-park-tennis-court",
    city: "달성군",
    address: "대구 달성군 현풍읍 성하리 228-2",
    latitude: 35.7025309331549,
    longitude: 128.441463176602,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004770", booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts },
    note: "테니스코트 8면입니다. 인터넷으로 예약하며 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다. DB의 조명비 단일 칼럼에는 평일 차액 27,000원을 저장했고 주말 차액은 28,000원입니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004770", daeguPublicFee)],
  },
  {
    name: "다사체육공원 테니스장",
    slug: "daegu-dalseonggun-dasa-sports-park-tennis-court",
    city: "달성군",
    address: "대구 달성군 다사읍 달천리 6-2",
    latitude: 35.8907016813148,
    longitude: 128.479228809975,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004831", booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts, court_count_hard_outdoor: 2 },
    note: "실외 하드코트 2면입니다. 인터넷으로 예약하며 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004831", daeguPublicFee)],
  },
  {
    name: "가창체육공원 테니스장",
    slug: "daegu-dalseonggun-gachang-sports-park-tennis-court",
    city: "달성군",
    address: "대구 달성군 가창면 가창로 604",
    latitude: 35.766062747691,
    longitude: 128.651516853772,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004836", booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts, court_count_grass_outdoor: 2 },
    note: "실외 인조잔디 코트 2면입니다. 인터넷으로 예약하며 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004836", daeguPublicFee)],
  },
  {
    name: "달성군민운동장 테니스장",
    slug: "daegu-dalseonggun-county-stadium-tennis-court",
    city: "달성군",
    address: "대구 달성군 논공읍 논공로 697-10",
    latitude: 35.729891934513,
    longitude: 128.450674112893,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: dalseongBooking, booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts },
    note: "달성군민운동장 내 테니스장입니다. 인터넷으로 예약하며 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다. 코트 면수와 표면 재질은 공식 공개자료에서 확인되지 않아 추정하지 않았습니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", dalseongBooking, daeguPublicFee)],
  },
  {
    name: "화원테니스장",
    slug: "daegu-dalseonggun-hwawon-tennis-court",
    city: "달성군",
    address: "대구 달성군 화원읍 인흥1길 58",
    latitude: 35.7942038150929,
    longitude: 128.505475433788,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004898", booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts, court_count_clay_indoor: 3, court_count_clay_outdoor: 3, court_count_grass_outdoor: 4 },
    note: "실내 클레이 3면과 실외 클레이 3면·인조잔디 4면, 총 10면입니다. 온라인 예약을 지원하며 접수 마감은 당일 15:00, 토·공휴일 이용분은 전날 15:00입니다. 개인 일반 사용료는 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원으로 안내됩니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004898", daeguPublicFee)],
  },
  {
    name: "현풍테니스장",
    slug: "daegu-dalseonggun-hyeonpung-tennis-court",
    city: "달성군",
    address: "대구 달성군 현풍읍 성하리 491-6",
    latitude: 35.69665320098401,
    longitude: 128.43665548785756,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: dalseongBooking, booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts },
    note: "실외 테니스코트 3면입니다. 인터넷으로 예약하며 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다. 표면 재질은 공식 공개자료에서 확인되지 않아 추정하지 않았습니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", dalseongBooking, daeguPublicFee)],
  },
  {
    name: "다사매곡테니스장",
    slug: "daegu-dalseonggun-dasa-maegok-tennis-court",
    city: "달성군",
    address: "대구 달성군 다사읍 매곡리 842",
    latitude: 35.8647459281767,
    longitude: 128.45001276702,
    values: { booking_rule_type: "irregular", booking_reception_time: "온라인 예약 · 당일 15시까지, 토·공휴일은 전날 15시까지 접수", booking_site_link: "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004890", booking_online_reserve_possible: true, booking_today_booking_possible: true, ...zeroCounts },
    note: "달성군시설관리공단 통합예약에서 온라인 예약할 수 있습니다. 당일 예약은 15:00까지, 토·공휴일 예약은 전날 15:00까지 접수합니다. 개인 일반 사용료는 1면 2시간 기준 평일 주간 28,000원·주말 37,000원, 야간 55,000원·65,000원입니다. 코트 면수와 표면 재질은 공식 공개자료에서 확인되지 않아 추정하지 않았습니다.",
    rules: [rule("irregular", "온라인 예약 · 접수 마감 시각 적용", "당일 15시까지 · 토·공휴일 전날 15시까지", "https://yeyak.dssiseol.or.kr/index.do?menu_id=00004890", daeguPublicFee)],
  },
];

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const resetLegacyBookingFields = {
  booking_lottery_desc: null,
  booking_open_type: null,
  booking_open_day_of_month: null,
  booking_open_day_of_week: null,
  booking_open_ordinal: null,
  booking_open_day_owner: null,
  booking_open_time_owner: null,
  booking_open_day_normal: null,
  booking_open_time_normal: null,
  booking_normal_iscurrentmonth: null,
  booking_open_time_local: null,
  booking_open_offset: null,
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

const { data: daeguBefore, error: daeguReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_city,slug,source_match_key,etc_desc,use_or_not")
  .eq("basic_region", "대구");
if (daeguReadError) throw daeguReadError;

const existingIds = new Set(daeguBefore.map(({ id }) => id));
for (const court of existingCourts) {
  if (!existingIds.has(court.id)) throw new Error(`기존 시설 누락: ${court.name} (${court.id})`);
}
if (!existingIds.has(hiddenDuplicateId)) throw new Error("숨김 대상 NIA 중복 시설을 찾지 못했습니다.");

const byMatchKey = new Map(daeguBefore.filter(({ source_match_key }) => source_match_key).map((court) => [court.source_match_key, court]));
const byNameCity = new Map(daeguBefore.map((court) => [`${court.basic_city}:${court.basic_court_name}`, court]));
const newPlan = newCourts.map((court) => {
  const sourceMatchKey = `research:daegu:${court.slug}`;
  const matched = byMatchKey.get(sourceMatchKey) ?? byNameCity.get(`${court.city}:${court.name}`) ?? null;
  return { ...court, sourceMatchKey, matched };
});

const allPlannedIds = [
  ...existingCourts.map(({ id }) => id),
  ...newPlan.map(({ matched }) => matched?.id).filter(Boolean),
  hiddenDuplicateId,
];
const { data: activeRulesBefore, error: rulesReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,sort_order,is_active")
  .in("court_id", allPlannedIds)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (rulesReadError) throw rulesReadError;

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  currentDaeguRows: daeguBefore.length,
  existingUpdates: existingCourts.length,
  duplicateToHide: 1,
  newFacilities: newCourts.length,
  newFacilitiesAlreadyPresent: newPlan.filter(({ matched }) => matched).length,
  expectedVisibleAfter: 26,
  planned: [
    ...existingCourts.map(({ name, values, rules }) => ({ name, action: "update", type: values.booking_rule_type, fee: rules[0].fee ? (rules[0].fee.is_free ? "free" : "paid") : "unknown" })),
    ...newPlan.map(({ name, matched, values, rules }) => ({ name, action: matched ? "update" : "insert", type: values.booking_rule_type, fee: rules[0].fee ? (rules[0].fee.is_free ? "free" : "paid") : "unknown" })),
  ],
}, null, 2));

if (!shouldApply) process.exit(0);

const rulesByCourt = new Map();
for (const currentRule of activeRulesBefore) {
  const list = rulesByCourt.get(currentRule.court_id) ?? [];
  list.push(currentRule);
  rulesByCourt.set(currentRule.court_id, list);
}

const { error: hideCourtError } = await supabase
  .from("courtinfo")
  .update({ use_or_not: false, updated_at: now })
  .eq("id", hiddenDuplicateId);
if (hideCourtError) throw new Error(`NIA 중복 시설 숨김 실패: ${hideCourtError.message}`);

const duplicateRules = rulesByCourt.get(hiddenDuplicateId) ?? [];
if (duplicateRules.length) {
  const duplicateRuleIds = duplicateRules.map(({ id }) => id);
  const { error: deactivateDuplicateError } = await supabase
    .from("court_booking_rules")
    .update({ is_active: false, updated_at: now })
    .in("id", duplicateRuleIds);
  if (deactivateDuplicateError) throw new Error(`NIA 중복 규칙 비활성화 실패: ${deactivateDuplicateError.message}`);
  const { error: deleteDuplicateFeeError } = await supabase
    .from("court_booking_rule_fees")
    .delete()
    .in("booking_rule_id", duplicateRuleIds);
  if (deleteDuplicateFeeError) throw new Error(`NIA 중복 요금 정리 실패: ${deleteDuplicateFeeError.message}`);
}

const saveFee = async (ruleId, fee, courtName) => {
  if (!fee) {
    const { error } = await supabase.from("court_booking_rule_fees").delete().eq("booking_rule_id", ruleId);
    if (error) throw new Error(`${courtName} 미확인 요금 정리 실패: ${error.message}`);
    return;
  }

  const row = {
    booking_rule_id: ruleId,
    is_free: fee.is_free,
    price_basis_hours: fee.price_basis_hours ?? 1,
    outdoor_weekday_price: fee.outdoor_weekday_price ?? null,
    outdoor_weekend_price: fee.outdoor_weekend_price ?? null,
    indoor_weekday_price: fee.indoor_weekday_price ?? null,
    indoor_weekend_price: fee.indoor_weekend_price ?? null,
    lighting_fee_separate: fee.lighting_fee_separate ?? false,
    lighting_fee_amount: fee.lighting_fee_amount ?? null,
    lighting_fee_basis_hours: fee.lighting_fee_basis_hours ?? null,
    lighting_start_time: fee.lighting_start_time ?? null,
    updated_at: now,
  };
  const { error } = await supabase.from("court_booking_rule_fees").upsert(row, { onConflict: "booking_rule_id" });
  if (error) throw new Error(`${courtName} 요금 저장 실패: ${error.message}`);
};

const saveRules = async (courtId, courtName, desiredRules, fallbackUrl) => {
  const currentRules = rulesByCourt.get(courtId) ?? [];
  const savedIds = [];
  for (let index = 0; index < desiredRules.length; index += 1) {
    const { fee, ...desired } = desiredRules[index];
    const payload = {
      ...resetRuleFields,
      label: "전체",
      eligibility: "normal",
      reservation_url: fallbackUrl,
      booking_round_label: null,
      usage_period_label: null,
      is_active: true,
      sort_order: (index + 1) * 10,
      ...desired,
      updated_at: now,
    };

    let ruleId;
    const existingRule = currentRules[index];
    if (existingRule) {
      const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existingRule.id);
      if (error) throw new Error(`${courtName} 예약 규칙 갱신 실패: ${error.message}`);
      ruleId = existingRule.id;
    } else {
      const { data, error } = await supabase
        .from("court_booking_rules")
        .insert({ court_id: courtId, ...payload, created_at: now })
        .select("id")
        .single();
      if (error) throw new Error(`${courtName} 예약 규칙 추가 실패: ${error.message}`);
      ruleId = data.id;
    }
    savedIds.push(ruleId);
    await saveFee(ruleId, fee, courtName);
  }

  const obsolete = currentRules.slice(desiredRules.length);
  if (obsolete.length) {
    const obsoleteIds = obsolete.map(({ id }) => id);
    const { error } = await supabase.from("court_booking_rules").update({ is_active: false, updated_at: now }).in("id", obsoleteIds);
    if (error) throw new Error(`${courtName} 이전 규칙 비활성화 실패: ${error.message}`);
    const { error: feeError } = await supabase.from("court_booking_rule_fees").delete().in("booking_rule_id", obsoleteIds);
    if (feeError) throw new Error(`${courtName} 이전 요금 정리 실패: ${feeError.message}`);
  }
  return savedIds;
};

for (const config of existingCourts) {
  const before = daeguBefore.find(({ id }) => id === config.id);
  const { error } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...config.values,
      use_or_not: true,
      etc_desc: appendNote(before.etc_desc, config.note),
      source_synced_at: now,
      updated_at: now,
    })
    .eq("id", config.id);
  if (error) throw new Error(`${config.name} 시설 갱신 실패: ${error.message}`);
  await saveRules(config.id, config.name, config.rules, config.values.booking_site_link);
  console.log(`완료: ${config.name}`);
}

for (const config of newPlan) {
  const commonValues = {
    basic_court_name: config.name,
    basic_address: config.address,
    basic_map_link: naverMap(config.name, config.address),
    basic_latitude: config.latitude,
    basic_longitude: config.longitude,
    basic_region: "대구",
    basic_city: config.city,
    basic_owner_type: null,
    booking_booking_provide: "public_site",
    use_or_not: true,
    slug: config.slug,
    source_provider: "official_research",
    source_service_name: config.name,
    source_place_name: config.name,
    source_area_name: `대구 ${config.city}`,
    source_match_key: config.sourceMatchKey,
    source_synced_at: now,
    updated_at: now,
  };

  let courtId = config.matched?.id;
  if (courtId) {
    const { error } = await supabase
      .from("courtinfo")
      .update({
        ...resetLegacyBookingFields,
        ...commonValues,
        ...config.values,
        etc_desc: appendNote(config.matched.etc_desc, config.note),
      })
      .eq("id", courtId);
    if (error) throw new Error(`${config.name} 신규 대상 갱신 실패: ${error.message}`);
  } else {
    const { data, error } = await supabase
      .from("courtinfo")
      .insert({
        ...resetLegacyBookingFields,
        ...commonValues,
        ...config.values,
        etc_desc: `${marker}\n${config.note}`,
        created_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(`${config.name} 시설 추가 실패: ${error.message}`);
    courtId = data.id;
    rulesByCourt.set(courtId, []);
  }

  await saveRules(courtId, config.name, config.rules, config.values.booking_site_link);
  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_city,basic_address,basic_latitude,basic_longitude,basic_map_link,use_or_not,booking_rule_type,etc_desc")
  .eq("basic_region", "대구")
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const visibleCourts = verifiedCourts.filter(({ use_or_not }) => use_or_not);
const visibleIds = visibleCourts.map(({ id }) => id);
const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,open_offset,is_active")
  .in("court_id", visibleIds)
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const invalidNew = verifiedCourts.filter((court) =>
  court.use_or_not &&
  newCourts.some(({ name }) => name === court.basic_court_name) &&
  (!court.basic_address || !court.basic_map_link || court.basic_latitude == null || court.basic_longitude == null || !court.etc_desc?.includes(marker)),
);
const hiddenDuplicate = verifiedCourts.find(({ id }) => id === hiddenDuplicateId);
const expectedRuleCount = existingCourts.reduce((sum, court) => sum + court.rules.length, 0) + newCourts.reduce((sum, court) => sum + court.rules.length, 0);

if (
  verifiedCourts.length !== 27 ||
  visibleCourts.length !== 26 ||
  hiddenDuplicate?.use_or_not !== false ||
  verifiedRules.length !== expectedRuleCount ||
  invalidNew.length
) {
  throw new Error(`검증 실패: total=${verifiedCourts.length}, visible=${visibleCourts.length}, hidden=${hiddenDuplicate?.use_or_not}, rules=${verifiedRules.length}/${expectedRuleCount}, invalidNew=${invalidNew.map(({ basic_court_name }) => basic_court_name).join(",")}`);
}

console.log(JSON.stringify({
  verifiedDaeguRows: verifiedCourts.length,
  visibleCourts: visibleCourts.length,
  hiddenDuplicates: 1,
  activeRules: verifiedRules.length,
  feeRows: verifiedFees.length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  unknownFees: verifiedRules.length - verifiedFees.length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({ ...acc, [rule_type]: (acc[rule_type] ?? 0) + 1 }), {}),
}, null, 2));
