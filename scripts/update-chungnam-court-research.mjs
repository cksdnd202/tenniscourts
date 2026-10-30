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
const marker = "[2026-09 충남 시설·예약·요금정보 공식자료 재검증]";
const eshare = (resourceId) =>
  `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`;
const naverSearch = (query) =>
  `https://map.naver.com/p/search/${encodeURIComponent(query)}`;

const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const freeFee = (priceBasisHours = 1) => ({
  is_free: true,
  price_basis_hours: priceBasisHours,
});

const paidFee = (priceBasisHours, values) => ({
  is_free: false,
  price_basis_hours: priceBasisHours,
  ...values,
});

const rule = (ruleType, bookingRoundLabel, usagePeriodLabel, reservationUrl, fee = freeFee(), extra = {}) => ({
  label: "전체",
  eligibility: "normal",
  rule_type: ruleType,
  booking_round_label: bookingRoundLabel,
  usage_period_label: usagePeriodLabel,
  reservation_url: reservationUrl,
  fee,
  ...extra,
});

const courts = [
  {
    id: "e91e6ec2-c073-42c5-9576-738af1939e95",
    name: "계룡시 생활체육공원 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "계룡시 체육시설 예약 화면에서 사전 예약 · 고정 오픈 시각 미공개",
      booking_site_link: "https://www.gyeryong.go.kr/ac/html/sub03/0305.html",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
      court_count_grass_outdoor: 8,
    },
    note: "실외 인조잔디 8면이며 사전 예약이 필요합니다. 개인 연습사용료는 2시간 기준 평일 조기 1,400원·주간 2,000원·야간 3,000원, 주말·공휴일 조기 2,100원·주간 3,000원·야간 4,500원입니다. 테니스장 조명은 1일·1회 기본 10,000원과 실제 전기 사용료가 별도입니다. 시간대별 요금과 조명 기준이 현재 구조화 요금 칼럼으로 정확히 표현되지 않아 상세 설명에만 저장했습니다.",
    rules: [rule("irregular", "예약 화면에서 사전 예약", "운영시간과 이용 가능일은 예약 화면 확인", "https://www.gyeryong.go.kr/ac/html/sub03/0305.html", null)],
  },
  {
    id: "200b5e89-96e0-4d95-b6c5-185d10669ee3",
    name: "한국도로공사 공주지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 공주지사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 주말·공휴일 이용",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 2면이며 토요일·일요일·공휴일에 공유누리로 신청한 뒤 관리자 승인을 받아 이용합니다. 평일 신청은 취소될 수 있습니다. 표면 재질과 정기 오픈 시각은 공식자료에서 확인되지 않아 코트 종류 숫자 칼럼은 비워 두었습니다. 무료입니다.",
    rules: [rule("irregular", "공유누리 온라인 신청 후 관리자 승인", "주말·공휴일 이용", eshare("GH07N0702097"))],
  },
  {
    id: "88b04d70-b9fd-4988-af02-fb9fcbddecab",
    name: "금산군 테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "공유누리 예약 불필요 표기 · 현장 이용, 운영 전 관리기관 확인 권장",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "공유누리에는 예약 불필요 자원으로 안내되어 있으나 운영시간과 코트 면수·표면은 미공개입니다. 금산군 체육시설 조례상 개인 이용료는 1인 2시간 4,000원, 월회원 20,000원이며 금산군민·어린이·청소년·군인·노인·장애인은 50% 감면됩니다. 조명은 1면 2시간 10,000원 별도입니다. 전용 사용료는 1면 2시간 평일 20,000원·주말/공휴일 30,000원으로 개인 이용료와 구분됩니다.",
    rules: [rule("on_site", "별도 예약 없이 현장 이용", "운영시간은 관리기관 확인", eshare("CD13Q4636656"), paidFee(2, {
      outdoor_weekday_price: 4000,
      outdoor_weekend_price: 4000,
      lighting_fee_separate: true,
      lighting_fee_amount: 10000,
      lighting_fee_basis_hours: 2,
    }))],
  },
  {
    id: "b600bb7f-5247-49af-b4b2-6384ede68e89",
    name: "시민운동장 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "논산 시민운동장 내 실외 테니스장 4면입니다. 평일 05:00~22:00 운영하며 주말·공휴일 이용시간은 관리자에게 확인해야 합니다. 전화 문의 후 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "평일 05:00~22:00 · 주말 운영시간 문의", eshare("CF14O3841241"))],
  },
  {
    id: "9df608c3-4f26-458a-87f8-ce57ba686888",
    name: "연무체육공원 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-746-8986",
      booking_online_reserve_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "실외 코트 3면과 야간조명이 있으며 매일 06:00~22:00 운영합니다. 전화 문의 후 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "매일 06:00~22:00", eshare("EJ16S1347876"))],
  },
  {
    id: "615413ed-2d71-42d4-85f0-e53034163abb",
    name: "당진종합운동장 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "당진 통합예약 온라인 신청 후 승인·결제 · 최소 1일 전 신청",
      booking_site_link: "https://www.dangjin.go.kr/fmres/rent/info/?centerId=DJ0030&facilityId=F0200",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "21:40:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "19:00:00",
      ...zeroCounts,
      court_count_hard_indoor: 4,
      court_count_hard_outdoor: 6,
    },
    note: "실외 6면과 돔 4면이 있으나 일반 온라인 예약 대상은 실외 3~6번 코트 4면입니다. 평일 06:00~21:40, 주말·공휴일 06:00~19:00 운영합니다. 최소 2명, 1일 최대 3시간이며 최소 1일 전에 신청하고 승인 후 3일 이내 결제해야 합니다. 개인 사용료는 1인 2시간 주간 1,500원·조기/야간 3,000원이고 8인 이상 단체는 500원·1,000원입니다. 1인 요금을 코트 요금처럼 오인할 수 있어 구조화 요금 칼럼에는 넣지 않았습니다.",
    rules: [rule("irregular", "온라인 신청 후 승인·결제", "최소 1일 전 · 최소 2명 · 1일 최대 3시간", "https://www.dangjin.go.kr/fmres/rent/info/?centerId=DJ0030&facilityId=F0200", null)],
  },
  {
    id: "a359a399-35ab-4706-bed9-9508dff671eb",
    name: "한국도로공사 당진지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 당진지사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 사전 협의·관리자 승인 · 직원 동행 필요",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "평일은 미개방하고 토요일·일요일·공휴일 09:00~18:00 이용합니다. 공유누리 신청 후 사전 협의와 관리자 승인이 필요하며 이용 시 직원이 동행합니다. 신청은 대표자 1명만 해야 합니다. 무료이며 코트 면수와 표면은 미공개입니다.",
    rules: [rule("irregular", "공유누리 신청 후 사전 협의·승인", "주말·공휴일 09:00~18:00 · 직원 동행", eshare("GG11K812823"))],
  },
  {
    id: "3e32e7d3-6668-462d-a8b9-1f67eaaaa619",
    name: "순성체육공원 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-350-3767",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "전화로 이용 가능 일정과 시간을 확인한 뒤 관리자 승인을 받아 무료로 이용합니다. 정기 예약 오픈일, 운영시간, 코트 면수와 표면은 공식자료에 없어 추정하지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "운영시간 담당자 확인", eshare("CD16N5543844"))],
  },
  {
    id: "ce8e3d45-003e-4744-b4b4-1bf7016a3553",
    name: "한국전력공사 보령지사 테니스장",
    values: {
      basic_court_name: "한국전력공사 보령지사 테니스장",
      basic_map_link: naverSearch("한국전력공사 보령지사 테니스장 충남 보령시 옥마로 60"),
      booking_rule_type: "phone",
      booking_reception_time: "이용 전 전화 문의 후 관리자 승인 · 법정공휴일 휴관 · 문의 041-930-7222",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "옥마로 60의 한국전력공사 보령지사 시설입니다. 동명의 한국도로공사 시설과 구분하기 위해 기관명을 시설명에 반영했습니다. 이용 전 전화 문의 후 승인받아 무료로 이용하며 법정공휴일은 휴관합니다. 운영시간, 면수와 표면은 미공개입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "법정공휴일 휴관 · 운영시간 문의", eshare("GG11K812713"))],
  },
  {
    id: "f0d81d4b-2b2d-4c59-a2d9-56a29ff72b8f",
    name: "한국도로공사 보령지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 보령지사 테니스장",
      basic_map_link: naverSearch("한국도로공사 보령지사 테니스장 충남 보령시 웅천읍 무창포로 197"),
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 공유누리 문의번호 063-714-6711",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "웅천읍 무창포로 197의 한국도로공사 보령지사 시설입니다. 동명의 한국전력공사 시설과 구분하기 위해 기관명을 시설명에 반영했습니다. 전화 문의 후 승인받아 무료로 이용합니다. 공유누리에 기재된 063-714-6711은 지역번호가 시설 소재지와 달라 이용 전 번호 확인이 필요합니다. 운영시간, 면수와 표면은 미공개입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "운영시간 담당자 확인", eshare("GI18I5013468"))],
  },
  {
    id: "788975b8-34b1-4286-8c98-564a57d35854",
    name: "보령테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "공유누리 약 30일 롤링 신청 · 최소 3영업일 전 · 평일 09:00~17:00 접수",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_open_offset: "30",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "공유누리에서 약 30일 범위의 평일 이용일을 선착순 신청하고 관리자 승인을 받습니다. 공휴일을 제외하고 최소 3영업일 전에 평일 09:00~17:00에 접수해야 하며 주말·공휴일은 예약 이용이 어렵습니다. 이용 슬롯은 07:00~21:00 사이 2시간 단위이고 1일 1코트 2시간, 최소 4명, 신청자 본인 참석 조건입니다. 무료입니다. 총 면수와 표면은 미공개입니다.",
    rules: [rule("rolling", "약 30일 이내 온라인 신청 후 승인", "평일 2시간 · 최소 3영업일 전 · 최소 4명", eshare("CF08I2552732"), freeFee(2), {
      open_offset: "30",
    })],
  },
  {
    id: "6bcdf124-3dea-486a-ba29-721a075ba02c",
    name: "신보령발전본부 송도테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "이용 전 전화로 가능 여부 확인 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "평일 09:00~18:00 운영하며 주말·공휴일은 관리자에게 확인해야 합니다. 이용 전 사용 가능 여부를 확인한 뒤 승인받아 무료로 이용합니다. 공유누리의 02-7511-1223은 중앙 대표번호로 보이므로 시설 연락처 재확인이 필요합니다. 면수와 표면은 미공개입니다.",
    rules: [rule("phone", "전화 사전 확인 후 관리자 승인", "평일 09:00~18:00 · 주말 운영시간 문의", eshare("GG11K811141"))],
  },
  {
    id: "fcee4655-21a0-468d-8806-a98facf1f0f2",
    name: "행복마루 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "평일 09:00~18:00 운영하며 주말은 관리자에게 확인해야 합니다. 전화 문의 후 승인받아 무료로 이용합니다. 공유누리의 02-7511-1223은 중앙 대표번호로 보이므로 시설 연락처 재확인이 필요합니다. 면수와 표면은 미공개입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "평일 09:00~18:00 · 주말 운영시간 문의", eshare("GK24T5720877"))],
  },
  {
    id: "50dfee10-841f-476c-9aff-b7da65e5b2df",
    name: "부여종합운동장 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "부여군시설관리공단 통합예약 신청 · 고정 오픈 시각 미공개",
      booking_site_link: "http://yeyak.buyeofmc.or.kr/index.do",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "부여군시설관리공단 체육시설 통합예약에서 신청합니다. 공개자료에는 09:00~22:00, 기본요금 20,000원으로 안내되지만 적용 시간과 실내·실외별 세부 기준이 명확하지 않아 구조화 요금 칼럼에는 넣지 않았습니다. 실외코트와 돔코트가 있으나 정확한 면수와 표면은 예약 화면에서 재확인이 필요합니다.",
    rules: [rule("irregular", "시설관리공단 통합예약 신청", "09:00~22:00 · 세부 일정 예약 화면 확인", "http://yeyak.buyeofmc.or.kr/index.do", null)],
  },
  {
    id: "d5c348da-9b5f-4732-b7ea-10bfbc4ac710",
    name: "한국도로공사 부여지사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 시설로 평일은 미개방하고 주말·공휴일 09:00~18:00 운영합니다. 공유누리 신청 후 관리자 승인을 받아 무료로 이용합니다. 승인은 공휴일을 제외하고 월~목 08:40~18:00, 금요일 08:20~15:00에 처리됩니다. 코트 면수와 표면은 미공개입니다.",
    rules: [rule("irregular", "공유누리 신청 후 관리자 승인", "주말·공휴일 09:00~18:00", eshare("GH07K0732523"))],
  },
  {
    id: "9e6acf88-cc03-47fa-9b8e-e4f0295019f4",
    name: "부춘산체육공원테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-660-2619",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "테니스와 배드민턴 겸용으로 안내되는 체육공원 시설입니다. 전화로 이용 일정과 운영시간을 확인한 뒤 관리자 승인을 받아 무료로 이용합니다. 정기 오픈일, 코트 면수와 표면은 공식자료에서 확인되지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "운영시간 담당자 확인", eshare("CI30J4123292"))],
  },
  {
    id: "619c8cdb-9516-49a8-95bf-2dd947cc2b87",
    name: "두왕테니스장",
    values: {
      basic_region: "울산",
      basic_city: "남구",
      basic_address: "울산광역시 남구 두왕동 430-7",
      basic_map_link: naverSearch("두왕테니스장 울산광역시 남구 두왕동 430-7"),
      basic_latitude: 35.49820963,
      basic_longitude: 129.3042031,
      slug: "ulsan-namgu-duwang-tennis-court",
      booking_rule_type: "irregular",
      booking_reception_time: "남구도시관리공단 예약서비스 또는 현장 신청",
      booking_site_link: "https://crs.uncmc.or.kr/index_main.jsp",
      booking_online_reserve_possible: true,
      booking_holiday_week: "매주 월요일, 1월 1일, 설·추석 당일",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 5,
      source_area_name: "울산 남구",
      source_match_key: "eshare-group:울산:city-name:남구:두왕테니스장",
    },
    note: "공유누리 원문의 실제 소재지는 울산광역시 남구 두왕동 430-7이므로 잘못 저장된 충남 서천군 분류와 좌표를 교정했습니다. 2023년 코트 교체공사로 5면 모두 클레이에서 인조잔디로 변경됐습니다. 하절기는 06:00~22:00, 동절기는 평일 08:00~22:00·주말 06:00~22:00이며 DB 시간 칼럼에는 전체 운영범위인 06:00~22:00을 저장했습니다. 매주 월요일과 1월 1일, 설·추석 당일은 휴장합니다. 1면 1시간 4,000원입니다.",
    rules: [rule("irregular", "공단 예약서비스 또는 현장 신청", "계절별 운영시간 적용 · 월요일 휴장", "https://crs.uncmc.or.kr/index_main.jsp", paidFee(1, {
      outdoor_weekday_price: 4000,
      outdoor_weekend_price: 4000,
    }))],
  },
  {
    id: "d5b79e0c-75c1-43c3-a705-9265c1fd7840",
    name: "강변테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "아산시테니스협회 다음 카페 또는 전화 문의 후 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 10면입니다. 아산시테니스협회 다음 카페 또는 전화로 이용 가능 일정을 확인한 뒤 승인받아 무료로 이용합니다. 고정 예약 오픈일과 운영시간, 표면 재질은 공식자료에서 확인되지 않아 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("irregular", "협회 카페 또는 전화 문의 후 승인", "운영 일정 협회 확인", "https://cafe.daum.net/asan-tennis")],
  },
  {
    id: "701ac59f-36bd-4d66-a377-e2b061920d25",
    name: "둔포테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-530-6711",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "평일과 토요일 06:00~22:00 운영하며 일요일·공휴일은 관리자에게 확인해야 합니다. 전화 문의 후 승인받아 무료로 이용합니다. DB의 주말 시간에는 확인된 토요일 운영시간을 저장했습니다. 코트 면수와 표면은 미공개입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "평일·토요일 06:00~22:00 · 일·공휴일 문의", eshare("CD08U1654482"))],
  },
  {
    id: "1cf12720-dae7-4b4f-ad34-a540215388d5",
    name: "이순신테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-536-8534",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 6면입니다. 전화로 이용 가능 일정과 운영시간을 확인한 뒤 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "운영시간 담당자 확인", eshare("CD07T4535853"))],
  },
  {
    id: "189ac376-4917-4a9e-873f-9ac01ec36fa7",
    name: "예산군테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-339-8266",
      booking_online_reserve_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
    },
    note: "실외 코트 3면입니다. 시설 표준 운영시간은 4~10월 05:00~23:00, 11~3월 06:00~22:00이며 DB에는 전체 운영범위를 저장했습니다. 전화 문의 후 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "계절별 운영시간 적용", eshare("CD02N004766"))],
  },
  {
    id: "12539ad8-9a01-4340-b21c-db093fc06b3a",
    name: "관세인재개발원 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "이용 30일 전부터 7일 전까지 이메일 신청 · 현재 공개 예약기간 만료",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 시설로 평일 09:00~18:00, 토·일요일은 종일 개방으로 안내됐습니다. 담당자 유선 확인 후 이용일 30일 전부터 7일 전까지 mange80@korea.kr로 신청서를 제출하며 약 3근무일 내 승인 여부를 통보합니다. 예약자 기준 월 1일·종목으로 제한되고 영리 강습은 불가합니다. 무료이나 공유누리 공개 예약기간이 2024년 6월에 종료되어 현재 개방 여부를 재확인해야 합니다.",
    rules: [rule("phone", "이용 30일 전부터 7일 전까지 이메일 신청", "현재 공개 예약기간 만료 · 운영기관 재확인", eshare("BA10A0015105"))],
  },
  {
    id: "aa82e330-4bd0-4dd8-a0b7-bff21c743866",
    name: "서북구청 테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "사전예약 없이 당직실 현장 신청 · 팀당 2시간",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "18:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "21:00:00",
      ...zeroCounts,
    },
    note: "청사 부속 실외 코트 1면입니다. 사전예약을 받지 않으며 이용자가 없을 때 당직실에서 신청서를 작성하고 팀당 최대 2시간 무료 이용합니다. 평일 18:00~21:00, 주말·공휴일 08:00~21:00 운영합니다. 공유누리의 02-521-3114는 소재지와 맞지 않아 연락처 재확인이 필요합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("on_site", "사전예약 없이 당직실 현장 신청", "평일 18:00~21:00 · 주말 08:00~21:00 · 팀당 2시간", eshare("BA10A0015133"), freeFee(2))],
  },
  {
    id: "ef1dca3e-0dcc-4c50-885e-e08673175f17",
    name: "천안종합운동장 실내테니스장",
    values: {
      basic_court_name: "천안종합운동장 실내테니스장",
      basic_address: "충남 천안시 서북구 번영로 208 천안종합운동장 실내테니스장",
      basic_map_link: naverSearch("천안종합운동장 실내테니스장 충남 천안시 서북구 번영로 208"),
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 8일 전 21:00 온라인 오픈 · 당일·익일 현장 접수",
      booking_site_link: "https://www.cauc.or.kr/_stadium/main.asp?no=38",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_open_time_normal: "21:00:00",
      booking_open_offset: "8",
      booking_holiday_week: "매월 첫째 주 월요일, 1월 1일, 설·추석 당일",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_indoor: 4,
      source_service_id: "BI27M0945626",
      source_service_name: "천안종합운동장 실내테니스장",
      source_place_name: "천안종합운동장 실내테니스장",
      source_match_key: "eshare:BI27M0945626",
    },
    note: "기존에 실내·실외가 한 레코드로 묶여 있던 시설을 공식 운영 기준에 맞춰 실내테니스장으로 분리했습니다. 케미칼 계열 실내 코트 4면이며 1면 2시간 단위입니다. 평일 06:00~22:00, 공휴일 10:00~22:00 운영합니다. 이용일 8일 전 21:00에 온라인 예약이 열리고 당일·익일은 현장 접수합니다. 평일 주간 20,000원·야간 25,000원, 주말·공휴일 주간 25,000원·야간 30,000원입니다. 구조화 요금에는 주간 기본요금과 야간 차액 5,000원을 조명비로 저장했습니다.",
    rules: [rule("rolling", "이용일 8일 전 21:00 온라인 오픈", "당일·익일 현장 접수 · 1면 2시간", "https://www.cauc.or.kr/_stadium/main.asp?no=38", paidFee(2, {
      indoor_weekday_price: 20000,
      indoor_weekend_price: 25000,
      lighting_fee_separate: true,
      lighting_fee_amount: 5000,
      lighting_fee_basis_hours: 2,
      lighting_start_time: "18:00:00",
    }), {
      open_time: "21:00:00",
      open_offset: "8",
    })],
  },
  {
    id: "d64163fb-6fbe-47b6-8c74-e91a7736551c",
    name: "한국도로공사 천안지사 테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 기준 1개월 이내 공유누리 즉시 예약",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_open_time_normal: "00:00:00",
      booking_open_offset: "30",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 시설로 공유누리에서 이용일 기준 1개월 이내 날짜를 즉시 예약할 수 있으며 관리자 별도 승인이 없습니다. 주말·공휴일 09:00~18:00에 09~12시, 12~15시, 15~18시의 3시간 단위로 운영합니다. 무료이며 코트 면수와 표면은 미공개입니다.",
    rules: [rule("rolling", "이용일 기준 1개월 이내 즉시 예약", "주말·공휴일 09:00~18:00 · 3시간 단위", eshare("GH05K4358766"), freeFee(3), {
      open_time: "00:00:00",
      open_offset: "30",
    })],
  },
  {
    id: "cfd1018f-ffd7-4c1c-9837-7c86b93a1c7b",
    name: "청양군테니스장",
    values: {
      booking_rule_type: "on_site",
      booking_reception_time: "별도 예약 없이 이용 · 문의 041-940-4864",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_indoor: 6,
    },
    note: "비가림 코트 6면이며 매일 09:00~22:00 운영합니다. 공유누리에는 예약 불필요 자원으로 안내되어 있어 별도 예약 없이 무료 이용합니다. 비가림 시설은 현재 DB 구조상 실내 하드 6면으로 저장했습니다.",
    rules: [rule("on_site", "별도 예약 없이 이용", "매일 09:00~22:00 · 비가림 6면", eshare("BK18I4532618"))],
  },
  {
    id: "a5082b3c-2cca-404c-9eee-beb748a4d696",
    name: "광천생활체육공원테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 문의 041-630-9072",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "4면 구역과 5면 구역으로 나뉜 총 9면의 실외 코트이며 종일 개방합니다. 전화 문의 후 관리자 승인을 받아 무료로 이용합니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "종일 개방 · 기상 및 운영정책에 따라 변동", eshare("BF19K0718124"))],
  },
  {
    id: "e6ba41e5-50e4-4552-b5bb-455748866e6a",
    name: "홍주종합경기장테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "테니스협회 또는 관리기관 전화 문의 후 승인",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
      court_count_hard_indoor: 4,
      court_count_grass_outdoor: 4,
    },
    note: "총 8면으로 실외 인조잔디 4면과 비가림 우레탄 4면입니다. 종일 개방하며 테니스협회 또는 관리기관에 전화 문의 후 승인받아 무료로 이용합니다. 비가림 우레탄 코트는 현재 DB 구조상 실내 하드 4면으로 저장했습니다.",
    rules: [rule("phone", "협회 또는 관리기관 전화 문의 후 승인", "종일 개방 · 기상 및 운영정책에 따라 변동", eshare("BF18P5052313"))],
  },
];

const newOutdoorCourt = {
  name: "천안종합운동장 실외테니스장",
  slug: "chungnam-cheonansi-cheonanjonghapundongjang-siloe-teniseujang",
  values: {
    basic_court_name: "천안종합운동장 실외테니스장",
    basic_region: "충남",
    basic_city: "천안시",
    basic_address: "충남 천안시 서북구 번영로 208 천안종합운동장 실외테니스장",
    basic_map_link: naverSearch("천안종합운동장 실외테니스장 충남 천안시 서북구 번영로 208"),
    basic_latitude: 36.8165701919437,
    basic_longitude: 127.113556115535,
    slug: "chungnam-cheonansi-cheonanjonghapundongjang-siloe-teniseujang",
    basic_owner_type: "시립",
    booking_rule_type: "rolling",
    booking_reception_time: "이용일 8일 전 21:00 온라인 오픈 · 당일·익일 현장 접수",
    booking_site_link: "https://www.cauc.or.kr/_stadium/main.asp?no=39",
    booking_online_reserve_possible: true,
    booking_today_booking_possible: true,
    booking_booking_provide: "public_site",
    booking_open_time_normal: "21:00:00",
    booking_open_offset: "8",
    booking_holiday_week: "매월 첫째 주 월요일, 1월 1일, 설·추석 당일",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:00:00",
    basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "08:00:00",
    basic_time_of_use_weekend_to: "22:00:00",
    use_or_not: true,
    ...zeroCounts,
    court_count_hard_outdoor: 12,
    source_provider: "eshare",
    source_service_id: "BI27M1351122",
    source_service_name: "천안종합운동장 실외테니스장",
    source_place_name: "천안종합운동장 실외테니스장",
    source_area_name: "충남 천안시",
    source_match_key: "eshare:BI27M1351122",
  },
  note: "기존 천안종합운동장 테니스장 레코드에서 분리한 실외 시설입니다. 하드코트 12면이며 1면 1시간 단위입니다. 평일 06:00~22:00, 공휴일 08:00~22:00 운영합니다. 이용일 8일 전 21:00에 온라인 예약이 열리고 당일·익일은 현장 접수합니다. 성인 기준 주간·조기 4,000원, 야간 6,000원입니다. 구조화 요금에는 기본요금 4,000원과 야간 차액 2,000원을 조명비로 저장했습니다.",
  rules: [rule("rolling", "이용일 8일 전 21:00 온라인 오픈", "당일·익일 현장 접수 · 1면 1시간", "https://www.cauc.or.kr/_stadium/main.asp?no=39", paidFee(1, {
    outdoor_weekday_price: 4000,
    outdoor_weekend_price: 4000,
    lighting_fee_separate: true,
    lighting_fee_amount: 2000,
    lighting_fee_basis_hours: 1,
    lighting_start_time: "18:00:00",
  }), {
    open_time: "21:00:00",
    open_offset: "8",
  })],
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

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const originalIds = courts.map(({ id }) => id);
const { data: originals, error: originalsError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_region,basic_city,booking_site_link,etc_desc,use_or_not")
  .in("id", originalIds);
if (originalsError) throw originalsError;

if (originals.length !== 28) {
  throw new Error(`반영 대상 기존 시설 수가 예상과 다릅니다: ${originals.length}/28`);
}

const originalsById = new Map(originals.map((court) => [court.id, court]));
for (const court of courts) {
  if (!originalsById.has(court.id)) throw new Error(`반영 대상 시설 누락: ${court.name} (${court.id})`);
}

const { data: outdoorMatches, error: outdoorMatchError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_site_link,etc_desc")
  .eq("slug", newOutdoorCourt.slug)
  .limit(2);
if (outdoorMatchError) throw outdoorMatchError;
if (outdoorMatches.length > 1) throw new Error("천안종합운동장 실외테니스장 slug 중복이 있습니다.");

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  existingTargets: originals.length,
  newOutdoorCourt: outdoorMatches.length ? "update-existing" : "insert",
  plannedRegionCorrection: "두왕테니스장: 충남 서천군 → 울산 남구",
  plannedRenames: [
    "테니스장 → 한국도로공사 공주지사 테니스장",
    "당진지사 테니스장 → 한국도로공사 당진지사 테니스장",
    "보령지사 테니스장 2건 → 한국전력공사/한국도로공사 시설로 구분",
    "천안종합운동장 테니스장 → 천안종합운동장 실내테니스장",
  ],
  plannedRules: courts.length + 1,
  plannedFees: courts.filter(({ rules }) => rules[0].fee).length + 1,
}, null, 2));

if (!shouldApply) process.exit(0);

let outdoorCurrent = outdoorMatches[0] ?? null;
if (!outdoorCurrent) {
  const { data, error } = await supabase
    .from("courtinfo")
    .insert({
      id: crypto.randomUUID(),
      ...resetLegacyBookingFields,
      ...newOutdoorCourt.values,
      etc_desc: `${marker}\n${newOutdoorCourt.note}`,
      source_synced_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id,basic_court_name,booking_site_link,etc_desc")
    .single();
  if (error) throw new Error(`천안종합운동장 실외테니스장 추가 실패: ${error.message}`);
  outdoorCurrent = data;
} else {
  const { error } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...newOutdoorCourt.values,
      etc_desc: appendNote(outdoorCurrent.etc_desc, newOutdoorCourt.note),
      source_synced_at: now,
      updated_at: now,
    })
    .eq("id", outdoorCurrent.id);
  if (error) throw new Error(`천안종합운동장 실외테니스장 갱신 실패: ${error.message}`);
}

const allCourts = [...courts, { ...newOutdoorCourt, id: outdoorCurrent.id }];
const allIds = allCourts.map(({ id }) => id);
const { data: activeRulesBefore, error: rulesBeforeError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,sort_order,is_active")
  .in("court_id", allIds)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (rulesBeforeError) throw rulesBeforeError;

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
  const current = originalsById.get(court.id);
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

await saveRules({ ...newOutdoorCourt, id: outdoorCurrent.id }, newOutdoorCourt.values.booking_site_link);
console.log(`완료: ${newOutdoorCourt.name}`);

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_region,basic_city,booking_rule_type,etc_desc,use_or_not")
  .in("id", allIds);
if (verifyCourtError) throw verifyCourtError;

const { count: chungnamCount, error: countError } = await supabase
  .from("courtinfo")
  .select("id", { count: "exact", head: true })
  .eq("basic_region", "충남");
if (countError) throw countError;

const { data: verifiedRules, error: verifyRulesError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,is_active")
  .in("court_id", allIds)
  .eq("is_active", true);
if (verifyRulesError) throw verifyRulesError;

const { data: verifiedFees, error: verifyFeesError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeesError) throw verifyFeesError;

const verifiedById = new Map(verifiedCourts.map((court) => [court.id, court]));
const duwang = verifiedById.get("619c8cdb-9516-49a8-95bf-2dd947cc2b87");
const invalidNotes = verifiedCourts.filter(({ etc_desc }) => !etc_desc?.includes(marker));
const invalidRuleTypes = verifiedRules.filter(({ court_id, rule_type }) => {
  const expected = allCourts.find(({ id }) => id === court_id)?.rules[0].rule_type;
  return expected !== rule_type;
});
const boryeongNames = verifiedCourts
  .filter(({ id }) => ["ce8e3d45-003e-4744-b4b4-1bf7016a3553", "f0d81d4b-2b2d-4c59-a2d9-56a29ff72b8f"].includes(id))
  .map(({ basic_court_name }) => basic_court_name)
  .sort();
const cheonanNames = verifiedCourts
  .filter(({ id }) => ["ef1dca3e-0dcc-4c50-885e-e08673175f17", outdoorCurrent.id].includes(id))
  .map(({ basic_court_name }) => basic_court_name)
  .sort();

if (
  verifiedCourts.length !== 29 ||
  chungnamCount !== 28 ||
  verifiedRules.length !== 29 ||
  verifiedFees.length !== 26 ||
  duwang?.basic_region !== "울산" ||
  duwang?.basic_city !== "남구" ||
  invalidNotes.length ||
  invalidRuleTypes.length ||
  boryeongNames.join("|") !== "한국도로공사 보령지사 테니스장|한국전력공사 보령지사 테니스장" ||
  cheonanNames.join("|") !== "천안종합운동장 실내테니스장|천안종합운동장 실외테니스장"
) {
  throw new Error(JSON.stringify({
    message: "충남 반영 검증 실패",
    targetRows: verifiedCourts.length,
    chungnamCount,
    activeRules: verifiedRules.length,
    feeRows: verifiedFees.length,
    duwang,
    invalidNotes: invalidNotes.map(({ basic_court_name }) => basic_court_name),
    invalidRuleTypes,
    boryeongNames,
    cheonanNames,
  }));
}

console.log(JSON.stringify({
  verifiedTargetRows: verifiedCourts.length,
  verifiedChungnamRows: chungnamCount,
  movedToUlsan: "두왕테니스장",
  insertedCourt: newOutdoorCourt.name,
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
