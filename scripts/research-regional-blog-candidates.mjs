import { createClient } from "@supabase/supabase-js";

const regions = ["강원", "경남", "경북"];
const selectedRegion = process.argv.find((value) => value.startsWith("--region="))?.slice(9);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: courts, error: courtError } = await db.from("courtinfo")
  .select("id,basic_region,basic_city,basic_court_name,basic_address,use_or_not")
  .in("basic_region", selectedRegion ? [selectedRegion] : regions).range(0, 999);
if (courtError) throw courtError;
const { data: links, error: linkError } = await db.from("court_blog_links")
  .select("court_id").in("court_id", courts.map(({ id }) => id)).range(0, 999);
if (linkError) throw linkError;
const covered = new Set(links.map(({ court_id }) => court_id));
const missing = courts.filter((court) => court.use_or_not && !covered.has(court.id));

const strip = (value) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/&(?:quot|amp|lt|gt|#\d+);/g, " ").replace(/\s+/g, " ").trim();
const compact = (value) => strip(value).replace(/\s+/g, "").toLowerCase();
const baseName = (name) => name
  .replace(/\([A-Z가-힣0-9\s]+코트\)/g, "")
  .replace(/\s*\d+번코트$/g, "")
  .replace(/\s*\([^)]*테니스장\)$/g, "")
  .trim();
const groups = new Map();
for (const court of missing) {
  const name = baseName(court.basic_court_name);
  const key = `${court.basic_region}|${court.basic_city}|${name}`;
  const group = groups.get(key) ?? { region: court.basic_region, city: court.basic_city, name, courts: [] };
  group.courts.push(court);
  groups.set(key, group);
}

for (const group of groups.values()) {
  const anchor = compact(group.name.replace(/테니스장|테니스코트|테니스구장|테니스/g, ""));
  if (anchor.length < 2 || /^(테니스장|본사 테니스장)$/.test(group.name)) {
    console.log(JSON.stringify({ region: group.region, city: group.city, name: group.name, count: group.courts.length, skipped: "generic" }));
    continue;
  }
  const query = `${group.city} ${group.name} 테니스장`;
  const params = new URLSearchParams({ query, display: "100", sort: "sim" });
  const response = await fetch(`https://openapi.naver.com/v1/search/blog.json?${params}`, {
    headers: { "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID, "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET },
  });
  if (!response.ok) throw new Error(`Naver ${response.status}: ${await response.text()}`);
  const items = (await response.json()).items ?? [];
  const candidates = items.map((item) => ({
    title: strip(item.title),
    description: strip(item.description).slice(0, 110),
    url: item.link,
  })).filter(({ title }) => {
    const text = compact(title);
    return (text.includes(anchor) || anchor.length >= 5 && text.includes(anchor.slice(0, Math.max(3, anchor.length - 2))))
      && /테니스|정구/i.test(title) && !/테니스화|라켓|레슨만|테니스엘보/.test(title);
  }).slice(0, 6);
  console.log(JSON.stringify({ region: group.region, city: group.city, name: group.name, count: group.courts.length, candidates }));
  await new Promise((resolve) => setTimeout(resolve, 700));
}
