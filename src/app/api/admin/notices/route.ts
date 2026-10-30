import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isNoticeChannel, type NoticeStatus } from "@/lib/support";

const statuses = new Set<NoticeStatus>(["draft", "published", "archived"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function noticePayload(body: Record<string, unknown>) {
  const title = cleanText(body.title, 120);
  const content = cleanText(body.body, 20000);
  const channels = Array.isArray(body.channels) ? body.channels.filter(isNoticeChannel) : [];
  const status = statuses.has(body.status as NoticeStatus) ? body.status as NoticeStatus : "draft";
  if (!title || !content || !channels.length) throw new Error("제목, 내용, 노출 채널을 입력해 주세요.");
  return {
    title,
    body: content,
    channels: [...new Set(channels)],
    status,
    is_pinned: Boolean(body.isPinned),
    published_at: nullableDate(body.publishedAt),
    publish_ends_at: nullableDate(body.publishEndsAt),
    action_label: cleanText(body.actionLabel, 40) || null,
    action_url: cleanText(body.actionUrl, 1000) || null,
    updated_by: "admin",
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const { data, error } = await getSupabaseAdmin()
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notices: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json() as Record<string, unknown>;
    const payload = noticePayload(body);
    const sendPush = Boolean(body.sendPush);
    if (sendPush && (payload.status !== "published" || !payload.channels.includes("app"))) {
      throw new Error("앱 채널에 게시하는 공지만 푸시로 발송할 수 있습니다.");
    }
    const { data, error } = await getSupabaseAdmin()
      .from("notices")
      .insert({
        ...payload,
        created_by: "admin",
        push_requested_at: sendPush ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ notice: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "공지를 저장하지 못했습니다." }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json() as Record<string, unknown>;
    const id = cleanText(body.id, 80);
    if (!id) throw new Error("수정할 공지를 선택해 주세요.");
    const admin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await admin
      .from("notices")
      .select("push_requested_at,push_sent_at,push_error")
      .eq("id", id)
      .single();
    if (existingError) throw existingError;
    const payload = noticePayload(body);
    const sendPush = Boolean(body.sendPush);
    if (sendPush && (payload.status !== "published" || !payload.channels.includes("app"))) {
      throw new Error("앱 채널에 게시하는 공지만 푸시로 발송할 수 있습니다.");
    }
    const pushUpdate = existing.push_sent_at
      ? {}
      : sendPush
        ? {
            push_requested_at: existing.push_requested_at ?? new Date().toISOString(),
            push_started_at: existing.push_error ? null : undefined,
            push_error: null,
          }
        : { push_requested_at: null, push_started_at: null, push_error: null };
    const { data, error } = await getSupabaseAdmin()
      .from("notices")
      .update({ ...payload, ...pushUpdate })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ notice: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "공지를 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "삭제할 공지를 선택해 주세요." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("notices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
