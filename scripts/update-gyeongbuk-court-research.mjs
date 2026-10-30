import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase 환경 변수가 필요합니다.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 경북 시설·예약·요금정보 공식자료 재검증]";
const hiddenDuplicateId = "4141deaa-db31-4808-9981-8ad1056287ac";
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

const freeFee = { is_free: true };
const paidFee = (priceBasisHours, values) => ({
  is_free: false,
  price_basis_hours: priceBasisHours,
  ...values,
});

const rule = (ruleType, bookingRoundLabel, usagePeriodLabel, reservationUrl, fee = freeFee, extra = {}) => ({
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
    id: "94afc513-09db-4fdf-b4f3-a4a60a248912",
    name: "한국도로공사 대구지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 대구지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 문의 후 관리자 승인 · 문의 053-714-6315",
      booking_site_link: eshare("GG11K812476"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "14:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "토요일과 일요일 14:00~18:00에 개방하고 평일과 공휴일은 미개방입니다. 이용 전 전화 문의와 관리자 승인이 필요하며 한 팀당 최대 2시간 이용할 수 있습니다. 코트 면수와 표면 재질은 공식 자료에 없어 추정하지 않았습니다. 이용료는 무료입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "주말 14:00~18:00 · 팀당 최대 2시간", eshare("GG11K812476"))],
  },
  {
    id: "0357b66b-1258-4460-b99a-1a9534084f4c",
    name: "한국가스공사 대구경북지역본부 테니스장",
    values: {
      basic_court_name: "한국가스공사 대구경북지역본부 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "담당자 문의 후 이용일 5일 전까지 신청서 제출 · 문의 053-850-1874",
      booking_site_link: eshare("GG11K811153"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "주말 09:00~18:00 개방합니다. 국가보안시설 출입 절차 때문에 담당자와 먼저 협의한 뒤 이용일 5일 전까지 사전신청서를 제출해야 합니다. 출입신청 후 인솔자 동행이 필요합니다. 코트 면수와 재질은 공식 자료에 없어 추정하지 않았습니다. 이용료는 무료입니다.",
    rules: [rule("phone", "전화 협의 후 이용 5일 전 신청서 제출", "주말 09:00~18:00", eshare("GG11K811153"))],
  },
  {
    id: "f4741e80-9b9c-4296-bceb-f8ed474a0aed",
    name: "HF미래인재원 풋살장(테니스장)",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 이용일까지 7일 미만이면 전화 후 오프라인 신청",
      booking_site_link: eshare("GG11K811496"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "10:00:00",
      basic_time_of_use_weekday_to: "17:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "경주시민과 HF미래인재원 협력업체가 이용할 수 있는 실외 풋살·테니스 다목적구장입니다. 평일 10:00~17:00 운영하고 토·일·공휴일은 미개방입니다. 공유누리에서 신청 후 승인을 받으며 이용일까지 7일 미만이면 전화 문의 후 오프라인으로 신청해야 합니다. 1회 1~4시간, 무료입니다.",
    rules: [rule("irregular", "온라인 신청 후 관리자 승인", "평일 10:00~17:00 · 1회 1~4시간", eshare("GG11K811496"))],
  },
  {
    id: "8845a50f-fb28-409b-8a4a-f54fce33331d",
    name: "경주 근로자종합복지관 테니스장",
    values: {
      basic_court_name: "경주 근로자종합복지관 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "사용 신청 후 관리자 승인 · 문의 054-760-7974",
      booking_site_link: eshare("BA10A0004940"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "20:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
      ...zeroCounts,
    },
    note: "경주시민과 근로자 대상 시설입니다. 코트 1면이며 평일 09:00~20:00 운영하고 토요일·공휴일은 사용 신청이 있을 때 개방합니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 사용료는 1면 2시간 10,000원입니다.",
    rules: [rule("phone", "사용 신청 후 관리자 승인", "평일 09:00~20:00 · 주말 신청 시 개방", eshare("BA10A0004940"), paidFee(2, { outdoor_weekday_price: 10000, outdoor_weekend_price: 10000 }))],
  },
  {
    id: "e3749754-a670-4914-9204-c98f17bd4e43",
    name: "한국수력원자력 본사 테니스장",
    values: {
      basic_court_name: "한국수력원자력 본사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "현재일 기준 1개월 이내 신청 · 사용 전 근무일 12:00까지 온라인 접수",
      booking_site_link: "https://www.khnp.co.kr/main/contents.do?key=374",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "19:00:00",
      ...zeroCounts,
    },
    note: "경주시 거주 개인·단체를 우선하며 온라인 선착순으로 접수합니다. 현재일 기준 1개월 이내 날짜를 신청할 수 있고 사용 전 근무일 12:00까지 접수합니다. 평일은 06:00~22:00이며 주말·공휴일은 4~9월 06:00~19:00, 10~3월 06:00~17:00입니다. 주말·공휴일 단체행사는 예약이 필요하고 그 외에는 현장 여건에 따라 자율 이용할 수 있습니다. 무료입니다.",
    rules: [rule("irregular", "사용일 기준 1개월 이내 온라인 선착순", "사용 전 근무일 12:00까지 신청", "https://www.khnp.co.kr/main/contents.do?key=374")],
  },
  {
    id: "1faff8ee-0988-4945-af61-8522207e0f85",
    name: "한국도로공사 경주지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 문의 후 관리자 승인 · 문의 054-811-6713",
      booking_site_link: eshare("GH14I3314127"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "실외 테니스코트와 조명탑, 무료 주차장이 있습니다. 담당자와 사전 협의 후 관리자 승인을 받아야 합니다. 정기 오픈일, 운영시간, 면수와 표면 재질은 공개자료에서 확인되지 않아 추정하지 않았습니다. 무료입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "이용 일정 담당자 확인", eshare("GH14I3314127"))],
  },
  {
    id: "f178cfd1-b29f-4c3c-89d7-dc6f07a15759",
    name: "한국도로공사 고령지사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 신청 · 사전 승인 필요",
      booking_site_link: eshare("GG11K812478"),
      booking_online_reserve_possible: true,
      ...zeroCounts,
    },
    note: "실외 코트이며 공유누리 온라인 신청 후 사전 승인이 필요합니다. 예약자 1팀당 최대 3시간 이용할 수 있습니다. 정기 오픈일, 운영시간, 면수와 표면 재질은 공식 자료에 없어 추정하지 않았습니다. 무료입니다.",
    rules: [rule("irregular", "공유누리 온라인 신청 후 승인", "팀당 최대 3시간", eshare("GG11K812478"))],
  },
  {
    id: "bee92698-63bd-4d90-bca2-ed3a150edf9c",
    name: "한국도로공사 구미지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "이용 1주일 전까지 전화 예약 · 문의 053-714-6214",
      booking_site_link: eshare("GK03J4736386"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "같은 주소와 연락처로 중복 등록된 구형 ‘구미지사 테니스장’ 대신 이 항목만 노출합니다. 실외 코트 2면 중 1면을 개방하며 토·일요일 09:00~18:00 이용 가능합니다. 이용 1주일 전까지 전화 예약하고 현장에서 확인서를 작성·제출해야 합니다. 무료입니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다.",
    rules: [rule("phone", "이용 1주일 전까지 전화 예약", "토·일 09:00~18:00 · 2면 중 1면 개방", eshare("GK03J4736386"))],
  },
  {
    id: "c9996eb7-6eb2-496c-b868-3a7c95b588b8",
    name: "국립농산물품질관리원 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 이용자 명단 제출",
      booking_site_link: eshare("BA10A0016164"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "코트 2면이며 평일은 미개방, 주말·공휴일 09:00~18:00 운영합니다. 동절기 11~2월에는 17:00까지입니다. 공유누리 신청 후 평일 업무시간에 승인을 받으며 이용자 명단 제출이 필요합니다. 개인·단체당 월 2회, 1회 최대 4시간으로 제한됩니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 무료입니다.",
    rules: [rule("irregular", "공유누리 신청 후 평일 업무시간 승인", "주말·공휴일 이용 · 월 2회, 회당 최대 4시간", eshare("BA10A0016164"))],
  },
  {
    id: "84b4ffc0-a849-4e1c-a85e-8f87562ab2c9",
    name: "한국도로공사 본사 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리에서 A·B면 온라인 예약",
      booking_site_link: eshare("HC09N4510805"),
      booking_online_reserve_possible: true,
      ...zeroCounts,
    },
    note: "한국도로공사 본사 후면의 실외 A·B 코트 2면입니다. 공유누리에서 코트별 온라인 예약이 가능하며 별도의 정기 오픈 날짜와 운영시간은 공개되어 있지 않습니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 무료입니다.",
    rules: [rule("irregular", "공유누리 코트별 온라인 예약", "예약 화면에서 이용 가능 일정 확인", eshare("HC09N4510805"))],
  },
  {
    id: "b8326cd8-9faa-4649-b662-08dbb6802efd",
    name: "한국전력기술 테니스장",
    values: {
      basic_court_name: "한국전력기술 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "온라인 신청 후 관리자 승인 · 5인 이상 단체는 최소 1주일 전 신청",
      booking_site_link: eshare("BA10A0005278"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "10:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 코트로 주말·공휴일 등 회사 휴무일 10:00~18:00 운영합니다. 온라인 신청 후 평일 근무일에 관리자 승인을 받습니다. 5인 이상 단체는 최소 1주일 전 신청서와 사용약관을 제출해야 합니다. 1회 1~2시간, 무료입니다. 면수와 표면 재질은 공식 자료에 없어 추정하지 않았습니다.",
    rules: [rule("irregular", "온라인 신청 후 평일 근무일 승인", "주말·공휴일 10:00~18:00 · 1회 1~2시간", eshare("BA10A0005278"))],
  },
  {
    id: "2281ae42-74bb-4435-b59d-8dd75c7c74a9",
    name: "봉화복합스포츠단지 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "봉화군 통합예약 온라인 신청 후 관리자 승인",
      booking_site_link: "https://www.bonghwa.go.kr/reservation/main.do",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "봉화군 통합예약에 실내 테니스장 1~4번 코트가 등록되어 있어 총 4면으로 확인됩니다. 06:00~22:00 운영하며 온라인 신청 후 관리자 승인을 받습니다. 코트 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 사용료는 1면 2시간 5,000원이고 조간은 06:00~09:00, 주간은 09:00~18:00, 야간은 18:00~22:00입니다. 야간 요금에는 조명이 포함되며 조명을 사용하지 않으면 주간 요금을 적용합니다.",
    rules: [rule("irregular", "봉화군 통합예약 온라인 신청 후 승인", "06:00~22:00 · 실내 4면", "https://www.bonghwa.go.kr/reservation/main.do", paidFee(2, { indoor_weekday_price: 5000, indoor_weekend_price: 5000 }))],
  },
  {
    id: "1d5870d1-5df2-490e-a1b1-47c7eaae3b2c",
    name: "상주시생활체육공원 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "전화 또는 방문 접수 · 문의 054-532-7173",
      booking_site_link: "https://www.sangju.go.kr/sportspark",
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "08:00:00",
      basic_time_of_use_weekend_to: "19:00:00",
      ...zeroCounts,
    },
    note: "전화 또는 방문 접수 방식이며 공식 연락처는 054-532-7173입니다. 공유누리의 02-537-7672는 잘못된 번호로 판단되어 사용하지 않습니다. 평일 06:00~22:00, 주말 08:00~19:00 운영합니다. 코트 면수와 표면 재질은 공식 자료에 없어 추정하지 않았습니다. 1회 2시간 기본요금은 1,500원이며 조간·야간에는 2,500원이 추가됩니다.",
    rules: [rule("phone", "전화 또는 방문 접수", "평일 06:00~22:00 · 주말 08:00~19:00", "https://www.sangju.go.kr/sportspark", paidFee(2, { outdoor_weekday_price: 1500, outdoor_weekend_price: 1500, lighting_fee_separate: true, lighting_fee_amount: 2500, lighting_fee_basis_hours: 2, lighting_start_time: "18:00:00" }))],
  },
  {
    id: "4be9d1d7-b16d-475f-ab9e-55ac06cfddf5",
    name: "한국도로공사 상주지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 상주지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 문의 후 관리자 승인 · 문의 054-830-6715",
      booking_site_link: eshare("GI25O1449745"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "한국도로공사 상주지사 앞 실외 테니스장입니다. 전화 문의 후 관리자 승인을 받아야 하며 정기 오픈일, 운영시간, 면수와 표면 재질은 공개자료에서 확인되지 않았습니다. 무료입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "이용 일정 담당자 확인", eshare("GI25O1449745"))],
  },
  {
    id: "edd88383-1d8b-4e76-b8a3-ff316c8fca6b",
    name: "한국도로공사 성주지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 성주지사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 예약 · 팀당 최대 3시간",
      booking_site_link: eshare("GG11K812479"),
      booking_online_reserve_possible: true,
      ...zeroCounts,
    },
    note: "정문 옆 실외 코트 1면을 개방합니다. 공유누리 온라인 예약 방식이며 1팀당 최대 3시간 이용할 수 있습니다. 정기 오픈일, 운영시간과 표면 재질은 공개자료에서 확인되지 않았습니다. 무료입니다.",
    rules: [rule("irregular", "공유누리 온라인 예약", "실외 1면 · 팀당 최대 3시간", eshare("GG11K812479"))],
  },
  {
    id: "37134f0c-dc36-4812-8925-dc5bd55d58b9",
    name: "경북도청 체육시설 테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "이용 10~30일 전 온라인 신청 · 당일 예약 불가",
      booking_site_link: eshare("BA10A0005580"),
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
    },
    note: "테니스장 총 3면 중 평일에는 1면, 주말에는 2면을 신청할 수 있습니다. 이용 10~30일 전에 온라인 신청하며 당일 예약은 불가합니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 1면 2시간 기준 평일 주간 20,000원·야간 25,000원, 주말 주간 35,000원·야간 40,000원이며 야간요금에는 조명비가 포함됩니다.",
    rules: [rule("irregular", "이용 10~30일 전 온라인 신청", "09:00~22:00 · 당일 예약 불가", eshare("BA10A0005580"), paidFee(2, { outdoor_weekday_price: 20000, outdoor_weekend_price: 35000, lighting_fee_separate: true, lighting_fee_amount: 5000, lighting_fee_basis_hours: 2, lighting_start_time: "18:00:00" }))],
  },
  {
    id: "9c3fa13b-d008-4aa0-ab2f-494166a0cb55",
    name: "한국도로공사 영주지사 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "유선 예약 필수 · 문의 053-714-6712",
      booking_site_link: eshare("GK03O0220263"),
      booking_online_reserve_possible: false,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "15:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 코트 1면이며 일요일 15:00~18:00에만 개방합니다. 별도 조명이 없고 유선 예약이 필수입니다. 토요일은 미개방입니다. 표면 재질은 공식 자료에 없어 구조화하지 않았습니다. 무료입니다.",
    rules: [rule("phone", "유선 예약 필수", "일요일 15:00~18:00 · 조명 없음", eshare("GK03O0220263"))],
  },
  {
    id: "877a615c-4aa2-494a-a4eb-0b11e2a895f4",
    name: "영천실내테니스장",
    values: {
      booking_rule_type: "irregular",
      booking_reception_time: "B·C·D면 공유누리 온라인 신청 후 승인 · A면 전화예약 054-335-6089",
      booking_site_link: "https://www.yc.go.kr/depart/contents.do?mId=0303020600",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_indoor: 4,
    },
    note: "기존 시민테니스장 8면 중 4면에 막구조물을 설치한 실내 인조잔디 코트 4면입니다. B·C·D면은 공유누리 온라인 신청 후 승인, A면은 054-335-6089 전화예약 방식입니다. 06:00~22:00 운영하고 매주 월요일과 신정·설·추석 당일은 휴장합니다. 하루 최대 2시간 이용할 수 있습니다. 1면 1시간 기준 관내자는 평일 10,000원·휴일 12,000원, 관외자는 평일 15,000원·휴일 18,000원입니다.",
    rules: [
      {
        ...rule("irregular", "온라인 신청 또는 A면 전화예약", "06:00~22:00 · 하루 최대 2시간", "https://www.yc.go.kr/depart/contents.do?mId=0303020600", paidFee(1, { indoor_weekday_price: 10000, indoor_weekend_price: 12000 })),
        label: "시민",
        eligibility: "citizen",
        sort_order: 10,
      },
      {
        ...rule("irregular", "온라인 신청 또는 A면 전화예약", "06:00~22:00 · 하루 최대 2시간", "https://www.yc.go.kr/depart/contents.do?mId=0303020600", paidFee(1, { indoor_weekday_price: 15000, indoor_weekend_price: 18000 })),
        sort_order: 20,
      },
    ],
  },
  {
    id: "9d19bac6-abbb-41e4-b95f-19013d0c973b",
    name: "한국도로공사 영천지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 영천지사 테니스장",
      booking_rule_type: "irregular",
      booking_reception_time: "이용 주 금요일 14:00까지 신청 후 관리자 승인",
      booking_site_link: eshare("GG23Q4235113"),
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: null,
      basic_time_of_use_weekday_to: null,
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "18:00:00",
      ...zeroCounts,
    },
    note: "실외 코트로 평일은 미개방이며 주말·공휴일 09:00~18:00 운영합니다. 해당 주 금요일 14:00까지 신청해야 주말 이용 승인을 받을 수 있습니다. 면수와 표면 재질은 공식 자료에 없어 추정하지 않았습니다. 무료입니다.",
    rules: [rule("irregular", "이용 주 금요일 14:00까지 신청", "주말·공휴일 09:00~18:00", eshare("GG23Q4235113"))],
  },
  {
    id: "a6e2ebe6-a418-458b-819b-85c3e7793bc5",
    name: "울진종합운동장 테니스장",
    values: {
      basic_court_name: "울진종합운동장 테니스장",
      booking_rule_type: "ordinal",
      booking_reception_time: "매월 마지막 월요일 09:00 다음 달 이용분 온라인 오픈",
      booking_site_link: "https://www.uljin.go.kr/reserve/index.uljin?commonCode3=SF03&menuCd=DOM_000000411002000000&startPage=1",
      booking_online_reserve_possible: true,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "09:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "09:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 6,
    },
    note: "매월 마지막 월요일 09:00에 다음 달 이용분을 온라인으로 엽니다. 월~금 09:00~17:00에 신청할 수 있고 당일 이용은 전화 문의가 필요합니다. 운영시간은 09:00~22:00입니다. 공식 자료상 총 10면(야외 6면·실내 4면)이며 표면 구성은 인조잔디 6면·클레이 2면·앙투카 2면으로 안내되지만 실내외별 세부 표면 대응은 공개되지 않아 구조화 필드에는 확실한 실외 인조잔디 6면만 입력했습니다. 실내는 1면 2시간 기준 평일 10,000원, 주말·공휴일 15,000원입니다. 실외는 울진군민 주간 무료·야간 유료로 안내되지만 정확한 야간 금액은 공개자료에 없어 요금 설명에만 남겼습니다.",
    rules: [
      rule("ordinal", "매월 마지막 월요일 09:00 온라인 오픈", "다음 달 이용분", "https://www.uljin.go.kr/reserve/index.uljin?commonCode3=SF03&menuCd=DOM_000000411002000000&startPage=1", paidFee(2, { indoor_weekday_price: 10000, indoor_weekend_price: 15000 }), {
        open_type: "week",
        open_day_of_week: 1,
        open_ordinal: -1,
        open_time: "09:00:00",
        open_offset: "다음 달",
      }),
    ],
  },
  {
    id: "020b2a8c-9bf3-4c64-a7d8-826fc35b3129",
    name: "한울원자력본부 나곡사택 테니스장",
    values: {
      basic_court_name: "한울원자력본부 나곡사택 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "간편예약 전 전화 문의 · 단체 이용 시 관리자 승인 · 문의 054-785-1815",
      booking_site_link: eshare("BA10A0006060"),
      booking_online_reserve_possible: false,
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "00:00:00",
      basic_time_of_use_weekday_to: "23:59:00",
      basic_time_of_use_weekend_from: "00:00:00",
      basic_time_of_use_weekend_to: "23:59:00",
      ...zeroCounts,
    },
    note: "평일·토요일·공휴일 종일 개방 시설이며 단체 이용은 전화 문의 후 사용 승인을 받아야 합니다. 대운동장과 바비큐장 옆에 위치합니다. 공유누리에는 동호회 가입 후 무료 이용으로 안내되어 있습니다. 코트 면수와 표면 재질은 공식 자료에 없어 구조화하지 않았습니다.",
    rules: [rule("phone", "전화 문의 후 단체 이용 승인", "평일·주말·공휴일 종일 개방", eshare("BA10A0006060"))],
  },
  {
    id: "fcece5e0-20ee-4ee1-bb31-501c479c36c6",
    name: "한울원자력본부 죽변사택 테니스장",
    values: {
      booking_rule_type: "phone",
      booking_reception_time: "간편예약 전 전화 문의 후 관리자 승인 · 문의 054-785-1815",
      booking_site_link: eshare("GG11K813394"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "누구나 이용 가능하지만 간편예약 전에 담당자와 전화로 협의하고 승인을 받아야 합니다. 정기 오픈일, 운영시간, 면수와 표면 재질은 공개자료에서 확인되지 않았습니다. 무료입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "이용 일정 담당자 확인", eshare("GG11K813394"))],
  },
  {
    id: "a6ff9817-d3e2-45e6-afd1-6dd434a5bcc1",
    name: "한국전력공사 의성지사 테니스장",
    values: {
      basic_court_name: "한국전력공사 의성지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "이용 전 담당자 사전 문의 · 문의 054-830-2213",
      booking_site_link: eshare("GG11K813845"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "이용 전 담당자와 사전 협의해야 합니다. 정기 오픈일, 운영시간, 면수와 표면 재질은 공식 공개자료에서 확인되지 않아 추정하지 않았습니다. 무료입니다.",
    rules: [rule("phone", "이용 전 담당자 사전 문의", "이용 일정 담당자 확인", eshare("GG11K813845"))],
  },
  {
    id: "abf1c9bb-0f1e-4d64-8854-0632423b4392",
    name: "한국도로공사 청송지사 테니스장",
    values: {
      basic_court_name: "한국도로공사 청송지사 테니스장",
      booking_rule_type: "phone",
      booking_reception_time: "사전 전화 문의 후 관리자 승인 · 문의 053-714-6911",
      booking_site_link: eshare("GG11K812480"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "실외 코트로 이용 전 담당자와 전화로 협의하고 승인을 받아야 합니다. 정기 오픈일, 운영시간, 면수와 표면 재질은 공개자료에서 확인되지 않았습니다. 무료입니다.",
    rules: [rule("phone", "전화 문의 후 관리자 승인", "이용 일정 담당자 확인", eshare("GG11K812480"))],
  },
  {
    id: "aa8096b0-b0ac-4f18-973d-273e3a83269c",
    name: "현동면체육공원 테니스장",
    values: {
      basic_court_name: "현동면체육공원 테니스장",
      booking_rule_type: "on_site",
      booking_reception_time: "예약 불필요 자원 · 현장 이용 · 문의 054-870-8401",
      booking_site_link: eshare("EJ30P2009250"),
      booking_online_reserve_possible: false,
      ...zeroCounts,
    },
    note: "공유누리에 예약 불필요 자원으로 등록되어 있어 현장 이용 방식으로 반영했습니다. 무료 주차가 가능하며 이용료는 무료입니다. 운영시간, 면수와 표면 재질은 공식 자료에서 확인되지 않아 추정하지 않았습니다.",
    rules: [rule("on_site", "예약 불필요 · 현장 이용", "운영 일정 현장 확인", eshare("EJ30P2009250"))],
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

const allIds = [...courts.map(({ id }) => id), hiddenDuplicateId];
const { data: existingCourts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,etc_desc,booking_site_link,use_or_not")
  .in("id", allIds);
if (courtReadError) throw courtReadError;
if (existingCourts.length !== allIds.length) {
  throw new Error(`대상 시설 수 불일치: ${existingCourts.length}/${allIds.length}`);
}

const { data: existingRules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,reservation_url,sort_order,is_active")
  .in("court_id", allIds)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;

const rulesByCourt = new Map();
for (const existingRule of existingRules) {
  const current = rulesByCourt.get(existingRule.court_id) ?? [];
  current.push(existingRule);
  rulesByCourt.set(existingRule.court_id, current);
}

const expectedRuleCount = courts.reduce((sum, court) => sum + court.rules.length, 0);
console.log(`갱신 ${courts.length}개 + 중복 숨김 1개 · 예약 규칙 ${expectedRuleCount}개 · 적용 모드: ${shouldApply ? "YES" : "NO (dry-run)"}`);
if (!shouldApply) {
  console.table(courts.map(({ name, values, rules }) => ({
    name,
    type: values.booking_rule_type,
    rules: rules.length,
    weekday: values.basic_time_of_use_weekday_from
      ? `${values.basic_time_of_use_weekday_from}-${values.basic_time_of_use_weekday_to}`
      : "-",
    weekend: values.basic_time_of_use_weekend_from
      ? `${values.basic_time_of_use_weekend_from}-${values.basic_time_of_use_weekend_to}`
      : "-",
    fee: rules.every(({ fee }) => fee.is_free) ? "무료" : "유료 포함",
  })));
  process.exit(0);
}

const hiddenRules = rulesByCourt.get(hiddenDuplicateId) ?? [];
const { error: hideCourtError } = await supabase
  .from("courtinfo")
  .update({ use_or_not: false, updated_at: now })
  .eq("id", hiddenDuplicateId);
if (hideCourtError) throw new Error(`구미 중복 시설 숨김 실패: ${hideCourtError.message}`);

if (hiddenRules.length) {
  const hiddenRuleIds = hiddenRules.map(({ id }) => id);
  const { error: deactivateError } = await supabase
    .from("court_booking_rules")
    .update({ is_active: false, updated_at: now })
    .in("id", hiddenRuleIds);
  if (deactivateError) throw new Error(`구미 중복 예약 규칙 비활성화 실패: ${deactivateError.message}`);
  const { error: hiddenFeeError } = await supabase
    .from("court_booking_rule_fees")
    .delete()
    .in("booking_rule_id", hiddenRuleIds);
  if (hiddenFeeError) throw new Error(`구미 중복 요금 정리 실패: ${hiddenFeeError.message}`);
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
  const { error } = await supabase
    .from("court_booking_rule_fees")
    .upsert(row, { onConflict: "booking_rule_id" });
  if (error) throw new Error(`${courtName} 요금 갱신 실패: ${error.message}`);
};

for (const config of courts) {
  const existingCourt = existingCourts.find(({ id }) => id === config.id);
  const currentRules = rulesByCourt.get(config.id) ?? [];
  if (!currentRules.length) throw new Error(`${config.name}의 활성 예약 규칙이 없습니다.`);

  const { error: courtUpdateError } = await supabase
    .from("courtinfo")
    .update({
      ...resetLegacyBookingFields,
      ...config.values,
      use_or_not: true,
      etc_desc: appendNote(existingCourt.etc_desc, config.note),
      updated_at: now,
    })
    .eq("id", config.id);
  if (courtUpdateError) throw new Error(`${config.name} 시설 갱신 실패: ${courtUpdateError.message}`);

  for (let index = 0; index < config.rules.length; index += 1) {
    const desired = config.rules[index];
    const { fee, ...desiredRule } = desired;
    const existingRule = currentRules[index];
    const payload = {
      ...resetRuleFields,
      label: "전체",
      eligibility: "normal",
      reservation_url: config.values.booking_site_link ?? existingCourt.booking_site_link,
      booking_round_label: null,
      usage_period_label: null,
      is_active: true,
      sort_order: (index + 1) * 10,
      ...desiredRule,
      updated_at: now,
    };

    let ruleId;
    if (existingRule) {
      const { error } = await supabase
        .from("court_booking_rules")
        .update(payload)
        .eq("id", existingRule.id);
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
    const obsoleteIds = obsoleteRules.map(({ id }) => id);
    const { error } = await supabase
      .from("court_booking_rules")
      .update({ is_active: false, updated_at: now })
      .in("id", obsoleteIds);
    if (error) throw new Error(`${config.name} 이전 예약 규칙 비활성화 실패: ${error.message}`);
    const { error: obsoleteFeeError } = await supabase
      .from("court_booking_rule_fees")
      .delete()
      .in("booking_rule_id", obsoleteIds);
    if (obsoleteFeeError) throw new Error(`${config.name} 이전 요금 정리 실패: ${obsoleteFeeError.message}`);
  }

  console.log(`완료: ${config.name}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,use_or_not,booking_rule_type,booking_reception_time,etc_desc")
  .in("id", allIds)
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const visibleIds = courts.map(({ id }) => id);
const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,label,eligibility,rule_type,open_type,open_day_of_week,open_ordinal,open_time,open_offset,is_active")
  .in("court_id", visibleIds)
  .eq("is_active", true);
if (verifyRuleError) throw verifyRuleError;

const { data: verifiedFees, error: verifyFeeError } = await supabase
  .from("court_booking_rule_fees")
  .select("booking_rule_id,is_free,price_basis_hours,outdoor_weekday_price,outdoor_weekend_price,indoor_weekday_price,indoor_weekend_price,lighting_fee_separate,lighting_fee_amount")
  .in("booking_rule_id", verifiedRules.map(({ id }) => id));
if (verifyFeeError) throw verifyFeeError;

const hidden = verifiedCourts.find(({ id }) => id === hiddenDuplicateId);
const visible = verifiedCourts.filter(({ id }) => id !== hiddenDuplicateId);
const invalidNotes = visible.filter(({ etc_desc }) => !etc_desc?.includes(marker));
const uljinRule = verifiedRules.find(({ court_id }) => court_id === "a6e2ebe6-a418-458b-819b-85c3e7793bc5");
const yeongcheonRules = verifiedRules.filter(({ court_id }) => court_id === "877a615c-4aa2-494a-a4eb-0b11e2a895f4");

if (
  verifiedCourts.length !== 26 ||
  visible.some(({ use_or_not }) => !use_or_not) ||
  hidden?.use_or_not !== false ||
  verifiedRules.length !== expectedRuleCount ||
  verifiedFees.length !== expectedRuleCount ||
  invalidNotes.length ||
  uljinRule?.rule_type !== "ordinal" ||
  uljinRule?.open_ordinal !== -1 ||
  uljinRule?.open_day_of_week !== 1 ||
  yeongcheonRules.length !== 2
) {
  throw new Error(`검증 실패: courts=${verifiedCourts.length}, visible=${visible.filter(({ use_or_not }) => use_or_not).length}, hidden=${hidden?.use_or_not}, rules=${verifiedRules.length}/${expectedRuleCount}, fees=${verifiedFees.length}/${expectedRuleCount}, notes=${invalidNotes.length}, uljin=${JSON.stringify(uljinRule)}, yeongcheon=${yeongcheonRules.length}`);
}

console.log(JSON.stringify({
  verifiedCourts: verifiedCourts.length,
  visibleCourts: visible.filter(({ use_or_not }) => use_or_not).length,
  hiddenDuplicates: hidden?.use_or_not === false ? 1 : 0,
  verifiedRules: verifiedRules.length,
  verifiedFees: verifiedFees.length,
  freeFees: verifiedFees.filter(({ is_free }) => is_free).length,
  paidFees: verifiedFees.filter(({ is_free }) => !is_free).length,
  ruleTypes: verifiedRules.reduce((acc, { rule_type }) => ({
    ...acc,
    [rule_type]: (acc[rule_type] ?? 0) + 1,
  }), {}),
}, null, 2));
