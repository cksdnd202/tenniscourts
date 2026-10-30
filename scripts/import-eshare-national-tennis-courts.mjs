import { createClient } from "@supabase/supabase-js";

const shouldApply = process.argv.includes("--apply");
const shouldAudit = process.argv.includes("--audit");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const eshareApiKey = process.env.ESHARE_API_KEY;

if (!supabaseUrl || !serviceRoleKey || !eshareApiKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ESHARE_API_KEY 환경변수가 필요합니다.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const REGION_CODES = [
  ["26", "부산"],
  ["27", "대구"],
  ["29", "광주"],
  ["30", "대전"],
  ["31", "울산"],
  ["36", "세종"],
  ["51", "강원"],
  ["43", "충북"],
  ["44", "충남"],
  ["52", "전북"],
  ["46", "전남"],
  ["47", "경북"],
  ["48", "경남"],
  ["50", "제주"],
];

const REGION_ADDRESS_PREFIXES = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "강원도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
  "제주도",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

const EXCLUDED_NAME_PATTERNS = [
  /테스트/i,
  /공지/,
  /예약현황/,
  /소프트\s*테니스/,
];

// 공유누리에서 같은 물리적 시설을 다른 이름으로 중복 제공하는 자원입니다.
// 더 구체적인 시설명 또는 운영기관 직결 예약 링크가 있는 자원을 남깁니다.
const DUPLICATE_RESOURCE_IDS = new Set([
  "BL31K1600578", // 고성지사 테니스장과 동일
  "CH09R3810121", // 정곡면공설운동장 테니스장과 동일
  "GL19N1657874", // 한국수력원자력 본사 테니스장과 동일
  "DJ20Q4652936", // 야음테니스장과 동일
  "GI19B821094", // 한국도로공사 무주지사 테니스장과 동일
  "BA10A0015945", // 청주국제테니스장과 동일
]);

function clean(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[\s·ㆍ,._()\[\]{}\-\/]/g, "");
}

function isActualTennisResource(row) {
  const name = clean(row.rsrcNm);
  if (!name || !name.includes("테니스")) return false;
  if (DUPLICATE_RESOURCE_IDS.has(clean(row.rsrcNo))) return false;
  return !EXCLUDED_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function facilityBaseName(rawName) {
  let name = clean(rawName)
    .replace(/\((?:평일|주말|공휴일)[^)]*예약용\)/g, "")
    .replace(/\((?:전화예약필수|예약가능)\)/g, "")
    .replace(/\((?:실내|실외)\)/g, "")
    .replace(/\([A-Z0-9]+\s*(?:번)?\s*(?:면|코트)\)/gi, "")
    .replace(/(?:실내|실외|야외)\s*테니스장/g, "테니스장")
    .replace(/\s*본관(?:옆|내)$/g, "")
    .replace(/\b(?:실내|실외|야외)\b/g, "")
    .replace(/\s*[A-Z]\s*(?:면|코트)$/i, "")
    .replace(/\s*코트\s*[A-Z0-9]+$/i, "")
    .replace(/\s*[A-Z0-9]+\s*번?\s*코트$/i, "")
    .replace(/\s*테니스장\s*[A-Z0-9]+\s*면?$/i, "테니스장")
    .replace(/테니스장\s*[A-Z0-9]+$/i, "테니스장")
    .replace(/\s*\d+\s*코트$/i, "")
    .replace(/\s*\d+\s*번$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const parenthesizedCourt = name.match(/^(.*?)\(테니스장\d+\).*$/);
  if (parenthesizedCourt) name = `${parenthesizedCourt[1]} 테니스장`;

  return name || clean(rawName);
}

function stripCourtVariant(rawName) {
  return clean(rawName)
    .replace(/\((?:평일|주말|공휴일)[^)]*예약용\)/g, "")
    .replace(/\((?:전화예약필수|예약가능)\)/g, "")
    .replace(/\([A-Z0-9]+\s*(?:번)?\s*(?:면|코트)\)/gi, "")
    .replace(/\s*[A-Z]\s*(?:면|코트)$/i, "")
    .replace(/\s*코트\s*[A-Z0-9]+$/i, "")
    .replace(/\s*[A-Z0-9]+\s*번?\s*코트$/i, "")
    .replace(/\s*테니스장\s*[A-Z0-9]+\s*면?$/i, "테니스장")
    .replace(/테니스장\s*[A-Z0-9]+$/i, "테니스장")
    .replace(/\s+/g, " ")
    .trim();
}

function facilityDisplayName(resources) {
  const stripped = resources.map((row) => stripCourtVariant(row.rsrcNm));
  const unique = [...new Set(stripped)];
  if (unique.length === 1) return unique[0];

  const allIndoor = stripped.every((name) => name.includes("실내"));
  const allOutdoor = stripped.every((name) => /실외|야외/.test(name));
  if (allIndoor || allOutdoor) return [...stripped].sort((a, b) => b.length - a.length)[0];

  return facilityBaseName([...stripped].sort((a, b) => b.length - a.length)[0]);
}

function fullAddress(row) {
  const address = clean(row.addr);
  const detail = clean(row.daddr);
  if (!detail || normalize(address).includes(normalize(detail))) return address;
  return `${address} ${detail}`.trim();
}

function extractCity(region, address) {
  if (region === "세종") return "세종시";

  let remainder = clean(address);
  for (const prefix of REGION_ADDRESS_PREFIXES) {
    if (remainder.startsWith(prefix)) {
      remainder = remainder.slice(prefix.length).trim();
      break;
    }
  }

  const city = remainder.match(/^([가-힣]+(?:시|군|구))(?=\s|$)/)?.[1];
  return city ?? null;
}

function coordinateKey(row) {
  const lat = Number(row.lat);
  const lng = Number(row.lot);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return "";
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function groupKey(region, row) {
  const base = normalize(facilityBaseName(row.rsrcNm));
  const address = normalize(row.addr);
  const coordinate = coordinateKey(row);
  const city = extractCity(region, clean(row.addr)) ?? "";
  const genericBase = base === "테니스장" ||
    base === "본사테니스장" ||
    base === "스포츠파크테니스장" ||
    /지사테니스장$/.test(base);

  if (!address && !coordinate) return `${region}:name:${base}`;
  if (genericBase) return `${region}:generic:${base}:${address || coordinate}`;
  return `${region}:city-name:${city}:${base}`;
}

async function fetchRegion(code, region) {
  const endpoint = `https://www.eshare.go.kr/eshare-openapi/rsrc/list/010500/${encodeURIComponent(eshareApiKey)}`;
  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ pageNo: 1, numOfRows: 1000, ctpvCd: code }),
      });
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  if (!response) throw new Error(`${region} 공유누리 연결 실패: ${lastError?.message ?? "알 수 없는 오류"}`);

  if (!response.ok) throw new Error(`${region} 공유누리 조회 실패 (${response.status})`);
  const raw = await response.json();
  if (raw.resultCode !== "OK" || !Array.isArray(raw.data)) {
    throw new Error(`${region} 공유누리 비정상 응답: ${raw.resultMsg ?? raw.resultCode}`);
  }

  return raw.data.map((row) => ({ ...row, _region: region }));
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function groupResources(rows) {
  const groups = new Map();
  for (const row of rows.filter(isActualTennisResource)) {
    const key = groupKey(row._region, row);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, resources]) => ({ key, resources }));
}

const choseong = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const jungseong = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const jongseong = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

function romanizeHangul(value) {
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return char;
    const index = code - 0xac00;
    return `${choseong[Math.floor(index / 588)]}${jungseong[Math.floor((index % 588) / 28)]}${jongseong[index % 28]}`;
  }).join("");
}

function slugBase(value) {
  return romanizeHangul(value.toLowerCase())
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "eshare-tennis-court";
}

function uniqueSlug(value, usedSlugs) {
  const base = slugBase(value);
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
  usedSlugs.add(slug);
  return slug;
}

async function readAllCourts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("courtinfo")
      .select("id,basic_court_name,basic_address,slug,source_match_key")
      .range(from, from + 999);
    if (error) throw new Error(`기존 테니스장 조회 실패: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

function buildCourt(group, usedSlugs) {
  const first = group.resources[0];
  const region = first._region;
  const name = facilityDisplayName(group.resources);
  const address = group.resources
    .map(fullAddress)
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0] ?? "";
  const city = extractCity(region, address);
  const coordinateResource = group.resources.find((row) => coordinateKey(row)) ?? first;
  const lat = Number(coordinateResource.lat);
  const lng = Number(coordinateResource.lot);
  const resourceIds = group.resources.map((row) => clean(row.rsrcNo)).filter(Boolean);
  const images = [...new Set(group.resources.map((row) => clean(row.imgFileUrlAddr)).filter(Boolean))];
  const reservationUrl = clean(first.instUrlAddr) ||
    `https://www.eshare.go.kr/UserPortal/Upv/UprResrcFacl/index.do?rsrc_no=${encodeURIComponent(resourceIds[0])}`;
  const now = new Date().toISOString();
  const mapQuery = encodeURIComponent(`${name} ${address}`.trim());

  return {
    matchKey: `eshare-group:${group.key}`,
    normalizedNameAddress: `${normalize(name)}:${normalize(address)}`,
    resourceIds,
    court: {
      basic_court_name: name,
      basic_address: address || null,
      basic_map_link: `https://map.naver.com/p/search/${mapQuery}`,
      basic_latitude: Number.isFinite(lat) && lat !== 0 ? lat : null,
      basic_longitude: Number.isFinite(lng) && lng !== 0 ? lng : null,
      basic_region: region,
      basic_city: city,
      basic_owner_type: null,
      booking_site_link: reservationUrl,
      booking_reception_time: "예약정보 확인 중",
      booking_rule_type: "checking",
      booking_online_reserve_possible: null,
      booking_today_booking_possible: null,
      booking_booking_provide: "public_site",
      time_of_use_same: true,
      use_or_not: true,
      slug: uniqueSlug(`${region} ${city ?? ""} ${name}`, usedSlugs),
      etc_desc: [
        "공유누리 체육시설 API에서 확인된 테니스 관련 시설입니다.",
        `공유누리 자원번호: ${resourceIds.join(", ")}`,
        group.resources.length > 1 ? `동일 시설로 묶은 공유누리 자원: ${group.resources.length}건` : null,
        images.length ? `공유누리 이미지 URL: ${images.join(", ")}` : null,
        "운영시간, 코트 면수·재질, 예약 오픈 규칙은 공식 운영기관 확인 전까지 추정하지 않습니다.",
      ].filter(Boolean).join("\n"),
      source_provider: "eshare",
      source_service_id: resourceIds.join(","),
      source_service_name: name,
      source_place_name: name,
      source_area_name: [region, city].filter(Boolean).join(" "),
      source_match_key: `eshare-group:${group.key}`,
      source_synced_at: now,
      updated_at: now,
    },
    bookingRule: {
      label: "전체",
      eligibility: "normal",
      rule_type: "checking",
      reservation_url: reservationUrl,
      booking_round_label: "예약정보 확인 중",
      usage_period_label: null,
      is_active: true,
      sort_order: 10,
      updated_at: now,
    },
  };
}

const regionResponses = await mapWithConcurrency(
  REGION_CODES,
  4,
  ([code, region]) => fetchRegion(code, region),
);
const allResources = regionResponses.flat();
const rawCandidates = allResources.filter((row) => clean(row.rsrcNm).includes("테니스"));
const excludedResources = rawCandidates.filter((row) => !isActualTennisResource(row));
const groups = groupResources(allResources);
const existingCourts = await readAllCourts();
const usedSlugs = new Set(existingCourts.map((row) => row.slug).filter(Boolean));
const existingMatchKeys = new Set(existingCourts.map((row) => row.source_match_key).filter(Boolean));
const existingNameAddresses = new Set(existingCourts.map((row) => `${normalize(row.basic_court_name)}:${normalize(row.basic_address)}`));
const candidates = groups.map((group) => buildCourt(group, usedSlugs));
const alreadyExisting = candidates.filter(
  (candidate) => existingMatchKeys.has(candidate.matchKey) || existingNameAddresses.has(candidate.normalizedNameAddress),
);
const toInsert = candidates.filter(
  (candidate) => !existingMatchKeys.has(candidate.matchKey) && !existingNameAddresses.has(candidate.normalizedNameAddress),
);

const summarizeByRegion = (items, pickRegion) => Object.fromEntries(
  REGION_CODES.map(([, region]) => [region, items.filter((item) => pickRegion(item) === region).length]),
);

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  apiResourceCount: allResources.length,
  tennisNamedResourceCount: rawCandidates.length,
  excludedCount: excludedResources.length,
  excluded: excludedResources.map((row) => `${row._region}:${row.rsrcNm}`),
  groupedFacilityCount: candidates.length,
  alreadyExistingCount: alreadyExisting.length,
  insertCount: toInsert.length,
  facilitiesByRegion: summarizeByRegion(candidates, (item) => item.court.basic_region),
  insertsByRegion: summarizeByRegion(toInsert, (item) => item.court.basic_region),
  missingCity: toInsert.filter((item) => !item.court.basic_city).map((item) => ({
    name: item.court.basic_court_name,
    address: item.court.basic_address,
    region: item.court.basic_region,
  })),
  ...(shouldAudit ? {
    mergedGroups: groups
      .filter((group) => group.resources.length > 1)
      .map((group) => ({
        region: group.resources[0]._region,
        facility: facilityBaseName(group.resources[0].rsrcNm),
        resources: group.resources.map((row) => row.rsrcNm),
      })),
  } : {}),
}, null, 2));

if (!shouldApply) process.exit(0);

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

const inserted = [];
for (const batch of chunks(toInsert, 50)) {
  const { data, error } = await supabase
    .from("courtinfo")
    .insert(batch.map((candidate) => candidate.court))
    .select("id,basic_court_name,basic_region,basic_city,source_match_key");
  if (error) throw new Error(`테니스장 일괄 등록 실패: ${error.message}`);
  inserted.push(...(data ?? []));
}

const insertedByMatchKey = new Map(inserted.map((court) => [court.source_match_key, court]));
const rules = toInsert.map((candidate) => {
  const court = insertedByMatchKey.get(candidate.matchKey);
  if (!court) throw new Error(`${candidate.court.basic_court_name} 등록 결과를 찾지 못했습니다.`);
  return { ...candidate.bookingRule, court_id: court.id };
});

for (const batch of chunks(rules, 100)) {
  const { error } = await supabase.from("court_booking_rules").insert(batch);
  if (error) {
    for (const idBatch of chunks(inserted.map((court) => court.id), 100)) {
      await supabase.from("courtinfo").delete().in("id", idBatch);
    }
    throw new Error(`예약 확인 규칙 일괄 등록 실패: ${error.message}`);
  }
}

console.log(JSON.stringify({ applied: true, insertedCount: inserted.length }, null, 2));
