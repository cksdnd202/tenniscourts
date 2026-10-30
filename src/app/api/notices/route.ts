import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isNoticeChannel } from "@/lib/support";

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") ?? "web";
  if (!isNoticeChannel(channel)) {
    return NextResponse.json({ error: "올바른 공지 채널이 아닙니다." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("notices")
    .select("id,title,body,channels,is_pinned,published_at,publish_ends_at,action_label,action_url,created_at,updated_at")
    .eq("status", "published")
    .contains("channels", [channel])
    .or(`published_at.is.null,published_at.lte.${now}`)
    .or(`publish_ends_at.is.null,publish_ends_at.gt.${now}`)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "공지사항을 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ notices: data ?? [] }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
