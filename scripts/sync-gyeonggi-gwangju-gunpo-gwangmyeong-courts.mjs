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
const cityBookingUrl = "https://www.gjcity.go.kr/portal/sports/facility/list.do?mId=0408010100";
const yangbeolBookingUrl = "https://gjcenter.gjcs.or.kr/fmcs/3";
const gunpoBookingUrl = "https://www.gunpouc.or.kr/fmcs/157";
const gunpoSmallFacilitiesUrl = "https://gunpouc.or.kr/fmcs/21";
const gureumsanBookingUrl =
  "https://www.gmsportscouncil.kr/reservation/reservation.php?facility=tennis-1";
const gwangmyeongBookingUrl =
  "https://reserve.gmuc.co.kr/user/tennis/tennisMain.do?menuFlag=T";

const zeroCourtCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const newCourts = [
  {
    key: "manseon",
    city: "광주시",
    name: "만선생활체육시설 테니스장",
    slug: "manseon-sports-facility-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 광주시 곤지암읍 만선로 12-17",
      basic_map_link: "https://map.naver.com/p/entry/place/1817020581",
      basic_latitude: 37.3658054683798,
      basic_longitude: 127.402587768227,
      basic_region: "경기",
      basic_city: "광주시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "08:00:00",
      basic_time_of_use_weekday_to: "21:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "21:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: cityBookingUrl,
      booking_reception_time: "신청일 기준 30일 뒤까지 접수, 이용일 4일 전 마감 (월 최대 2일)",
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_eligibility_first: null,
      booking_eligibility_second: "normal",
      booking_open_time_normal: null,
      booking_open_offset: "30",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매주 월요일",
      etc_desc: [
        "광주시 통합예약에서 대기 신청 후 관리자 승인을 받는 공공 테니스장입니다.",
        "1회 2시간, 월 최대 2일 이용할 수 있으며 취소한 예약도 월 횟수에 포함됩니다.",
        "하절기(3~10월) 08:00~21:00, 동절기(11~2월) 09:00~21:00 운영합니다.",
        "평일 2시간 주간 16,000원·야간 24,000원, 주말/공휴일 주간 24,000원·야간 32,000원입니다.",
        "공식 예약 상세에 총 코트 면수와 재질이 명시되지 않아 코트 수는 미확인으로 저장했습니다.",
      ].join("\n"),
      source_provider: "gwangju_city_sports_reservation",
      source_service_id: "174",
      source_service_name: "만선생활체육시설 테니스",
      source_place_name: "만선생활체육시설",
      source_area_name: "경기 광주시 곤지암읍",
      source_match_key: "gjcity-sports:174",
      source_synced_at: now,
    },
  },
  {
    key: "docheok_b",
    city: "광주시",
    name: "도척스포츠타운 테니스장(B)",
    slug: "docheok-sports-town-tennis-court-b",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 광주시 도척면 도척로 676",
      basic_map_link: "https://map.naver.com/p/entry/place/1912446942",
      basic_latitude: 37.2946090698242,
      basic_longitude: 127.327201843262,
      basic_region: "경기",
      basic_city: "광주시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "08:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: cityBookingUrl,
      booking_reception_time: "신청일 기준 30일 뒤까지 접수, 이용일 4일 전 마감 (월 최대 2일)",
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_eligibility_first: null,
      booking_eligibility_second: "normal",
      booking_open_time_normal: null,
      booking_open_offset: "30",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매주 일·월요일",
      etc_desc: [
        "광주시 통합예약의 도척 스포츠타운 테니스B 예약 항목입니다.",
        "A와 B가 별도 예약 항목이므로 1면 예약 단위로 판단했으나 재질은 공식 자료에 없어 미확인으로 저장했습니다.",
        "1회 2시간, 월 최대 2일 이용하며 대기 신청 후 관리자 승인을 받습니다.",
        "하절기(3~10월) 08:00~22:00, 동절기(11~2월) 09:00~21:00 운영합니다.",
        "평일 2시간 주간 16,000원·야간 24,000원, 주말/공휴일 주간 24,000원·야간 32,000원입니다.",
      ].join("\n"),
      source_provider: "gwangju_city_sports_reservation",
      source_service_id: "98",
      source_service_name: "도척 스포츠타운 테니스B",
      source_place_name: "도척스포츠타운",
      source_area_name: "경기 광주시 도척면",
      source_match_key: "gjcity-sports:98",
      source_synced_at: now,
    },
  },
  {
    key: "gunpo_citizen",
    city: "군포시",
    name: "시민체육광장 테니스장",
    slug: "gunpo-citizen-sports-plaza-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 군포시 산본로 267",
      basic_map_link: "https://map.naver.com/p/entry/place/20349745",
      basic_latitude: 37.3540356844596,
      basic_longitude: 126.936815220052,
      basic_region: "경기",
      basic_city: "군포시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      court_count_hard_outdoor: 9,
      booking_site_link: gunpoBookingUrl,
      booking_reception_time:
        "관내 추첨 전월 1일 10:00~3일 23:59, 추첨 4일 09:00; 잔여분 이용 14일 전 10:00~전일 23:59",
      booking_rule_type: "lottery",
      booking_lottery_desc:
        "관내 추첨 접수 후 매월 4일 09:00 추첨, 당첨 후 24시간 내 결제. 잔여분은 14일 전부터 실시간 예약",
      booking_open_type: null,
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: 1,
      booking_open_time_owner: "10:00:00",
      booking_open_offset: "다음달",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: "설·추석 당일",
      etc_desc: [
        "실외 하드코트 9면, 매일 06:00~22:00 운영합니다.",
        "관내 추첨은 사용 전월 1일 10:00부터 3일 23:59까지이며 4일 09:00에 추첨합니다.",
        "잔여분은 사용 14일 전 10:00부터 전일 23:59까지 실시간 예약하며 당일은 이용 2시간 전부터 현장 선착순입니다.",
        "코트당 1시간 평일 3,000원·토/휴일 5,000원, 조명은 각각 2,000원·3,000원입니다.",
      ].join("\n"),
      source_provider: "gunpo_urban_corporation",
      source_service_id: "citizen-sports-plaza-tennis",
      source_service_name: "시민체육광장 테니스장",
      source_place_name: "시민체육광장",
      source_area_name: "경기 군포시",
      source_match_key: "gunpouc:citizen-sports-plaza-tennis",
      source_synced_at: now,
    },
  },
  {
    key: "sanbon_ic",
    city: "군포시",
    name: "산본IC체육공원 테니스장",
    slug: "sanbon-ic-sports-park-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 군포시 산본로 486",
      basic_map_link: "https://map.naver.com/p/entry/place/38173138",
      basic_latitude: 37.375613,
      basic_longitude: 126.928928,
      basic_region: "경기",
      basic_city: "군포시",
      use_or_not: true,
      ...zeroCourtCounts,
      court_count_grass_outdoor: 2,
      booking_site_link: gunpoSmallFacilitiesUrl,
      booking_reception_time: "평일·토요일·공휴일 무료개방",
      booking_rule_type: "on_site",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: "인조잔디 실외 2면과 LED 서치라이트 2기를 갖춘 무료개방 시설입니다. 공식 페이지에 별도 온라인 예약 일정은 없습니다.",
      source_provider: "gunpo_urban_corporation",
      source_service_id: "sanbon-ic-tennis",
      source_service_name: "산본IC체육공원 테니스장",
      source_place_name: "산본IC체육공원",
      source_area_name: "경기 군포시",
      source_match_key: "gunpouc:sanbon-ic-tennis",
      source_synced_at: now,
    },
  },
  {
    key: "haneol",
    city: "군포시",
    name: "한얼근린공원 하부 테니스장",
    slug: "haneol-neighborhood-park-lower-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 군포시 번영로561번길 70",
      basic_map_link: "https://map.naver.com/p/entry/place/19271878",
      basic_latitude: 37.363894,
      basic_longitude: 126.938318,
      basic_region: "경기",
      basic_city: "군포시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: gunpoSmallFacilitiesUrl,
      booking_reception_time: "평일·토요일·공휴일 무료개방",
      booking_rule_type: "on_site",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: "실외 2면과 락커룸·전기·수도를 갖춘 무료개방 시설입니다. 표면 재질과 별도 온라인 예약 일정은 공식 자료에서 확인되지 않았습니다.",
      source_provider: "gunpo_urban_corporation",
      source_service_id: "haneol-lower-tennis",
      source_service_name: "한얼근린공원 하부 테니스장",
      source_place_name: "한얼근린공원",
      source_area_name: "경기 군포시",
      source_match_key: "gunpouc:haneol-lower-tennis",
      source_synced_at: now,
    },
  },
  {
    key: "songjeong",
    city: "군포시",
    name: "송정체육공원 테니스장",
    slug: "songjeong-sports-park-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 군포시 도마교동 322",
      basic_map_link: "https://map.naver.com/p/entry/place/1436555330",
      basic_latitude: 37.3119341,
      basic_longitude: 126.9256727,
      basic_region: "경기",
      basic_city: "군포시",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: gunpoSmallFacilitiesUrl,
      booking_reception_time: "평일·토요일·공휴일 무료개방",
      booking_rule_type: "on_site",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: "실외 1면과 화장실·관리동·음수대·파고라를 갖춘 무료개방 시설입니다. 표면 재질과 별도 온라인 예약 일정은 공식 자료에서 확인되지 않았습니다.",
      source_provider: "gunpo_urban_corporation",
      source_service_id: "songjeong-tennis",
      source_service_name: "송정체육공원 테니스장",
      source_place_name: "송정체육공원",
      source_area_name: "경기 군포시",
      source_match_key: "gunpouc:songjeong-tennis",
      source_synced_at: now,
    },
  },
  {
    key: "gureumsan",
    city: "광명시",
    name: "구름산 시립테니스장",
    slug: "gureumsan-municipal-tennis-court",
    values: {
      basic_owner_type: "시립",
      basic_address: "경기 광명시 오리로 493-7",
      basic_map_link: "https://map.naver.com/p/entry/place/1099173511",
      basic_latitude: 37.4460961,
      basic_longitude: 126.879649,
      basic_region: "경기",
      basic_city: "광명시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      court_count_grass_outdoor: 3,
      booking_site_link: gureumsanBookingUrl,
      booking_reception_time: "관내 매월 21일 09:00, 관외 매월 26일부터 다음 달 예약",
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: 21,
      booking_open_time_owner: "09:00:00",
      booking_open_day_normal: 26,
      booking_open_time_normal: null,
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: null,
      etc_desc: [
        "광명시체육회가 운영하는 인조잔디 실외 3면입니다.",
        "1일 같은 종목 1타임(2시간)만 예약하며 예약 후 30분 내 결제해야 합니다.",
        "하절기(3~10월) 06:00~22:00, 동절기(11~2월) 07:00~21:00 운영합니다.",
        "2시간 기준 평일 주간 10,000원·야간 26,000원, 주말/공휴일 주간 20,000원·야간 39,000원입니다.",
        "관외 예약은 매월 26일부터 가능하나 공식 안내에 시각이 명시되지 않아 오픈 시간은 비워 두었습니다.",
      ].join("\n"),
      source_provider: "gwangmyeong_sports_council",
      source_service_id: "tennis-1",
      source_service_name: "구름산 시립테니스장 1면",
      source_place_name: "구름산 시립테니스장",
      source_area_name: "경기 광명시",
      source_match_key: "gmsc:tennis",
      source_synced_at: now,
    },
  },
];

const existingCourtUpdates = [
  {
    key: "yangbeol",
    city: "광주시",
    aliases: ["광주시민체육관 테니스장", "광주시 양벌테니스돔"],
    values: {
      basic_court_name: "광주시 양벌테니스돔",
      slug: "gwangju-yangbeol-tennis-dome",
      basic_owner_type: "시립",
      basic_address: "경기 광주시 청석로 85",
      basic_map_link: "https://map.naver.com/p/entry/place/1287914318",
      basic_latitude: 37.3956909179688,
      basic_longitude: 127.258598327637,
      basic_region: "경기",
      basic_city: "광주시",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "20:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      court_count_hard_indoor: 12,
      booking_site_link: yangbeolBookingUrl,
      booking_reception_time:
        "정규대관 매월 18일 09:00~22일, 승인 23일, 결제 23~24일; 수시대관 온라인 이용 3일 전까지",
      booking_rule_type: "fixed_schedule",
      booking_open_type: "day",
      booking_eligibility_first: "citizen",
      booking_eligibility_second: null,
      booking_open_day_owner: 18,
      booking_open_time_owner: "09:00:00",
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_normal_iscurrentmonth: false,
      booking_open_offset: "다음달",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매주 월요일, 설·추석 연휴",
      etc_desc: [
        "2026년 개장한 양벌테니스돔으로, 기존 광주시민체육관 테니스장 행을 같은 주소 기준으로 갱신했습니다.",
        "실내 하드코트 12면과 야외 2면이며 야외 코트 재질은 공식 자료에 없어 코트 수 필드에는 실내 12면만 분류했습니다.",
        "평일 06:00~22:00, 토 07:00~20:00, 일 07:00~18:00, 공휴일 09:00~18:00 운영합니다.",
        "정규대관은 관내 팀만 가능하며 수시대관은 온라인으로 사용 3일 전까지, 오프라인은 당월 상시 신청 가능합니다.",
        "대관료는 코트당 2시간 기준이며 광주시민은 이용 인원 50% 이상 거주 증빙 시 기준요금의 50%를 감면받습니다.",
      ].join("\n"),
      source_synced_at: now,
    },
  },
  {
    key: "docheok_a",
    city: "광주시",
    aliases: ["도척스포츠타운 테니스장(A)"],
    values: {
      basic_address: "경기 광주시 도척면 도척로 676",
      basic_map_link: "https://map.naver.com/p/entry/place/1912446942",
      basic_latitude: 37.2946090698242,
      basic_longitude: 127.327201843262,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "08:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCourtCounts,
      booking_site_link: cityBookingUrl,
      booking_reception_time: "신청일 기준 30일 뒤까지 접수, 이용일 4일 전 마감 (월 최대 2일)",
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_eligibility_first: null,
      booking_eligibility_second: "normal",
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_open_offset: "30",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매주 일·월요일",
      etc_desc: [
        "광주시 통합예약의 도척 스포츠타운 테니스A 예약 항목입니다.",
        "A와 B가 별도 예약 항목이므로 1면 예약 단위로 판단했으나 재질은 공식 자료에 없어 미확인으로 저장했습니다.",
        "1회 2시간, 월 최대 2일 이용하며 대기 신청 후 관리자 승인을 받습니다.",
        "하절기(3~10월) 08:00~22:00, 동절기(11~2월) 09:00~21:00 운영합니다.",
      ].join("\n"),
      source_provider: "gwangju_city_sports_reservation",
      source_service_id: "97",
      source_service_name: "도척 스포츠타운 테니스A",
      source_place_name: "도척스포츠타운",
      source_area_name: "경기 광주시 도척면",
      source_match_key: "gjcity-sports:97",
      source_synced_at: now,
    },
  },
  {
    key: "gwangju_expressway",
    city: "광주시",
    aliases: ["한국도로공사 경기광주지사 테니스장"],
    values: {
      basic_address: "경기 광주시 곤지암읍 독고개길 15",
      basic_map_link: "https://map.naver.com/p/entry/place/11797195",
      basic_latitude: 37.3580514360783,
      basic_longitude: 127.316984423028,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCourtCounts,
      booking_reception_time: "예약 가능 여부 유선 확인",
      booking_rule_type: "phone",
      booking_open_type: null,
      booking_eligibility_first: null,
      booking_eligibility_second: null,
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_open_offset: null,
      booking_online_reserve_possible: false,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      booking_holiday_week: "평일 미개방, 토·공휴일 09:00~18:00",
      etc_desc: "한국도로공사 경기광주지사의 무료 개방 실외 테니스장 2면입니다. 전국민 이용 가능하며 예약 가능 여부는 담당 부서에 유선으로 확인해야 합니다. 코트 재질은 확인되지 않았습니다.",
      source_synced_at: now,
    },
  },
  {
    key: "gunpo_expressway",
    city: "군포시",
    aliases: ["군포지사 테니스장"],
    values: {
      basic_address: "경기 군포시 군포로 86",
      basic_map_link: "https://map.naver.com/p/entry/place/11797200",
      basic_latitude: 37.3239080249964,
      basic_longitude: 126.918419598795,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "17:00:00",
      ...zeroCourtCounts,
      booking_reception_time: "토요일 09:00~17:00 선착순, 팀당 최대 3시간",
      booking_rule_type: "on_site",
      booking_open_type: null,
      booking_eligibility_first: null,
      booking_eligibility_second: null,
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_open_offset: null,
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: "평일·일요일·공휴일 미개방",
      etc_desc: [
        "일반 시민 대상 토요일 선착순 개방 시설이며 팀당 최대 3시간 이용합니다.",
        "보수 또는 지사 행사 시 이용이 제한될 수 있습니다.",
        "공식 정보는 유료 시설로 분류하지만 금액이 없어 요금은 미확인으로 남겼습니다.",
        "테니스 레슨, 흡연, 음주가무, 음식물 및 취사도구 반입은 금지됩니다.",
      ].join("\n"),
      source_synced_at: now,
    },
  },
  {
    key: "gwangmyeong_municipal",
    city: "광명시",
    aliases: ["시립테니스장", "광명시립테니스장"],
    values: {
      basic_court_name: "광명시립테니스장",
      slug: "gwangmyeong-municipal-tennis-court",
      basic_owner_type: "시립",
      basic_address: "경기 광명시 금하로 201-68",
      basic_map_link: "https://map.naver.com/p/entry/place/1448514139",
      basic_latitude: 37.4574317932129,
      basic_longitude: 126.853797912598,
      basic_region: "경기",
      basic_city: "광명시",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      use_or_not: true,
      ...zeroCourtCounts,
      booking_site_link: gwangmyeongBookingUrl,
      booking_reception_time: "월별 예약 공지 확인 (통상 월 2회 분할 오픈)",
      booking_rule_type: "irregular",
      booking_open_type: null,
      booking_eligibility_first: "citizen",
      booking_eligibility_second: "normal",
      booking_open_day_owner: null,
      booking_open_time_owner: null,
      booking_open_day_normal: null,
      booking_open_time_normal: null,
      booking_open_offset: null,
      booking_online_reserve_possible: true,
      booking_today_booking_possible: true,
      booking_booking_provide: "public_site",
      booking_holiday_week: "매주 월요일, 설·추석 연휴",
      etc_desc: [
        "실외 13면의 광명시립테니스장입니다. 코트 재질은 이번 공식 조사에서 확인되지 않아 재질별 코트 수는 비워 두었습니다.",
        "하절기(3~10월) 06:00~22:00, 동절기(11~2월) 07:00~21:00 운영합니다.",
        "2시간 기준 평일 주간 10,000원·야간 20,000원, 토/공휴일 주간 20,000원·야간 30,000원입니다.",
        "예약 오픈일은 월별 공지로 안내되므로 과거 분할 오픈 패턴을 고정 규칙으로 저장하지 않았습니다.",
        "예약 후 30분 내 결제해야 하며 당일 잔여 코트는 현장 이용이 가능합니다.",
      ].join("\n"),
      source_synced_at: now,
    },
  },
];

const ruleDefinitions = [
  {
    courtKey: "manseon",
    label: "30일 롤링 접수",
    eligibility: "normal",
    rule_type: "rolling",
    open_time: null,
    open_offset: "30",
    reservation_url: cityBookingUrl,
    booking_round_label: "관리자 승인 대기 신청",
    usage_period_label: "신청일 기준 30일 뒤까지, 이용 4일 전 마감",
    sort_order: 10,
  },
  {
    courtKey: "docheok_a",
    label: "30일 롤링 접수",
    eligibility: "normal",
    rule_type: "rolling",
    open_time: null,
    open_offset: "30",
    reservation_url: cityBookingUrl,
    booking_round_label: "관리자 승인 대기 신청",
    usage_period_label: "신청일 기준 30일 뒤까지, 이용 4일 전 마감",
    sort_order: 10,
  },
  {
    courtKey: "docheok_b",
    label: "30일 롤링 접수",
    eligibility: "normal",
    rule_type: "rolling",
    open_time: null,
    open_offset: "30",
    reservation_url: cityBookingUrl,
    booking_round_label: "관리자 승인 대기 신청",
    usage_period_label: "신청일 기준 30일 뒤까지, 이용 4일 전 마감",
    sort_order: 10,
  },
  {
    courtKey: "yangbeol",
    label: "관내 팀 정규대관",
    eligibility: "citizen",
    rule_type: "fixed_schedule",
    open_type: "day",
    open_day_of_month: 18,
    open_time: "09:00:00",
    open_offset: "다음달",
    reservation_url: yangbeolBookingUrl,
    booking_round_label: "정규대관 접수 18일 09:00~22일",
    usage_period_label: "익월 이용분",
    sort_order: 10,
  },
  {
    courtKey: "yangbeol",
    label: "수시대관",
    eligibility: "normal",
    rule_type: "irregular",
    reservation_url: yangbeolBookingUrl,
    booking_round_label: "온라인 수시대관",
    usage_period_label: "사용 3일 전까지; 당월 현장 상시 신청",
    sort_order: 20,
  },
  {
    courtKey: "gunpo_citizen",
    label: "관내 추첨",
    eligibility: "citizen",
    rule_type: "lottery",
    lottery_desc: "사용 전월 1일 10:00~3일 23:59 접수, 4일 09:00 추첨, 당첨 후 24시간 내 결제",
    reservation_url: gunpoBookingUrl,
    booking_round_label: "시민체육광장 관내 추첨",
    usage_period_label: "익월 이용분",
    sort_order: 10,
  },
  {
    courtKey: "gunpo_citizen",
    label: "잔여분 실시간",
    eligibility: "normal",
    rule_type: "rolling",
    open_time: "10:00:00",
    open_offset: "14",
    reservation_url: gunpoBookingUrl,
    booking_round_label: "추첨 후 잔여분",
    usage_period_label: "사용 14일 전 10:00~전일 23:59",
    sort_order: 20,
  },
  {
    courtKey: "gunpo_citizen",
    label: "당일 잔여분 현장",
    eligibility: "normal",
    rule_type: "on_site",
    reservation_url: gunpoBookingUrl,
    booking_round_label: "당일 현장 선착순",
    usage_period_label: "이용시간 2시간 전부터",
    sort_order: 30,
  },
  ...["sanbon_ic", "haneol", "songjeong"].map((courtKey) => ({
    courtKey,
    label: "무료개방 현장 이용",
    eligibility: "normal",
    rule_type: "on_site",
    reservation_url: gunpoSmallFacilitiesUrl,
    booking_round_label: "무료개방",
    usage_period_label: "평일·토요일·공휴일",
    sort_order: 10,
  })),
  {
    courtKey: "gureumsan",
    label: "광명시민 우선",
    eligibility: "citizen",
    rule_type: "fixed_schedule",
    open_type: "day",
    open_day_of_month: 21,
    open_time: "09:00:00",
    open_offset: "다음달",
    reservation_url: gureumsanBookingUrl,
    booking_round_label: "관내 회원 예약",
    usage_period_label: "익월 이용분",
    sort_order: 10,
  },
  {
    courtKey: "gureumsan",
    label: "관외 예약",
    eligibility: "normal",
    rule_type: "fixed_schedule",
    open_type: "day",
    open_day_of_month: 26,
    open_time: null,
    open_offset: "다음달",
    reservation_url: gureumsanBookingUrl,
    booking_round_label: "관외 회원 예약",
    usage_period_label: "익월 이용분; 오픈 시각 미명시",
    sort_order: 20,
  },
  {
    courtKey: "gwangju_expressway",
    label: "유선 사전 확인",
    eligibility: "normal",
    rule_type: "phone",
    sort_order: 10,
  },
  {
    courtKey: "gunpo_expressway",
    label: "토요일 현장 선착순",
    eligibility: "normal",
    rule_type: "on_site",
    booking_round_label: "팀당 최대 3시간",
    usage_period_label: "토요일 09:00~17:00",
    sort_order: 10,
  },
  {
    courtKey: "gwangmyeong_municipal",
    label: "월별 공지 예약",
    eligibility: "normal",
    rule_type: "irregular",
    reservation_url: gwangmyeongBookingUrl,
    booking_round_label: "월별 예약 공지 확인",
    usage_period_label: "통상 월 2회 분할 오픈",
    sort_order: 10,
  },
];

async function findByNames(city, names) {
  const { data, error } = await supabase
    .from("courtinfo")
    .select("id,basic_court_name,basic_city,slug")
    .eq("basic_city", city)
    .in("basic_court_name", names);
  if (error) throw new Error(`${city} ${names.join("/")} 조회 실패: ${error.message}`);
  return data ?? [];
}

async function preflight() {
  const current = [];

  for (const court of newCourts) {
    const rows = await findByNames(court.city, [court.name]);
    if (rows.length > 1) throw new Error(`${court.name} 중복 행 ${rows.length}개를 발견했습니다.`);
    current.push({ key: court.key, kind: "new", expectedName: court.name, rows });
  }

  for (const update of existingCourtUpdates) {
    const rows = await findByNames(update.city, update.aliases);
    if (rows.length !== 1) {
      throw new Error(
        `${update.city} ${update.aliases.join("/")} 대상이 ${rows.length}개입니다. 정확히 1개여야 합니다.`
      );
    }
    current.push({ key: update.key, kind: "update", expectedName: update.aliases[0], rows });
  }

  const targetSlugs = [
    ...newCourts.map((court) => court.slug),
    ...existingCourtUpdates.map((update) => update.values.slug).filter(Boolean),
  ];
  const { data: slugRows, error: slugError } = await supabase
    .from("courtinfo")
    .select("id,basic_court_name,basic_city,slug")
    .in("slug", targetSlugs);
  if (slugError) throw new Error(`슬러그 중복 검사 실패: ${slugError.message}`);

  const allowedIds = new Set(current.flatMap((item) => item.rows.map((row) => row.id)));
  const conflicts = (slugRows ?? []).filter((row) => !allowedIds.has(row.id));
  if (conflicts.length) {
    throw new Error(`다른 코트와 슬러그 충돌: ${JSON.stringify(conflicts)}`);
  }

  return current;
}

async function saveNewCourt(court) {
  const existing = await findByNames(court.city, [court.name]);
  const payload = {
    basic_court_name: court.name,
    slug: court.slug,
    ...court.values,
    updated_at: now,
  };

  if (existing[0]?.id) {
    const { data, error } = await supabase
      .from("courtinfo")
      .update(payload)
      .eq("id", existing[0].id)
      .select("id,basic_court_name,basic_city,slug")
      .single();
    if (error) throw new Error(`${court.name} 멱등 갱신 실패: ${error.message}`);
    return { ...data, action: "updated_existing" };
  }

  const { data, error } = await supabase
    .from("courtinfo")
    .insert(payload)
    .select("id,basic_court_name,basic_city,slug")
    .single();
  if (error) throw new Error(`${court.name} 신규 등록 실패: ${error.message}`);
  return { ...data, action: "inserted" };
}

async function updateExistingCourt(update) {
  const rows = await findByNames(update.city, update.aliases);
  if (rows.length !== 1) throw new Error(`${update.aliases[0]} 갱신 대상을 찾지 못했습니다.`);

  const { data, error } = await supabase
    .from("courtinfo")
    .update({ ...update.values, updated_at: now })
    .eq("id", rows[0].id)
    .select("id,basic_court_name,basic_city,slug")
    .single();
  if (error) throw new Error(`${update.aliases[0]} 기본정보 갱신 실패: ${error.message}`);
  return { ...data, action: "updated" };
}

async function upsertRule(courtId, definition) {
  const { courtKey: _courtKey, ...fields } = definition;
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
    anchor_date: null,
    lottery_desc: fields.lottery_desc ?? null,
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

  if (existing?.id) {
    const { error } = await supabase
      .from("court_booking_rules")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(`${fields.label} 규칙 갱신 실패: ${error.message}`);
    return { id: existing.id, action: "updated", label: fields.label };
  }

  const { data, error } = await supabase
    .from("court_booking_rules")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`${fields.label} 규칙 등록 실패: ${error.message}`);
  return { id: data.id, action: "inserted", label: fields.label };
}

const preflightResult = await preflight();

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        newCourtCount: newCourts.length,
        updateCourtCount: existingCourtUpdates.length,
        bookingRuleCount: ruleDefinitions.length,
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

for (const court of newCourts) {
  const saved = await saveNewCourt(court);
  savedByKey.set(court.key, saved);
  courtWrites.push({ key: court.key, ...saved });
}

for (const update of existingCourtUpdates) {
  const saved = await updateExistingCourt(update);
  savedByKey.set(update.key, saved);
  courtWrites.push({ key: update.key, ...saved });
}

const ruleWrites = [];
for (const definition of ruleDefinitions) {
  const court = savedByKey.get(definition.courtKey);
  if (!court?.id) throw new Error(`${definition.courtKey} 저장 결과가 없어 예약 규칙을 저장할 수 없습니다.`);
  ruleWrites.push({
    courtKey: definition.courtKey,
    ...(await upsertRule(court.id, definition)),
  });
}

const savedIds = courtWrites.map((court) => court.id);
const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select(
    "id,basic_court_name,basic_city,basic_address,use_or_not,court_count_hard_indoor,court_count_hard_outdoor,court_count_grass_outdoor,booking_rule_type,booking_reception_time,booking_site_link"
  )
  .in("id", savedIds)
  .order("basic_city")
  .order("basic_court_name");
if (verifyCourtError) throw new Error(`코트 검증 조회 실패: ${verifyCourtError.message}`);

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("court_id,label,eligibility,rule_type,open_type,open_day_of_month,open_time,open_offset,is_active")
  .in("court_id", savedIds)
  .order("court_id")
  .order("sort_order");
if (verifyRuleError) throw new Error(`예약 규칙 검증 조회 실패: ${verifyRuleError.message}`);

if ((verifiedCourts ?? []).length !== newCourts.length + existingCourtUpdates.length) {
  throw new Error(`검증된 코트 수가 예상과 다릅니다: ${verifiedCourts?.length ?? 0}`);
}

const expectedRuleKeys = new Set(
  ruleDefinitions.map((definition) => `${savedByKey.get(definition.courtKey).id}:${definition.label}`)
);
const verifiedRuleKeys = new Set(
  (verifiedRules ?? []).map((rule) => `${rule.court_id}:${rule.label}`)
);
const missingRules = [...expectedRuleKeys].filter((key) => !verifiedRuleKeys.has(key));
if (missingRules.length) throw new Error(`검증에서 누락된 예약 규칙: ${missingRules.join(", ")}`);

console.log(
  JSON.stringify(
    {
      mode: "applied",
      requested: { inserted: newCourts.length, updated: existingCourtUpdates.length },
      courtWrites,
      ruleWrites,
      verifiedCourts,
      verifiedRuleCount: verifiedRules?.length ?? 0,
      verifiedRules,
    },
    null,
    2
  )
);
