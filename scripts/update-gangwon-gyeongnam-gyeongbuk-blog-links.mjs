import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const apply = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const now = new Date().toISOString();

// Keep only posts confirmed to show or describe the exact DB facility.
const catalog = [
  { region: "강원", city: "정선군", match: /^여량면 테니스장$/, relevant: /정선군.{0,15}아우라지.{0,12}테니스/, urls: ["https://blog.naver.com/connan58/60171822649"] },
  { region: "강원", city: "원주시", match: /^한국광해광업공단 본관 옥외 테니스장$/, bodyPattern: /원주시에 위치한 한국광해광업공단.{0,60}테니스장 야외 인조잔디/, urls: ["https://blog.naver.com/neulbomgreen/224222353878"] },
  { region: "경남", city: "거제시", match: /^거제시립테니스장$/, bodyPattern: /거제시립테니스장.{0,100}옥포 코트와 동일하게 잔디 코트/, urls: ["https://blog.naver.com/louis_life/223297188725"] },
  { region: "경남", city: "거제시", match: /^옥포테니스장$/, bodyPattern: /첫 코트 배정받은 옥포시립테니스장/, urls: ["https://blog.naver.com/louis_life/223291527747"] },
  { region: "경남", city: "거창군", match: /^스포츠파크 테니스장$/, relevant: /거창.{0,12}스포츠파크.{0,12}테니스/, urls: ["https://blog.naver.com/mirk90/223122477996"] },
  { region: "경남", city: "남해군", match: /^남해군공설테니스장$/, relevant: /남해.{0,8}공설.{0,12}테니스/, urls: ["https://blog.naver.com/volleytax/224081621521", "https://blog.naver.com/pediatrlee_dr/222855839083"] },
  { region: "경남", city: "양산시", match: /^서창운동장 테니스장$/, relevant: /양산.{0,15}서창운동장.{0,12}테니스/, urls: ["https://blog.naver.com/april24u/223212169551"] },
  { region: "경남", city: "양산시", match: /^웅상체육공원 테니스장$/, relevant: /웅상체육공원.{0,12}테니스/, urls: ["https://blog.naver.com/s2s2_ooo/223438750918"] },
  { region: "경남", city: "양산시", match: /^종합운동장 테니스장$/, relevant: /양산종합운동장.{0,12}테니스/, urls: ["https://blog.naver.com/ateachern/223283403116"] },
  { region: "경남", city: "양산시", match: /^천성산체육공원 테니스장$/, relevant: /천성산.{0,20}테니스/, bodyPattern: /천성산 체육공원.{0,40}네비/, urls: ["https://blog.naver.com/vnd315/223220169720"] },
  { region: "경남", city: "창녕군", match: /^창녕공설테니스장$/, relevant: /창녕.{0,15}공설.{0,15}테니스/, urls: ["https://blog.naver.com/neull0408/222840232677"] },
  { region: "경남", city: "창원시", match: /^3·15 해양누리공원 테니스장코트$/, relevant: /(3\.15|315|해양누리공원).{0,25}테니스/, urls: ["https://blog.naver.com/racketboy_01/223357742814", "https://blog.naver.com/hhyejjin0810/223350266056"] },
  { region: "경남", city: "창원시", match: /^덴소문화공원 테니스장$/, relevant: /(덴소문화공원|우산동문화공원).{0,15}테니스/, urls: ["https://blog.naver.com/jsyo0120/223135794753", "https://blog.naver.com/hoolove1743/224228971388"] },
  { region: "경북", city: "안동시", match: /^경북도청 체육시설 테니스장$/, relevant: /(경북도청|경상북도청).{0,12}테니스/, urls: ["https://blog.naver.com/csw1065/222819047837", "https://blog.naver.com/s2s2_ooo/223432124317"] },
  { region: "경북", city: "영천시", match: /^영천실내테니스장$/, relevant: /영천.{0,8}실내.{0,12}테니스/, urls: ["https://blog.naver.com/twelveg/223903284045", "https://blog.naver.com/kchilguk/224382347807"] },
  { region: "경북", city: "영천시", match: /^한국도로공사 영천지사 테니스장$/, relevant: /한국도로공사.{0,8}영천지사.{0,12}테니스/, urls: ["https://blog.naver.com/jellozon/222978964616"] },
  { region: "경북", city: "울진군", match: /^울진종합운동장 테니스장$/, relevant: /울진.{0,8}종합운동장.{0,18}테니스/, urls: ["https://blog.naver.com/april24u/224412309451"] },
];

const { data: courts, error: courtError } = await db.from("courtinfo")
  .select("id,basic_region,basic_city,basic_court_name,basic_address,use_or_not")
  .in("basic_region", ["강원", "경남", "경북"]).range(0, 999);
if (courtError) throw courtError;
const { data: existing, error: existingError } = await db.from("court_blog_links")
  .select("court_id,url,sort_order").in("court_id", courts.map(({ id }) => id)).range(0, 999);
if (existingError) throw existingError;
const currentByCourt = new Map(courts.map(({ id }) => [id, existing.filter((link) => link.court_id === id)]));
const planByCourt = new Map();

async function bodyText(url) {
  const match = url.match(/^https:\/\/blog\.naver\.com\/([^/]+)\/(\d+)/);
  if (!match) throw new Error(`본문 검증 URL 형식 오류: ${url}`);
  const response = await fetch(`https://m.blog.naver.com/${match[1]}/${match[2]}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) throw new Error(`본문 조회 실패: ${url} ${response.status}`);
  return (await response.text())
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]{1,15};/g, " ")
    .replace(/\s+/g, " ");
}

for (const definition of catalog) {
  const targets = courts.filter((court) => court.use_or_not && court.basic_region === definition.region
    && court.basic_city === definition.city && definition.match.test(court.basic_court_name));
  if (!targets.length) throw new Error(`시설 매칭 실패: ${definition.region} ${definition.city} ${definition.match}`);
  const neededUrls = definition.urls.filter((url) => targets.some((court) => {
    const current = currentByCourt.get(court.id);
    const planned = planByCourt.get(court.id)?.add ?? [];
    return current.length + planned.length < 3
      && !current.some((link) => link.url === url)
      && !planned.some((link) => link.url === url);
  }));
  if (!neededUrls.length) continue;
  const previews = await Promise.all(neededUrls.map((url) => fetchBlogPreview({ url })));
  for (const preview of previews) {
    const previewText = `${preview.title ?? ""} ${preview.description ?? ""}`.replace(/\s+/g, "");
    if (definition.relevant && !definition.relevant.test(previewText)) {
      throw new Error(`제목/설명 관련성 실패: ${definition.city} ${preview.url} ${previewText}`);
    }
    if (definition.bodyPattern && !definition.bodyPattern.test(await bodyText(preview.url))) {
      throw new Error(`본문 관련성 실패: ${definition.city} ${preview.url}`);
    }
  }
  for (const court of targets) {
    const current = currentByCourt.get(court.id);
    const plan = planByCourt.get(court.id) ?? { court, add: [], startOrder: Math.max(-1, ...current.map((link) => link.sort_order ?? -1)) + 1 };
    const seen = new Set([...current.map((link) => link.url), ...plan.add.map(({ url }) => url)]);
    plan.add.push(...previews.filter(({ url }) => !seen.has(url)).slice(0, Math.max(0, 3 - current.length - plan.add.length)));
    if (plan.add.length) planByCourt.set(court.id, plan);
  }
}
const plans = [...planByCourt.values()];
console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", courtCount: plans.length,
  linkCount: plans.reduce((sum, { add }) => sum + add.length, 0),
  courts: plans.map(({ court, add }) => `${court.basic_region} ${court.basic_city} ${court.basic_court_name}: ${add.length}`) }, null, 2));
if (!apply) process.exit(0);

async function storeThumbnail(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CourtsKoreaPreview/1.0; +https://courtskorea.com)", Referer: "https://blog.naver.com/" } });
    if (!response.ok) return url;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 2 * 1024 * 1024) return url;
    const path = `${createHash("sha256").update(url).digest("hex")}.${extension}`;
    const { error } = await db.storage.from("blog-thumbnails").upload(path, buffer, { contentType, cacheControl: "31536000", upsert: true });
    if (error) return url;
    return db.storage.from("blog-thumbnails").getPublicUrl(path).data.publicUrl;
  } catch { return url; }
}

for (const { court, add, startOrder } of plans) {
  const rows = await Promise.all(add.map(async (preview, index) => ({
    court_id: court.id, url: preview.url, title: preview.title, description: preview.description,
    thumbnail_url: await storeThumbnail(preview.thumbnail_url), source: preview.source,
    sort_order: startOrder + index, updated_at: now,
  })));
  const { error } = await db.from("court_blog_links").insert(rows);
  if (error) throw new Error(`${court.basic_court_name} 저장 실패: ${error.message}`);
  console.log(`완료 ${court.basic_region} ${court.basic_city} ${court.basic_court_name}: +${rows.length}`);
}

const { data: verified, error: verifyError } = await db.from("court_blog_links")
  .select("court_id,url").in("court_id", plans.map(({ court }) => court.id)).range(0, 999);
if (verifyError) throw verifyError;
for (const { court, add } of plans) {
  const urls = new Set(verified.filter((link) => link.court_id === court.id).map((link) => link.url));
  if (add.some(({ url }) => !urls.has(url))) throw new Error(`사후 검증 실패: ${court.basic_court_name}`);
}
console.log(JSON.stringify({ updatedCourts: plans.length, insertedLinks: plans.reduce((sum, { add }) => sum + add.length, 0) }));
