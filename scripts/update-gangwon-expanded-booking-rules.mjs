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
const marker = "[2026-09 강원 예약정보 확대 재검증]";

const updates = [
  {
    courtId: "e2a8f7df-fbfb-47b3-9133-7dc0d41b9e62",
    name: "거진실내테니스장",
    court: {
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_open_offset: "7",
      booking_open_time_normal: null,
      booking_reception_time: "고성군 통합예약 온라인 선착순 · 신청일 기준 7일 뒤까지 · 이용일 1일 전 마감",
      booking_site_link: "https://gwgs.go.kr/prog/fcltyRental/yeyak/sub04_01/7/list.do",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
    },
    note: "고성군 실제 예약 달력을 재확인했습니다. 신청일을 기준으로 7일 뒤 일정까지 순차적으로 열리는 롤링 예약이며 이용일 1일 전까지 신청해야 하고 당일 예약은 불가합니다. 공개 화면에는 매일 슬롯이 열리는 정확한 시각이 명시되어 있지 않아 오픈 시각은 비워 두었습니다. 2026년 10월 25일까지의 임시운영 안내는 고성군민 대상, 매일 09:00~21:00, 무료 운영입니다.",
    rule: {
      label: "7일 롤링 접수",
      eligibility: "normal",
      rule_type: "rolling",
      open_time: null,
      open_offset: "7",
      reservation_url: "https://gwgs.go.kr/prog/fcltyRental/yeyak/sub04_01/7/list.do",
      booking_round_label: "온라인 선착순 · 이용일 1일 전 마감",
      usage_period_label: "신청일 기준 7일 뒤까지",
    },
  },
  {
    courtId: "f75ff58d-8c59-4270-99f5-451c6ec4d177",
    name: "한국도로공사 양양지사 테니스장",
    court: {
      booking_rule_type: "rolling",
      booking_open_type: null,
      booking_open_offset: "30",
      booking_open_time_normal: null,
      booking_reception_time: "공유누리 온라인 신청 · 이용일 30일 전부터 3일 전까지 · 관리자 승인",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
    },
    note: "공유누리 신청 가능 기간을 예약 규칙으로 구조화했습니다. 이용일 30일 전부터 신청할 수 있고 이용일 3일 전에 접수가 마감되는 30일 롤링 방식이며, 신청 후 관리자 승인이 필요합니다. 정확한 일일 오픈 시각은 공개 안내에 없어 비워 두었습니다.",
    rule: {
      label: "30일 롤링 신청",
      eligibility: "normal",
      rule_type: "rolling",
      open_time: null,
      open_offset: "30",
      reservation_url: "https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=EI05I4515430",
      booking_round_label: "온라인 신청 후 관리자 승인",
      usage_period_label: "이용일 30일 전부터 3일 전까지",
    },
  },
  {
    courtId: "62f08d63-b7ac-420f-9156-9f8c0609c300",
    name: "동해시 웰빙레포츠타운 테니스장",
    court: {
      booking_rule_type: "checking",
      booking_open_type: null,
      booking_open_offset: null,
      booking_open_time_normal: null,
      booking_reception_time: "동해시시설관리공단 온라인 예약 · 정확한 오픈 일정 확인 필요",
      booking_site_link: "https://www.dhsisul.org/pages/sub.htm?mv_data=aWR4PTI2JnR5cGU9aGVhbHRo%7C%7C&nav_code=new1701855774",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
    },
    note: "공식 시설 안내에서 예약 홈페이지를 통해 신청하도록 안내하므로 기존의 현장 접수 분류를 온라인 예약으로 정정했습니다. 다만 공개 시설 안내에는 예약 슬롯의 고정 오픈일이나 롤링 범위가 명시되어 있지 않아 예약 규칙 유형은 확인 필요로 유지합니다.",
    rule: {
      label: "온라인 예약",
      eligibility: "normal",
      rule_type: "checking",
      open_time: null,
      open_offset: null,
      reservation_url: "https://www.dhsisul.org/pages/sub.htm?mv_data=aWR4PTI2JnR5cGU9aGVhbHRo%7C%7C&nav_code=new1701855774",
      booking_round_label: "동해시시설관리공단 온라인 예약",
      usage_period_label: "예약 화면에서 이용 가능 일정 확인",
    },
  },
  {
    courtId: "6339b7fb-49ec-4fd5-b07a-59ea0a30e82c",
    name: "춘천송암스포츠타운 테니스장",
    court: {
      booking_rule_type: "checking",
      booking_open_type: null,
      booking_open_offset: null,
      booking_open_time_normal: null,
      booking_reception_time: "춘천도시공사 통합예약 온라인 대관 · 당일 잔여분은 전화 또는 방문 문의",
      booking_site_link: "https://rev.cuc.or.kr/www/28",
      booking_online_reserve_possible: true,
    },
    note: "춘천도시공사 통합예약에서 코트와 날짜를 선택하는 온라인 대관 시설임을 확인하여 기존 비정기 예약 분류를 정정했습니다. 공개 시설 안내에는 일반 코트 대관의 월간 오픈일과 시각이 명시되어 있지 않아 확인 필요로 표시하며, 당일 잔여분은 전화 또는 방문으로 문의합니다.",
    rule: {
      label: "온라인 대관",
      eligibility: "normal",
      rule_type: "checking",
      open_time: null,
      open_offset: null,
      reservation_url: "https://rev.cuc.or.kr/www/28",
      booking_round_label: "춘천도시공사 통합예약 온라인 대관",
      usage_period_label: "예약 화면에서 이용 가능 일정 확인",
    },
  },
  {
    courtId: "8ee60203-cf3d-4215-962e-646df0fb0459",
    name: "양양 테니스장",
    court: {
      booking_rule_type: "checking",
      booking_open_type: null,
      booking_open_offset: null,
      booking_open_time_normal: null,
      booking_reception_time: "공유누리 온라인 신청 후 관리자 승인 · 신청 가능 일정 확인",
      booking_site_link: "https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=BG18N4114683",
      booking_online_reserve_possible: true,
      booking_today_booking_possible: false,
    },
    note: "공유누리에서 온라인으로 신청한 뒤 관리자 승인을 받는 시설입니다. 현장·전화 예약이 아니라 온라인 승인 예약으로 명확히 정리했으며, 고정 오픈일 또는 롤링 일수는 공개 안내에서 확인되지 않아 확인 필요 상태를 유지합니다.",
    rule: {
      label: "온라인 승인 예약",
      eligibility: "normal",
      rule_type: "checking",
      open_time: null,
      open_offset: null,
      reservation_url: "https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=BG18N4114683",
      booking_round_label: "공유누리 온라인 신청 후 관리자 승인",
      usage_period_label: "신청 가능 일정 확인",
    },
  },
];

const appendNote = (existing, note) => {
  const current = existing ?? "";
  const markerIndex = current.indexOf(marker);
  const base = (markerIndex >= 0 ? current.slice(0, markerIndex) : current).trim();
  return [base, `${marker}\n${note}`].filter(Boolean).join("\n\n");
};

const ids = updates.map(({ courtId }) => courtId);
const { data: courts, error: courtReadError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,etc_desc,booking_rule_type,booking_reception_time,booking_open_offset")
  .in("id", ids);
if (courtReadError) throw courtReadError;

const { data: rules, error: ruleReadError } = await supabase
  .from("court_booking_rules")
  .select("id,court_id,rule_type,open_offset,is_active,sort_order")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("sort_order", { ascending: true });
if (ruleReadError) throw ruleReadError;

if (courts.length !== updates.length) {
  throw new Error(`대상 시설 수 불일치: ${courts.length}/${updates.length}`);
}

const courtById = new Map(courts.map((court) => [court.id, court]));
const ruleByCourtId = new Map();
for (const rule of rules) {
  if (!ruleByCourtId.has(rule.court_id)) ruleByCourtId.set(rule.court_id, rule);
}

for (const update of updates) {
  if (!ruleByCourtId.has(update.courtId)) {
    throw new Error(`${update.name}: 활성 예약 규칙이 없습니다.`);
  }
}

console.table(
  updates.map((update) => {
    const before = courtById.get(update.courtId);
    return {
      facility: update.name,
      before: before.booking_rule_type,
      after: update.court.booking_rule_type,
      offset: update.court.booking_open_offset ?? "-",
      reception: update.court.booking_reception_time,
    };
  })
);

if (!shouldApply) {
  console.log("dry-run 완료. --apply를 추가하면 DB에 반영합니다.");
  process.exit(0);
}

const resetRuleFields = {
  open_type: null,
  open_day_of_month: null,
  open_day_of_week: null,
  open_ordinal: null,
  interval_weeks: null,
  anchor_date: null,
  lottery_desc: null,
  open_date_adjustment: "none",
  target_condition: null,
};

for (const update of updates) {
  const existingCourt = courtById.get(update.courtId);
  const existingRule = ruleByCourtId.get(update.courtId);

  const { error: courtUpdateError } = await supabase
    .from("courtinfo")
    .update({
      ...update.court,
      etc_desc: appendNote(existingCourt.etc_desc, update.note),
      updated_at: now,
    })
    .eq("id", update.courtId);
  if (courtUpdateError) throw new Error(`${update.name} courtinfo 수정 실패: ${courtUpdateError.message}`);

  const { error: ruleUpdateError } = await supabase
    .from("court_booking_rules")
    .update({
      ...resetRuleFields,
      ...update.rule,
      updated_at: now,
    })
    .eq("id", existingRule.id);
  if (ruleUpdateError) throw new Error(`${update.name} 예약 규칙 수정 실패: ${ruleUpdateError.message}`);
}

const { data: verifiedCourts, error: verifyCourtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,booking_rule_type,booking_open_offset,booking_reception_time,booking_site_link")
  .in("id", ids)
  .order("basic_court_name");
if (verifyCourtError) throw verifyCourtError;

const { data: verifiedRules, error: verifyRuleError } = await supabase
  .from("court_booking_rules")
  .select("court_id,label,rule_type,open_time,open_offset,reservation_url,booking_round_label,usage_period_label,is_active")
  .in("court_id", ids)
  .eq("is_active", true)
  .order("court_id");
if (verifyRuleError) throw verifyRuleError;

console.log("\n검증: courtinfo");
console.table(verifiedCourts);
console.log("\n검증: court_booking_rules");
console.table(verifiedRules);

for (const update of updates) {
  const court = verifiedCourts.find(({ id }) => id === update.courtId);
  const rule = verifiedRules.find(({ court_id }) => court_id === update.courtId);
  if (!court || !rule) throw new Error(`${update.name}: 검증 결과 누락`);
  if (court.booking_rule_type !== update.court.booking_rule_type) {
    throw new Error(`${update.name}: courtinfo 규칙 유형 검증 실패`);
  }
  if (rule.rule_type !== update.rule.rule_type || rule.open_offset !== update.rule.open_offset) {
    throw new Error(`${update.name}: 상세 예약 규칙 검증 실패`);
  }
}

console.log(`\n강원 예약정보 ${updates.length}건 갱신 및 검증 완료.`);
