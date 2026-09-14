import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { data: courts, error: courtError } = await supabase
  .from("courtinfo")
  .select("id,basic_court_name,basic_address,slug")
  .eq("basic_city", "김포시")
  .eq("use_or_not", true)
  .order("basic_court_name");

if (courtError) throw new Error(`김포시 노출 테니스장 조회 실패: ${courtError.message}`);

const courtIds = (courts ?? []).map(({ id }) => id);
const { data: links, error: linkError } = await supabase
  .from("court_blog_links")
  .select("court_id,url,title,description,source,sort_order")
  .in("court_id", courtIds)
  .order("court_id")
  .order("sort_order");

if (linkError) throw new Error(`블로그 링크 조회 실패: ${linkError.message}`);

const linksByCourt = new Map();
for (const link of links ?? []) {
  const courtLinks = linksByCourt.get(link.court_id) ?? [];
  courtLinks.push(link);
  linksByCourt.set(link.court_id, courtLinks);
}

console.log(
  JSON.stringify(
    {
      courtCount: courts?.length ?? 0,
      linkCount: links?.length ?? 0,
      courts: (courts ?? []).map((court) => ({
        ...court,
        blogLinks: linksByCourt.get(court.id) ?? [],
      })),
    },
    null,
    2
  )
);
