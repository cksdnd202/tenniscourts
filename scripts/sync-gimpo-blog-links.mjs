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

const sharedPungnyeonLinks = ["https://blog.naver.com/gimpo2010/223464778206"];

const catalog = [
  {
    name: "고촌 파르코스 테니스장",
    pattern: /파르코스|고촌체육공원/i,
    urls: [
      "https://blog.naver.com/bwh011/224330331315",
      "https://blog.naver.com/ksk3147/223625086809",
      "https://blog.naver.com/everx3/223472617187",
    ],
  },
  {
    name: "김포 솔터실내테니스장",
    pattern: /솔터.{0,12}테니스|김포생활체육관.{0,12}테니스/i,
    urls: [
      "https://blog.naver.com/perfume64/223985701965",
      "https://blog.naver.com/writer_oh_store/224033341710",
      "https://blog.naver.com/traveler_suhyun/224260896405",
    ],
  },
  {
    name: "김포 종합운동장 테니스장",
    pattern: /김포시민회관코트|사우문화체육광장|김포시종합운동장/i,
    urls: [
      "https://blog.naver.com/everx3/224301021619",
      "https://blog.naver.com/gimpo2010/223426554147",
      "https://blog.naver.com/gimpo2010/222957448498",
    ],
  },
  {
    name: "동성테니스클럽",
    pattern: /동성테니스/i,
    urls: ["https://blog.naver.com/sunnis_tennis/223285967348"],
  },
  {
    name: "서암생활체육공원 테니스장",
    pattern: /서암.{0,16}테니스/i,
    urls: [
      "https://blog.naver.com/pgk2000/222884384261",
      "https://blog.naver.com/setthetable063/223551903590",
      "https://blog.naver.com/yellowhole_biz/223375400907",
    ],
  },
  {
    name: "심플테니스",
    pattern: /심플.{0,12}테니스|simple tennis/i,
    urls: [
      "https://blog.naver.com/gangan_go/224255661918",
      "https://blog.naver.com/everx3/224221427652",
      "https://blog.naver.com/each88/224327916267",
    ],
  },
  {
    name: "양곡테니스장",
    pattern: /양곡.{0,12}테니스/i,
    urls: [],
  },
  {
    name: "통진 레코파크 테니스장",
    pattern: /통진.{0,8}레코파크/i,
    urls: [
      "https://blog.naver.com/gimpo2010/222744116848",
      "https://blog.naver.com/lo0612ol/222088377923",
      "https://blog.naver.com/lghost_kr/220935187030",
    ],
  },
  {
    name: "풍년근린공원 테니스장 (1번)",
    pattern: /풍년.{0,16}(테니스|근린공원)/i,
    urls: sharedPungnyeonLinks,
  },
  {
    name: "풍년근린공원 테니스장 (2번)",
    pattern: /풍년.{0,16}(테니스|근린공원)/i,
    urls: sharedPungnyeonLinks,
  },
];

const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_city,use_or_not")
  .eq("basic_city", "김포시")
  .eq("use_or_not", true)
  .order("basic_court_name");

if (courtError) throw new Error(`김포시 노출 테니스장 조회 실패: ${courtError.message}`);

const actualNames = (courts ?? []).map(({ basic_court_name }) => basic_court_name).sort();
const catalogNames = catalog.map(({ name }) => name).sort();
if (JSON.stringify(actualNames) !== JSON.stringify(catalogNames)) {
  throw new Error(`대상 목록이 리서치 시점과 다릅니다: ${JSON.stringify(actualNames)}`);
}

const courtByName = new Map(courts.map((court) => [court.basic_court_name, court]));
const researched = [];
for (const definition of catalog) {
  const previews = await Promise.all(definition.urls.map((url) => fetchBlogPreview({ url })));
  for (const preview of previews) {
    const text = `${preview.title ?? ""} ${preview.description ?? ""}`;
    if (!definition.pattern.test(text)) {
      throw new Error(`${definition.name} 관련성 검증 실패: ${preview.url}`);
    }
  }
  researched.push({ ...definition, court: courtByName.get(definition.name), previews });
}

if (!shouldApply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        courtCount: researched.length,
        linkCount: researched.reduce((sum, item) => sum + item.previews.length, 0),
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

  if (rows.length) {
    const { error: insertError } = await supabase.from("court_blog_links").insert(rows);
    if (insertError) throw new Error(`${court.basic_court_name} 링크 저장 실패: ${insertError.message}`);
  }
}

const courtIds = courts.map(({ id }) => id);
const { data: verified, error: verifyError } = await supabase
  .from("court_blog_links")
  .select("court_id,url,title,description,thumbnail_url,source,sort_order")
  .in("court_id", courtIds)
  .order("court_id")
  .order("sort_order");

if (verifyError) throw new Error(`저장 검증 실패: ${verifyError.message}`);

for (const definition of catalog) {
  const court = courtByName.get(definition.name);
  const saved = (verified ?? []).filter(({ court_id }) => court_id === court.id);
  if (
    saved.length !== definition.urls.length ||
    saved.some((row, index) => row.url !== definition.urls[index] || row.sort_order !== index)
  ) {
    throw new Error(`${definition.name} 검증 불일치: ${JSON.stringify(saved)}`);
  }
}

console.log(
  JSON.stringify(
    {
      mode: "applied",
      courtCount: courts.length,
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
