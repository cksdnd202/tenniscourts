import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const siteUrl = "https://courtskorea.com";

async function fetchActiveCourtSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("courtinfo")
      .select("slug")
      .eq("use_or_not", true)
      .order("slug", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("sitemap: failed to fetch court slugs", error.message);
      break;
    }

    if (!data?.length) break;

    const rows = data as { slug: string | null }[];
    for (const row of rows) {
      if (row.slug?.trim()) slugs.push(row.slug.trim());
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courtSlugs = await fetchActiveCourtSlugs();
  const lastModified = new Date();

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  };

  const courtEntries: MetadataRoute.Sitemap = courtSlugs.map((slug) => ({
    url: `${siteUrl}/courts/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [homeEntry, ...courtEntries];
}

/** 사이트맵을 하루에 한 번 갱신 */
export const revalidate = 86400;
