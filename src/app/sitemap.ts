import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { removeMonthlySlugToken } from "@/lib/slugRedirect";

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
      .in("sport_type", ["tennis", "badminton"])
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
  const latestCourtUpdate = courts.reduce<Date | undefined>((latest, court) => {
    if (!court.updated_at) return latest;
    const updatedAt = new Date(court.updated_at);
    if (Number.isNaN(updatedAt.getTime())) return latest;
    return !latest || updatedAt > latest ? updatedAt : latest;
  }, undefined);

  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    ...(latestCourtUpdate ? { lastModified: latestCourtUpdate } : {}),
    changeFrequency: "daily",
    priority: 1,
  };

  const policyEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/account-deletion`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/notices`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const seenCourtUrls = new Set<string>();
  const courtEntries: MetadataRoute.Sitemap = courts.flatMap((court) => {
    const slug = removeMonthlySlugToken(court.slug?.trim() ?? "");
    const url = `${siteUrl}/courts/${slug}`;

    if (!slug || seenCourtUrls.has(url)) return [];
    seenCourtUrls.add(url);

    return [{
      url,
      ...(court.updated_at ? { lastModified: new Date(court.updated_at) } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    }];
  });

  return [
    homeEntry,
    { ...homeEntry, url: `${siteUrl}/tennis`, priority: 0.9 },
    { ...homeEntry, url: `${siteUrl}/badminton`, priority: 0.9 },
    ...policyEntries,
    ...courtEntries,
  ];
}

/** 사이트맵을 하루에 한 번 갱신 */
export const revalidate = 3600;
