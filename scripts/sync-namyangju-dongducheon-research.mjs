import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase 환경 변수가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const now = new Date().toISOString();
const marker = "[2026-09 남양주·동두천 공식자료 재검증]";
const namyangjuBookingUrl = "https://www.nyj.go.kr/rent";
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

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const existingDefinitions = [
  {
    names: ["가운동 테니스장"],
    values: {
      basic_address: "경기 남양주시 다산동 739",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    },
    note: "공식 체육시설 현황 기준 실외 테니스장 2면입니다. 표면 재질은 공식 자료에 공개되지 않았습니다.",
  },
  {
    names: ["가운푸른물센터 테니스장"],
    values: {
      basic_address: "경기 남양주시 다산동 689",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 수시접수 · 무료",
    },
    note: "통합예약에 등록된 실외 1면 무료 시설입니다. 고정 예약 오픈일은 월별 공지를 확인해야 합니다.",
  },
  {
    names: ["남양주체육문화센터 테니스장"],
    values: {
      basic_address: "경기 남양주시 다산지금로 91",
      basic_map_link: naverSearch("남양주체육문화센터 테니스장"),
      booking_site_link: "https://app.ncuc.or.kr/nyj/319",
      booking_rule_type: "irregular",
      booking_reception_time: "센터 대관·일일입장 일정 확인 · 2시간 기준",
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "20:00:00",
      ...zeroCounts,
      court_count_grass_outdoor: 5,
    },
    note: "남양주도시공사 공식 안내 기준 인조잔디 5면과 조명시설이 있습니다. 공휴일은 09:00~17:00이며 매월 1·3주 일요일은 휴관합니다.",
  },
  {
    names: Array.from({ length: 5 }, (_, i) =>
      `별내동 테니스장 ${String.fromCharCode(65 + i)}코트(별내체육공원테니스장)`,
    ),
    values: {
      basic_address: "경기 남양주시 별내동 861",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 관리자 승인 · 2시간 회차",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
    },
    mapQuery: "별내택지지구체육공원 테니스장",
    note: "별내택지지구체육공원 실외 5면 중 해당 코트입니다. 예약 화면은 06:00~22:00, 2시간 단위이며 관리자 승인 방식입니다.",
  },
  {
    names: Array.from({ length: 5 }, (_, i) =>
      `별내면 테니스장 ${String.fromCharCode(65 + i)}코트(광전리 테니스장)`,
    ),
    values: {
      basic_address: "경기 남양주시 별내면 광전리 199-21",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 관리자 승인",
    },
    mapQuery: "별내면 광전리 테니스장",
    note: "별내면 광전리 실외 5면 중 해당 코트입니다. 신청 후 관리자 승인을 거치며 표면 재질은 공식 자료에 공개되지 않았습니다.",
  },
  {
    names: ["부평리 생활체육시설 테니스장"],
    values: {
      basic_address: "경기 남양주시 진접읍 부평리 498-3",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    },
    note: "공식 체육시설 현황 기준 실외 2면입니다. 시설별 최신 일반요금과 표면 재질은 공개자료로 확정하지 못해 기존 요금을 유지했습니다.",
  },
  {
    names: ["북한강테니스장"],
    values: {
      basic_address: "경기 남양주시 화도읍 금남리 160-1",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 1일 최소 2시간~최대 4시간",
    },
    note: "공식 시설안내 기준 실외 2면입니다. 2시간 기준 평일 주간 10,000원·야간 20,000원, 토·공휴일 주간 20,000원·야간 30,000원입니다.",
  },
  {
    names: [
      "약대울 체육시설 테니스장A",
      "약대울 체육시설 테니스장B",
      "약대울 체육시설 테니스장C",
    ],
    values: {
      basic_address: "경기 남양주시 평내동 180-13",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 선착순 자동승인 · 2시간 회차",
    },
    mapQuery: "약대울 테니스장",
    note: "3~10월 예약 화면 기준 06:00부터 2시간 회차로 운영됩니다. C코트는 개인 우선이며 계절별 종료시간은 월별 예약 화면을 확인해야 합니다.",
  },
  {
    names: ["양골체육시설 테니스장"],
    values: {
      basic_address: "경기 남양주시 금곡동 693-2",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    },
    note: "남양주시 공식 체육시설 현황의 주소로 정정했습니다. 실외 3면이며 표면 재질과 시설별 최신 일반요금은 추가 확인이 필요합니다.",
  },
  {
    names: ["양지리 생활체육공원 테니스장"],
    values: {
      basic_address: "경기 남양주시 오남읍 양지리 105-1",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
    },
    note: "공식 현황 기준 실외 4면입니다. 현재 예약 달력은 07:00~23:00, 2시간 회차로 운영됩니다.",
  },
  {
    names: ["월문리 체육시설 (테니스장, 족구장)"],
    values: {
      basic_address: "경기 남양주시 와부읍 월문리 1281-8",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    },
    mapQuery: "월문리 생활체육시설 테니스장",
    note: "남양주시 공식 체육시설 현황 기준 실외 5면입니다. 표면 재질과 고정 예약 오픈일은 공개되지 않았습니다.",
  },
  {
    names: ["장현배수지 생활체육시설 테니스장"],
    values: {
      basic_address: "경기 남양주시 진접읍 장현리 산25-1",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 선착순 · 2시간 회차",
    },
    note: "최신 남양주시 공식 체육시설 현황 기준 실외 4면입니다. 기존 설명의 3면 표기를 4면으로 바로잡았습니다.",
  },
  {
    names: ["지금배수지테니스장"],
    values: {
      basic_address: "경기 남양주시 지금동 산1098-8",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "06:00:00",
      basic_time_of_use_weekday_to: "22:00:00",
      basic_time_of_use_weekend_from: "06:00:00",
      basic_time_of_use_weekend_to: "22:00:00",
    },
    note: "공식 체육시설 현황 기준 실외 6면입니다. 현재 예약 화면은 06:00~22:00, 2시간 회차로 운영됩니다.",
  },
  {
    names: ["체육공원2호 (테니스코트)"],
    values: {
      basic_address: "경기 남양주시 다산동 6033",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    },
    mapQuery: "다산 체육공원2호 테니스장",
    note: "남양주시 공식 체육시설 현황 기준 실외 3면입니다. 표면 재질은 공식 자료에 공개되지 않았습니다.",
  },
  {
    names: ["퇴계원 테니스장"],
    values: {
      basic_address: "경기 남양주시 퇴계원읍 퇴계원리 136-1",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · 관리자 승인 · 2시간 회차",
      time_of_use_same: true,
      basic_time_of_use_weekday_from: "07:00:00",
      basic_time_of_use_weekday_to: "23:00:00",
      basic_time_of_use_weekend_from: "07:00:00",
      basic_time_of_use_weekend_to: "23:00:00",
    },
    note: "공식 안내 기준 실외 3면입니다. 예약 달력은 07:00~23:00, 2시간 회차이며 관리자 승인 방식입니다.",
  },
  {
    names: ["호평동 생활체육시설 테니스장"],
    values: {
      basic_address: "경기 남양주시 호평동 295-2",
      booking_rule_type: "on_site",
      booking_reception_time: "무료개방 · 현장 이용",
      booking_online_reserve_possible: false,
      booking_today_booking_possible: true,
    },
    note: "국도 46호선 교량 하부의 실외 2면 무료개방 시설입니다. 표면 재질은 공식 자료에 공개되지 않았습니다.",
  },
  {
    names: ["화도테니스장"],
    values: {
      basic_address: "경기 남양주시 화도읍 녹촌리 99-21",
      booking_site_link: namyangjuBookingUrl,
      booking_rule_type: "irregular",
      booking_reception_time: "남양주시 통합예약 월별 공지 후 수시접수 · B코트와 A·C 잔여시간 일반 예약",
    },
    note: "공식 안내 기준 실외 3면입니다. A·C는 등록 동호회 우선, B와 잔여시간은 일반 예약 대상입니다.",
  },
  {
    city: "동두천시",
    names: ["동두천 종합운동장 테니스장"],
    values: {
      basic_address: "경기 동두천시 어등로 45",
      booking_rule_type: "checking",
      booking_reception_time: "사전 신청·사용승인 방식 · 정확한 예약 오픈 일정은 시설사업소 확인 필요",
    },
    note: "동두천시 공식 자료 기준 총 8면입니다. 이 중 4면은 인조잔디 및 막구조 지붕 설치가 확인되며 나머지 4면의 최신 표면과 운영시간·요금은 추정 입력하지 않았습니다. 시설사업소 031-860-3300.",
  },
  {
    city: "동두천시",
    names: ["동두천지사 테니스장"],
    values: {
      basic_address: "경기 동두천시 평화로 2262",
      booking_rule_type: "irregular",
      booking_reception_time: "공유누리 온라인 예약 · 주민 대상 · 평일 18:00~19:00 · 관리자 승인",
      booking_online_reserve_possible: true,
      time_of_use_same: false,
      basic_time_of_use_weekday_from: "18:00:00",
      basic_time_of_use_weekday_to: "19:00:00",
      basic_time_of_use_weekend_from: null,
      basic_time_of_use_weekend_to: null,
    },
    mapQuery: "한국전력공사 동두천지사 테니스장",
    note: "공유누리 공개정보 기준 주민 대상 평일 18:00~19:00 이용 시설입니다. 요금·면수·표면은 공개자료에 없어 기존 값을 유지했습니다.",
  },
  {
    city: "동두천시",
    names: ["소요생활체육공원 테니스장"],
    values: {
      basic_address: "경기 동두천시 봉동로 27",
    },
    note: "현행 조례상 해당 동 지역주민 우선승인 시설입니다. 최신 테니스장 운영시간·면수·요금의 공식 공개 근거가 부족해 기존 DB 값을 유지하고 재확인 대상으로 표시했습니다.",
  },
];

const newDefinitions = [
  {
    name: "진건공공하수처리시설 테니스장 A코트",
    slug: "jingeon-public-wastewater-tennis-court-a",
    address: "경기 남양주시 진건읍 금강로380번길 67",
    latitude: 37.635411617983,
    longitude: 127.150754073575,
    mapQuery: "진건공공하수처리시설 테니스장",
    reception: "남양주시 통합예약 월별 공지 후 수시접수 · 관리자 승인 · 07:00~21:00 · 2시간 회차",
    note: "진건공공하수처리시설 실외 2면 중 A코트입니다. 시설별 최신 요금과 표면 재질은 확인 전까지 비워 둡니다.",
    hours: ["07:00:00", "21:00:00"],
  },
  {
    name: "진건공공하수처리시설 테니스장 B코트",
    slug: "jingeon-public-wastewater-tennis-court-b",
    address: "경기 남양주시 진건읍 금강로380번길 67",
    latitude: 37.635411617983,
    longitude: 127.150754073575,
    mapQuery: "진건공공하수처리시설 테니스장",
    reception: "남양주시 통합예약 월별 공지 후 수시접수 · 관리자 승인 · 07:00~21:00 · 2시간 회차",
    note: "진건공공하수처리시설 실외 2면 중 B코트입니다. 시설별 최신 요금과 표면 재질은 확인 전까지 비워 둡니다.",
    hours: ["07:00:00", "21:00:00"],
  },
  {
    name: "다산진건 체육공원1호 테니스장",
    slug: "dasan-jingeon-sports-park-1-tennis-court",
    address: "경기 남양주시 다산동 4347-1",
    latitude: 37.6167912260418,
    longitude: 127.148967755393,
    mapQuery: "다산진건 체육공원1호 테니스장",
    reception: "남양주시 통합예약 월별 공지 후 수시접수 · 2시간 회차",
    note: "남양주시 공식 체육시설 현황 기준 실외 2면입니다. 최신 시설별 요금과 표면 재질은 확인 전까지 비워 둡니다.",
  },
  {
    name: "지금푸른물센터 테니스장",
    slug: "jigeum-water-center-tennis-court",
    address: "경기 남양주시 수석동 405-1",
    latitude: 37.5855938059123,
    longitude: 127.16701967735,
    mapQuery: "지금푸른물센터 테니스장",
    reception: "남양주시 통합예약 월별 공지 확인 · 세부 접수정보 확인 필요",
    note: "남양주시 공식 체육시설 현황 기준 실외 1면입니다. 최신 요금·표면·운영시간은 확인 전까지 비워 둡니다.",
  },
  ...["D", "E"].map((letter) => ({
    name: `약대울 체육시설 테니스장${letter}`,
    slug: `yakdaeul-sports-facility-tennis-court-${letter.toLowerCase()}`,
    address: "경기 남양주시 평내동 180-13",
    latitude: 37.6525849047845,
    longitude: 127.234009620867,
    mapQuery: "약대울 테니스장",
    reception: "남양주시 통합예약 월별 공지 후 수시접수 · 선착순 자동승인 · 2시간 회차",
    note: `2024년 신규 개장한 약대울 실외 ${letter}코트입니다. 3~10월은 06:00부터 2시간 회차로 운영되며 계절별 종료시간은 예약 화면을 확인해야 합니다.`,
    fee: { weekday: 5000, weekend: 10000, lighting: 5000 },
  })),
];

async function readCourts() {
  const { data, error } = await supabase
    .from("courtinfo")
    .select("*")
    .in("basic_city", ["남양주시", "동두천시"]);
  if (error) throw new Error(`테니스장 조회 실패: ${error.message}`);
  return data ?? [];
}

async function upsertRule(courtId, definition) {
  const { data: existing, error: readError } = await supabase
    .from("court_booking_rules")
    .select("id")
    .eq("court_id", courtId)
    .eq("label", "전체 예약")
    .maybeSingle();
  if (readError) throw new Error(`예약 규칙 조회 실패: ${readError.message}`);

  const payload = {
    court_id: courtId,
    label: "전체 예약",
    eligibility: "normal",
    rule_type: "irregular",
    reservation_url: namyangjuBookingUrl,
    booking_round_label: "수시접수",
    usage_period_label: definition.reception,
    is_active: true,
    sort_order: 10,
    updated_at: now,
  };
  if (existing) {
    const { error } = await supabase.from("court_booking_rules").update(payload).eq("id", existing.id);
    if (error) throw new Error(`예약 규칙 갱신 실패: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("court_booking_rules")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`예약 규칙 등록 실패: ${error.message}`);
  return data.id;
}

async function upsertFee(ruleId, fee) {
  const { error } = await supabase.from("court_booking_rule_fees").upsert(
    {
      booking_rule_id: ruleId,
      is_free: false,
      price_basis_hours: 2,
      outdoor_weekday_price: fee.weekday,
      outdoor_weekend_price: fee.weekend,
      indoor_weekday_price: null,
      indoor_weekend_price: null,
      lighting_fee_separate: true,
      lighting_fee_amount: fee.lighting,
      lighting_fee_basis_hours: 2,
      lighting_start_time: null,
      updated_at: now,
    },
    { onConflict: "booking_rule_id" },
  );
  if (error) throw new Error(`요금 저장 실패: ${error.message}`);
}

const before = await readCourts();
const byKey = new Map(before.map((court) => [`${court.basic_city}:${court.basic_court_name}`, court]));
const existingNames = existingDefinitions.flatMap((definition) => definition.names);
const missingExisting = existingDefinitions.flatMap((definition) =>
  definition.names.filter(
    (name) => !byKey.has(`${definition.city ?? "남양주시"}:${name}`),
  ),
);
if (missingExisting.length) {
  throw new Error(`기존 대상 누락: ${missingExisting.join(", ")}`);
}

if (!shouldApply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    existingUpdates: existingNames.length,
    plannedInserts: newDefinitions.filter((definition) => !byKey.has(`남양주시:${definition.name}`)).length,
    idempotentUpdates: newDefinitions.filter((definition) => byKey.has(`남양주시:${definition.name}`)).length,
  }, null, 2));
  process.exit(0);
}

const touchedIds = [];
for (const definition of existingDefinitions) {
  const city = definition.city ?? "남양주시";
  for (const name of definition.names) {
    const court = byKey.get(`${city}:${name}`);
    const values = {
      ...definition.values,
      basic_map_link:
        definition.values.basic_map_link ?? naverSearch(definition.mapQuery ?? name),
      etc_desc: appendNote(court.etc_desc, definition.note),
      updated_at: now,
    };
    const { data, error } = await supabase
      .from("courtinfo")
      .update(values)
      .eq("id", court.id)
      .select("id")
      .single();
    if (error) throw new Error(`${name} 갱신 실패: ${error.message}`);
    touchedIds.push(data.id);
  }
}

for (const definition of newDefinitions) {
  const existing = byKey.get(`남양주시:${definition.name}`);
  const hours = definition.hours ?? [null, null];
  const payload = {
    basic_court_name: definition.name,
    slug: definition.slug,
    basic_owner_type: "시립",
    basic_address: definition.address,
    basic_map_link: naverSearch(definition.mapQuery),
    basic_latitude: definition.latitude,
    basic_longitude: definition.longitude,
    basic_region: "경기",
    basic_city: "남양주시",
    use_or_not: true,
    ...zeroCounts,
    booking_site_link: namyangjuBookingUrl,
    booking_rule_type: "irregular",
    booking_reception_time: definition.reception,
    booking_online_reserve_possible: true,
    booking_today_booking_possible: null,
    booking_booking_provide: "public_site",
    time_of_use_same: Boolean(definition.hours),
    basic_time_of_use_weekday_from: hours[0],
    basic_time_of_use_weekday_to: hours[1],
    basic_time_of_use_weekend_from: hours[0],
    basic_time_of_use_weekend_to: hours[1],
    etc_desc: appendNote(existing?.etc_desc, definition.note),
    updated_at: now,
  };

  const query = existing
    ? supabase.from("courtinfo").update(payload).eq("id", existing.id)
    : supabase.from("courtinfo").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(`${definition.name} 저장 실패: ${error.message}`);
  touchedIds.push(data.id);
  const ruleId = await upsertRule(data.id, definition);
  if (definition.fee) await upsertFee(ruleId, definition.fee);
}

const { data: verified, error: verifyError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name,basic_address,basic_map_link,basic_latitude,basic_longitude,booking_rule_type,booking_reception_time,use_or_not")
  .in("id", [...new Set(touchedIds)])
  .order("basic_city")
  .order("basic_court_name");
if (verifyError) throw new Error(`검증 조회 실패: ${verifyError.message}`);

const after = await readCourts();
const summary = {
  mode: "applied",
  beforeCount: before.length,
  afterCount: after.length,
  insertedCount: after.length - before.length,
  updatedOrInsertedCount: verified.length,
  naverMapCount: verified.filter((court) => court.basic_map_link?.includes("map.naver.com")).length,
  visibleCount: verified.filter((court) => court.use_or_not).length,
  newCourts: verified.filter((court) => newDefinitions.some((definition) => definition.name === court.basic_court_name)),
};
console.log(JSON.stringify(summary, null, 2));
