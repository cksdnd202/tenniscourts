import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://courtskorea.com").replace(
  /\/$/,
  ""
);

async function fetchActiveCourtIds(): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("courtinfo")
      .select("id")
      .eq("use_or_not", true)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("sitemap: failed to fetch court ids", error.message);
      break;
    }

    if (!data?.length) break;

    const rows = data as { id: string | number }[];
    for (const row of rows) {
      if (row.id != null) ids.push(String(row.id));
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courtIds = await fetchActiveCourtIds();
  const lastModified = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  };

  const courtEntries: MetadataRoute.Sitemap = courtIds.map((id) => ({
    url: `${siteUrl}/courts/${id}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [homeEntry, ...courtEntries];
}

/** 사이트맵을 하루에 한 번 갱신 */
export const revalidate = 86400;
