import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase 환경 변수가 필요합니다.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 경남 시설·예약정보 공식자료 재검증]";
const eshare = (resourceId) =>
  `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${resourceId}`;
const geojeBooking = "https://www.gmdc.co.kr/_geojesp/_sub03/sub.html?bo_table=reserve&mode=s1";
const yangsanBooking = "https://www.yssisul.or.kr/rent";
const changwon315Booking = "https://www.changwon.go.kr/booking/10032/10085/10156.web?amode=view&expId=EX000048&fcd=T116";

const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const freeFee = { is_free: true };
const paidFee = (priceBasisHours, values = {}) => ({
  is_free: false,
  price_basis_hours: priceBasisHours,
  ...values,
});

const fixedDayRule = (day, time, url, usagePeriodLabel = "다음 달 이용분") => ({
  label: "전체",
  eligibility: "normal",
  rule_type: "fixed_schedule",
  open_type: "day",
  open_day_of_month: day,
  open_time: time,
  open_offset: "다음달",
  reservation_url: url,
  booking_round_label: `매월 ${day}일 ${time.slice(0, 5)} 온라인 선착순 오픈`,
  usage_period_label: usagePeriodLabel,
});

const courts = [
  {
    id: "d47ca1fe-733e-43d2-9497-f4dd02c68940",
    name: "거제시립테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time: "매월 2일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: geojeBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 4,
    },
    note: "거제해양관광개발공사 예약 공지 기준 매월 2일 09:00에 다음 달 이용분을 엽니다. 실외 하드코트 4면입니다. 계절별 운영시간이 달라 대표 운영범위 05:00~23:00을 저장했습니다. 연습사용은 1회 2시간 기준이며 평일 주간 10,000원, 토·공휴일 및 야간은 14,000원입니다.",
    rules: [{ ...fixedDayRule(2, "09:00:00", geojeBooking), fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 14000 }) }],
  },
  {
    id: "db1e6dd6-5dc7-458e-9d3b-d3a37b1a584c",
    name: "거제지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 협의 후 신청 · 문의 055-630-2226",
      booking_site_link: eshare("GG11K812591"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "한국전력공사 거제지사 개방시설입니다. 평일 09:00~18:00 운영하고 토·일·공휴일은 개방하지 않습니다. 공유누리 온라인 신청이 가능하지만 이용 전 담당자와 사전 협의해야 하며 정기 오픈 날짜는 공개되어 있지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: eshare("GG11K812591"), booking_round_label: "사전 전화 협의 후 신청", usage_period_label: "평일 09:00~18:00", fee: freeFee }],
  },
  {
    id: "b64f140e-6540-4cc2-b557-4ee888bbc8ad",
    name: "능포테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time: "매월 4일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: geojeBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 2,
    },
    note: "거제해양관광개발공사 예약 공지 기준 매월 4일 09:00에 다음 달 이용분을 엽니다. 실외 코트 2면이며 계절별 운영시간이 달라 대표 운영범위 05:00~23:00을 저장했습니다. 연습사용은 1회 2시간 기준입니다.",
    rules: [{ ...fixedDayRule(4, "09:00:00", geojeBooking), fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 14000 }) }],
  },
  {
    id: "cc778e8e-0895-4c16-8fcb-68fbd2d358fe",
    name: "송정테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time: "매월 5일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: geojeBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 2,
    },
    note: "거제해양관광개발공사 예약 공지 기준 매월 5일 09:00에 다음 달 이용분을 엽니다. 실외 코트 2면이며 계절별 운영시간이 달라 대표 운영범위 05:00~23:00을 저장했습니다. 연습사용은 1회 2시간 기준입니다.",
    rules: [{ ...fixedDayRule(5, "09:00:00", geojeBooking), fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 14000 }) }],
  },
  {
    id: "7d8f91cc-3587-44ff-a411-40a4aec0b126",
    name: "옥포테니스장",
    values: {
      booking_rule_type: "fixed_schedule",
      booking_reception_time: "매월 5일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: geojeBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 3,
    },
    note: "거제해양관광개발공사 예약 공지 기준 매월 5일 09:00에 다음 달 이용분을 엽니다. 실외 코트 3면이며 계절별 운영시간이 달라 대표 운영범위 05:00~23:00을 저장했습니다. 연습사용은 1회 2시간 기준입니다.",
    rules: [{ ...fixedDayRule(5, "09:00:00", geojeBooking), fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 14000 }) }],
  },
  {
    id: "125ff21c-ef56-4bb0-8e07-45cf0132ecc7",
    name: "스포츠파크 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 또는 위탁운영자 전화 협의 · 문의 010-2062-8012",
      booking_site_link: eshare("CF11J5349229"),
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 6,
      court_count_grass_outdoor: 6,
    },
    note: "거창스포츠파크 테니스장은 실외 하드 6면·인조잔디 6면, 06:00~22:00 운영입니다. 공유누리 신청 또는 위탁운영자 전화 협의 방식이며 관리자가 코트를 배정합니다. 공개 페이지에 정기 오픈 날짜·시각은 없습니다. 개인 사용료는 1인 2시간 4,000원으로 코트 면당 요금이 아닙니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("CF11J5349229"), booking_round_label: "온라인 신청 또는 위탁운영자 전화 협의", usage_period_label: "운영 일정 확인 후 신청", fee: paidFee(2, { outdoor_weekday_price: 4000, outdoor_weekend_price: 4000 }) }],
  },
  {
    id: "8ccb2edc-dfc3-41b2-9a5f-901a2096502d",
    name: "고성지사 테니스장",
    values: { booking_rule_type: "phone", booking_reception_time: "사전 전화 협의 후 관리자 승인 · 문의 055-711-6911", booking_site_link: eshare("GG11K811647"), booking_online_reserve_possible: false },
    note: "한국도로공사 고성지사 개방시설입니다. 무료이며 이용 전 담당자와 사전 협의 후 승인을 받아야 합니다. 정기 오픈 날짜·시각과 상시 운영시간은 공식 공개자료에서 확인되지 않았습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-711-6911", booking_round_label: "전화 협의 후 관리자 승인", usage_period_label: "이용 일정 담당자 확인", fee: freeFee }],
  },
  {
    id: "c7fe4d9a-b5ec-4dc3-98fe-4c71e171fd90",
    name: "남해군공설테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "위탁운영 시설로 이용 일정 전화 문의 · 문의 055-860-8661",
      booking_site_link: "https://www.namhae.go.kr/reserve/Index.do?c=RE0201040000",
      booking_online_reserve_possible: false,
      ...zeroCounts,
      court_count_hard_outdoor: 4,
    },
    note: "남해군 공식 시설자료 기준 실외 케미컬 코트 4면이며 위탁운영 시설입니다. 공개 예약포털에는 정기 접수 오픈일이 게시되지 않아 전화 문의 방식으로 저장했습니다. 사용료는 코트 1면 3시간 기준 평일 11,000원, 토·공휴일 16,500원입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-860-8661", booking_round_label: "위탁운영 시설 전화 문의", usage_period_label: "이용 일정 운영기관 확인", fee: paidFee(3, { outdoor_weekday_price: 11000, outdoor_weekend_price: 16500 }) }],
  },
  {
    id: "91163c16-e6ce-426b-8a92-ae8b1d3a71e4",
    name: "밀양지사 테니스장",
    values: { booking_rule_type: "phone", booking_reception_time: "사전 전화 또는 방문 신청 후 관리자 승인 · 문의 055-350-2225", booking_site_link: eshare("GG11K813846"), booking_online_reserve_possible: false },
    note: "한국전력공사 밀양지사 개방시설입니다. 무료이며 전화 또는 방문으로 사전 신청한 뒤 승인을 받아야 합니다. 정기 오픈 날짜·시각과 상시 운영시간은 공식 공개자료에 없습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-350-2225", booking_round_label: "전화 또는 방문 신청 후 승인", usage_period_label: "이용 일정 담당자 확인", fee: freeFee }],
  },
  {
    id: "1a76cc14-2b60-403f-86d1-a33a2d2df71d",
    name: "한국도로공사 밀양지사 테니스장",
    values: { booking_rule_type: "phone", booking_reception_time: "사전 전화 협의 후 관리자 승인 · 문의 055-714-7121", booking_site_link: eshare("GH13N4505506"), booking_online_reserve_possible: false },
    note: "한국도로공사 밀양지사 개방시설입니다. 무료이며 이용 전 담당자 협의와 승인이 필요합니다. 공개자료에서 정기 접수 오픈일과 상시 운영시간은 확인되지 않았습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-714-7121", booking_round_label: "전화 협의 후 관리자 승인", usage_period_label: "이용 일정 담당자 확인", fee: freeFee }],
  },
  {
    id: "45e51cce-89df-4ffb-ad67-82367cc0987c",
    name: "한국수력원자력(주) 삼랑진양수발전소 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 신청 및 공문 제출 후 관리자 승인 · 현재 노후화 수리로 이용 제한",
      booking_site_link: eshare("FJ15P3221441"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "평일 09:00~11:00 및 14:00~18:00 운영하고 주말·공휴일은 미개방합니다. 공유누리 신청과 이용 공문 제출 후 승인이 필요하며 무료입니다. 최신 공유누리 안내에는 시설 노후화 수리 필요로 이용 제한이 표시되어 있습니다. 정기 접수 오픈일은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("FJ15P3221441"), booking_round_label: "온라인 신청·공문 제출 후 관리자 승인", usage_period_label: "평일 09:00~11:00, 14:00~18:00 · 현재 이용 제한", fee: freeFee }],
  },
  {
    id: "00884ee3-2469-4f92-bfe8-6ff4140d8fcb",
    name: "사천공공하수처리시설 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 실시간 예약 신청 후 관리자 승인 · 미예약 이용 불가",
      booking_site_link: eshare("BA10A0004011"),
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
    },
    note: "07:00~22:00 운영, 무료이며 1회 최대 4시간 이용할 수 있습니다. 공유누리에서 실시간 예약을 신청한 뒤 관리자 승인을 받아야 하고 미예약 이용은 불가합니다. 별도 정기 오픈일은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("BA10A0004011"), booking_round_label: "공유누리 실시간 신청 후 관리자 승인", usage_period_label: "1회 최대 4시간", fee: freeFee }],
  },
  {
    id: "b2029a50-04b5-4e90-a884-b6d524849261",
    name: "삼천포공공하수처리시설 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 실시간 예약 신청 후 관리자 승인 · 미예약 이용 불가",
      booking_site_link: eshare("BA10A0004015"),
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "09:00~18:00 운영, 무료이며 1회 최대 4시간 이용할 수 있습니다. 공유누리에서 실시간 예약을 신청한 뒤 관리자 승인을 받아야 하고 미예약 이용은 불가합니다. 별도 정기 오픈일은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("BA10A0004015"), booking_round_label: "공유누리 실시간 신청 후 관리자 승인", usage_period_label: "1회 최대 4시간", fee: freeFee }],
  },
  {
    id: "031c9626-feb2-4e65-aa45-03b48f3396b8",
    name: "산청지사 테니스장",
    values: { booking_rule_type: "phone", booking_reception_time: "사전 전화 협의 후 관리자 승인 · 문의 055-711-6611", booking_site_link: eshare("GH07O1636922"), booking_online_reserve_possible: false },
    note: "한국도로공사 산청지사 개방시설입니다. 무료이며 이용 전 담당자 협의와 승인이 필요합니다. 공개자료에서 정기 접수 오픈일과 상시 운영시간은 확인되지 않았습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-711-6611", booking_round_label: "전화 협의 후 관리자 승인", usage_period_label: "이용 일정 담당자 확인", fee: freeFee }],
  },
  {
    id: "a48e6630-8596-4adb-9a98-21b5e275fe6b",
    name: "서창운동장 테니스장",
    values: {
      booking_rule_type: "ordinal",
      booking_reception_time: "매월 첫 번째 화요일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: yangsanBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 3,
    },
    note: "양산시시설관리공단 FAQ 기준 다음 달 이용분을 매월 첫 번째 화요일 09:00부터 선착순 접수합니다. 실외 인조잔디 3면, 대표 운영시간 06:00~22:00입니다. 사용료는 면당 2시간 기준 평일 주간 10,000원, 토·공휴일 및 야간 15,000원입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "ordinal", open_day_of_week: 2, open_ordinal: 1, open_time: "09:00:00", open_offset: "다음달", reservation_url: yangsanBooking, booking_round_label: "매월 첫 번째 화요일 09:00 선착순 오픈", usage_period_label: "다음 달 이용분", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000 }) }],
  },
  {
    id: "0a38c3cd-948d-499c-b424-96f77764b22e",
    name: "웅상체육공원 테니스장",
    values: {
      booking_rule_type: "ordinal",
      booking_reception_time: "매월 첫 번째 화요일 09:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: yangsanBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 4,
    },
    note: "양산시시설관리공단 FAQ 기준 다음 달 이용분을 매월 첫 번째 화요일 09:00부터 선착순 접수합니다. 실외 인조잔디 4면, 대표 운영시간 06:00~22:00입니다. 사용료는 면당 2시간 기준 평일 주간 10,000원, 토·공휴일 및 야간 15,000원입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "ordinal", open_day_of_week: 2, open_ordinal: 1, open_time: "09:00:00", open_offset: "다음달", reservation_url: yangsanBooking, booking_round_label: "매월 첫 번째 화요일 09:00 선착순 오픈", usage_period_label: "다음 달 이용분", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000 }) }],
  },
  {
    id: "41e18f45-9be4-4e1c-bed3-0c601d0cd2a8",
    name: "종합운동장 테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "양산시민 이용일 30일 전 09:00 · 관외 이용자 14일 전 09:00 온라인 선착순 오픈",
      booking_site_link: yangsanBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "05:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "05:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 4,
      court_count_clay_outdoor: 4,
    },
    note: "양산종합운동장 테니스장은 실외 8면(클레이 4, 하드 4)입니다. 공식 FAQ 기준 온라인 접수는 양산시민이 이용일 30일 전, 관외 이용자는 14일 전 오전 9시부터 선착순으로 가능합니다. 사용료는 면당 2시간 기준 평일 주간 10,000원, 토·공휴일 및 야간 15,000원입니다.",
    rules: [
      { label: "구민", eligibility: "local", target_condition: "양산시민", rule_type: "rolling", open_time: "09:00:00", open_offset: "30", reservation_url: yangsanBooking, booking_round_label: "이용일 30일 전 09:00 선착순 오픈", usage_period_label: "양산시민", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000 }) },
      { label: "전체", eligibility: "normal", target_condition: "양산시 외 거주자", rule_type: "rolling", open_time: "09:00:00", open_offset: "14", reservation_url: yangsanBooking, booking_round_label: "이용일 14일 전 09:00 선착순 오픈", usage_period_label: "관외 이용자", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000 }) },
    ],
  },
  {
    id: "ab43882c-09a5-46d9-9db6-937193c4aa52",
    name: "천성산체육공원 테니스장",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 30일 전부터 5일 전까지 온라인 신청",
      booking_site_link: yangsanBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 2,
    },
    note: "양산시시설관리공단 공식 안내 기준 실외 인조잔디 2면, 06:00~22:00 운영입니다. 이용일 1개월 전부터 5일 전까지 온라인 신청합니다. 면당 2시간 기준 평일 주간 10,000원, 토·공휴일 및 야간 15,000원이며 야간 조명료 3,500원이 별도입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "rolling", open_offset: "30", reservation_url: yangsanBooking, booking_round_label: "이용일 30일 전부터 신청", usage_period_label: "이용일 5일 전까지", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000, lighting_fee_separate: true, lighting_fee_amount: 3500, lighting_fee_basis_hours: 2, lighting_start_time: "18:00:00" }) }],
  },
  {
    id: "f8cc7c1d-22fc-42a1-a899-ec428765e7d5",
    name: "테니스장",
    values: {
      basic_court_name: "한국도로공사 양산지사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 수시 신청 후 관리자 승인 · 문의 055-711-6311",
      booking_site_link: eshare("GI23O1502201"),
      booking_online_reserve_possible: true,
    },
    note: "시설명이 모호해 운영기관을 반영한 '한국도로공사 양산지사 테니스장'으로 정정했습니다. 코트 2면, 무료이며 공유누리 신청 후 관리자 승인을 받습니다. 정기 오픈 날짜·시각은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("GI23O1502201"), booking_round_label: "공유누리 수시 신청 후 관리자 승인", usage_period_label: "이용 가능 일정 예약 화면 확인", fee: freeFee }],
  },
  {
    id: "d3cc0d97-6f2a-4717-8d98-eb481601fbb9",
    name: "정곡면공설운동장 테니스장",
    values: { booking_rule_type: "irregular", booking_reception_time: "공유누리 수시 신청 후 관리자 승인", booking_site_link: eshare("DJ20K4406829"), booking_online_reserve_possible: true },
    note: "의령군 정곡면공설운동장 내 무료 테니스장입니다. 공유누리에서 신청한 뒤 관리자 승인을 받는 방식이며 공개자료에는 정기 오픈 날짜·시각과 상세 운영시간이 게시되어 있지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("DJ20K4406829"), booking_round_label: "공유누리 수시 신청 후 관리자 승인", usage_period_label: "이용 가능 일정 예약 화면 확인", fee: freeFee }],
  },
  {
    id: "8a8fff09-29fb-46ee-9e32-8392a5e868ee",
    name: "한국남동발전(주) 본사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화·메일·공문으로 이용신청 후 승인 · 문의 070-8898-1942",
      booking_site_link: "https://www.alioplus.go.kr/facilities/facltDetail.do?facltSeq=6848",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "ALIO Plus 공식 안내 기준 평일 09:00~18:00만 개방하고 토·일·공휴일은 미개방합니다. 전화·메일·공문 신청 후 승인을 받아야 합니다. 1회 이용당 경남사회복지공동모금회 5,000원 기부 후 영수증을 제출하며, 이는 시간당 요금이 아닙니다. 코트 2면, 8인 내외입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "070-8898-1942", booking_round_label: "전화·메일·공문 신청 후 승인", usage_period_label: "평일 09:00~18:00", fee: paidFee(1, { outdoor_weekday_price: 5000 }) }],
  },
  {
    id: "f914bbe7-2610-49ac-92a9-fbbb8e41ad0d",
    name: "한국도로공사 부산경남본부 진주지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 협의 후 이용 · 문의 055-711-6511",
      booking_site_link: eshare("GG29P4554522"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 2,
    },
    note: "한국도로공사 진주지사 개방시설로 평일은 미개방, 토요일·공휴일 09:00~18:00 운영합니다. 실외 인조잔디 2면, 무료이며 사전 전화 협의가 필요합니다. 정기 접수 오픈일은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-711-6511", booking_round_label: "사전 전화 협의 후 이용", usage_period_label: "토요일·공휴일 09:00~18:00", fee: freeFee }],
  },
  {
    id: "f0655193-9679-4254-aa8f-fc0b9f54f48e",
    name: "창녕공설테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 또는 현장 신청 · 전용 사용은 이용일 7일 전까지 신청 · 문의 055-532-9537",
      booking_site_link: eshare("CJ03G5810072"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 6,
      court_count_clay_indoor: 6,
    },
    note: "총 12면으로 케미컬 6면·클레이 6면이며 시설 안내의 실내·실외 요금 구분에 맞춰 클레이 6면을 실내로 구조화했습니다. 월~토 09:00~22:00, 일요일 09:00~18:00입니다. 전화 또는 현장 신청 방식이고 전용 사용은 이용일 7일 전까지 신청합니다. 개인연습 2시간 기준 실외 10,000원·실내 20,000원, 토·공휴일은 50% 가산됩니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-532-9537", booking_round_label: "전화 또는 현장 신청", usage_period_label: "전용 사용은 이용일 7일 전까지 신청", fee: paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 15000, indoor_weekday_price: 20000, indoor_weekend_price: 30000 }) }],
  },
  {
    id: "296851ac-2d0c-4721-a2cc-a77341da75e5",
    name: "창녕지사 테니스장",
    values: { booking_rule_type: "irregular", booking_reception_time: "공유누리 수시 신청 후 관리자 승인", booking_site_link: eshare("GI23P0624685"), booking_online_reserve_possible: true },
    note: "한국도로공사 창녕지사 개방시설입니다. 무료이며 공유누리에서 이용 가능일을 선택해 신청한 뒤 관리자 승인을 받습니다. 예약 달력에서 개방일을 제공하지만 정기 오픈 날짜·시각은 공식적으로 공개하지 않아 수시 신청으로 저장했습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("GI23P0624685"), booking_round_label: "공유누리 수시 신청 후 관리자 승인", usage_period_label: "예약 달력의 개방일 확인", fee: freeFee }],
  },
  {
    id: "e3af4a03-4ab9-470a-91bb-fe733dac6bbe",
    name: "3·15 해양누리공원 테니스장코트",
    values: {
      booking_rule_type: "rolling",
      booking_reception_time: "이용일 14일 전부터 온라인 자동승인 예약 · 방문·전화 예약 불가",
      booking_site_link: changwon315Booking,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "21:00:00",
      ...zeroCounts,
      court_count_hard_outdoor: 2,
    },
    note: "창원시 통합예약 공식 안내 기준 실외 코트 2면, 무료, 2시간 단위입니다. 이용일 14일 전부터 온라인으로 신청하며 자동승인됩니다. 방문·유선 예약은 불가하고 팀당 1일 1회·주 2회 이하로 제한됩니다. 예약 시간표 기준 대표 운영시간 09:00~21:00을 저장했습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "rolling", open_offset: "14", reservation_url: changwon315Booking, booking_round_label: "이용일 14일 전부터 온라인 자동승인", usage_period_label: "2시간 단위 · 1일 1회·주 2회 이하", fee: freeFee }],
  },
  {
    id: "699ecd81-18e2-4b35-99d7-33d3cb729d1c",
    name: "경남본부 테니스장",
    values: { booking_rule_type: "irregular", booking_reception_time: "공유누리 수시 신청 · 즉시 예약 방식", booking_site_link: eshare("GG11K812764"), booking_online_reserve_possible: true },
    note: "한국전력공사 경남본부 개방시설입니다. 무료이며 공유누리에서 별도 관리자 심사 없이 신청하는 방식입니다. 평일 12:00~13:00은 이용할 수 없고 야간 조명 사용이 제한됩니다. 정기 접수 오픈일과 전체 운영시간은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "irregular", reservation_url: eshare("GG11K812764"), booking_round_label: "공유누리 수시 신청", usage_period_label: "평일 12:00~13:00 이용 불가 · 야간 조명 제한", fee: freeFee }],
  },
  {
    id: "4098b228-99db-4d66-8022-178d0692686e",
    name: "덴소문화공원 테니스장",
    values: { booking_rule_type: "rolling", booking_reception_time: "이용일 14일 전부터 1일 전까지 공유누리 신청 후 관리자 승인", booking_site_link: eshare("CE28J0254860"), booking_online_reserve_possible: true, ...zeroCounts, court_count_hard_outdoor: 2 },
    note: "실외 코트 2면이며 무료입니다. 이용일 14일 전부터 1일 전까지 공유누리에서 신청하고 관리자 승인을 받습니다. 2시간 단위, 1일 1회·주 2회까지 이용할 수 있으며 조명은 21:00에 소등됩니다. 코트 표면은 공개자료에 명시되지 않아 하드 분류는 현장 이미지 기준입니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "rolling", open_offset: "14", reservation_url: eshare("CE28J0254860"), booking_round_label: "이용일 14일 전부터 신청", usage_period_label: "이용일 1일 전까지 · 2시간 단위", fee: freeFee }],
  },
  {
    id: "7a42f201-d0b1-4d58-89b3-f30129432d28",
    name: "한국도로공사 창원지사 테니스장",
    values: { booking_rule_type: "phone", booking_reception_time: "주말·공휴일 이용 전 전화 협의 · 문의 055-711-6411", booking_site_link: eshare("GJ20N3052786"), booking_online_reserve_possible: false },
    note: "한국도로공사 창원지사 개방시설로 실외 코트 3면, 무료입니다. 주말·공휴일에 개방하며 이용 전 담당자와 전화 협의해야 합니다. 조명은 없고 정기 접수 오픈일과 정확한 개방시간은 공개하지 않습니다.",
    rules: [{ label: "전체", eligibility: "normal", rule_type: "phone", reservation_url: "055-711-6411", booking_round_label: "주말·공휴일 이용 전 전화 협의", usage_period_label: "주말·공휴일 개방", fee: freeFee }],
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

const ids = courts.map(({ id }) => id);
const { data: existingCourts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,etc_desc,booking_site_link")
  .in("id", ids);
if (courtReadError) throw courtReadError;
if (existingCourts.length !== courts.length) throw new Error(`대상 시설 수 불일치: ${existingCourts.length}/${courts.length}`);

const { data: existingRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,reservation_url,sort_order,is_active")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;

const rulesByCourt = new Map();
for (const rule of existingRules) {
  const current = rulesByCourt.get(rule.court_id) ?? [];
  current.push(rule);
  rulesByCourt.set(rule.court_id, current);
}

console.log(`대상 ${courts.length}개 · 예약규칙 ${courts.reduce((sum, court) => sum + court.rules.length, 0)}개 · 적용 모드: ${shouldApply ? "YES" : "NO (dry-run)"}`);
if (!shouldApply) {
  console.table(courts.map(({ name, values, rules }) => ({
    name,
    rule: rules.map(({ rule_type }) => rule_type).join(","),
    reception: values.booking_reception_time,
    fee: rules.every(({ fee }) => fee.is_free) ? "무료" : "유료 포함",
  })));
  process.exit(0);
}

const upsertFee = async (ruleId, fee, courtName) => {
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
  if (error) throw new Error(`${courtName} 요금 갱신 실패: ${error.message}`);
};

for (const config of courts) {
  const existing = existingCourts.find(({ id }) => id === config.id);
  const currentRules = rulesByCourt.get(config.id) ?? [];
  if (!currentRules.length) throw new Error(`${config.name}의 활성 예약 규칙이 없습니다.`);

  const { error: courtUpdateError } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...config.values,
      etc_desc: appendNote(existing.etc_desc, config.note),
      updated_at: now,
    })
    .eq("id", config.id);
  if (courtUpdateError) throw new Error(`${config.name} 시설 갱신 실패: ${courtUpdateError.message}`);

  for (let index = 0; index < config.rules.length; index += 1) {
    const desired = config.rules[index];
    const { fee, ...ruleValues } = desired;
    const existingRule = currentRules[index];
    const payload = {
      ...resetRuleFields,
      label: "전체",
      eligibility: "normal",
      reservation_url: config.values.booking_site_link ?? existing.booking_site_link,
      booking_round_label: null,
      usage_period_label: null,
      is_active: true,
      sort_order: (index + 1) * 10,
      ...ruleValues,
      updated_at: now,
    };

    let ruleId;
    if (existingRule) {
      const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existingRule.id);
      if (error) throw new Error(`${config.name} 예약 규칙 갱신 실패: ${error.message}`);
      ruleId = existingRule.id;
    } else {
      const { data, error } = await supabase
        .from("court_booking_rules")
        .insert({ court_id: config.id, ...payload, created_at: now })
        .select("id")
        .single();
      if (error) throw new Error(`${config.name} 예약 규칙 추가 실패: ${error.message}`);
      ruleId = data.id;
    }
    await upsertFee(ruleId, fee, config.name);
  }

  const obsoleteRules = currentRules.slice(config.rules.length);
  if (obsoleteRules.length) {
    const { error } = await supabase
      .from("court_booking_rules")
      .update({ is_active: false, updated_at: now })
      .in("id", obsoleteRules.map(({ id }) => id));
    if (error) throw new Error(`${config.name} 이전 예약 규칙 비활성화 실패: ${error.message}`);
  }

  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,booking_reception_time,etc_desc")
  .in("id", ids)
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,rule_type,open_day_of_month,open_day_of_week,open_ordinal,open_time,open_offset,is_active")
  .in("court_id", ids)
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const expectedRuleCount = courts.reduce((sum, court) => sum + court.rules.length, 0);
const invalidNotes = verifiedCourts.filter(({ etc_desc }) => !etc_desc?.includes(marker));
const renamedCourt = verifiedCourts.find(({ id }) => id === "f8cc7c1d-22fc-42a1-a899-ec428765e7d5");
if (
  verifiedCourts.length !== courts.length ||
  verifiedRules.length !== expectedRuleCount ||
  verifiedFees.length !== expectedRuleCount ||
  invalidNotes.length ||
  renamedCourt?.basic_court_name !== "한국도로공사 양산지사 테니스장"
) {
  throw new Error(`검증 실패: courts=${verifiedCourts.length}, rules=${verifiedRules.length}/${expectedRuleCount}, fees=${verifiedFees.length}/${expectedRuleCount}, notes=${invalidNotes.length}, renamed=${renamedCourt?.basic_court_name}`);
}

console.log(JSON.stringify({
  verifiedCourts: verifiedCourts.length,
  verifiedRules: verifiedRules.length,
  verifiedFees: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({ ...acc, [rule_type]: (acc[rule_type] ?? 0) + 1 }), {}),
}, null, 2));
