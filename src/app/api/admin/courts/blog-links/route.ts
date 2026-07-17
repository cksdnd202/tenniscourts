import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { fetchBlogPreview } from "@/lib/blogPreview";
import { storeBlogThumbnail } from "@/lib/blogThumbnailStorage";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type BlogLinkInput = {
  url?: string;
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  source?: string | null;
  sort_order?: number | null;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const courtId = req.nextUrl.searchParams.get("courtId");
  if (!courtId) {
    return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("court_blog_links")
      .select("*")
      .eq("court_id", courtId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 링크를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as { courtId?: string; links?: BlogLinkInput[] };
    const courtId = body.courtId;

    if (!courtId) {
      return NextResponse.json({ error: "courtId가 필요합니다." }, { status: 400 });
    }

    const links = (body.links ?? [])
      .slice(0, 3)
      .map((link, index) => ({
        url: normalizeUrl(link.url),
        title: normalizeText(link.title),
        description: normalizeText(link.description),
        thumbnail_url: normalizeUrl(link.thumbnail_url),
        source: normalizeText(link.source),
        sort_order: Number.isFinite(Number(link.sort_order)) ? Number(link.sort_order) : index,
      }))
      .filter((link) => link.url);

    const enrichedLinks = await Promise.all(
      links.map(async (link, index) => {
        const preview =
          link.title && link.description && link.thumbnail_url
            ? null
            : await fetchBlogPreview({
                url: link.url ?? "",
                title: link.title,
                description: link.description,
                source: link.source,
              });

        const thumbnailUrl = link.thumbnail_url ?? preview?.thumbnail_url ?? null;

        return {
          court_id: courtId,
          url: link.url,
          title: link.title ?? preview?.title ?? null,
          description: link.description ?? preview?.description ?? null,
          thumbnail_url: await storeBlogThumbnail(thumbnailUrl),
          source: link.source ?? preview?.source ?? null,
          sort_order: index,
          updated_at: new Date().toISOString(),
        };
      })
    );

    const admin = getSupabaseAdmin();
    const { error: deleteError } = await admin.from("court_blog_links").delete().eq("court_id", courtId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (enrichedLinks.length === 0) {
      return NextResponse.json({ links: [] });
    }

    const { data, error } = await admin
      .from("court_blog_links")
      .insert(enrichedLinks)
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "블로그 링크를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
