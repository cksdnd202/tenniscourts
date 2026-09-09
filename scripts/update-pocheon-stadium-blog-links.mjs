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

const urls = [
  "https://blog.naver.com/inminjjeong/223402918536",
  "https://blog.naver.com/2eeyunjin/223215747285",
  "https://blog.naver.com/sool920/223223476221",
];

const previews = await Promise.all(urls.map((url) => fetchBlogPreview({ url })));
for (const preview of previews) {
  const text = `${preview.title ?? ""} ${preview.description ?? ""}`;
  if (!text.includes("포천") || !text.includes("테니스")) {
    throw new Error(`시설 관련성 검증 실패: ${preview.url}`);
  }
}

const { data: court, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_city,basic_court_name,basic_address")
  .eq("basic_city", "포천시")
  .ilike("basic_court_name", "%종합운동장%테니스장%")
  .single();
if (courtError) throw new Error(`포천 종합운동장 테니스장 조회 실패: ${courtError.message}`);

if (!shouldApply) {
  console.log(JSON.stringify({ mode: "dry-run", court, previews }, null, 2));
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
if (deleteError) throw new Error(`기존 블로그 링크 정리 실패: ${deleteError.message}`);

const { error: insertError } = await supabase.from("court_blog_links").insert(rows);
if (insertError) throw new Error(`블로그 링크 등록 실패: ${insertError.message}`);

const { data: verified, error: verifyError } = await supabase
  .from("court_blog_links")
  .select("id,url,title,description,thumbnail_url,source,sort_order")
  .eq("court_id", court.id)
  .order("sort_order");
if (verifyError) throw new Error(`블로그 링크 검증 실패: ${verifyError.message}`);
if (verified.length !== 3 || verified.some((row, index) => row.url !== urls[index])) {
  throw new Error(`블로그 링크 검증 결과가 예상과 다릅니다: ${JSON.stringify(verified)}`);
}

console.log(JSON.stringify({ mode: "applied", court, links: verified }, null, 2));
