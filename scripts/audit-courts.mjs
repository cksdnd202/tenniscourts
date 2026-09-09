import fs from "node:fs";
import path from "node:path";

const PAGE_SIZE = 1000;
const DETAIL_LIMIT = Number.parseInt(process.env.AUDIT_DETAIL_LIMIT ?? "100", 10);
const jsonOnly = process.argv.includes("--json");
const failOnIssues = process.argv.includes("--fail-on-issues");

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabaseHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

async function fetchAll(table, select = "*") {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.searchParams.set("select", select);
    url.searchParams.set("offset", String(from));
    url.searchParams.set("limit", String(PAGE_SIZE));

    const response = await fetch(url, { headers: supabaseHeaders });
    if (!response.ok) {
      throw new Error(`${table} 조회 실패 (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function courtLabel(court) {
  return [court.basic_region, court.basic_city, court.basic_court_name]
    .filter(hasText)
    .join(" / ");
}

function ruleLabel(rule, courtById) {
  const court = courtById.get(rule.court_id);
  return `${court ? courtLabel(court) : rule.court_id} / ${rule.label || rule.id}`;
}

function isNaverMapLink(value) {
  if (!hasText(value)) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "map.naver.com" || hostname.endsWith(".map.naver.com") || hostname === "naver.me";
  } catch {
    return false;
  }
}

function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function missingRuleFields(rule) {
  const missing = [];
  if (!hasText(rule.rule_type)) return ["rule_type"];

  switch (rule.rule_type) {
    case "fixed_schedule":
      if (!Number.isInteger(rule.open_day_of_month)) missing.push("open_day_of_month");
      if (!hasText(rule.open_time)) missing.push("open_time");
      break;
    case "ordinal":
      if (!Number.isInteger(rule.open_day_of_week)) missing.push("open_day_of_week");
      if (!Number.isInteger(rule.open_ordinal)) missing.push("open_ordinal");
      if (!hasText(rule.open_time)) missing.push("open_time");
      break;
    case "rolling":
      if (!hasText(rule.open_time)) missing.push("open_time");
      if (!hasText(rule.open_offset)) missing.push("open_offset");
      break;
    case "interval_weekly":
      if (!Number.isInteger(rule.open_day_of_week)) missing.push("open_day_of_week");
      if (!Number.isInteger(rule.interval_weeks)) missing.push("interval_weeks");
      if (!hasText(rule.open_time)) missing.push("open_time");
      break;
    case "monthly_relative":
      if (!hasText(rule.open_offset)) missing.push("open_offset");
      if (!hasText(rule.open_time)) missing.push("open_time");
      break;
    case "lottery":
      if (!hasText(rule.lottery_desc)) missing.push("lottery_desc");
      break;
  }

  return missing;
}

function addGrouped(map, key, value) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

const [courts, rules, fees] = await Promise.all([
  fetchAll(
    "courtinfo",
    [
      "id",
      "basic_court_name",
      "slug",
      "basic_region",
      "basic_city",
      "basic_address",
      "basic_map_link",
      "basic_latitude",
      "basic_longitude",
      "use_or_not",
      "booking_site_link",
      "booking_online_reserve_possible",
    ].join(",")
  ),
  fetchAll("court_booking_rules"),
  fetchAll("court_booking_rule_fees"),
]);

const activeCourts = courts.filter((court) => court.use_or_not === true);
const courtById = new Map(courts.map((court) => [court.id, court]));
const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
const activeRules = rules.filter((rule) => rule.is_active === true);
const activeRulesByCourt = new Map();
const feeByRule = new Map(fees.map((fee) => [fee.booking_rule_id, fee]));

for (const rule of activeRules) addGrouped(activeRulesByCourt, rule.court_id, rule);

const issues = {
  missingAddress: [],
  missingMapLink: [],
  nonNaverMapLink: [],
  missingCoordinates: [],
  invalidCoordinates: [],
  missingBookingSiteLink: [],
  missingActiveBookingRules: [],
  duplicateCourtNames: [],
  duplicateSlugs: [],
  invalidBookingRules: [],
  missingRuleFees: [],
  orphanOrInactiveRuleFees: [],
  invalidRuleFees: [],
};

for (const court of activeCourts) {
  const label = courtLabel(court);
  if (!hasText(court.basic_address)) issues.missingAddress.push(label);
  if (!hasText(court.basic_map_link)) {
    issues.missingMapLink.push(label);
  } else if (!isNaverMapLink(court.basic_map_link)) {
    issues.nonNaverMapLink.push(label);
  }

  const hasAnyCoordinate = court.basic_latitude != null || court.basic_longitude != null;
  if (!hasAnyCoordinate) {
    issues.missingCoordinates.push(label);
  } else if (!isValidCoordinate(court.basic_latitude, court.basic_longitude)) {
    issues.invalidCoordinates.push(label);
  }

  if (court.booking_online_reserve_possible === true && !hasText(court.booking_site_link)) {
    issues.missingBookingSiteLink.push(label);
  }
  if (!(activeRulesByCourt.get(court.id)?.length > 0)) {
    issues.missingActiveBookingRules.push(label);
  }
}

const courtNames = new Map();
const slugs = new Map();
for (const court of activeCourts) {
  const normalizedName = [court.basic_region, court.basic_city, court.basic_court_name]
    .map((value) => (value ?? "").trim().replace(/\s+/g, " ").toLowerCase())
    .join("|");
  if (hasText(court.basic_court_name)) addGrouped(courtNames, normalizedName, courtLabel(court));
  if (hasText(court.slug)) addGrouped(slugs, court.slug.trim().toLowerCase(), courtLabel(court));
}
for (const values of courtNames.values()) {
  if (values.length > 1) issues.duplicateCourtNames.push(values.join(" ↔ "));
}
for (const [slug, values] of slugs.entries()) {
  if (values.length > 1) issues.duplicateSlugs.push(`${slug}: ${values.join(" ↔ ")}`);
}

for (const rule of activeRules) {
  const missing = missingRuleFields(rule);
  if (missing.length > 0) {
    issues.invalidBookingRules.push(`${ruleLabel(rule, courtById)}: ${missing.join(", ")} 누락`);
  }

  const court = courtById.get(rule.court_id);
  if (court?.use_or_not === true && !feeByRule.has(rule.id)) {
    issues.missingRuleFees.push(ruleLabel(rule, courtById));
  }
}

const priceFields = [
  "outdoor_weekday_price",
  "outdoor_weekend_price",
  "indoor_weekday_price",
  "indoor_weekend_price",
];

for (const fee of fees) {
  const rule = ruleById.get(fee.booking_rule_id);
  if (!rule || rule.is_active !== true) {
    issues.orphanOrInactiveRuleFees.push(fee.id);
    continue;
  }

  const prices = priceFields.map((field) => fee[field]);
  const problems = [];
  if (fee.is_free === true && prices.some((price) => price != null)) {
    problems.push("무료 규칙에 요금 존재");
  }
  if (fee.is_free !== true && prices.every((price) => price == null)) {
    problems.push("유료 규칙에 요금 없음");
  }
  if (![1, 2, 3].includes(fee.price_basis_hours)) {
    problems.push("요금 기준 시간 오류");
  }
  if (fee.is_free === true && fee.lighting_fee_separate === true) {
    problems.push("무료 규칙에 별도 조명비 설정");
  }
  if (fee.lighting_fee_separate === true && fee.lighting_fee_amount == null) {
    problems.push("별도 조명비 금액 누락");
  }
  if (fee.lighting_fee_separate !== true && (fee.lighting_fee_amount != null || fee.lighting_start_time != null)) {
    problems.push("조명비 별도 아님에도 조명 상세값 존재");
  }

  if (problems.length > 0) {
    issues.invalidRuleFees.push(`${ruleLabel(rule, courtById)}: ${problems.join(", ")}`);
  }
}

const issueCounts = Object.fromEntries(
  Object.entries(issues).map(([key, values]) => [key, values.length])
);
const totalIssues = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
const report = {
  auditedAt: new Date().toISOString(),
  readOnly: true,
  counts: {
    courts: courts.length,
    activeCourts: activeCourts.length,
    bookingRules: rules.length,
    activeBookingRules: activeRules.length,
    feeRows: fees.length,
    totalIssues,
  },
  issueCounts,
  issues,
};

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("COURTSKOREA DB QUALITY AUDIT");
  console.log(`실행 시각: ${report.auditedAt}`);
  console.log("모드: 읽기 전용 (DB 변경 없음)");
  console.log(
    `대상: 전체 ${courts.length}곳 / 노출 ${activeCourts.length}곳 / 활성 규칙 ${activeRules.length}개 / 요금 ${fees.length}건`
  );
  console.log(`발견 항목: ${totalIssues}건`);

  for (const [key, values] of Object.entries(issues)) {
    console.log(`\n[${key}] ${values.length}건`);
    for (const value of values.slice(0, DETAIL_LIMIT)) console.log(`- ${value}`);
    if (values.length > DETAIL_LIMIT) {
      console.log(`- ... ${values.length - DETAIL_LIMIT}건 더 있음`);
    }
  }
}

if (failOnIssues && totalIssues > 0) process.exitCode = 2;
