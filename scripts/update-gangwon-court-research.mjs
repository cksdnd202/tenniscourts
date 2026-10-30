import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase 환경 변수가 필요합니다.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 강원 시설정보 공식자료 재검증]";
const hiddenDuplicateId = "fed403e6-759f-48ae-b395-07d66adf10df";
const zeroCounts = {
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
};

const court = (id, name, values, note, rule, fee = null) => ({ id, name, values, note, rule, fee });
const free = { is_free: true };

const courts = [
  court("e2a8f7df-fbfb-47b3-9133-7dc0d41b9e62", "고성군 거진실내테니스장", {
    booking_rule_type: "irregular",
    booking_reception_time: "고성군 통합예약에서 온라인 선착순 신청 · 운영 일정 확인 필요",
    booking_site_link: "https://www.gwgs.go.kr/yeyak",
    ...zeroCounts,
  }, "실내 코트 3면입니다. 표면 재질은 공식 안내에서 확인되지 않아 재질별 면수는 구조화하지 않았습니다. 2026년 5월 임시운영은 매일 09:00~21:00, 1시간 단위·1일 최대 2시간, 5월 31일까지 무료였으나 임시 조건이므로 상시 이용시간과 정식 요금으로 구조화하지 않았습니다. 이후 일정과 요금은 고성군 통합예약에서 확인해야 합니다.", {
    rule_type: "irregular", booking_round_label: "고성군 통합예약 온라인 선착순", usage_period_label: "운영 일정 별도 공지", reservation_url: "https://www.gwgs.go.kr/yeyak",
  }),
  court("b87f08ad-0c9d-4e50-aa0a-c1474a56f0d6", "동해시 근로복지공단 동해병원 테니스장", {
    booking_rule_type: "phone",
    booking_reception_time: "관련 기관 협의 및 전화 문의 후 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "17:30:00", basic_time_of_use_weekday_to: "20:00:00",
    basic_time_of_use_weekend_from: "08:00:00", basic_time_of_use_weekend_to: "20:00:00",
  }, "관련 기관 협의·승인 시설이며 평일 17:30~20:00, 주말·공휴일 08:00~20:00 이용 안내가 확인됩니다. 코트 1면이며 재질은 공식 자료에 없어 추정하지 않았습니다. 공유누리 화면의 무료 표기와 상세 설명의 전화 문의 안내가 달라 구조화 요금은 입력하지 않았습니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 및 관련 기관 협의 후 승인", usage_period_label: "이용 일정 전화 확인",
  }),
  court("62f08d63-b7ac-420f-9156-9f8c0609c300", "동해시 웰빙레포츠타운 테니스장", {
    booking_rule_type: "on_site",
    booking_reception_time: "현장 접수 · 동해시시설관리공단 운영 안내 확인",
    booking_site_link: "https://www.dhsisul.org/pages/sub.htm?mv_data=aWR4PTI2JnR5cGU9aGVhbHRo%7C%7C&nav_code=new1701855774",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "05:00:00", basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "05:00:00", basic_time_of_use_weekend_to: "18:00:00",
    ...zeroCounts, court_count_grass_outdoor: 3, court_count_hard_outdoor: 2,
  }, "실외 5면(인조잔디 3·하드 2)입니다. 3~10월 화~토 05:00~22:00, 일·월·공휴일 05:00~18:00이며 대표시간은 이 기준으로 저장했습니다. 11~2월은 화~토 06:00~21:00, 일·월·공휴일 06:00~18:00입니다. 개인 이용료는 2시간 기준 평일 2,000원·휴일 3,000원, 야간 3,000원입니다. 코트 전용 사용료(평일 주간 10,000원·야간 12,000원, 휴일 주간 12,000원·야간 15,000원)는 일반 개인 이용료와 달라 설명으로 보존했습니다.", {
    rule_type: "on_site", booking_round_label: "현장 접수", usage_period_label: "당일 이용", reservation_url: "https://www.dhsisul.org/pages/sub.htm?mv_data=aWR4PTI2JnR5cGU9aGVhbHRo%7C%7C&nav_code=new1701855774",
  }, { is_free: false, price_basis_hours: 2, outdoor_weekday_price: 2000, outdoor_weekend_price: 3000 }),
  court("c49290f6-3b45-4105-8ff0-d28535e2a94c", "삼척시 지사-삼척기지 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 문의 후 시설 이용 신청서 제출 및 승인",
    time_of_use_same: true,
    basic_time_of_use_weekday_from: "09:00:00", basic_time_of_use_weekday_to: "17:00:00",
    basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "17:00:00",
  }, "평일·주말 09:00~17:00 운영하며 전화 문의 후 시설 이용 신청서 제출과 승인이 필요합니다. 공식 자료에 코트 재질과 면수가 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 후 이용 신청·승인", usage_period_label: "상시 운영 · 일정 사전 확인",
  }, free),
  court("8ee60203-cf3d-4215-962e-646df0fb0459", "양양군 양양 테니스장", {
    booking_rule_type: "checking", booking_reception_time: "관리자 승인 · 신청 가능 일정 확인 필요",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "20:00:00",
    ...zeroCounts, court_count_hard_outdoor: 8,
  }, "실외 하드코트 8면이며 일반 개방은 7·8번 코트 2면입니다. 평일 06:00~22:00, 주말 06:00~20:00이고 매주 월요일은 휴장합니다. 1면 2시간 기준 평일 10,000원·주말 20,000원입니다.", {
    rule_type: "checking", booking_round_label: "이용 가능 일정 확인 후 신청·승인", usage_period_label: "2시간 단위 이용",
  }, { is_free: false, price_basis_hours: 2, outdoor_weekday_price: 10000, outdoor_weekend_price: 20000 }),
  court("bbba3203-4c3b-4797-b934-199283761d73", "양양군 조산 테니스장", {
    booking_rule_type: "on_site", booking_reception_time: "국민체육센터 방문 신청·결제 후 열쇠 수령",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:30:00", basic_time_of_use_weekday_to: "21:30:00",
    basic_time_of_use_weekend_from: "06:30:00", basic_time_of_use_weekend_to: "19:30:00",
    ...zeroCounts, court_count_grass_outdoor: 4,
  }, "실외 인조잔디 4면이며 일반 개방은 3·4번 코트 2면입니다. 평일 06:30~21:30, 주말 06:30~19:30이고 매주 월요일은 휴장합니다. 국민체육센터에서 방문 신청·결제 후 열쇠를 수령합니다. 1면 2시간 기준 평일 10,000원·주말 20,000원입니다.", {
    rule_type: "on_site", booking_round_label: "국민체육센터 방문 신청·결제", usage_period_label: "2시간 단위 이용",
  }, { is_free: false, price_basis_hours: 2, outdoor_weekday_price: 10000, outdoor_weekend_price: 20000 }),
  court("f75ff58d-8c59-4270-99f5-451c6ec4d177", "양양군 한국도로공사 양양지사 테니스장", {
    booking_rule_type: "checking", booking_reception_time: "공유누리 이용 신청 · 이용일 30일 전부터 3일 전까지 · 관리자 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: null, basic_time_of_use_weekday_to: null,
    basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "18:00:00",
  }, "평일은 미개방이며 주말·공휴일 09:00~18:00 이용합니다. 이용일 30일 전부터 3일 전까지 공유누리에서 신청하고 관리자 승인을 받아야 합니다. 공식 자료에 코트 면수와 재질이 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "checking", booking_round_label: "이용일 30일 전부터 3일 전까지 신청", usage_period_label: "주말·공휴일 이용",
  }, free),
  court("93f4cfc8-7f86-47ea-b2f7-7365279550f2", "영월군 덕포테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 문의(033-370-4703) 후 관리자 승인",
    ...zeroCounts,
  }, "전화 문의 후 관리자 승인을 받아 이용합니다. 공식 자료에서 시설 면적 893㎡를 확인했으나 코트 면수와 재질, 정규 운영시간은 확인되지 않아 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 후 관리자 승인", usage_period_label: "이용 일정 전화 확인", reservation_url: "033-370-4703",
  }, free),
  court("b7ab1caf-572e-485d-a65a-6c87893f7ee1", "영월군 스포츠파크 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "영월군 공식 시설 안내 확인 후 문의 신청",
    booking_site_link: "https://www.yw.go.kr/www/contents.do?key=1366",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00",
    ...zeroCounts, court_count_hard_outdoor: 3,
  }, "영월군 공식 전천후테니스장 안내를 기준으로 반영했습니다. 코트 3면이며 하절기 06:00~22:00, 동절기 06:00~21:00입니다. 매월 첫째·셋째 월요일과 1월 1일·명절은 휴장합니다. 공식 요금은 1인 3시간 10,000원이며 영월군민은 50% 감면됩니다. 현재 DB는 코트당 요금만 표시하므로 이를 코트 요금으로 오인하지 않도록 구조화 요금 행은 만들지 않고 설명에 보존했습니다.", {
    rule_type: "phone", booking_round_label: "시설 문의 후 신청", usage_period_label: "1인 3시간 이용", reservation_url: "https://www.yw.go.kr/www/contents.do?key=1366",
  }),
  court("3cc1de18-eb9a-4c2e-b965-1df45151b603", "영월군 쌍용4리 테니스장", {
    booking_rule_type: "checking", booking_reception_time: "관리자 문의 및 승인",
  }, "관리자 문의와 승인을 거쳐 이용하는 시설입니다. 공식 자료에 운영시간·면수·재질이 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "checking", booking_round_label: "관리자 문의 후 승인", usage_period_label: "이용 일정 별도 확인",
  }, free),
  court("0c8412db-8c45-4dfb-acb2-74c5b04bac20", "원주시 원주지사 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 문의 후 관리자 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "13:00:00", basic_time_of_use_weekday_to: "14:00:00",
    basic_time_of_use_weekend_from: null, basic_time_of_use_weekend_to: null,
  }, "평일 13:00~14:00에만 개방하고 주말은 미개방입니다. 전화 문의 후 관리자 승인이 필요합니다. 공식 자료에 코트 면수와 재질이 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 후 관리자 승인", usage_period_label: "평일 13:00~14:00",
  }, free),
  court("d4e27211-cf8a-4c4d-83b4-d7f5acb946c5", "원주시 한국광해광업공단 본관 옥외 테니스장", {
    booking_rule_type: "irregular", booking_reception_time: "온라인 신청 후 관리자 승인 · 이용 가능 일정 확인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: null, basic_time_of_use_weekday_to: null,
    basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "18:00:00",
  }, "평일은 미개방이며 주말·공휴일 09:00~18:00 이용합니다. 옥외 코트 면적은 405㎡이며 공식 자료에 재질과 면수가 없어 추정하지 않았습니다. 최초 1시간 30,000원, 추가 1시간당 20,000원이며 조명료는 시간당 10,000원입니다.", {
    rule_type: "irregular", booking_round_label: "온라인 신청 후 관리자 승인", usage_period_label: "주말·공휴일 이용",
  }, { is_free: false, price_basis_hours: 1, outdoor_weekday_price: null, outdoor_weekend_price: 30000, lighting_fee_separate: true, lighting_fee_amount: 10000, lighting_fee_basis_hours: 1 }),
  court("f1f13e73-4122-40c8-af87-8262a498c736", "정선군 여량면 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 문의(033-560-2666) 후 관리자 승인",
    time_of_use_same: true,
    basic_time_of_use_weekday_from: "00:00:00", basic_time_of_use_weekday_to: "23:59:00",
    basic_time_of_use_weekend_from: "00:00:00", basic_time_of_use_weekend_to: "23:59:00",
    ...zeroCounts,
  }, "실외 코트 1면으로 연중 상시 개방 안내가 확인됩니다. 표면 재질은 공식 문서에 명시되지 않았으므로 DB 분류상 기타 실외 면수로 표현할 수 없어 재질별 면수는 추정 입력하지 않습니다. 전화 문의 후 관리자 승인이 필요하며 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 후 관리자 승인", usage_period_label: "상시 개방", reservation_url: "033-560-2666",
  }, free),
  court("352b99ec-dacd-43d9-8296-3696a3833361", "정선군 정선국토관리사무소 본관부근(테니스장)", {
    booking_rule_type: "irregular", booking_reception_time: "단체 온라인 신청 후 관리자 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: null, basic_time_of_use_weekday_to: null,
    basic_time_of_use_weekend_from: "10:00:00", basic_time_of_use_weekend_to: "17:00:00",
  }, "단체 이용 시설로 평일은 미개방이며 주말·공휴일 10:00~17:00 운영합니다. 코트 2면이나 재질은 공식 자료에 없어 구조화하지 않았습니다. 온라인 신청 후 관리자 승인이 필요하며 이용료는 무료입니다.", {
    rule_type: "irregular", booking_round_label: "단체 온라인 신청 후 관리자 승인", usage_period_label: "주말·공휴일 이용",
  }, free),
  court("4af1e8cd-d2f1-48a7-8a88-eae0e5b0e532", "정선군 정선병원 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 문의(033-560-7199) 후 이용 협의",
  }, "전화 문의 후 이용을 협의해야 합니다. 오래된 시설로 안전 상태를 반드시 확인해야 하며, 공식 자료에 운영시간·면수·재질이 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 문의 후 이용 협의", usage_period_label: "안전 상태와 이용 일정 사전 확인", reservation_url: "033-560-7199",
  }, free),
  court("f334c3da-8e9e-4636-a834-3ee42723b738", "춘천시 강원특별자치도공무원교육원 테니스장", {
    booking_rule_type: "irregular", booking_reception_time: "온라인 신청 후 관리자 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "08:00:00",
    basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "18:00:00",
  }, "코트 2면이며 평일 06:00~08:00은 교육 운영에 지장이 없는 경우에만 이용할 수 있고, 휴일은 06:00~18:00 이용합니다. 온라인 신청 후 관리자 승인이 필요합니다. 요금은 1면 1시간 5,000원이지만 공식 자료에 실내·실외 구분이 없어 잘못된 유형 요금으로 노출되지 않도록 구조화하지 않고 설명에 보존했습니다.", {
    rule_type: "irregular", booking_round_label: "온라인 신청 후 관리자 승인", usage_period_label: "평일 조건부·휴일 이용",
  }),
  court("6339b7fb-49ec-4fd5-b07a-59ea0a30e82c", "춘천시 춘천송암스포츠타운 테니스장", {
    booking_rule_type: "irregular", booking_reception_time: "춘천도시공사 온라인 대관 신청 · 당일은 전화 또는 방문 문의",
    booking_site_link: "https://rev.cuc.or.kr/www/28",
    ...zeroCounts,
  }, "총 24면(실내 6·센터 1·실외 17)이며 공식 자료에 표면 재질이 없어 재질별 면수는 구조화하지 않았습니다. 일반 예약 대상은 실내 4면·실외 6면, 클럽 사용 실외 11면, 강습 실내 2면입니다. 2시간 기준 실내 평일 30,000원·주말 36,000원, 실외 평일 10,000원·주말 12,000원입니다. 조명료는 별도이나 공식 안내에서 금액을 확인하지 못했습니다. 정규 운영시간은 예약 화면에서 확인해야 합니다.", {
    rule_type: "irregular", booking_round_label: "온라인 대관 신청", usage_period_label: "예약 화면에서 이용 가능 일정 확인", reservation_url: "https://rev.cuc.or.kr/www/28",
  }, { is_free: false, price_basis_hours: 2, outdoor_weekday_price: 10000, outdoor_weekend_price: 12000, indoor_weekday_price: 30000, indoor_weekend_price: 36000, lighting_fee_separate: true }),
  court("0186fe81-5df5-40a6-9f20-12a5f4d1f9ef", "춘천시 한국폴리텍대학 춘천캠퍼스 테니스장", {
    booking_rule_type: "irregular", booking_reception_time: "공유누리 월별 대관 공고에서 온라인 신청 후 관리자 승인",
    booking_site_link: "https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=GI03R5711118",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: null, basic_time_of_use_weekday_to: null,
    basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "18:00:00",
    ...zeroCounts, court_count_hard_outdoor: 4,
  }, "동일 주소의 중복 시설인 ‘한국폴리텍대학 춘천1캠퍼스 옥외테니스장’ 대신 이 시설만 노출합니다. 최신 공유누리 안내 기준 실외 코트 4면, 주말·공휴일 09:00~18:00 운영이며 월별 시설 대관 공고에서 온라인 신청 후 승인을 받습니다. 요금은 30명 미만 기준 1시간 10,000원이고 30명 이상은 별도 문의입니다. 표면 재질은 공식 문서에 명시되지 않았지만 기존 시설 분류를 유지했습니다.", {
    rule_type: "irregular", booking_round_label: "월별 대관 공고 온라인 신청 후 승인", usage_period_label: "주말·공휴일 이용", reservation_url: "https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=GI03R5711118",
  }, { is_free: false, price_basis_hours: 1, outdoor_weekday_price: null, outdoor_weekend_price: 10000 }),
  court("8ff0a527-4820-42f3-822b-21024c963f0c", "춘천시 호반테니스장", {
    booking_rule_type: "irregular", booking_reception_time: "춘천도시공사 예약 화면 확인 후 신청",
    booking_site_link: "https://rev.cuc.or.kr/www/50",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "18:00:00",
    ...zeroCounts, court_count_hard_outdoor: 10,
  }, "실외 케미컬·하드코트 10면(강습 2면 포함)입니다. 평일 06:00~22:00, 주말 06:00~18:00 운영합니다. 코트 대관은 2시간 기준 평일 12,000원·주말 15,000원입니다. 개인 연습 이용료는 주간 2,300원, 조기·야간 3,400원으로 별도입니다.", {
    rule_type: "irregular", booking_round_label: "예약 화면 확인 후 신청", usage_period_label: "2시간 단위 대관", reservation_url: "https://rev.cuc.or.kr/www/50",
  }, { is_free: false, price_basis_hours: 2, outdoor_weekday_price: 12000, outdoor_weekend_price: 15000 }),
  court("4efad0f0-31e1-42c4-9668-2275362c3452", "태백시 태백시민테니스장", {
    booking_rule_type: "phone", booking_reception_time: "회원 이용 시설 · 전화 문의(033-550-2753)",
    ...zeroCounts, court_count_grass_outdoor: 4,
  }, "실외 인조잔디 4면입니다. 회원 이용 시설로 일반 공개 예약은 확인되지 않았으며 전화 문의가 필요합니다. 공유누리에는 15,000원이 표시되지만 시간·인원·코트 기준이 없어 구조화 요금으로 입력하지 않았습니다.", {
    rule_type: "phone", booking_round_label: "회원 이용·전화 문의", usage_period_label: "운영 일정 전화 확인", reservation_url: "033-550-2753",
  }),
  court("e024bf31-9c3d-470f-8181-720f65f41071", "평창군 대관령지사 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "공유누리 신청 전 전화 문의 후 관리자 승인",
  }, "공유누리 신청 전 전화 확인이 필요하며 관리자 승인 후 이용합니다. 공식 자료에 운영시간·면수·재질이 없어 추정하지 않았습니다. 이용료는 무료입니다.", {
    rule_type: "phone", booking_round_label: "전화 확인 후 공유누리 신청·승인", usage_period_label: "이용 일정 별도 확인",
  }, free),
  court("305dde4e-7f90-4ceb-a1fa-593845353ece", "홍천군 홍천국토관리사무소 본관부근(테니스장)", {
    booking_rule_type: "irregular", booking_reception_time: "온라인 신청 후 관리자 승인",
    time_of_use_same: false,
    basic_time_of_use_weekday_from: null, basic_time_of_use_weekday_to: null,
    basic_time_of_use_weekend_from: "09:00:00", basic_time_of_use_weekend_to: "18:00:00",
  }, "평일은 미개방이며 주말 09:00~18:00 운영합니다. 코트 2면이나 재질은 공식 자료에 없어 구조화하지 않았습니다. 온라인 신청 후 관리자 승인이 필요하며 이용료는 무료입니다.", {
    rule_type: "irregular", booking_round_label: "온라인 신청 후 관리자 승인", usage_period_label: "주말 이용",
  }, free),
  court("6e6448c1-e5e5-49ad-a922-88c9f1809c72", "화천군 붕어섬 테니스장", {
    booking_rule_type: "phone", booking_reception_time: "전화 또는 방문 신청 후 관리자 승인",
    time_of_use_same: true,
    basic_time_of_use_weekday_from: "06:00:00", basic_time_of_use_weekday_to: "22:00:00",
    basic_time_of_use_weekend_from: "06:00:00", basic_time_of_use_weekend_to: "22:00:00",
  }, "평일·주말 06:00~22:00 운영하며 전화 또는 방문 신청 후 관리자 승인을 받습니다. 공식 자료의 요금은 평일 8,000원·주말 10,000원이지만 시간·인원·코트 기준이 없어 구조화 요금으로 입력하지 않았습니다. 코트 면수와 재질도 공식 문서에서 확인되지 않아 추정하지 않았습니다.", {
    rule_type: "phone", booking_round_label: "전화 또는 방문 신청 후 승인", usage_period_label: "운영 일정 사전 확인",
  }),
];

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const resetRuleFields = {
  open_type: null, open_day_of_month: null, open_day_of_week: null, open_ordinal: null,
  open_time: null, open_offset: null, interval_weeks: null, anchor_date: null,
  lottery_desc: null, open_date_adjustment: "none", target_condition: null,
};

const ids = [...courts.map(({ id }) => id), hiddenDuplicateId];
const { data: existingCourts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,etc_desc,booking_site_link,use_or_not")
  .in("id", ids);
if (courtReadError) throw courtReadError;
if (existingCourts.length !== ids.length) throw new Error(`대상 시설 수 불일치: ${existingCourts.length}/${ids.length}`);

const { data: existingRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,reservation_url")
  .in("court_id", courts.map(({ id }) => id))
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;
const ruleByCourt = new Map();
for (const rule of existingRules) if (!ruleByCourt.has(rule.court_id)) ruleByCourt.set(rule.court_id, rule);

console.log(`갱신 ${courts.length}개 + 중복 숨김 1개 · 적용 모드: ${shouldApply ? "YES" : "NO (dry-run)"}`);
if (!shouldApply) {
  console.table(courts.map(({ name, values, fee }) => ({
    name,
    rule: values.booking_rule_type,
    weekday: values.basic_time_of_use_weekday_from ? `${values.basic_time_of_use_weekday_from}-${values.basic_time_of_use_weekday_to}` : "-",
    weekend: values.basic_time_of_use_weekend_from ? `${values.basic_time_of_use_weekend_from}-${values.basic_time_of_use_weekend_to}` : "-",
    fee: fee ? (fee.is_free ? "무료" : "유료") : "설명만",
  })));
  process.exit(0);
}

const { error: hideError } = await supabase
  .from("courtinfo")
  .update({ use_or_not: false, updated_at: now })
  .eq("id", hiddenDuplicateId);
if (hideError) throw new Error(`중복 시설 숨김 실패: ${hideError.message}`);

for (const config of courts) {
  const existing = existingCourts.find(({ id }) => id === config.id);
  const existingRule = ruleByCourt.get(config.id);
  if (!existingRule) throw new Error(`${config.name}의 활성 예약 규칙이 없습니다.`);

  const { error: courtUpdateError } = await supabase.from("courtinfo").update({
    ...config.values,
    use_or_not: true,
    etc_desc: appendNote(existing.etc_desc, config.note),
    updated_at: now,
  }).eq("id", config.id);
  if (courtUpdateError) throw new Error(`${config.name} 시설 갱신 실패: ${courtUpdateError.message}`);

  const { error: ruleUpdateError } = await supabase.from("court_booking_rules").update({
    ...resetRuleFields,
    label: "전체", eligibility: "normal", is_active: true, sort_order: 10,
    reservation_url: config.values.booking_site_link ?? existingRule.reservation_url ?? existing.booking_site_link,
    booking_round_label: null, usage_period_label: null,
    ...config.rule,
    updated_at: now,
  }).eq("id", existingRule.id);
  if (ruleUpdateError) throw new Error(`${config.name} 예약 규칙 갱신 실패: ${ruleUpdateError.message}`);

  if (!config.fee) {
    const { error: deleteFeeError } = await supabase.from("court_booking_rule_fees").delete().eq("booking_rule_id", existingRule.id);
    if (deleteFeeError) throw new Error(`${config.name} 비구조화 요금 정리 실패: ${deleteFeeError.message}`);
  } else {
    const fee = {
      booking_rule_id: existingRule.id,
      is_free: config.fee.is_free,
      price_basis_hours: config.fee.price_basis_hours ?? 1,
      outdoor_weekday_price: config.fee.outdoor_weekday_price ?? null,
      outdoor_weekend_price: config.fee.outdoor_weekend_price ?? null,
      indoor_weekday_price: config.fee.indoor_weekday_price ?? null,
      indoor_weekend_price: config.fee.indoor_weekend_price ?? null,
      lighting_fee_separate: config.fee.lighting_fee_separate ?? false,
      lighting_fee_amount: config.fee.lighting_fee_amount ?? null,
      lighting_fee_basis_hours: config.fee.lighting_fee_basis_hours ?? null,
      lighting_start_time: null,
      updated_at: now,
    };
    const { error: feeError } = await supabase.from("court_booking_rule_fees").upsert(fee, { onConflict: "booking_rule_id" });
    if (feeError) throw new Error(`${config.name} 요금 갱신 실패: ${feeError.message}`);
  }

  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,use_or_not,etc_desc")
  .in("id", ids);
if (verifyCourtError) throw verifyCourtError;

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,is_active")
  .in("court_id", courts.map(({ id }) => id))
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const hidden = verifiedCourts.find(({ id }) => id === hiddenDuplicateId);
const retained = verifiedCourts.filter(({ id }) => id !== hiddenDuplicateId);
const invalidNotes = retained.filter(({ etc_desc }) => !etc_desc?.includes(marker));
if (verifiedCourts.length !== 24 || retained.some(({ use_or_not }) => !use_or_not) || hidden?.use_or_not !== false || verifiedRules.length !== 23 || verifiedFees.length !== 17 || invalidNotes.length) {
  throw new Error(`검증 실패: courts=${verifiedCourts.length}, retainedVisible=${retained.filter(({ use_or_not }) => use_or_not).length}, hidden=${hidden?.use_or_not}, rules=${verifiedRules.length}, fees=${verifiedFees.length}, notes=${invalidNotes.length}`);
}

console.log(JSON.stringify({
  verifiedCourts: verifiedCourts.length,
  visibleCourts: retained.filter(({ use_or_not }) => use_or_not).length,
  hiddenDuplicates: hidden?.use_or_not === false ? 1 : 0,
  verifiedRules: verifiedRules.length,
  structuredFees: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  descriptiveOnlyFees: courts.filter(({ fee }) => !fee).length,
}, null, 2));
