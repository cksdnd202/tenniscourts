import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const apply = process.argv.includes("--apply");
// Only firsthand visits or posts about the exact facility are included.
// A mention of a different court in a tournament itinerary is not sufficient.
const catalog = [
  ["전북", "완주테니스장", "8470707/223126518145", "완주군청테니스장"],
  ["전북", "군산시 월명테니스장", "turtletrail/223779456555", "월명종합경기장"],
  ["전북", "군산시 월명테니스장", "mang_o_ov/223186354346", "월명종합경기장테니스장"],
  ["전북", "배산체육공원(테니스장5) 야외", "szesz/224244971333", "배산체육공원"],
  ["충남", "둔포테니스장", "alzzalsc/221633560331", "둔포체육공원테니스장"],
  ["충남", "천안종합운동장 실내테니스장", "shiny0720/222987229328", "천안종합운동장"],
  ["충남", "천안종합운동장 실외테니스장", "navi_jeong/222668966578", "천안종합운동장테니스장"],
  ["충남", "연무체육공원 테니스장", "joonnis_kim/221790717596", "연무체육공원"],
  ["충남", "광천생활체육공원테니스장", "choi554/223243864442", "광천생활체육공원테니스장"],
  ["충남", "홍주종합경기장테니스장", "sua0627/223275931538", "홍주종합경기장테니스장"],
  ["충남", "청양군테니스장", "racketgirl/223990194503", "누레기길5-2"],
  ["충남", "순성체육공원 테니스장", "akh1919/223206319588", "순성체육공원내순성테니스코트"],
  ["충남", "시민운동장 테니스장", "killme124/224301036118", "논산시민운동장테니스장"],
  ["충남", "보령테니스장", "ssuel0602/224151730282", "보령남로347"],
  ["충남", "당진종합운동장 테니스장", "dangjin2030/222086406247", "고대면종합운동장내"],
  ["충북", "청주강내하수처리장 테니스장", "tennis__jay/223391135647", "강내하수처리장내에있는코트"],
  ["충북", "청주국제테니스장", "do_odo_o/222939223368", "호미로242"],
  ["충북", "청주국제테니스장", "yeonhwa409/223377179362", "청주국제테니스장"],
  ["충북", "탄금테니스장", "bwh011/223681409833", "탄금테니스장"],
  ["충북", "탄금테니스장", "totonana91/223595157463", "탄금테니스장"],
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
  const earlier = planned.filter((item) => item.court.id === court.id);
  if (links.length + earlier.length >= 3) throw new Error(`블로그 슬롯 초과: ${region} ${name}`);

  const response = await fetch(`https://m.blog.naver.com/${path}`, {
    headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`블로그 접근 실패: ${url} (${response.status})`);
  const html = await response.text();
  if (!compact(html).includes(compact(evidence))) throw new Error(`시설 내용 불일치: ${region} ${name} ${url}`);
  const preview = await fetchBlogPreview({ url });
  const pageTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s*:\s*네이버 블로그\s*$/, "").trim();
  if (pageTitle) preview.title = pageTitle;
  if (!preview.title || preview.title === "네이버 블로그") throw new Error(`블로그 제목 확인 실패: ${url}`);
  planned.push({ court, preview, sortOrder: Math.max(-1, ...links.map(({ sort_order }) => sort_order ?? -1)) + 1 + earlier.length });
}

console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", links: planned.length,
  courts: new Set(planned.map(({ court }) => court.id)).size,
  byRegion: Object.fromEntries([...new Set(planned.map(({ court }) => court.basic_region))]
    .map((region) => [region, planned.filter(({ court }) => court.basic_region === region).length])),
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
  .select("court_id,url").in("court_id", [...new Set(planned.map(({ court }) => court.id))]).range(0, 999);
if (verifyError) throw verifyError;
for (const { court, preview } of planned) {
  if (!verified.some(({ court_id, url }) => court_id === court.id && url === preview.url)) {
    throw new Error(`저장 확인 실패: ${court.basic_region} ${court.basic_court_name}`);
  }
}
console.log(`등록 및 재조회 확인 완료: ${planned.length}건`);
