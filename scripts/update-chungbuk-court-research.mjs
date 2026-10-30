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
const marker = "[2026-09 충북 시설·예약·요금정보 공식자료 재검증]";
const eshare = (resourceId) =>
  `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`;

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

const courts = [
  {
    id: "45f431a0-5726-4051-a3f3-cddca486e48a",
    name: "한국도로공사 보은지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 보은지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "최소 7일 전 전화 신청 후 관리자 승인 · 문의 043-721-6511",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 테니스 코트 1면입니다. 최소 7일 전에 전화로 신청하고 관리자 승인을 받아 이용하며 운영시간은 담당자에게 확인해야 합니다. 무료입니다. 표면 재질은 공식자료에 없어 코트 종류 숫자 칼럼은 비워 두었습니다.",
    rule: rule("phone", "최소 7일 전 전화 신청 후 관리자 승인", "운영시간 담당자 확인", eshare("GG11K813354"), freeFee()),
  },
  {
    id: "e20a3df7-aa62-494f-a52e-ca6035a9d56d",
    name: "한국도로공사 영동지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "이용 전 전화 신청 후 직원 확인 · 문의 042-722-6415",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "주말·공휴일에 개방하는 실외 코트입니다. 이용 전 전화로 신청하고 직원 확인을 받아야 하며 정확한 운영시간과 코트 면수·표면은 담당자에게 확인해야 합니다. 무료입니다.",
    rule: rule("phone", "전화 신청 후 직원 확인", "주말·공휴일 이용 · 시간 담당자 확인", eshare("GH07Q0211527"), freeFee()),
  },
  {
    id: "faa2cb0f-db03-4c14-9b8a-69c695245e87",
    name: "옥천고등학교 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 학교 교육 일정 우선 · 문의 043-730-2905",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "학교 교육 일정을 우선하며 전화 문의 후 관리자 승인을 받아 이용합니다. 공유누리 기본요금은 15,000원으로 안내되지만 적용 시간 기준이 없어 구조화 요금에는 넣지 않았습니다. 코트 면수·표면과 운영시간은 미공개입니다.",
    rule: rule("phone", "전화 문의 후 관리자 승인", "학교 교육 일정 우선 · 운영시간 문의", eshare("HF04J0004655")),
  },
  {
    id: "eab41d9d-f31e-4abc-94f6-d2d0775510dc",
    name: "한국가스안전공사 본사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 관리자 승인 · 예약 확인 뒤 7일 이내 사용신청서 제출",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "주말·공휴일 09:00~18:00 운영하며 야간조명은 없습니다. 공유누리 신청 후 관리자 승인을 확인하고 7일 이내 시설사용 신청서를 제출해야 합니다. 2025년 6월부터 월 최대 2회 이용할 수 있습니다. 무료이며 코트 면수·표면은 미공개입니다.",
    rule: rule("irregular", "공유누리 신청 후 관리자 승인", "주말·공휴일 09:00~18:00 · 월 최대 2회", eshare("GG11K812566"), freeFee()),
  },
  {
    id: "6b9002ca-e7c9-4a9f-8278-575044143e3e",
    name: "한국소비자원 테니스장",
    values: {
      basic_address: "충북 음성군 맹동면 용두로 54 한국소비자원 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "최소 3일 전 공유누리 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "18:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 코트 2면으로 금요일 18:00~22:00, 토·일요일 09:00~18:00 운영합니다. 공휴일·대체공휴일과 창립기념일인 7월 1일은 휴관합니다. 최소 3일 전 공유누리로 신청하고 관리자 승인을 받아 이용하며 최대 8명, 무료입니다. 표면 재질은 미공개입니다.",
    rule: rule("irregular", "최소 3일 전 온라인 신청 후 관리자 승인", "금 18:00~22:00 · 토·일 09:00~18:00", eshare("GG11K813104"), freeFee()),
  },
  {
    id: "a4ccd468-bfb8-4ec8-9c25-246bf93959be",
    name: "한국도로공사 제천지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "최소 7일 전 전화 신청 후 관리자 승인 · 문의 043-721-6311",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "평일 09:00~18:00 운영하며 최소 7일 전에 전화로 신청하고 관리자 승인을 받아 이용합니다. 무료이며 코트 면수와 표면은 미공개입니다.",
    rule: rule("phone", "최소 7일 전 전화 신청 후 관리자 승인", "평일 09:00~18:00", eshare("GJ20N4654603"), freeFee()),
  },
  {
    id: "4d4356c3-4242-4160-a99f-3b0b298b202f",
    name: "법무연수원 진천본원 테니스장",
    values: {
      basic_court_name: "법무연수원 진천본원 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "최소 7일 전 덕산혁신도시출장소에 신청서 제출 · 문의 043-539-8441",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "주말·공휴일 09:00~12:00와 13:00~17:00 운영하는 코트 2면입니다. 최소 7일 전 사용신청서를 덕산혁신도시출장소에 직접 제출해야 합니다. 진천군 주민과 관내 기관·직장·학교는 무료이며 그 외 이용자는 공유누리 기본요금 100,000원으로 안내되지만 시간 기준이 없어 구조화 요금에는 넣지 않았습니다. 표면은 미공개입니다.",
    rule: rule("phone", "최소 7일 전 사용신청서 제출", "주말·공휴일 09:00~12:00, 13:00~17:00", eshare("BA10A0015745")),
  },
  {
    id: "a15fa05f-3542-46b9-a1ca-ef4ca6c57e61",
    name: "정보통신산업진흥원 테니스장",
    values: {
      basic_court_name: "정보통신산업진흥원 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "최소 15일 전 사용신청서를 이메일 제출 후 관리자 승인 · play@nipa.kr",
      booking_site_link: "https://www.nipa.kr/home/2-5-1",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "17:30:00",
      ...zeroCounts,
    },
    note: "실외 코트 2면입니다. 주말·공휴일에 07:00~09:00, 09:30~11:30, 13:00~15:00, 15:30~17:30의 4회차로 운영합니다. 최소 15일 전에 사용신청서를 play@nipa.kr로 제출하고 승인을 받아 무료로 이용합니다. 만 19세 미만은 보호자가 동반해야 하며 표면 재질은 미공개입니다.",
    rule: rule("phone", "최소 15일 전 이메일 신청 후 관리자 승인", "주말·공휴일 2시간 4회차", "https://www.nipa.kr/home/2-5-1", freeFee(2)),
  },
  {
    id: "49b6714f-4ec3-4f2a-b2b5-0c90a9742f23",
    name: "정보통신정책연구원 본관 테니스장",
    values: {
      basic_court_name: "정보통신정책연구원 본관 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "최소 2일 전 공유누리 온라인 예약",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "주말·공휴일 10:00~17:00 운영하는 코트 1면입니다. 최소 2일 전에 공유누리로 온라인 예약하며 무료입니다. 표면 재질은 미공개입니다.",
    rule: rule("irregular", "최소 2일 전 온라인 예약", "주말·공휴일 10:00~17:00", eshare("BA10A0015831"), freeFee()),
  },
  {
    id: "eea7be0f-019f-43ce-a5a9-8a1f1eea259a",
    name: "한국교육과정평가원 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 후 관리자 승인 · 이용 시작 시 경비실 확인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "주말·공휴일 10:00~17:00 운영합니다. 공유누리 신청 후 관리자 승인을 받고 이용 시작 시 경비실에 확인해야 합니다. 대학수학능력시험 보안기간인 매년 10~12월에는 이용을 제한합니다. 무료이며 면수와 표면은 미공개입니다.",
    rule: rule("irregular", "공유누리 신청 후 관리자 승인", "주말·공휴일 10:00~17:00 · 매년 10~12월 이용 제한", eshare("BA10A0016158"), freeFee()),
  },
  {
    id: "07d0236e-7721-44ab-b20b-97fe4a543102",
    name: "한국도로공사 충북본부 및 진천지사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "사용신청서를 첨부해 공유누리 신청 후 관리자 승인 · 미승인 시 이용 2일 전 확인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "사용신청서를 첨부해 공유누리로 신청하고 관리자 승인을 받아 이용합니다. 예약일이 가까워도 미승인 상태이면 이용 2일 전까지 담당자에게 확인해야 하며 주말 이용은 목요일까지 확인합니다. 무료이고 운영시간·면수·표면은 미공개입니다.",
    rule: rule("irregular", "신청서 첨부 후 온라인 신청·관리자 승인", "미승인 시 이용 2일 전까지 확인", eshare("GG11I2707734"), freeFee()),
  },
  {
    id: "52e967a2-5771-40b9-bcf6-3302dbb30cbc",
    name: "청주강내하수처리장 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "매월 1일부터 다음 달 이용분 공유누리 온라인 예약",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "18:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "18:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "A·B·C 3개 예약 자원으로 운영하며 매월 1일부터 다음 달 이용분을 예약합니다. 확인된 예약 회차는 18:00~20:00와 20:00~22:00이고 1일 최대 4시간입니다. 무료이며 표면 재질은 미공개입니다.",
    rule: rule("irregular", "매월 1일부터 다음 달 이용분 예약", "18:00~20:00, 20:00~22:00 · 1일 최대 4시간", eshare("CE27J3302777"), freeFee(2)),
  },
  {
    id: "99411cfd-59ca-49a0-a02f-bf379ded561c",
    name: "청주국제테니스장",
    values: {
      booking_rule_type: "checking",
      booking_reception_time: "청주시시설관리공단 예약 페이지에서 접수 · 최신 오픈 일정 확인 필요",
      booking_site_link: "https://www.cjuc.or.kr/reserve/",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "21:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 8,
      court_count_clay_outdoor: 6,
    },
    note: "확인된 시설 구성은 실외 하드 8면과 클레이 6면이며 운영시간은 06:00~21:00입니다. 예약은 청주시시설관리공단 예약 페이지에서 진행하지만 현재 공개 페이지에서 정확한 오픈 일정과 최신 요금을 확인할 수 없어 예약규칙과 요금은 확인 중으로 유지했습니다.",
    rule: rule("checking", "온라인 예약 일정 확인 필요", "운영시간 06:00~21:00", "https://www.cjuc.or.kr/reserve/"),
  },
  {
    id: "57224716-33ca-49e8-94db-90e33feae884",
    name: "청주내수하수처리장 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 예약 달력에서 이용 가능일 온라인 신청",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "08:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "3개 예약 자원으로 운영하며 공유누리 예약 달력에서 이용 가능한 날짜를 신청합니다. 확인된 운영시간은 08:00~18:00이고 야간 이용은 하지 않습니다. 무료이며 표면 재질은 미공개입니다.",
    rule: rule("irregular", "예약 달력에서 이용 가능일 온라인 신청", "08:00~18:00 · 야간 이용 불가", eshare("CE27K0945561"), freeFee()),
  },
  {
    id: "ca318eda-89e2-43b5-8875-89b64d408bfb",
    name: "청주여자중학교 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 학교 교육 일정 우선",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "07:30:00",
      basic_time_of_use_weekend_to: "09:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 1,
    },
    note: "실외 코트 1면으로 주말·공휴일 07:30~09:00 운영하며 학교 교육 일정을 우선합니다. 전화 문의 후 관리자 승인을 받아 이용합니다. 공유누리 기본요금은 25,000원으로 안내되지만 시간 기준이 없어 구조화 요금에는 넣지 않았습니다.",
    rule: rule("phone", "전화 문의 후 관리자 승인", "주말·공휴일 07:30~09:00 · 학교 일정 우선", eshare("HF10N3755793")),
  },
  {
    id: "ecb1b6a7-2060-46c0-9154-529ddc7815c4",
    name: "청주하수처리장 테니스장",
    values: {
      basic_court_name: "청주하수처리장 테니스장",
      booking_rule_type: "ordinal",
      booking_reception_time: "매월 마지막 월요일 10:00 다음 달 이용분 온라인 오픈 · 공휴일이면 화요일",
      booking_site_link: "https://ticket.cheongju.go.kr/www/selectFcltyWebList.do?key=17&searchInsttNo=2",
      booking_online_reserve_possible: true,
      booking_open_type: "week",
      booking_open_day_of_week: 1,
      booking_open_ordinal: -1,
      booking_open_time_normal: "10:00:00",
      booking_open_offset: "다음달",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 A·B 코트 2면이며 매월 마지막 월요일 10:00에 다음 달 이용분을 선착순으로 엽니다. 해당일이 공휴일이면 화요일 10:00에 엽니다. 2시간 단위이며 1일 최대 2회·4시간 이용할 수 있습니다. 주간은 2시간 5,000원, 야간은 10,000원으로 구조화 요금에는 기본 5,000원과 야간 차액 5,000원을 저장했습니다. 표면은 미공개입니다.",
    rule: rule("ordinal", "매월 마지막 월요일 10:00 온라인 오픈", "다음 달 이용분 · 2시간 단위 · 1일 최대 4시간", "https://ticket.cheongju.go.kr/www/selectFcltyWebList.do?key=17&searchInsttNo=2", paidFee(2, {
      outdoor_weekday_price: 5000,
      outdoor_weekend_price: 5000,
      lighting_fee_separate: true,
      lighting_fee_amount: 5000,
      lighting_fee_basis_hours: 2,
    }), {
      open_type: "week",
      open_day_of_week: 1,
      open_ordinal: -1,
      open_time: "10:00:00",
      open_offset: "다음달",
      // 공휴일이면 화요일 오픈 규칙은 현재 enum으로 표현할 수 없어 안내 문구에만 보존한다.
      open_date_adjustment: "none",
    }),
  },
  {
    id: "77a8d17e-891a-45aa-9abf-40e0df7e1b50",
    name: "충북지방조달청 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "동반자 명단을 첨부해 공유누리 신청 후 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "06:30:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCounts,
    },
    note: "주말·공휴일 06:30~11:30와 13:00~17:00 운영합니다. 동반자 명단을 첨부해 공유누리로 신청하고 관리자 승인을 받아야 합니다. 신청자 포함 최대 8명, 1일 최대 2시간이며 야간조명은 없습니다. 무료이고 면수·표면은 미공개입니다.",
    rule: rule("irregular", "동반자 명단 첨부 후 온라인 신청·승인", "주말·공휴일 06:30~11:30, 13:00~17:00 · 최대 2시간", eshare("DC29Q0952963"), freeFee(2)),
  },
  {
    id: "d2b212ee-b4ab-47d5-b146-da4cd6593ee4",
    name: "용담초등학교 테니스장",
    values: {
      basic_court_name: "용담초등학교 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 문의 후 관리자 승인 · 학교 교육 일정 우선",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "용담초등학교의 실외 테니스 시설로 학교 교육 일정을 우선합니다. 사전에 전화로 문의하고 관리자 승인을 받아 이용합니다. 공유누리 기본요금은 25,000원이며 25,000원·50,000원·100,000원 구간도 안내되지만 적용 시간 구분이 명확하지 않아 구조화 요금에는 넣지 않았습니다. 운영시간과 면수·표면은 미공개입니다.",
    rule: rule("phone", "사전 전화 문의 후 관리자 승인", "학교 교육 일정 우선 · 운영시간 문의", eshare("HF10M2147164")),
  },
  {
    id: "3ce8caa8-99a2-4646-8e0c-499707d33e2f",
    name: "예금보험공사 충주 글로벌교육센터 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 문의 후 관리자 승인 · 충주시민 및 교육시설 이용자 대상 · 문의 043-857-9815",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "10:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "충주시민과 교육시설 이용자를 대상으로 교육·연수 일정이 없는 평일 10:00~18:00에 개방합니다. 전화 문의 후 관리자 승인을 받아 이용합니다. 시설 크기는 24×11m이며 요금은 1인 2시간 11,000원, 최대 4명 44,000원입니다. 1인 요금이어서 코트 단위 구조화 요금에는 넣지 않았습니다.",
    rule: rule("phone", "전화 문의 후 관리자 승인", "평일 10:00~18:00 · 충주시민 및 교육시설 이용자", eshare("GG11K811010")),
  },
  {
    id: "51a2a119-9b2a-4fd9-9511-50cbcfa3542c",
    name: "충주혜성학교 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "사전 전화 확인 후 공유누리 신청·관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:30:00",
      basic_time_of_use_weekday_to: "19:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "19:00:00",
      ...zeroCounts,
    },
    note: "평일은 06:30~07:30과 방과 후에 운영하며 방과 후 시간은 여름 17:00~19:00, 겨울 17:00~18:00입니다. 주말·공휴일은 09:00~19:00 운영합니다. 사전에 전화로 확인한 뒤 공유누리로 신청하고 승인을 받아 이용합니다. 기본요금 15,000원과 15,000원·30,000원·60,000원 구간이 안내되지만 적용 기준이 불명확해 구조화 요금에는 넣지 않았습니다. 면수·표면은 미공개입니다.",
    rule: rule("irregular", "사전 전화 확인 후 온라인 신청·승인", "평일 06:30~07:30·방과 후, 주말 09:00~19:00", eshare("HF07L1610450")),
  },
  {
    id: "4a168adf-351c-476d-93b1-564194f310d5",
    name: "탄금테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time: "매월 1일 09:00 해당 월 이용분 온라인 신청 · 당일 예약 가능",
      booking_site_link: "https://www.chungju.go.kr/rev/reserve/321?category_3=%EC%B2%B4%EC%9C%A1%EC%8B%9C%EC%84%A4&category_4=%ED%85%8C%EB%8B%88%EC%8A%A4&search_word=%ED%83%84%EA%B8%88",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_open_type: "day",
      booking_open_day_of_month: 1,
      booking_open_time_normal: "09:00:00",
      booking_normal_iscurrentmonth: true,
      booking_open_offset: "당월",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실내 3면과 실외 17면으로 총 20면입니다. 매월 1일 09:00부터 해당 월 말일까지 신청하며 당일 예약도 가능합니다. 1일 최대 4시간이고 동호회는 월 최대 2면으로 제한됩니다. 1면 2시간 주간 기준 실내는 평일 8,000원·주말/공휴일 10,000원, 실외는 평일 4,000원·주말/공휴일 5,000원입니다. 야간 이용료는 실내 10,000원·13,000원, 실외 5,000원·7,000원이고 조명료는 시간당 5,000원 별도입니다. 관외 단체는 50% 가산됩니다. 야간 기본요금 차등은 현재 구조로 모두 표현할 수 없어 주간 기본요금과 별도 조명료를 구조화했습니다. 코트 표면은 공식 페이지에 미표기입니다.",
    rule: rule("fixed_schedule", "매월 1일 09:00 해당 월 예약 오픈", "당일 예약 가능 · 1일 최대 4시간", "https://www.chungju.go.kr/rev/reserve/321?category_3=%EC%B2%B4%EC%9C%A1%EC%8B%9C%EC%84%A4&category_4=%ED%85%8C%EB%8B%88%EC%8A%A4&search_word=%ED%83%84%EA%B8%88", paidFee(2, {
      outdoor_weekday_price: 4000,
      outdoor_weekend_price: 5000,
      indoor_weekday_price: 8000,
      indoor_weekend_price: 10000,
      lighting_fee_separate: true,
      lighting_fee_amount: 5000,
      lighting_fee_basis_hours: 1,
    }), {
      open_type: "day",
      open_day_of_month: 1,
      open_time: "09:00:00",
      open_offset: "당월",
    }),
  },
  {
    id: "a81a2dbb-0ca3-47cb-8a0e-a6180aace6a5",
    name: "한국도로공사 충주지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 충주지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "최소 2일 전 전화 신청 후 관리자 승인 · 문의 043-721-6411",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 2면으로 최소 2일 전에 전화로 신청하고 관리자 승인을 받아 무료로 이용합니다. 운영시간과 표면은 미공개입니다.",
    rule: rule("phone", "최소 2일 전 전화 신청 후 관리자 승인", "운영시간 담당자 확인", eshare("GJ22M5605992"), freeFee()),
  },
  {
    id: "a5434a7e-0c31-4129-b023-9ad43cfeadc9",
    name: "한국도로공사 엄정지사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "최소 2일 전 공유누리 신청 후 전화 확인·관리자 승인 · 문의 043-721-6611",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "실외 코트 2면으로 최소 2일 전에 공유누리로 신청하고 전화 확인과 관리자 승인을 받아 무료로 이용합니다. 고정 운영시간과 표면은 미공개입니다.",
    rule: rule("irregular", "최소 2일 전 온라인 신청 후 전화 확인·승인", "운영시간 예약 달력 확인", eshare("GJ22I0358351"), freeFee()),
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

const ids = courts.map(({ id }) => id);
const { data: existingCourts, error: existingError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_region,etc_desc")
  .in("id", ids);
if (existingError) throw existingError;
if (existingCourts.length !== courts.length) {
  throw new Error(`대상 시설 수가 예상과 다릅니다: ${existingCourts.length}/${courts.length}`);
}
if (existingCourts.some(({ basic_region }) => basic_region !== "충북")) {
  throw new Error("충북 외 지역 시설이 대상에 포함되어 있습니다.");
}

const existingById = new Map(existingCourts.map((court) => [court.id, court]));
const { data: existingRules, error: rulesError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,sort_order")
  .in("court_id", ids)
  .order("sort_order");
if (rulesError) throw rulesError;

const rulesByCourt = new Map();
for (const existingRule of existingRules) {
  const list = rulesByCourt.get(existingRule.court_id) ?? [];
  list.push(existingRule);
  rulesByCourt.set(existingRule.court_id, list);
}

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  targetCourts: courts.length,
  plannedRules: courts.length,
  plannedFeeRows: courts.filter(({ rule: item }) => item.fee).length,
  plannedRenames: courts
    .filter(({ id, name }) => existingById.get(id)?.basic_court_name !== name)
    .map(({ id, name }) => `${existingById.get(id)?.basic_court_name} → ${name}`),
}, null, 2));

if (!shouldApply) process.exit(0);

for (const court of courts) {
  const current = existingById.get(court.id);
  const { error: courtUpdateError } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...court.values,
      etc_desc: appendNote(current.etc_desc, court.note),
      source_synced_at: now,
      updated_at: now,
    })
    .eq("id", court.id);
  if (courtUpdateError) throw new Error(`${court.name} 시설 갱신 실패: ${courtUpdateError.message}`);

  const currentRules = rulesByCourt.get(court.id) ?? [];
  const primaryRule = currentRules[0] ?? null;
  const { fee, ...desiredRule } = court.rule;
  const payload = {
    court_id: court.id,
    ...resetRuleFields,
    ...desiredRule,
    is_active: true,
    sort_order: 10,
    updated_at: now,
  };

  let ruleId;
  if (primaryRule) {
    const { error: ruleUpdateError } = await supabase
      .from("court_booking_rules")
      .update(payload)
      .eq("id", primaryRule.id);
    if (ruleUpdateError) throw new Error(`${court.name} 예약규칙 갱신 실패: ${ruleUpdateError.message}`);
    ruleId = primaryRule.id;
  } else {
    const { data: insertedRule, error: ruleInsertError } = await supabase
      .from("court_booking_rules")
      .insert({ ...payload, created_at: now })
      .select("id")
      .single();
    if (ruleInsertError) throw new Error(`${court.name} 예약규칙 추가 실패: ${ruleInsertError.message}`);
    ruleId = insertedRule.id;
  }

  const obsoleteRuleIds = currentRules.slice(1).map(({ id }) => id);
  if (obsoleteRuleIds.length) {
    const { error: obsoleteFeeError } = await supabase
      .from("court_booking_rule_fees")
      .delete()
      .in("booking_rule_id", obsoleteRuleIds);
    if (obsoleteFeeError) throw new Error(`${court.name} 이전 요금 정리 실패: ${obsoleteFeeError.message}`);
    const { error: obsoleteRuleError } = await supabase
      .from("court_booking_rules")
      .delete()
      .in("id", obsoleteRuleIds);
    if (obsoleteRuleError) throw new Error(`${court.name} 이전 예약규칙 정리 실패: ${obsoleteRuleError.message}`);
  }

  if (fee) {
    const feeRow = {
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
    const { error: feeUpsertError } = await supabase
      .from("court_booking_rule_fees")
      .upsert(feeRow, { onConflict: "booking_rule_id" });
    if (feeUpsertError) throw new Error(`${court.name} 요금 갱신 실패: ${feeUpsertError.message}`);
  } else {
    const { error: feeDeleteError } = await supabase
      .from("court_booking_rule_fees")
      .delete()
      .eq("booking_rule_id", ruleId);
    if (feeDeleteError) throw new Error(`${court.name} 구조화 불가 요금 정리 실패: ${feeDeleteError.message}`);
  }
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,booking_reception_time,booking_site_link,basic_time_of_use_weekday_from,basic_time_of_use_weekday_to,basic_time_of_use_weekend_from,basic_time_of_use_weekend_to")
  .in("id", ids);
if (verifyCourtError) throw verifyCourtError;

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,booking_round_label,usage_period_label")
  .in("court_id", ids);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const expectedFeeCount = courts.filter(({ rule: item }) => item.fee).length;
const wrongNames = courts.filter(({ id, name }) =>
  verifiedCourts.find((court) => court.id === id)?.basic_court_name !== name,
);
if (
  verifiedCourts.length !== courts.length ||
  verifiedRules.length !== courts.length ||
  verifiedFees.length !== expectedFeeCount ||
  wrongNames.length
) {
  throw new Error(`검증 실패: courts=${verifiedCourts.length}, rules=${verifiedRules.length}, fees=${verifiedFees.length}/${expectedFeeCount}, wrongNames=${wrongNames.length}`);
}

console.log(JSON.stringify({
  verifiedCourts: verifiedCourts.length,
  verifiedRules: verifiedRules.length,
  verifiedFees: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  ruleTypes: verifiedCourts.reduce((counts, { booking_rule_type }) => ({
    ...counts,
    [booking_rule_type]: (counts[booking_rule_type] ?? 0) + 1,
  }), {}),
}, null, 2));
