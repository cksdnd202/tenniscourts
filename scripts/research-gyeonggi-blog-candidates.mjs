import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const cityFilter = process.argv.find((argument) => argument.startsWith("--city="))?.slice(7);
const compactOutput = process.argv.includes("--compact");
const onlyEmpty = process.argv.includes("--only-empty");
const stopWords = /테니스장|테니스코트|테니스구장|테니스/g;
const clean = (value) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/&(?:quot|amp|lt|gt);/g, " ").replace(/\s+/g, " ").trim();
const compact = (value) => clean(value).replace(/\s+/g, "").toLowerCase();

function baseName(name) {
  const alias = name.match(/\(([^)]*(?:테니스|코트)[^)]*)\)/)?.[1];
  if (alias && !/^[A-Z가-힣]?\d*\s*(?:번)?\s*코트|단체/.test(alias)) name = alias;
  return name
    .replace(/,.*$/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*[-–—]\s*(?:하절기|동절기|주말|평일|[A-Z]\s*코트).*$/i, "")
    .replace(/\s*제?\d+\s*(?:번)?\s*코트.*$/i, "")
    .replace(/\s*[A-Z]\s*코트.*$/i, "")
    .replace(/\s*\([123]\s*면\).*$/, "")
    .replace(/\s*\d+\s*면.*$/, "")
    .replace(/\s+풋살장$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const { data: courts, error: courtError } = await db.from("courtinfo")
  .select("id,basic_city,basic_court_name,basic_address,use_or_not")
  .eq("basic_region", "경기").order("basic_city").order("basic_court_name").range(0, 999);
if (courtError) throw courtError;
const { data: links, error: linkError } = await db.from("court_blog_links")
  .select("court_id,url,title").in("court_id", courts.map(({ id }) => id)).range(0, 999);
if (linkError) throw linkError;
const existing = new Map();
for (const link of links) existing.set(link.court_id, (existing.get(link.court_id) ?? 0) + 1);
const groups = new Map();
for (const court of courts) {
  if (cityFilter && court.basic_city !== cityFilter) continue;
  const base = baseName(court.basic_court_name);
  const key = `${court.basic_city}|${base}|${base === "테니스장" || base === "본사 테니스장" ? court.basic_address : ""}`;
  const group = groups.get(key) ?? { city: court.basic_city, base, courts: [] };
  group.courts.push(court);
  groups.set(key, group);
}

let lastSearchAt = 0;
async function search(query, attempts = 0) {
  const elapsed = Date.now() - lastSearchAt;
  if (elapsed < 600) await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
  lastSearchAt = Date.now();
  const params = new URLSearchParams({ query, display: "100", sort: "sim" });
  const response = await fetch(`https://openapi.naver.com/v1/search/blog.json?${params}`, {
    headers: { "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID, "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET },
  });
  if (response.status === 429) {
    if (attempts >= 2) throw new Error("Naver rate limit remained after 3 attempts");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return search(query, attempts + 1);
  }
  if (!response.ok) throw new Error(`Naver ${response.status}: ${await response.text()}`);
  return (await response.json()).items ?? [];
}

for (const group of groups.values()) {
  const missing = group.courts.filter((court) => (existing.get(court.id) ?? 0) < (onlyEmpty ? 1 : 3));
  if (!missing.length) continue;
  const anchor = compact(group.base.replace(stopWords, ""));
  if (anchor.length < 2 || group.base === "테니스장") {
    console.log(JSON.stringify({ city: group.city, base: group.base, courts: missing.length, skipped: "generic-name" }));
    continue;
  }
  const query = `${group.city} ${group.base} 테니스`;
  let items;
  try { items = await search(query); }
  catch (error) { console.log(JSON.stringify({ city: group.city, base: group.base, error: String(error) })); continue; }
  if (!items.some((item) => compact(clean(item.title)).includes(anchor))) {
    try { items = [...items, ...await search(`${group.city} ${group.base.replace(/테니스장|테니스구장|테니스코트/g, "")} 테니스장`)]; }
    catch (error) { console.log(JSON.stringify({ city: group.city, base: group.base, error: String(error) })); continue; }
  }
  const candidates = items.map((item) => {
    const title = clean(item.title);
    const desc = clean(item.description);
    const titleText = compact(title);
    const allText = compact(`${title} ${desc}`);
    const hasAnchor = titleText.includes(anchor) || compact(group.base).length >= 5 && titleText.includes(compact(group.base));
    const hasTennis = /테니스|tennis/i.test(title);
    const wrong = /테니스화|테니스스커트|테니스팔찌|테니스엘보|테니스 라켓|테니스레슨만/i.test(title);
    const score = (titleText.includes(anchor) ? 100 : hasAnchor ? 50 : 0) + (/테니스|tennis/i.test(title) ? 20 : 0) + (item.postdate?.startsWith("2026") ? 8 : 0);
    return { title, desc: desc.slice(0, 90), url: item.link, date: item.postdate, score, acceptable: hasAnchor && hasTennis && !wrong };
  }).filter(({ acceptable }) => acceptable).sort((a, b) => b.score - a.score).slice(0, 4);
  console.log(JSON.stringify({ city: group.city, base: group.base, courts: missing.length, existing: group.courts.map((court) => existing.get(court.id) ?? 0), candidates: compactOutput ? candidates.map(({ title, url, score }) => ({ title, url, score })) : candidates }));
}
