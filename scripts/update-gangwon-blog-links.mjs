import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { fetchBlogPreview } from "../src/lib/blogPreview.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldApply = process.argv.includes("--apply");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const catalog = [
  {
    name: "동해시 웰빙레포츠타운 테니스장",
    pattern: /동해.{0,20}(웰빙레포츠타운|종합경기장)|웰빙레포츠타운/i,
    urls: [
      "https://blog.naver.com/1bin1/223502386529",
      "https://blog.naver.com/leeromin2/223047422657",
    ],
  },
  {
    name: "양양 테니스장",
    pattern: /양양.{0,20}(종합운동장|테니스 코트|테니스장)/i,
    urls: ["https://blog.naver.com/tennis_with_you/223009203969"],
  },
  {
    name: "조산 테니스장",
    pattern: /조산.{0,12}테니스|해오름.{0,12}테니스/i,
    urls: [
      "https://blog.naver.com/daily_review12/224381830568",
      "https://blog.naver.com/logan_life/223652876141",
    ],
  },
  {
    name: "한국도로공사 양양지사 테니스장",
    pattern: /양양.{0,20}테니스장/i,
    urls: ["https://blog.naver.com/assiduitas1027/223676105229"],
  },
  {
    name: "스포츠파크 테니스장",
    pattern: /영월.{0,20}(스포츠파크|전천후).{0,12}테니스/i,
    urls: ["https://blog.naver.com/daily_sub/223577393149"],
  },
  {
    name: "춘천송암스포츠타운 테니스장",
    pattern: /송암.{0,20}(스포츠타운|테니스)/i,
    urls: [
      "https://blog.naver.com/iloveyou0981/224332730282",
      "https://blog.naver.com/moon_tennis/223203107347",
    ],
  },
  {
    name: "호반테니스장",
    pattern: /호반.{0,12}테니스/i,
    urls: [
      "https://blog.naver.com/hajabi_/223272402738",
      "https://blog.naver.com/yoonyoon_111/223604212733",
      "https://blog.naver.com/gp1229/223419323875",
    ],
  },
  {
    name: "붕어섬 테니스장",
    pattern: /붕어섬.{0,12}테니스|전국의 테니스\s*장 어디까지|드디어 한판 붙다/i,
    urls: [
      "https://blog.naver.com/lck3061/221698337798",
      "https://blog.naver.com/uvelym_mama/223135513334",
    ],
  },
];

const targetNames = catalog.map(({ name }) => name);
const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_city,basic_region,use_or_not")
  .eq("basic_region", "강원")
  .eq("use_or_not", true)
  .in("basic_court_name", targetNames);

if (courtError) throw new Error(`강원도 테니스장 조회 실패: ${courtError.message}`);

const courtByName = new Map((courts ?? []).map((court) => [court.basic_court_name, court]));
const missingNames = targetNames.filter((name) => !courtByName.has(name));
if (missingNames.length) {
  throw new Error(`DB에서 대상 테니스장을 찾지 못했습니다: ${missingNames.join(", ")}`);
}

const targetIds = courts.map(({ id }) => id);
const { data: existingLinks, error: existingError } = await supabase
  .from("court_blog_links")
  .select("court_id,url,title,sort_order")
  .in("court_id", targetIds)
  .order("court_id")
  .order("sort_order");

if (existingError) throw new Error(`기존 블로그 링크 조회 실패: ${existingError.message}`);

const researched = [];
for (const definition of catalog) {
  const previews = await Promise.all(definition.urls.map((url) => fetchBlogPreview({ url })));

  for (const preview of previews) {
    const text = `${preview.title ?? ""} ${preview.description ?? ""}`;
    if (!definition.pattern.test(text)) {
      throw new Error(`${definition.name} 관련성 검증 실패: ${preview.url} / ${text}`);
    }
  }

  researched.push({
    ...definition,
    court: courtByName.get(definition.name),
    previews,
  });
}

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        courtCount: researched.length,
        linkCount: researched.reduce((sum, item) => sum + item.previews.length, 0),
        existingLinks,
        courts: researched.map(({ court, previews }) => ({ court, previews })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

async function storeThumbnail(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CourtsKoreaPreview/1.0; +https://courtskorea.com)",
        Accept: "image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
        Referer: "https://blog.naver.com/",
      },
    });
    if (!response.ok) return url;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > 2 * 1024 * 1024) return url;

    const path = `${createHash("sha256").update(url).digest("hex")}.${extension}`;
    const { error } = await supabase.storage.from("blog-thumbnails").upload(path, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) return url;

    return supabase.storage.from("blog-thumbnails").getPublicUrl(path).data.publicUrl;
  } catch {
    return url;
  }
}

const now = new Date().toISOString();
for (const { court, previews } of researched) {
  const rows = await Promise.all(
    previews.map(async (preview, index) => ({
      court_id: court.id,
      url: preview.url,
      title: preview.title,
      description: preview.description,
      thumbnail_url: await storeThumbnail(preview.thumbnail_url),
      source: preview.source,
      sort_order: index,
      updated_at: now,
    }))
  );

  const { error: deleteError } = await supabase
    .from("court_blog_links")
    .delete()
    .eq("court_id", court.id);
  if (deleteError) throw new Error(`${court.basic_court_name} 기존 링크 정리 실패: ${deleteError.message}`);

  const { error: insertError } = await supabase.from("court_blog_links").insert(rows);
  if (insertError) throw new Error(`${court.basic_court_name} 링크 저장 실패: ${insertError.message}`);
}

const { data: verified, error: verifyError } = await supabase
  .from("court_blog_links")
  .select("court_id,url,title,description,thumbnail_url,source,sort_order")
  .in("court_id", targetIds)
  .order("court_id")
  .order("sort_order");

if (verifyError) throw new Error(`저장 결과 조회 실패: ${verifyError.message}`);

for (const definition of catalog) {
  const court = courtByName.get(definition.name);
  const saved = (verified ?? []).filter(({ court_id }) => court_id === court.id);
  if (
    saved.length !== definition.urls.length ||
    saved.some((row, index) => row.url !== definition.urls[index] || row.sort_order !== index)
  ) {
    throw new Error(`${definition.name} 저장 검증 불일치: ${JSON.stringify(saved)}`);
  }
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      courtCount: catalog.length,
      linkCount: verified?.length ?? 0,
      courts: catalog.map((definition) => ({
        name: definition.name,
        links: (verified ?? []).filter(
          ({ court_id }) => court_id === courtByName.get(definition.name).id
        ),
      })),
    },
    null,
    2
  )
);
