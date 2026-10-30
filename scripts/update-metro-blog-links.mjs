import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const apply = process.argv.includes("--apply");
const catalog = [
  ["대구", "월배테니스장", "lookbackonme/222933905458", "월배체육공원"],
  ["대구", "다사체육공원 테니스장", "thsrnxk/223086513708", "다사체육공원"],
  ["대구", "진밭골체육센터 테니스장", "5500_661_/224044733848", "진밭골"],
  ["대구", "가창체육공원 테니스장", "dalseonggun/223174003767", "가창체육공원"],
  ["대구", "다사매곡테니스장", "thsrnxk/224163895889", "다사매곡"],
  ["대구", "도동복합운동장 테니스장", "peterabit12/224271640857", "도동복합운동장"],
  ["대구", "화원테니스장", "inzzang486/223084081144", "화원테니스장"],
  ["대구", "두류테니스장", "lookbackonme/222959384950", "두류테니스장"],
  ["대구", "유니버시아드테니스장", "ma_pick/222764580807", "유니버시아드테니스장"],
  ["대전", "을미기체육공원 테니스장", "ldh0628/223224640253", "을미기테니스장"],
  ["대전", "관저테니스장", "first_seogu/222755370285", "관저테니스장"],
  ["대전", "오량실내테니스장", "first_seogu/221681099710", "오량실내테니스장"],
  ["대전", "송강실내테니스장", "sattosun/223183303860", "송강실내테니스장"],
  ["대전", "은평공원테니스장", "sattosun/223656995253", "은평공원테니스장"],
  ["대전", "정림테니스장", "ihj2245/223963063609", "정림서로181"],
  ["부산", "해돋이배수지 테니스장", "volleytax/223385316202", "해돋이배수지"],
  ["부산", "좌동1배수지 테니스장", "babyju-/223924119275", "좌동1배수지"],
  ["부산", "해양경찰서 구민테니스장", "babyju-/223924151798", "해양경찰서구민테니스장"],
  ["부산", "대저차량사업소 테니스장", "volleytax/224281976008", "대저차량사업소"],
  ["부산", "부산환경공단 중앙사업소 테니스장", "soony8998/223923193708", "중앙사업소테니스장"],
  ["부산", "부산환경공단 정관사업소 테니스장", "superpeman/224240470217", "정관사업소테니스장"],
  ["부산", "좌동테니스장", "volleytax/223412709139", "좌동테니스장"],
  ["부산", "반송테니스장", "sedarounstory/223897376742", "꽃다래공원테니스장"],
  ["부산", "부산환경공단 남부사업소 테니스장", "somsomguri-/223007127736", "남부환경공단"],
  ["부산", "부산환경공단 기장사업소 테니스장", "babyju-/223924150696", "기장사업소테니스장"],
  ["부산", "부산환경공단 수영사업단 테니스장", "volleytax/223797138572", "수영환경공원테니스장"],
  ["부산", "센텀테니스장", "volleytax/223483379929", "센텀테니스장"],
  ["울산", "남산테니스장", "volleytax/224196480657", "남산레포츠공원테니스장"],
  ["울산", "두왕테니스장", "hge02005/224050037502", "두왕테니스장"],
  ["울산", "야음테니스장", "yellowhole_biz/223479444916", "야음테니스장"],
  ["세종", "다정동 저류지 체육시설 테니스장", "birdie_train/223418223480", "다정동저류지"],
  ["세종", "소정 테니스장", "hyetori-bamtori/223372497023", "소정테니스장"],
  ["세종", "수질복원센터A 테니스장", "duiii/223082840304", "수질복원센터테니스장A"],
  ["세종", "수질복원센터B 테니스장", "gp1229/223807894215", "수질복원센터B테니스장"],
  ["세종", "금남 생활체육공원 테니스장", "pinktokki8748/222897512709", "금남생활체육공원테니스장"],
  ["세종", "전의생활체육공원 테니스장", "gp1229/224181051156", "전의생활체육공원테니스장"],
  ["세종", "조치원 체육공원 테니스장", "dreey/224288082027", "조치원체육공원테니스장"],
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: courts, error: courtError } = await db.from("courtinfo")
  .select("id,basic_region,basic_court_name,use_or_not")
  .in("basic_region", [...new Set(catalog.map(([region]) => region))]).range(0, 999);
if (courtError) throw courtError;
const { data: existing, error: existingError } = await db.from("court_blog_links")
  .select("court_id,url,sort_order").in("court_id", courts.map(({ id }) => id)).range(0, 999);
if (existingError) throw existingError;

const compact = (value) => value.replace(/<[^>]*>/g, " ").replace(/&[^;]{1,15};/g, " ").replace(/\s+/g, "").toLowerCase();
const planned = [];
for (const [region, name, path, evidence] of catalog) {
  const targets = courts.filter((court) => court.basic_region === region && court.basic_court_name === name && court.use_or_not);
  if (targets.length !== 1) throw new Error(`시설 매칭 불일치: ${region} ${name} (${targets.length}건)`);
  const court = targets[0];
  const url = `https://blog.naver.com/${path}`;
  const links = existing.filter((link) => link.court_id === court.id);
  if (links.some((link) => link.url === url)) continue;
  if (links.length >= 3) throw new Error(`블로그 슬롯 초과: ${region} ${name}`);

  const mobileUrl = `https://m.blog.naver.com/${path}`;
  const response = await fetch(mobileUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`블로그 접근 실패: ${url} (${response.status})`);
  const html = await response.text();
  if (!compact(html).includes(compact(evidence))) throw new Error(`시설 내용 불일치: ${region} ${name} ${url}`);
  const preview = await fetchBlogPreview({ url });
  const pageTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s*:\s*네이버 블로그\s*$/, "").trim();
  if (pageTitle) preview.title = pageTitle;
  if (!preview.title || preview.title === "네이버 블로그") throw new Error(`블로그 제목 확인 실패: ${url}`);
  planned.push({ court, preview, sortOrder: Math.max(-1, ...links.map(({ sort_order }) => sort_order ?? -1)) + 1 });
}

console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", links: planned.length,
  byRegion: Object.fromEntries([...new Set(planned.map(({ court }) => court.basic_region))].map((region) => [region, planned.filter(({ court }) => court.basic_region === region).length])),
  targets: planned.map(({ court, preview }) => `${court.basic_region} ${court.basic_court_name}: ${preview.title}`) }, null, 2));
if (!apply) process.exit(0);

async function storeThumbnail(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://blog.naver.com/" } });
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

const now = new Date().toISOString();
const rows = [];
for (const { court, preview, sortOrder } of planned) {
  rows.push({ court_id: court.id, url: preview.url, title: preview.title,
    description: preview.description, thumbnail_url: await storeThumbnail(preview.thumbnail_url),
    source: preview.source, sort_order: sortOrder, updated_at: now });
}
if (rows.length) {
  const { error } = await db.from("court_blog_links").insert(rows);
  if (error) throw error;
}
const { data: verified, error: verifyError } = await db.from("court_blog_links")
  .select("court_id,url").in("court_id", planned.map(({ court }) => court.id)).range(0, 999);
if (verifyError) throw verifyError;
for (const { court, preview } of planned) {
  if (!verified.some(({ court_id, url }) => court_id === court.id && url === preview.url)) {
    throw new Error(`저장 확인 실패: ${court.basic_region} ${court.basic_court_name}`);
  }
}
console.log(`등록 및 재조회 확인 완료: ${planned.length}건`);
