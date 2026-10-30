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
const marker = "[2026-09 전북 시설·예약·요금정보 공식자료 재검증]";

const excluded = [
  ["38761f23-3aab-4b50-ad72-5f618293b25e", "한국도로공사 무주지사 본관 좌측(테니스장)", "동일 시설 중복 여부 확인 필요"],
  ["09b09158-ab48-43aa-9ee3-3305ba516b4b", "한국도로공사 무주지사 테니스장", "동일 시설 중복 여부 확인 필요"],
  ["3fd50d98-bf26-481a-b3fa-4021bf876c2a", "익산청사 테니스장", "공식 채널 사이 무료·유료 안내 충돌"],
  ["afdf9f41-9c7e-415b-bf92-7eb135491956", "국민연금공단 기금관 테니스장", "공식 채널 사이 운영시간·요금 안내 충돌"],
  ["8d48e1f7-08c9-4125-83a6-9884877ccd7d", "한국농수산대학 테니스장, 축구장", "복합 자원 요금으로 테니스 단독 요금 미확인"],
];

const freeFee = () => ({ is_free: true, price_basis_hours: 1 });
const paidFee = (priceBasisHours, values) => ({
  is_free: false,
  price_basis_hours: priceBasisHours,
  ...values,
});

const rule = (ruleType, bookingRoundLabel, usagePeriodLabel, fee = null, extra = {}) => ({
  label: "전체",
  eligibility: "normal",
  rule_type: ruleType,
  booking_round_label: bookingRoundLabel,
  usage_period_label: usagePeriodLabel,
  fee,
  ...extra,
});

const courts = [
  {
    id: "6c7d869a-597e-49b0-9868-f09657630c36",
    name: "군산국민체육센터 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "월별 공지된 예약 오픈일에 공유누리 신청 후 관리자 승인·결제",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      court_count_grass_outdoor: 2,
      court_count_hard_outdoor: 0,
      court_count_hard_indoor: 0,
      court_count_grass_indoor: 0,
      court_count_clay_indoor: 0,
      court_count_clay_outdoor: 0,
    },
    note: "06:00~22:00 운영하는 실외 인조잔디 2면입니다. 예약은 월별 공지된 오픈일에 공유누리에서 신청한 뒤 관리자 승인과 결제를 거칩니다. 개인 사용료는 1인 2시간 1,600원이고, 전용 사용은 2면 4시간 기준 평일 16,000원·공휴일 24,000원입니다. 개인요금과 전용요금이 한 규칙에 함께 있어 현재 구조화 요금 칼럼에는 넣지 않았습니다. 18시 이후 조명 사용료는 실제 전기사용료 기준 별도입니다.",
    rules: [rule("irregular", "월별 공지된 예약 오픈일에 온라인 신청", "06:00~22:00 · 승인 후 이용")],
  },
  {
    id: "1b49d87c-f78f-477a-8776-7dd129b000f2",
    name: "군산발전본부 실내테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "매월 16~20일 다음 달 이용분 신청 · 군산시민 대상",
      booking_site_link: "https://www.kstennis.co.kr/",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "실내 코트 2면 중 일반 예약 대상은 B코트 1면이며 A코트는 강습용입니다. 매월 16~20일 다음 달 이용분을 군산시민이 신청할 수 있습니다. 평일 06:00~21:00, 토요일 06:00~18:00이며 공휴일은 4~10월 09:00~18:00, 11~3월 09:00~17:00입니다. 평일 1시간 사용료는 주간 6,000원, 조조·야간 9,000원이고 주말·공휴일은 예약 후 확인 사항이라 구조화 요금으로 등록하지 않았습니다. 코트 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "매월 16~20일 다음 달 예약 신청", "다음 달 이용분 · 군산시민", null, { reservation_url: "https://www.kstennis.co.kr/" })],
  },
  {
    id: "53dce36d-0c55-476e-970f-553775f96a85",
    name: "군산시 월명테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_open_type: "week",
      booking_open_day_of_week: 1,
      booking_open_time_normal: "09:00:00",
      booking_open_offset: "다음주",
      booking_reception_time: "매주 월요일 09:00 다음 주 월~일 이용분 오픈",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      court_count_grass_outdoor: 9,
      court_count_hard_outdoor: 1,
      court_count_hard_indoor: 0,
      court_count_grass_indoor: 0,
      court_count_clay_indoor: 0,
      court_count_clay_outdoor: 0,
    },
    note: "실외 10면으로 인조잔디 9면과 하드 1면입니다. 매주 월요일 09:00에 다음 주 월요일~일요일 이용분이 열리며 1일 최대 2시간 이용할 수 있습니다. 06:00~22:00 운영하고 기본 사용료는 1면 1시간 4,000원, 조명료는 1시간 3,000원 별도입니다.",
    rules: [rule("interval_weekly", "매주 월요일 09:00 다음 주 예약 오픈", "다음 주 월요일~일요일 · 1일 최대 2시간", paidFee(1, {
      outdoor_weekday_price: 4000,
      outdoor_weekend_price: 4000,
      lighting_fee_separate: true,
      lighting_fee_amount: 3000,
      lighting_fee_basis_hours: 1,
      lighting_start_time: "18:00:00",
    }), {
      open_type: "week",
      open_day_of_week: 1,
      open_time: "09:00:00",
      open_offset: "다음주",
      interval_weeks: 1,
      anchor_date: "2026-09-14",
    })],
  },
  {
    id: "9005b4c2-9f8b-446a-82e1-b4b173ad5d96",
    name: "남원지사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 담당자 전화 사전협의·승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "평일은 개방하지 않고 주말·공휴일 09:00~18:00 운영합니다. 공유누리 신청 뒤 담당자와 전화로 사전협의하고 승인을 받아야 하며 이용료는 무료입니다. 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "공유누리 신청 후 전화 사전협의·승인", "주말·공휴일 09:00~18:00", freeFee())],
  },
  {
    id: "8d8e202f-3a9d-4094-a2d6-16524189432b",
    name: "농촌진흥청 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "이용 15일 전 신청서 제출·팩스 접수 · 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "16:00:00",
    },
    note: "주말·공휴일 10:00~16:00 운영합니다. 이용 15일 전에 신청서를 제출하거나 팩스로 접수하고, 이용 5일 전까지 관리자 승인을 받아야 합니다. 신청 1건당 코트 1면을 무료로 이용할 수 있으며 전체 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "이용 15일 전 신청서·팩스 접수", "주말·공휴일 10:00~16:00 · 승인 후 이용", freeFee())],
  },
  {
    id: "3ba58ef2-e8e7-4fdf-988a-5b0d26835644",
    name: "배산체육공원(테니스장5) 야외",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "이용일 1개월 이내 온라인 신청 · 당일 신청 불가",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
    },
    note: "실외 코트 5면입니다. 4~9월 05:00~22:00, 10~3월 05:00~23:00 운영하므로 DB에는 전체 운영범위인 05:00~23:00을 저장했습니다. 이용일 1개월 이내 온라인 신청할 수 있고 당일 신청은 불가합니다. 기본 사용료는 1면 1시간 평일 3,000원·주말 4,000원, 야간은 기본료의 50% 가산이며 조명료는 1시간 4,000원 별도입니다. 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "이용일 1개월 이내 온라인 신청", "당일 신청 불가 · 계절별 운영시간 적용", paidFee(1, {
      outdoor_weekday_price: 3000,
      outdoor_weekend_price: 4000,
      lighting_fee_separate: true,
      lighting_fee_amount: 4000,
      lighting_fee_basis_hours: 1,
    }))],
  },
  {
    id: "96cc1367-e038-47a4-92df-c47c7f0bddea",
    name: "완주테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "반월 단위 공지 일정에 따라 09:00경 온라인 오픈",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
    },
    note: "실외 16면이며 화~일요일 06:00~22:00 운영하고 월요일과 법정공휴일은 휴장합니다. 예약은 1~15일과 16~말일의 반월 단위 공지 일정에 따라 09:00경 열립니다. 개인 사용료는 1회 4시간 기준 평일 3,000원·공휴일 4,000원이며 야간은 각각 4,000원·5,000원, 개인 조명료는 1면 5,000원 별도입니다. 현재 요금 DB는 최대 3시간 기준까지만 지원하므로 4시간 요금은 설명에만 남겼습니다. 코트 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "반월 단위 공지 일정에 따라 09:00경 오픈", "화~일 06:00~22:00 · 월요일·법정공휴일 휴장")],
  },
  {
    id: "f66b37bc-fa4c-454f-9c8c-ada3d164a08a",
    name: "익산지방국토관리청 본관앞(테니스장)",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "2025년 4월부터 예약 일시 중단 · 재개 여부 운영기관 확인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "실외 코트 1면으로 주말·공휴일 09:00~18:00 개방하고 이용료는 무료입니다. 종전에는 매월 1일 인터넷 접수했으나 공식 안내상 2025년 4월부터 예약이 일시 중단되어 재개 여부를 운영기관에 확인해야 합니다. 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "2025년 4월부터 예약 일시 중단", "재개 여부 운영기관 확인", freeFee())],
  },
  {
    id: "fa98a741-d7eb-4d8e-b689-533e5adbdf9b",
    name: "전기안전인재개발원 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 주말·공휴일 휴관",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "전화로 이용 가능 일정과 운영시간을 확인한 뒤 관리자 승인을 받아 무료로 이용합니다. 주말·공휴일은 휴관합니다. 평일 운영시간, 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "평일 이용 · 운영시간 문의", freeFee())],
  },
  {
    id: "22c6a769-7672-4d50-add9-b925c1f61597",
    name: "전북인재개발원 본관 앞 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 교육 일정 중 이용 제한",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "평일 09:00~18:00 이용 가능하나 교육 일정 중에는 이용이 제한됩니다. 인터넷 예약은 지원하지 않으며 전화(063-290-5129) 문의 후 관리자 승인을 받아야 합니다. 사용료는 4시간 20,000원으로 확인되지만 실내·실외 구분이 공식자료에 명시되지 않아 구조화 요금 칼럼에는 넣지 않았습니다. 주말 운영시간, 코트 면수와 표면은 확인되지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "평일 09:00~18:00 · 교육 일정 중 제한", null, { reservation_url: "063-290-5129" })],
  },
  {
    id: "6af8d67a-cf9e-46eb-820f-d68891460852",
    name: "지방자치인재개발원 옥외(테니스장)",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "별도 예약 없이 이용 가능 · 운영 전 전화 확인 권장",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "별도 예약 없이 무료 이용할 수 있으며 운영 전 전화 확인이 권장됩니다. 평일 06:00~09:00와 18:00~22:00에만 개방하고 주말은 휴관합니다. DB가 하루 두 구간을 직접 저장하지 못해 운영시간 숫자 칼럼은 비워 두었습니다. 총 4면 중 이용 가능한 코트는 1면이며 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("on_site", "별도 예약 없이 이용", "평일 06:00~09:00·18:00~22:00 · 주말 휴관", freeFee())],
  },
  {
    id: "b9090c2b-7c35-4e89-afc4-436f9233c2a8",
    name: "한국국토정보공사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "이용일 기준 1개월 이내 공유누리 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "이용일 기준 1개월 이내 공유누리에서 신청하고 관리자 승인을 받아 무료로 이용합니다. 토요일은 09:00~18:00, 일요일·공휴일은 09:00~15:00이며 DB에는 주말 전체 범위인 09:00~18:00을 저장했습니다. 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "이용일 기준 1개월 이내 온라인 신청", "토 09:00~18:00 · 일·공휴일 09:00~15:00", freeFee())],
  },
  {
    id: "dfbeaca2-38de-4fb9-a880-a349ae6c7918",
    name: "한국도로공사 부안지사 사옥 정면(테니스장)",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "12:00:00",
    },
    note: "실외 코트 1면으로 평일은 개방하지 않고 주말·공휴일 09:00~12:00 운영합니다. 공유누리 신청 후 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "공유누리 신청 후 관리자 승인", "주말·공휴일 09:00~12:00", freeFee())],
  },
  {
    id: "277bbee3-2400-45cf-87f2-b04c54014c29",
    name: "한국도로공사 전북본부 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "이용일 최소 1주 전 전화 신청 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "실외 코트 1면으로 평일은 개방하지 않고 주말·공휴일 09:00~18:00 운영합니다. 이용일 최소 1주 전에 전화(063-714-6012) 신청하고 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "이용일 최소 1주 전 전화 신청", "주말·공휴일 09:00~18:00", freeFee(), { reservation_url: "063-714-6012" })],
  },
  {
    id: "ec0e9aaf-c9b5-4cda-9db0-8d46b46ce8df",
    name: "한국도로공사 전주지사 숙소동 전면(테니스장)",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 상시 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "실외 코트 1면으로 평일은 개방하지 않고 주말·공휴일 09:00~18:00 운영합니다. 공유누리에서 신청한 뒤 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("irregular", "공유누리 신청 후 관리자 승인", "주말·공휴일 09:00~18:00", freeFee())],
  },
  {
    id: "3b70ddf0-0735-43c3-9c51-3304e1cfb368",
    name: "한국도로공사 진안지사 사옥 우측(테니스장)",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "평일은 개방하지 않고 주말·공휴일 09:00~18:00 운영합니다. 전화 문의 후 관리자 승인을 받아 무료로 이용합니다. 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "주말·공휴일 09:00~18:00", freeFee())],
  },
  {
    id: "9e0ec125-2402-45fd-a2c6-c457eb3c5d42",
    name: "한국전기안전공사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "전화로 이용 가능 일정과 운영시간을 확인한 뒤 관리자 승인을 받아 무료로 이용합니다. 운영시간, 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "운영시간 문의", freeFee())],
  },
];

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

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const targetIds = courts.map(({ id }) => id);
const excludedIds = excluded.map(([id]) => id);
const { data: before, error: beforeError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_site_link,booking_rule_type,etc_desc,use_or_not")
  .eq("basic_region", "전북");
if (beforeError) throw beforeError;

const beforeById = new Map(before.map((court) => [court.id, court]));
for (const court of courts) {
  if (!beforeById.has(court.id)) throw new Error(`반영 대상 시설 누락: ${court.name} (${court.id})`);
}
for (const [id, name] of excluded) {
  if (!beforeById.has(id)) throw new Error(`제외 대상 시설 누락: ${name} (${id})`);
}

const { data: activeRulesBefore, error: rulesBeforeError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,sort_order,is_active")
  .in("court_id", targetIds)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (rulesBeforeError) throw rulesBeforeError;

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  currentJeonbukRows: before.length,
  confirmedUpdates: courts.length,
  excludedUntouched: excluded.map(([, name, reason]) => ({ name, reason })),
  planned: courts.map(({ name, values, rules }) => ({
    name,
    ruleType: rules[0].rule_type,
    fee: rules[0].fee ? (rules[0].fee.is_free ? "free" : "paid") : "note-only",
    online: values.booking_online_reserve_possible,
  })),
}, null, 2));

if (!shouldApply) process.exit(0);

const rulesByCourt = new Map();
for (const currentRule of activeRulesBefore) {
  const list = rulesByCourt.get(currentRule.court_id) ?? [];
  list.push(currentRule);
  rulesByCourt.set(currentRule.court_id, list);
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
  const { error } = await supabase
    .from("court_booking_rule_fees")
    .upsert(row, { onConflict: "booking_rule_id" });
  if (error) throw new Error(`${courtName} 요금 저장 실패: ${error.message}`);
};

const saveRules = async (court, fallbackUrl) => {
  const currentRules = rulesByCourt.get(court.id) ?? [];
  for (let index = 0; index < court.rules.length; index += 1) {
    const { fee, ...desired } = court.rules[index];
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
      if (error) throw new Error(`${court.name} 예약 규칙 갱신 실패: ${error.message}`);
      ruleId = existingRule.id;
    } else {
      const { data, error } = await supabase
        .from("court_booking_rules")
        .insert({ court_id: court.id, ...payload, created_at: now })
        .select("id")
        .single();
      if (error) throw new Error(`${court.name} 예약 규칙 추가 실패: ${error.message}`);
      ruleId = data.id;
    }
    await saveFee(ruleId, fee, court.name);
  }

  const obsolete = currentRules.slice(court.rules.length);
  if (obsolete.length) {
    const obsoleteIds = obsolete.map(({ id }) => id);
    const { error } = await supabase
      .from("court_booking_rules")
      .update({ is_active: false, updated_at: now })
      .in("id", obsoleteIds);
    if (error) throw new Error(`${court.name} 이전 규칙 비활성화 실패: ${error.message}`);
    const { error: feeError } = await supabase
      .from("court_booking_rule_fees")
      .delete()
      .in("booking_rule_id", obsoleteIds);
    if (feeError) throw new Error(`${court.name} 이전 요금 정리 실패: ${feeError.message}`);
  }
};

for (const court of courts) {
  const current = beforeById.get(court.id);
  const { error } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...court.values,
      etc_desc: appendNote(current.etc_desc, court.note),
      source_synced_at: now,
      updated_at: now,
    })
    .eq("id", court.id);
  if (error) throw new Error(`${court.name} 시설 갱신 실패: ${error.message}`);

  const fallbackUrl = court.values.booking_site_link ?? current.booking_site_link;
  await saveRules(court, fallbackUrl);
  console.log(`완료: ${court.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,etc_desc,use_or_not")
  .eq("basic_region", "전북");
if (verifyCourtError) throw verifyCourtError;

const verifiedTargetCourts = verifiedCourts.filter(({ id }) => targetIds.includes(id));
const verifiedExcluded = verifiedCourts.filter(({ id }) => excludedIds.includes(id));
const { data: verifiedRules, error: verifyRulesError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,is_active")
  .in("court_id", targetIds)
  .eq("is_active", true);
if (verifyRulesError) throw verifyRulesError;

const { data: verifiedFees, error: verifyFeesError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeesError) throw verifyFeesError;

const invalidTargets = verifiedTargetCourts.filter(({ etc_desc }) => !etc_desc?.includes(marker));
const mutatedExcluded = verifiedExcluded.filter(({ booking_rule_type, etc_desc }) =>
  booking_rule_type !== "checking" || etc_desc?.includes(marker));
const expectedRuleTypes = new Map(courts.map(({ id, rules }) => [id, rules[0].rule_type]));
const invalidRules = verifiedRules.filter(({ court_id, rule_type }) => expectedRuleTypes.get(court_id) !== rule_type);

if (
  verifiedCourts.length !== 22 ||
  verifiedTargetCourts.length !== 17 ||
  verifiedExcluded.length !== 5 ||
  verifiedRules.length !== 17 ||
  verifiedFees.length !== 13 ||
  invalidTargets.length ||
  mutatedExcluded.length ||
  invalidRules.length
) {
  throw new Error(JSON.stringify({
    message: "전북 반영 검증 실패",
    total: verifiedCourts.length,
    targets: verifiedTargetCourts.length,
    excluded: verifiedExcluded.length,
    rules: verifiedRules.length,
    fees: verifiedFees.length,
    invalidTargets: invalidTargets.map(({ basic_court_name }) => basic_court_name),
    mutatedExcluded: mutatedExcluded.map(({ basic_court_name }) => basic_court_name),
    invalidRules,
  }));
}

console.log(JSON.stringify({
  verifiedJeonbukRows: verifiedCourts.length,
  updatedCourts: verifiedTargetCourts.length,
  excludedUntouched: verifiedExcluded.length,
  activeRules: verifiedRules.length,
  feeRows: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  noteOnlyFees: verifiedRules.length - verifiedFees.length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({
    ...acc,
    [rule_type]: (acc[rule_type] ?? 0) + 1,
  }), {}),
}, null, 2));
