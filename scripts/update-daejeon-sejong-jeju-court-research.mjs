import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase 환경 변수가 필요합니다.");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const now = new Date().toISOString();
const marker = "[2026-09 대전·세종·제주 시설·예약·요금정보 공식자료 재검증]";
const eshare = (id) => `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${id}`;
const sejongBooking = "https://onestop.sejong.go.kr/Usr/resve/instList.do?fcltClCode=FC_TENNIS";
const daejeonSeoBooking = "https://www.seogu.go.kr/gym/www/228";

const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const paid = (hours, prices) => ({
  is_free: false,
  price_basis_hours: hours,
  lighting_fee_separate: false,
  ...prices,
});
const free = { is_free: true, price_basis_hours: 1, lighting_fee_separate: false };
const sejongFee = paid(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 10000 });

const fixedDay = (day, time, url, label, usage = "다음 달 이용분") => ({
  rule_type: "fixed_schedule",
  open_type: "day",
  open_day_of_month: day,
  open_time: time,
  open_offset: "다음달",
  booking_round_label: label,
  usage_period_label: usage,
  reservation_url: url,
});
const ordinal = (weekday, order, time, url, label) => ({
  rule_type: "ordinal",
  open_type: "week",
  open_day_of_week: weekday,
  open_ordinal: order,
  open_time: time,
  open_offset: "다음달",
  booking_round_label: label,
  usage_period_label: "다음 달 이용분",
  reservation_url: url,
});
const rolling = (days, time, url, label, usage) => ({
  rule_type: "rolling",
  open_offset: String(days),
  open_time: time,
  booking_round_label: label,
  usage_period_label: usage,
  reservation_url: url,
});
const irregular = (url, label, usage) => ({
  rule_type: "irregular",
  booking_round_label: label,
  usage_period_label: usage,
  reservation_url: url,
});

const courts = [
  {
    id: "17b37fe4-facf-45a4-8e69-2f25d3ce8237",
    name: "을미기체육공원 테니스장",
    values: {
      booking_reception_time: "매월 25일 10:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: "https://scdaedeok.or.kr/",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 4,
    },
    note: "실외 인조잔디 4면, 운영시간 06:00~22:00입니다. 매월 25일 10:00에 다음 달 이용분을 온라인 선착순으로 접수합니다. 공개된 2,000원 요금은 부과 기준 시간이 확인되지 않아 구조화 요금에는 반영하지 않았습니다.",
    rule: fixedDay(25, "10:00:00", "https://scdaedeok.or.kr/", "매월 25일 10:00 온라인 선착순 오픈"),
  },
  {
    id: "0e1f08c6-e958-4d6c-9fe3-5fb05c00499d",
    name: "신탄진정수사업소 테니스장",
    values: {
      booking_reception_time: "다음 달 이용분 전월 1~26일 공유누리 신청 후 관리자 승인",
      booking_site_link: eshare("CJ08M4400778"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
    },
    note: "토·일 09:00~18:00 운영하며 12~2월에는 이용할 수 없습니다. 다음 달 이용분을 전월 1~26일 공유누리에서 신청하고 관리자 승인을 받습니다. 1회 최대 4시간이며 무료입니다. 주소와 담당 전화는 공식 자료끼리 차이가 있어 기존 값을 유지했습니다.",
    rule: irregular(eshare("CJ08M4400778"), "전월 1~26일 공유누리 신청 후 관리자 승인", "토·일 09:00~18:00 · 12~2월 이용 불가"),
    fee: free,
  },
  {
    id: "56a2db61-57e7-49ba-83e8-2be103c7bf60",
    name: "한국도로공사 대전지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 대전지사 테니스장",
      booking_reception_time: "주말 주간 이용 · 사전 협의 후 공유누리 신청 및 관리자 승인",
      booking_site_link: eshare("GJ28Q1047412"),
      booking_online_reserve_possible: true,
    },
    note: "실외 3면이며 주말 주간에 개방합니다. 이용 전 담당자와 협의한 뒤 공유누리에서 신청하고 관리자 승인을 받아야 합니다. 정확한 운영 시작시각과 코트 표면은 공개되지 않았으며 이용료는 무료입니다.",
    rule: irregular(eshare("GJ28Q1047412"), "사전 협의 후 공유누리 신청 및 관리자 승인", "주말 주간 · 18:00 이전"),
    fee: free,
  },
  {
    id: "3d77886d-23eb-4530-883a-233f3d360120",
    name: "오량실내테니스장",
    values: {
      booking_reception_time: "매월 네 번째 토요일 11:00 다음 달 이용분 온라인 선착순 오픈 · 60분 내 결제",
      booking_site_link: daejeonSeoBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_hard_indoor: 3,
    },
    note: "실내 하드코트 3면입니다. 평일 06:00~22:00, 주말·공휴일 07:00~22:00 운영합니다. 매월 네 번째 토요일 11:00에 다음 달 이용분이 열리며 예약 후 60분 내 결제해야 합니다.",
    rule: ordinal(6, 4, "11:00:00", daejeonSeoBooking, "매월 네 번째 토요일 11:00 온라인 선착순 오픈"),
    fee: paid(1, { indoor_weekday_price: 20000, indoor_weekend_price: 20000 }),
  },
  {
    id: "6b146644-da3f-4590-af2a-46612fe61cca",
    name: "관저테니스장",
    values: {
      booking_reception_time: "매월 네 번째 토요일 11:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: daejeonSeoBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
    },
    note: "실외 9면, 운영시간 06:00~22:00입니다. 코트 표면은 공식 공개자료에 명시되지 않아 유형별 면수에는 반영하지 않았습니다. 매월 네 번째 토요일 11:00에 다음 달 이용분이 열립니다.",
    rule: ordinal(6, 4, "11:00:00", daejeonSeoBooking, "매월 네 번째 토요일 11:00 온라인 선착순 오픈"),
    fee: paid(1, { outdoor_weekday_price: 4000, outdoor_weekend_price: 5000, lighting_fee_separate: true, lighting_fee_amount: 5000, lighting_fee_basis_hours: 1 }),
  },
  {
    id: "431c3c12-a140-4156-80d9-9a6dd6a97f9f",
    name: "은평공원테니스장",
    values: {
      basic_address: "대전 서구 월평중로 55",
      booking_reception_time: "매월 네 번째 토요일 11:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: daejeonSeoBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "19:00:00",
    },
    note: "실외 4면입니다. 코트 표면은 공식 공개자료에 명시되지 않아 유형별 면수에는 반영하지 않았습니다. 평일 06:00~21:00, 주말·공휴일 06:00~19:00 운영하며 매월 네 번째 토요일 11:00에 다음 달 이용분이 열립니다.",
    rule: ordinal(6, 4, "11:00:00", daejeonSeoBooking, "매월 네 번째 토요일 11:00 온라인 선착순 오픈"),
    fee: paid(1, { outdoor_weekday_price: 4000, outdoor_weekend_price: 5000, lighting_fee_separate: true, lighting_fee_amount: 3000, lighting_fee_basis_hours: 1 }),
  },
  {
    id: "a9f84303-50b1-488a-ad8d-af389fbf9730",
    name: "정림테니스장",
    values: {
      booking_reception_time: "매월 네 번째 토요일 11:00 다음 달 이용분 온라인 선착순 오픈",
      booking_site_link: daejeonSeoBooking,
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 4,
    },
    note: "실외 인조잔디 4면, 운영시간 06:00~22:00입니다. 매월 네 번째 토요일 11:00에 다음 달 이용분이 열립니다.",
    rule: ordinal(6, 4, "11:00:00", daejeonSeoBooking, "매월 네 번째 토요일 11:00 온라인 선착순 오픈"),
    fee: paid(1, { outdoor_weekday_price: 4000, outdoor_weekend_price: 5000, lighting_fee_separate: true, lighting_fee_amount: 3000, lighting_fee_basis_hours: 1 }),
  },
  {
    id: "de1bdf74-8fd1-4a57-b6fb-921b276f5f16",
    name: "송강실내테니스장",
    values: {
      booking_reception_time: "매월 25일 09:00 다음 달 이용분 온라인 선착순 오픈 · 30분 내 결제",
      booking_site_link: "https://www.djsiseol.or.kr/reserve/sub0203.asp",
      booking_online_reserve_possible: true,
    },
    note: "실내 4면(테니스 전용 3면, 겸용 1면)입니다. 4~9월 06:00~22:00, 10~3월 07:00~22:00로 운영시간이 달라 단일 운영시간 필드에는 넣지 않았습니다. 주간 10,000원·야간 12,500원(1시간)은 실내 주·야간 분리 컬럼이 없어 구조화 요금에 반영하지 않았습니다.",
    rule: fixedDay(25, "09:00:00", "https://www.djsiseol.or.kr/reserve/sub0203.asp", "매월 25일 09:00 온라인 선착순 오픈"),
  },
  {
    id: "d529c26e-3fd8-427b-afbb-32249298a57f",
    name: "한국가스기술공사 본사 테니스장",
    values: {
      booking_reception_time: "주말 이용 · 공유누리 신청 후 관리자 승인 및 보안서류 제출",
      booking_site_link: "https://www.alioplus.go.kr/facilities/facltDetail.do?facltSeq=7314",
      booking_online_reserve_possible: true,
    },
    note: "평일과 공휴일은 개방하지 않으며 주말에만 운영합니다. 하절기 09:00~18:00, 동절기 09:00~17:00로 달라 단일 운영시간 필드에는 넣지 않았습니다. 유료 시설이지만 금액이 공개되지 않아 구조화 요금에는 반영하지 않았습니다.",
    rule: irregular("https://www.alioplus.go.kr/facilities/facltDetail.do?facltSeq=7314", "공유누리 신청 후 관리자 승인 및 보안서류 제출", "주말 · 하절기 09:00~18:00 · 동절기 09:00~17:00"),
  },
  {
    id: "abd0aaac-ccd4-48cc-9554-1ecb333b81d8",
    name: "금남 생활체육공원 테니스장",
    values: { basic_address: "세종특별자치시 금남면 용포리 28", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00" },
    note: "실외 3면, 운영시간 06:00~22:00입니다. 현재 온라인 예약은 2·3번 코트를 대상으로 하며 매일 09:00에 이용일 7일 전 일정이 열립니다.",
    rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"),
    fee: sejongFee,
  },
  {
    id: "e5e75e97-4cf0-4f9b-a274-5ec01005b283",
    name: "고려대학교 세종캠퍼스테니스장",
    values: { booking_reception_time: "매주 목요일 16:00 해당 주 시민 이용분 접수 마감·승인", booking_site_link: eshare("FC10K4250115"), booking_online_reserve_possible: true },
    note: "실외 4면입니다. 시민 이용시간은 금요일 06:00~09:00·18:00~22:00, 주말·공휴일 07:00~20:00이며 매주 목요일 16:00에 해당 주 접수를 마감·승인합니다. 기본 이용료는 무료이고 조명료는 시간당 5,000원이지만 현재 요금 제약상 무료+별도 조명료를 함께 저장할 수 없어 구조화 요금에는 반영하지 않았습니다.",
    rule: irregular(eshare("FC10K4250115"), "매주 목요일 16:00 해당 주 접수 마감·승인", "금 06:00~09:00·18:00~22:00 · 주말·공휴일 07:00~20:00"),
  },
  {
    id: "b4e44fba-5ebc-4a5b-820f-7528fa5f812e",
    name: "다정동 저류지 체육시설 테니스장",
    values: { basic_address: "세종특별자치시 다정동 640", time_of_use_same: true, basic_time_of_use_weekday_from: "09:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "22:00:00", ...zeroCounts, court_count_hard_outdoor: 3 },
    note: "실외 하드코트 3면, 운영시간 09:00~22:00입니다. 매일 09:00에 이용일 7일 전 일정이 열립니다. 기본 2시간 요금은 10,000원이며 09:00~10:00 1시간 슬롯 5,000원은 현 구조에서 함께 표현할 수 없어 비고에만 남겼습니다.",
    rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "f8e88e7b-cb39-4ea2-b440-f6c145d65a4c",
    name: "소정 테니스장",
    values: { basic_address: "세종특별자치시 소정면 소정리 476-4", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00" },
    note: "실외 3면, 운영시간 06:00~22:00입니다. 현재 온라인 예약은 A코트를 대상으로 하며 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "3c32f866-5e16-4462-ba7b-0e3d02c5342d",
    name: "수질복원센터A 테니스장",
    values: { basic_address: "세종특별자치시 금송로 612 (가람동 960)", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00", ...zeroCounts, court_count_grass_outdoor: 9 },
    note: "실외 인조잔디 9면, 운영시간 06:00~22:00입니다. 현재 온라인 예약은 7·8·9번 코트를 대상으로 하며 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "8e0817f0-d2c9-4449-a88a-7f96f363b0c5",
    name: "전의생활체육공원 테니스장",
    values: { basic_address: "세종특별자치시 전의면 읍내황골1길 63", time_of_use_same: false, basic_time_of_use_weekday_from: "09:00:00", basic_time_of_use_weekday_to: "21:00:00", basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "18:00:00", ...zeroCounts, court_count_grass_outdoor: 3 },
    note: "실외 인조잔디 3면입니다. 평일 09:00~21:00, 주말·공휴일 09:00~18:00 운영하며 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "c501c148-052c-4a18-9dc4-c8e0059ada31",
    name: "수질복원센터B 테니스장",
    values: { basic_address: "세종특별자치시 종합운동장4로 11 (대평동 646)", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00", ...zeroCounts, court_count_grass_outdoor: 3 },
    note: "실외 인조잔디 3면, 운영시간 06:00~22:00입니다. 현재 온라인 예약은 3번 코트를 대상으로 하며 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "a309a5b3-6733-40f7-aa19-fbcadc823fff",
    name: "조치원 체육공원 테니스장",
    values: { basic_address: "세종특별자치시 조치원읍 허만석로 98", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00", ...zeroCounts, court_count_hard_outdoor: 5 },
    note: "실외 하드코트 5면, 운영시간 06:00~22:00입니다. 현재 온라인 예약은 4·5번 코트를 대상으로 하며 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "138eb3bd-1c13-4498-a724-33cc3e61793d",
    name: "중앙공원 테니스장",
    values: { basic_address: "세종특별자치시 중앙공원로 60", time_of_use_same: true, basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00", basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00", ...zeroCounts, court_count_grass_outdoor: 10 },
    note: "실외 인조잔디 10면, 운영시간 06:00~22:00입니다. 매일 09:00에 이용일 7일 전 일정이 열립니다.", rule: rolling(7, "09:00:00", sejongBooking, "매일 09:00 온라인 선착순 오픈", "이용일 7일 전"), fee: sejongFee,
  },
  {
    id: "17166cce-5127-4b13-a444-a72457980361",
    name: "남제주빛드림본부 테니스장",
    values: {
      basic_address: "제주특별자치도 서귀포시 안덕면 화순서서로 15 남제주빛드림본부 사택 테니스장",
      booking_reception_time: "현재일부터 약 1개월 이내 공유누리 신청 후 관리자 승인·담당자 연락",
      booking_site_link: eshare("GI11J2555454"),
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "14:00:00",
      basic_time_of_use_weekday_to: "18:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    note: "평일 14:00~18:00 운영하고 주말·공휴일은 휴관합니다. 월요일 16:00~18:00는 수업으로 이용할 수 없습니다. 공개 대상은 실외 B코트 1면이며 표면은 공개되지 않았습니다. 현재일부터 약 1개월 이내 일정을 공유누리에서 신청하고 관리자 승인과 담당자 연락을 거칩니다. 이용료는 무료입니다.",
    rule: rolling(30, null, eshare("GI11J2555454"), "공유누리 신청 후 관리자 승인·담당자 연락", "현재일부터 약 1개월 이내 · 평일 14:00~18:00"),
    fee: free,
  },
];

const skipped = [{ id: "9dbf89cb-2d41-41a8-acb2-f521d203538f", name: "한국가스기술공사 정문 오른편(테니스장)", reason: "동일 주소의 구형·중복 시설 가능성" }];

const resetLegacy = {
  booking_lottery_desc: null, booking_open_type: null, booking_open_day_of_month: null,
  booking_open_day_of_week: null, booking_open_ordinal: null, booking_open_day_owner: null,
  booking_open_time_owner: null, booking_open_day_normal: null, booking_open_time_normal: null,
  booking_normal_iscurrentmonth: null, booking_open_time_local: null, booking_open_offset: null,
};
const resetRule = {
  open_type: null, open_day_of_month: null, open_day_of_week: null, open_ordinal: null,
  open_time: null, open_offset: null, interval_weeks: null, anchor_date: null,
  lottery_desc: null, open_date_adjustment: "none", target_condition: null,
};

const legacyFor = (rule) => {
  const isFixedDay = rule.rule_type === "fixed_schedule" && rule.open_type === "day";
  const isOrdinal = rule.rule_type === "ordinal";
  return {
    booking_rule_type: rule.rule_type,
    booking_open_type: rule.open_type ?? null,
    booking_open_day_normal: isFixedDay ? rule.open_day_of_month : null,
    booking_open_day_of_week: isOrdinal && rule.open_day_of_week != null ? String(rule.open_day_of_week) : null,
    booking_open_ordinal: isOrdinal && rule.open_ordinal != null ? String(rule.open_ordinal) : null,
    booking_open_time_normal: rule.open_time ?? null,
    booking_open_offset: rule.open_offset ?? null,
  };
};

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const ids = courts.map(({ id }) => id);
const { data: currentCourts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_address,etc_desc,booking_rule_type")
  .in("id", ids);
if (courtReadError) throw courtReadError;
if (currentCourts.length !== courts.length) {
  const found = new Set(currentCourts.map(({ id }) => id));
  throw new Error(`대상 시설 누락: ${courts.filter(({ id }) => !found.has(id)).map(({ name }) => name).join(", ")}`);
}

const { data: currentRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,rule_type,sort_order,is_active")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;

const rulesByCourt = new Map();
for (const rule of currentRules) rulesByCourt.set(rule.court_id, [...(rulesByCourt.get(rule.court_id) ?? []), rule]);
const badRuleCounts = courts.filter(({ id }) => (rulesByCourt.get(id) ?? []).length !== 1);
if (badRuleCounts.length) throw new Error(`활성 예약규칙이 1개가 아닌 시설: ${badRuleCounts.map(({ name, id }) => `${name}(${(rulesByCourt.get(id) ?? []).length})`).join(", ")}`);

const ruleIds = currentRules.map(({ id }) => id);
const { data: currentFees, error: feeReadError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", ruleIds);
if (feeReadError) throw feeReadError;
const feeByRule = new Map(currentFees.map((fee) => [fee.booking_rule_id, fee]));

console.log(`대상 ${courts.length}개 · 건드리지 않음 ${skipped.length}개 · 적용 모드 ${shouldApply ? "YES" : "NO (dry-run)"}`);
console.table(courts.map((court) => {
  const current = currentCourts.find(({ id }) => id === court.id);
  const existingRule = rulesByCourt.get(court.id)[0];
  return {
    시설: court.name,
    현재이름: current.basic_court_name,
    규칙: `${existingRule.rule_type} → ${court.rule.rule_type}`,
    요금: court.fee ? (court.fee.is_free ? "무료 확정" : "유료 확정") : feeByRule.has(existingRule.id) ? "기존 유지(보류)" : "미등록(보류)",
  };
}));
console.table(skipped);
if (!shouldApply) process.exit(0);

const upsertFee = async (ruleId, fee, courtName) => {
  const payload = {
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
  const { error } = await supabase.from("court_booking_rule_fees").upsert(payload, { onConflict: "booking_rule_id" });
  if (error) throw new Error(`${courtName} 요금 갱신 실패: ${error.message}`);
};

for (const config of courts) {
  const current = currentCourts.find(({ id }) => id === config.id);
  const existingRule = rulesByCourt.get(config.id)[0];
  const { error: courtError } = await supabase.from("courtinfo").update({
    ...resetLegacy,
    ...legacyFor(config.rule),
    booking_site_link: config.rule.reservation_url,
    booking_reception_time: [config.rule.booking_round_label, config.rule.usage_period_label].filter(Boolean).join(" · "),
    booking_online_reserve_possible: true,
    ...config.values,
    etc_desc: appendNote(current.etc_desc, config.note),
    source_synced_at: now,
    updated_at: now,
  }).eq("id", config.id);
  if (courtError) throw new Error(`${config.name} 시설 갱신 실패: ${courtError.message}`);

  const { error: ruleError } = await supabase.from("court_booking_rules").update({
    ...resetRule,
    label: "전체",
    eligibility: "normal",
    ...config.rule,
    is_active: true,
    sort_order: 10,
    updated_at: now,
  }).eq("id", existingRule.id);
  if (ruleError) throw new Error(`${config.name} 예약규칙 갱신 실패: ${ruleError.message}`);
  if (config.fee) await upsertFee(existingRule.id, config.fee, config.name);
  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifiedCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_address,booking_rule_type,etc_desc")
  .in("id", ids);
if (verifiedCourtError) throw verifiedCourtError;
const { data: verifiedRules, error: verifiedRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,open_type,open_day_of_month,open_day_of_week,open_ordinal,open_time,open_offset,is_active")
  .in("court_id", ids)
  .eq("is_active", true);
if (verifiedRuleError) throw verifiedRuleError;
const confirmedFeeConfigs = courts.filter(({ fee }) => fee);
const confirmedFeeRuleIds = confirmedFeeConfigs.map(({ id }) => verifiedRules.find(({ court_id }) => court_id === id)?.id).filter(Boolean);
const { data: verifiedFees, error: verifiedFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", confirmedFeeRuleIds);
if (verifiedFeeError) throw verifiedFeeError;

const badNotes = verifiedCourts.filter(({ etc_desc }) => !etc_desc?.includes(marker));
const wrongRules = courts.filter((court) => verifiedRules.find(({ court_id }) => court_id === court.id)?.rule_type !== court.rule.rule_type);
if (verifiedCourts.length !== courts.length || verifiedRules.length !== courts.length || verifiedFees.length !== confirmedFeeConfigs.length || badNotes.length || wrongRules.length) {
  throw new Error(`검증 실패 courts=${verifiedCourts.length}/${courts.length}, rules=${verifiedRules.length}/${courts.length}, fees=${verifiedFees.length}/${confirmedFeeConfigs.length}, notes=${badNotes.length}, wrongRules=${wrongRules.length}`);
}

console.log(JSON.stringify({
  updatedCourts: verifiedCourts.length,
  updatedRules: verifiedRules.length,
  confirmedFeesUpserted: verifiedFees.length,
  preservedOrDeferredFees: courts.length - confirmedFeeConfigs.length,
  skippedCourts: skipped.length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({ ...acc, [rule_type]: (acc[rule_type] ?? 0) + 1 }), {}),
}, null, 2));
