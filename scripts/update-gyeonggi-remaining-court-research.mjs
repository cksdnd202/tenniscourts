import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase 환경 변수가 필요합니다.");

const db = createClient(url, key, { auth: { persistSession: false } });
const marker = "[2026-09 경기 미조사 시설 공식자료 확인]";
const now = new Date().toISOString();
const cities = ["가평군", "성남시", "수원시", "안산시", "안성시", "양주시", "양평군", "여주시", "용인시", "의왕시", "이천시", "평택시", "하남시", "화성시"];
const eshare = (id) => `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${id}`;
const anseong = "https://reservation.anseong.go.kr/";
const anseongNotice = "https://reservation.anseong.go.kr/index.do?board_id=notice&cp=%2Fboard%2Fview.do&menu_id=0008&pageIndex=1&searchCondition=TITLE&searchKeyword=&seq=108";
const anseongFacility = "https://www.asimc.or.kr/portal/contents.do?mid=0101060000";
const yangju = "https://reserve.yjuc.or.kr/main/rent/rent_req_list.do";
const yangjuFee = "https://reserve.yjuc.or.kr/main/content/view/MN04020300.do";
const yongin = "https://publicsports.yongin.go.kr/publicsports/sports/index.do";
const hanamStadium = "https://rent.hanamsport.or.kr/hanam_rent_ms/center/guide.php";
const hanamMisa = "https://www.hanam.go.kr/sotong/selectMisaParkResveWeb.do?key=9365&searchCategoryCode=B1";
const zeroCounts = {
  court_count_hard_indoor: 0, court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0, court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0, court_count_clay_outdoor: 0,
};
const free = { is_free: true, price_basis_hours: 1 };
const priced = (hours, surface, weekday, weekend) => ({
  is_free: false,
  price_basis_hours: hours,
  [`${surface}_weekday_price`]: weekday,
  [`${surface}_weekend_price`]: weekend,
});
const irregular = (text, source, usage = null, type = "irregular") => ({
  rule_type: type, label: "전체", eligibility: "normal",
  booking_round_label: text, usage_period_label: usage,
  reservation_url: source,
});
const fixedDay = (day, time, text, source, usage = "다음 달 이용분") => ({
  ...irregular(text, source, usage, "fixed_schedule"),
  open_type: "day", open_day_of_month: day, open_time: time,
  open_offset: "다음달", open_date_adjustment: "none",
});
const addNote = (existing, note) => {
  const base = (existing ?? "").split(marker)[0].trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};
const hours = (weekdayFrom, weekdayTo, weekendFrom, weekendTo) => ({
  time_of_use_same: weekdayFrom === weekendFrom && weekdayTo === weekendTo,
  basic_time_of_use_weekday_from: weekdayFrom,
  basic_time_of_use_weekday_to: weekdayTo,
  basic_time_of_use_weekend_from: weekendFrom,
  basic_time_of_use_weekend_to: weekendTo,
});

const yangpyeong = {
  "강상 테니스장": ["전화·방문 신청, 이용 14일 전 18:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "강하테니스장": ["인터넷·전화·방문 신청, 이용 7일 전 17:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "개군레포츠공원 테니스장": ["방문 신청, 이용 2일 전 00:00 마감·관리자 심사", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "서종생활체육공원 테니스장": ["인터넷·전화·방문 신청, 이용 3일 전 12:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "양동레포츠공원 테니스장": ["전화·방문 신청, 이용 3일 전 13:00 마감", "평일 33,000원·주말 49,500원/회차"],
  "옥천레포츠공원 테니스장": ["전화·방문 신청, 이용 5일 전 15:00 마감·관리자 심사", "평일 30,000원/3시간·상세설명의 주말 45,000원/3시간"],
  "용문 테니스장": ["인터넷·전화·방문 신청, 이용 5일 전 13:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "지평레포츠공원 테니스장": ["인터넷·방문 신청, 이용 5일 전 13:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
  "청운레포츠공원 테니스장": ["인터넷·방문 신청, 이용 5일 전 13:00 마감", "평일 기본 30,000원·주말 표기 45,000원/회차"],
};

function configFor(court) {
  const city = court.basic_city;
  const name = court.basic_court_name;
  const source = court.booking_site_link;
  const id = court.source_service_id;

  if (city === "가평군" && /^가평실내테니스장 [1-5]번코트$/.test(name)) {
    return {
      values: { booking_rule_type: "checking", booking_open_type: "week", booking_open_day_of_week: 1, booking_open_time_normal: "14:00:00", booking_open_offset: "다음주", booking_reception_time: "매주 월요일 14:00 다음 주 이용분 온라인 선착순 오픈", booking_online_reserve_possible: true, booking_today_booking_possible: false },
      rule: { ...irregular("매주 월요일 14:00 다음 주 예약 오픈", source, "당일예약 불가", "interval_weekly"), open_type: "week", open_offset: "다음주", interval_weeks: 1, anchor_date: "2026-09-21", open_day_of_week: 1, open_time: "14:00:00" },
      note: "가평군시설관리공단 공유서비스 기준 매주 월요일 13:30~14:00 예약 대기 후 14:00에 다음 주 예약 시작. 기본 평일 30,000원·주말/공휴일 36,000원/회차이나 회차 길이가 명확하지 않아 구조화 요금 보류. 공유서비스 06:00~22:00와 공단 운영시간 안내가 달라 시간 필드 보류. 코트별 개방요일도 서로 다르므로 일괄 입력하지 않음.",
    };
  }

  if (city === "성남시" && id === "GG11K812441") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "토요일·일요일 제외 공휴일 13:00~18:00, 온라인 신청 후 관리자 승인", booking_online_reserve_possible: true },
      rule: irregular("온라인 신청 후 관리자 승인·사전 문의", source, "토요일 및 일요일 제외 공휴일 13:00~18:00"), fee: free,
      note: "한국석유관리원 본사 테니스장. 무료 실외 시설이며 토요일 및 일요일을 제외한 공휴일 13:00~18:00 이용 가능. 정확한 정기 접수 오픈 시각은 공개되지 않음. KOICA의 동명 시설과 다른 주소·운영기관임.",
    };
  }

  if (city === "수원시" && name.startsWith("테니스장") && source?.includes("instiCode=6411268")) {
    const season = name.includes("하절기");
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "경기공유서비스 월별 접수일 공지에 따라 선착순 예약", booking_online_reserve_possible: true, booking_today_booking_possible: false, ...(season ? { ...zeroCounts, court_count_grass_outdoor: 1 } : {}) },
      rule: irregular("월별 접수일에 온라인 선착순 예약", source, name.includes("단체") ? "단체 예약 항목" : "하절기 코트 예약 항목"),
      note: `경기도인재개발원 인조잔디 3면의 코트별·계절별/단체 예약 항목. A/B/C 전체를 각각 3면으로 계산하지 않음. 공유서비스 주간 5,000원·야간 6,000원(일반), 단체 항목 별도 요금이 있으나 DB에 주야간 기본요금 구분이 없어 구조화 요금 보류. 코트별 운영요일과 월별 접수일을 해당 상세화면에서 확인 필요. 원문: ${source}`,
    };
  }

  if (city === "안산시" && id === "HB24P0406928") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 정기 오픈 시각 미공개", booking_online_reserve_possible: true, ...zeroCounts, court_count_clay_outdoor: 2 },
      rule: irregular("공유누리 온라인 신청 후 관리자 승인", source, "정기 오픈 시각 미공개"), fee: free,
      note: "KICOX 테니스가든은 실외 클레이코트 2면, 무료. 공개 원문에 정기 접수 오픈 시각·개방요일이 없어 별도 확정하지 않음.",
    };
  }

  if (city === "안성시" && name.includes("신청 창구_테스트")) return null;
  if (city === "안성시" && name === "안성경찰서 테니스장") return null;
  if (city === "안성시" && name.startsWith("안성맞춤")) {
    const soft = name.includes("소프트");
    return {
      values: { booking_rule_type: "rolling", booking_reception_time: "익일부터 7일 이내 인터넷 예약 · 주말 이용분 금요일 16:00 접수 마감", booking_site_link: source, booking_online_reserve_possible: true, booking_today_booking_possible: true },
      rule: { ...irregular("익일부터 7일 이내 인터넷 예약", source, "주말 이용분 금요일 16:00 마감 · 당일 현장 잔여분", "rolling"), open_offset: "7" },
      note: `${soft ? "안성맞춤소프트테니스구장" : "안성맞춤테니스구장"}의 DB 코트별 항목. 2시간·1면 기준 주간 평일/공휴일 ${soft ? "3,500/5,000" : "7,000/10,000"}원, 야간 ${soft ? "5,000/7,500" : "10,000/15,000"}원, 조명 별도 ${soft ? "4,500" : "3,000"}원/2시간. 현재 요금표는 주야간 기본요금 분리 불가하므로 금액은 설명으로만 보존. 소프트테니스와 일반 테니스의 종목 구분도 유지 필요. 공식 자료: ${anseongFacility}`,
    };
  }
  if (city === "안성시") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "다음 달 이용분 월별 공지: 안성시민 우선예약 후 잔여분 일반예약", booking_site_link: anseong, booking_online_reserve_possible: true },
      rule: irregular("월별 공지에 따라 시민 우선→잔여분 일반 접수", anseong, "다음 달 이용분"),
      note: `안성시 통합예약 시설. 2026년 10월 이용분은 경로·장애인 시민 우선 9/18 09:00, 시민 우선 9/21 09:00, 일반 잔여분 9/30 09:00. 적용 대상 코트와 날짜는 매달 달라 고정일 규칙으로 저장하지 않음. 요금은 시설별 상세화면에서 확인해야 하며 경기공유서비스의 0원·1원 표시는 실제 요금으로 사용하지 않음. 공지: ${anseongNotice}`,
    };
  }

  if (city === "양주시") {
    const surface = name.startsWith("광적") || name.startsWith("신천") || name.startsWith("옥정") ? "grass" : name.startsWith("삼숭") ? "hard" : null;
    const count = name.startsWith("광적") || name.startsWith("신천") || name.startsWith("삼숭") ? 4 : name.startsWith("옥정") ? 6 : null;
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "정기대관 매주 수요일 09:00~18:00 추첨 · 수시대관 관내 수요일 13:00부터, 기타 목요일 13:00부터 선착순", booking_site_link: yangju, booking_online_reserve_possible: true, ...(surface && count ? { ...zeroCounts, [`court_count_${surface}_outdoor`]: count } : {}) },
      rule: irregular("정기대관 수요일 추첨 · 수시대관 관내 수요일 13:00/기타 목요일 13:00 선착순", yangju, "정기대관 2주 후 일정 · 수시대관 별도"),
      note: `양주도시공사 대관 공통 안내 기준. 정기대관은 매주 수요일 09:00~18:00 신청 후 18:00 추첨, 수시대관은 관내등록팀·양주시민 수요일 13:00, 그 외 목요일 13:00부터 선착순. 옥정배수지 테니스장 6면은 2025년 9월 인조잔디로 교체됨. 실외 주간 1시간 평일/토·공휴일 4,400/4,950원, 야간 4,950/6,050원; 실내 주간 8,800/9,900원, 야간 9,900/11,000원. 현재 DB는 주야간 기본요금을 나눌 수 없어 구조화 요금 보류. 백석 실내/실외의 공식 코트 면수 배분은 별도 확인 필요. 요금표: ${yangjuFee}. 공식 대관 안내: https://www.yjuc.or.kr/sub/content.asp?cIdx=232. 옥정 코트 교체 공고: https://www.yjuc.or.kr/sub/content.asp?actionMode=view&cIdx=30&fboard=board_notice&num=776`,
    };
  }

  if (city === "양평군" && yangpyeong[name]) {
    const [booking, price] = yangpyeong[name];
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: booking, booking_online_reserve_possible: /인터넷/.test(booking) },
      rule: irregular(booking, source, "정기 오픈 시각 미공개"),
      note: `경기공유서비스 시설별 안내: ${booking}. ${price}. 일부 원문은 주말 휴관과 주말 요금을 동시에 표기하여 실제 주말 운영 여부가 충돌하며, 대부분 회차 길이도 확인되지 않아 시간·구조화 요금은 보류. 원문: ${source}`,
    };
  }

  if (city === "여주시" && name === "대신테니스장") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "여주시 대신면 온라인 예약 · 정기 오픈 시각 미공개", booking_online_reserve_possible: true },
      rule: irregular("여주시 대신면 온라인 예약", source, "정기 오픈 시각 미공개 · 2시간 이용"),
      note: "대신테니스장 2면. 주간 2시간 기준 평일 관내/관외 6,000/12,000원, 주말 관내/관외 7,000/14,000원. 주간만 게시되어 야간 요금까지 동일한 것처럼 구조화하지 않음. 하절기/동절기 운영시간도 서로 달라 단일 시간 필드에 입력하지 않음. 관내는 이용자 50% 이상이 여주시 관내 거주자인 팀.",
    };
  }

  if (city === "용인시" && (name.startsWith("골드CC 시립테니스장") || name.startsWith("동백산오름공원 테니스장") || name === "공세동 테니스장")) {
    const indoor = name.includes("실내");
    const fee = priced(2, indoor ? "indoor" : "outdoor", 2000, 2000);
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "월별 접수 일정에 따라 구민 우선→시민 우선→일반 온라인 선착순", booking_site_link: yongin, booking_online_reserve_possible: true, booking_today_booking_possible: false },
      rule: irregular("월별 공지에 따라 구민→시민→일반 온라인 선착순", yongin, "다음 달 이용분 · 2시간 단위"), fee,
      note: "용인시 공공체육시설 통합예약 대상. 공식 시설 상세에 1면 2시간 평일/주말 2,000원 및 당일 예약 불가가 안내됨. 2026년 10월 골드 접수는 시민 우선 9/17, 일반 9/18 등 월별로 달라 고정일 규칙으로 저장하지 않음. 골드 전체는 공식 안내상 10면이지만 DB에는 코트별 6건만 있어 총 면수를 각 행에 복제하지 않음.",
    };
  }
  if (city === "용인시" && id === "GJ28R1306571") {
    return {
      values: { booking_rule_type: "phone", booking_reception_time: "토요일 13:00~18:00 · 담당자 유선 예약 후 확정", booking_online_reserve_possible: false },
      rule: irregular("담당자 유선 예약 후 확정", eshare(id), "토요일 13:00~18:00", "phone"), fee: free,
      note: "한국도로공사 용인지사 실외 2면. 토요일 13:00~18:00만 개방하며 02-2219-6512 유선 예약 확정 후 이용 가능. 무료.",
    };
  }
  if (city === "용인시" && id === "GJ29I4402162") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "매월 1일 09:00부터 온라인 선착순 접수 · 토요일 13:00~17:00 이용", booking_online_reserve_possible: true },
      rule: irregular("매월 1일 09:00부터 온라인 선착순", eshare(id), "토요일 13:00~17:00 · 2시간 단위"), fee: free,
      note: "한국도로공사 수원지사 테니스장 2면 중 1면 개방. 토요일 13:00~17:00, 2시간 단위, 무료. 매월 1일 09:00부터 접수하나 어느 달 이용분인지 원문에 명시되지 않아 고정일 계산 규칙은 보류.",
    };
  }

  if (city === "의왕시" && name.startsWith("청계체육공원 테니스장")) {
    const use = name.includes("1번") ? "강습 전용 코트" : name.includes("2번") ? "장기배정 코트" : "일반예약 코트";
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "대체로 전월 25일 09:00 다음 달 예약 · 월별 예외 공지 확인", booking_online_reserve_possible: true },
      rule: irregular("대체로 전월 25일 09:00 다음 달 예약", source, `${use} · 예외 공지 확인`),
      note: `${use}. 원문 요금은 1시간 기준 평일 주간/야간 3,000/5,000원, 주말·공휴일 4,000/7,000원. 주야간 분리 요금 컬럼이 없어 구조화 요금 보류. 2026년 2월분은 1/26 09:00으로 조정된 예외가 있어 고정 25일 규칙으로 저장하지 않음. 원문: ${source}`,
    };
  }
  if (city === "의왕시" && /^청계소프트테니스장\([AB]코트\)/.test(name)) {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "대체로 전월 25일 09:00 접수 · 이용 3일 전 마감", booking_online_reserve_possible: true },
      rule: irregular("대체로 전월 25일 09:00 접수", source, "이용 3일 전 마감 · 월별 예외 확인"),
      note: `청계소프트테니스장 코트별 항목. 테니스/소프트테니스 이용 가능 표기가 함께 있으며 기본 6,000원, 주말·공휴일 10,000원, 야간 8,000원/회차가 원문에 표시됨. 회차 길이와 요일별 일부 변동이 있어 구조화 요금 보류. 원문: ${source}`,
    };
  }

  if (city === "이천시" && name.startsWith("4-테니스장 (대월면")) {
    return {
      values: { booking_rule_type: "phone", booking_reception_time: "대월면 체육공원 전화 문의·협의 후 대관", booking_online_reserve_possible: false },
      rule: irregular("전화 문의·협의 후 대관", source, "코트별 항목 · 2시간 기준", "phone"),
      note: `대월면 체육공원 실외 인조잔디 3면의 1·2·3면 대관 구성별 항목. 3면 자원 상세에는 전용사용 2시간 기준 평일/주말 주간 10,000/20,000원, 야간 15,000/25,000원이 게시되어 있으나 다른 자원에는 0원·오래된 달력 등 충돌 정보가 있어 코트별 요금을 일괄 입력하지 않음. 현재 DB에 주야간 기본요금 구분도 없어 구조화 요금 보류. 원문: ${source}`,
    };
  }
  if (city === "이천시" && id === "GJ28Q5347371") {
    return {
      values: { booking_rule_type: "phone", booking_reception_time: "이용 2주 전 담당자 유선 예약 필수", booking_online_reserve_possible: false },
      rule: irregular("이용 2주 전 담당자 유선 예약", eshare(id), "관리자 승인", "phone"), fee: free,
      note: "한국도로공사 이천지사 실외 테니스장 2면, 무료. 이용 2주 전 033-811-6811 유선 예약 필수. 보안시설로 건물·화장실 이용 불가.",
    };
  }

  if (city === "평택시" && id === "EE18J4430042") {
    return {
      values: { booking_reception_time: "현재 시설 보수로 한시적 이용 불가 · 재개 공지 확인 필요" },
      note: `관세청 평택세관 시설. 무료·신청서 이용 30~3일 전 제출 및 기관 승인 방식이지만, 원문에 시설 보수로 한시적 이용 불가라고 명시됨. 상단 운영표와 상세설명의 휴일 개방 여부가 충돌하므로 예약 규칙·시간은 checking 유지. 원문: https://www.eshare.go.kr/UserPortal/Upv/UprResrcGym/index.do?rsrc_no=${id}`,
    };
  }

  if (city === "하남시" && name.startsWith("미사한강공원 테니스장")) {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "하남시 온라인 달력에서 코트별 예약 · 고정 오픈 시각 미확인", booking_site_link: hanamMisa, booking_online_reserve_possible: true },
      rule: irregular("하남시 온라인 달력에서 코트별 예약", hanamMisa, "고정 오픈 시각 미확인"),
      note: "미사한강공원 테니스장 1~4코트의 개별 예약 항목. 온라인 달력에서 날짜·시간을 선택한다. 인조잔디 코트로 확인되지만 요금 및 정기 예약 오픈 시각은 공식 공개화면에서 확인되지 않아 보류.",
    };
  }
  if (city === "하남시" && name.startsWith("하남종합운동장 제")) {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "매월 둘째 월·화요일 10:00 관내 우선예약 · 공휴일이면 익일 조정", booking_site_link: "https://rent.hanamsport.or.kr/hanam_rent_ms/", booking_online_reserve_possible: true },
      rule: irregular("매월 둘째 월·화요일 10:00 관내 우선예약", hanamStadium, "공휴일 예외 · 잔여 일반접수 일정 확인"),
      note: `하남국민체육센터 제1·제2테니스장 온라인 대관. 매월 둘째 월·화요일 10:00 관내 승인 개인/단체 우선예약, 해당일 공휴일이면 익일로 변경. 관외 잔여접수 시각과 현행 코트별 요금은 공개 접수안내에서 확인되지 않아 보류. 출처: ${hanamStadium}`,
    };
  }
  if (city === "하남시" && id === "GK18J5101953") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "분기별 신청 수요 취합 후 배정·관리자 승인", booking_online_reserve_possible: true },
      rule: irregular("분기별 신청 수요 취합 후 관리자 승인", eshare(id), "신청 즉시 확정되지 않음"), fee: free,
      note: "한국도로공사 동서울지사 무료 실외 테니스장. 분기 내 신청을 모아 배정 기준에 따라 확정하므로 고정 선착순 오픈 규칙이 아님.",
    };
  }

  if (city === "화성시" && /^테니스장-[동하]절기$/.test(name)) {
    const summer = name.endsWith("하절기");
    return {
      values: { booking_rule_type: "fixed_schedule", booking_reception_time: "매월 1일 12:00 다음 달 이용분 경기공유서비스 선착순 오픈", booking_online_reserve_possible: true, booking_today_booking_possible: false, ...hours(null, null, summer ? "06:00:00" : "09:00:00", summer ? "20:00:00" : "17:00:00") },
      rule: fixedDay(1, "12:00:00", "매월 1일 12:00 온라인 선착순", source, summer ? "3~10월 주말·공휴일 이용분" : "11~2월 주말·공휴일 이용분"), fee: free,
      note: `경기도농업기술원 동일 시설의 ${summer ? "하절기(3~10월)" : "동절기(11~2월)"} 별도 자원. 평일 미개방, 주말·공휴일 ${summer ? "06:00~20:00" : "09:00~17:00"}, 무료, 1일 1팀 2시간. 매월 1일 12:00 다음 달분 오픈, 당일예약 불가. 계절별 DB행이므로 중복 시설 여부는 별도 검토 필요. 원문: ${source}`,
    };
  }
  if (city === "화성시" && id === "GG11K811613") {
    return {
      values: { booking_rule_type: "irregular", booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 정기 오픈 시각 미공개", booking_online_reserve_possible: true },
      rule: irregular("공유누리 온라인 신청 후 관리자 승인", eshare(id), "1회 최대 4시간 · 1인당 반기 1회"), fee: free,
      note: "한국도로공사 화성지사 무료 실외 테니스장. 1회 8명 이하, 예약당 최대 4시간, 1인 반기 1회 이용 제한. 정기 오픈 시각은 미공개.",
    };
  }

  return null;
}

const { data: courts, error: readError } = await db.from("courtinfo")
  .select("id,basic_city,basic_court_name,booking_site_link,booking_rule_type,source_service_id,etc_desc,source_provider")
  .eq("basic_region", "경기").eq("source_provider", "eshare").in("basic_city", cities);
if (readError) throw readError;

const selected = courts.map((court) => ({ court, config: configFor(court) })).filter(({ config }) => config);
const skipped = courts.filter((court) => !configFor(court));
if (courts.length !== 115) throw new Error(`조사 대상 행 수 변경: ${courts.length}/115`);
if (selected.some(({ court }) => court.booking_rule_type !== "checking" && !court.etc_desc?.includes(marker))) {
  throw new Error("다른 작업에서 이미 갱신된 대상이 있습니다. 재검토 후 실행하세요.");
}
const ids = selected.map(({ court }) => court.id);
const { data: activeRules, error: ruleReadError } = await db.from("court_booking_rules")
  .select("id,court_id").in("court_id", ids).eq("is_active", true);
if (ruleReadError) throw ruleReadError;
const ruleByCourt = new Map();
for (const rule of activeRules) {
  if (ruleByCourt.has(rule.court_id) || !selected.find(({ court }) => court.id === rule.court_id)?.court.etc_desc?.includes(marker)) {
    throw new Error(`기존 활성 규칙이 현재 작업 소유가 아니거나 중복입니다: ${rule.court_id}`);
  }
  ruleByCourt.set(rule.court_id, rule);
}

console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", scope: courts.length, selected: selected.length, skipped: skipped.length,
  byCity: Object.fromEntries(cities.map((city) => [city, selected.filter(({ court }) => court.basic_city === city).length])),
  skippedNames: skipped.map(({ basic_city, basic_court_name }) => `${basic_city} ${basic_court_name}`) }, null, 2));
if (!apply) process.exit(0);

const changed = [];
for (const { court, config } of selected) {
  const values = {
    ...config.values,
    etc_desc: addNote(court.etc_desc, config.note),
    source_synced_at: now,
    updated_at: now,
  };
  const { data: updated, error: courtError } = await db.from("courtinfo").update(values)
    .eq("id", court.id).select("id");
  if (courtError) throw new Error(`${court.basic_city} ${court.basic_court_name}: ${courtError.message}`);
  if (updated.length !== 1) throw new Error(`${court.basic_city} ${court.basic_court_name}: 조건부 갱신 0건`);

  if (config.rule) {
    const rule = { court_id: court.id, is_active: true, sort_order: 10,
      ...config.rule, created_at: now, updated_at: now };
    const previous = ruleByCourt.get(court.id);
    const { data: inserted, error: insertError } = previous
      ? await db.from("court_booking_rules").update({ ...config.rule, updated_at: now }).eq("id", previous.id).select("id").single()
      : await db.from("court_booking_rules").insert(rule).select("id").single();
    if (insertError) throw new Error(`${court.basic_city} ${court.basic_court_name} 규칙: ${insertError.message}`);
    if (config.fee) {
      const fee = { booking_rule_id: inserted.id, ...config.fee, lighting_fee_separate: false,
        created_at: now, updated_at: now };
      const { error: feeError } = await db.from("court_booking_rule_fees").upsert(fee, { onConflict: "booking_rule_id" });
      if (feeError) throw new Error(`${court.basic_city} ${court.basic_court_name} 요금: ${feeError.message}`);
    }
  }
  changed.push(court.id);
  console.log(`완료 ${changed.length}/${selected.length}: ${court.basic_city} ${court.basic_court_name}`);
}

const { data: verified, error: verifyError } = await db.from("courtinfo")
  .select("id,basic_city,basic_court_name,booking_rule_type,etc_desc").in("id", ids);
if (verifyError) throw verifyError;
const { data: verifiedRules, error: verifyRuleError } = await db.from("court_booking_rules")
  .select("id,court_id,rule_type").in("court_id", ids).eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;
const expectedRuleCount = selected.filter(({ config }) => config.rule).length;
if (verified.length !== selected.length || verifiedRules.length !== expectedRuleCount || verified.some(({ etc_desc }) => !etc_desc?.includes(marker))) {
  throw new Error(`사후 검증 실패: courts=${verified.length}/${selected.length}, rules=${verifiedRules.length}/${expectedRuleCount}`);
}
const feeRuleIds = selected.filter(({ config }) => config.fee).map(({ court }) => verifiedRules.find(({ court_id }) => court_id === court.id)?.id);
const { data: verifiedFees, error: verifyFeeError } = feeRuleIds.length
  ? await db.from("court_booking_rule_fees").select("booking_rule_id,is_free,price_basis_hours").in("booking_rule_id", feeRuleIds)
  : { data: [], error: null };
if (verifyFeeError) throw verifyFeeError;
if (verifiedFees.length !== feeRuleIds.length) throw new Error(`요금 검증 실패: ${verifiedFees.length}/${feeRuleIds.length}`);
console.log(JSON.stringify({ updatedCourts: verified.length, insertedRules: verifiedRules.length, insertedFees: verifiedFees.length, skipped: skipped.length }, null, 2));
