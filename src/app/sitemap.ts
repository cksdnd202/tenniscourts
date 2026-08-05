import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const siteUrl = "https://courtskorea.com";

type SitemapCourtRow = {
  slug: string | null;
  updated_at: string | null;
};

async function fetchActiveCourts(): Promise<SitemapCourtRow[]> {
  const courts: SitemapCourtRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("courtinfo")
      .select("slug, updated_at")
      .eq("use_or_not", true)
      .order("slug", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("sitemap: failed to fetch court slugs", error.message);
      break;
    }

    if (!data?.length) break;

    const rows = data as SitemapCourtRow[];
    for (const row of rows) {
      if (row.slug?.trim()) courts.push(row);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return courts;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courts = await fetchActiveCourts();
  const lastModified = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  };

  const courtEntries: MetadataRoute.Sitemap = courts.map((court) => ({
    url: `${siteUrl}/courts/${court.slug?.trim()}`,
    lastModified: court.updated_at ? new Date(court.updated_at) : lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [homeEntry, ...courtEntries];
}

/** 사이트맵을 하루에 한 번 갱신 */
export const revalidate = 86400;
