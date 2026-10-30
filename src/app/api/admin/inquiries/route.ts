import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isInquiryStatus } from "@/lib/support";
import { sendInquiryReplyPush } from "@/lib/serviceNotificationPush";

function value(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const { data, error } = await getSupabaseAdmin()
    .from("customer_inquiries")
    .select("*,customer_inquiry_replies(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const id = value(body?.id, 80);
  if (!id || !isInquiryStatus(body?.status)) {
    return NextResponse.json({ error: "문의와 상태를 확인해 주세요." }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("customer_inquiries")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const id = value(body?.id, 80);
  const reply = value(body?.body, 10000);
  if (!id || !reply) return NextResponse.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: created, error: replyError } = await admin
    .from("customer_inquiry_replies")
    .insert({ inquiry_id: id, body: reply, author_type: "admin", author_label: "Courts Korea" })
    .select("*")
    .single();
  if (replyError) return NextResponse.json({ error: replyError.message }, { status: 500 });

  const { data: inquiry, error: inquiryError } = await admin
    .from("customer_inquiries")
    .update({ status: "answered", last_replied_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();
  if (inquiryError) return NextResponse.json({ error: inquiryError.message }, { status: 500 });
  if (inquiry.user_id && inquiry.source === "app") {
    try {
      await sendInquiryReplyPush({
        userId: inquiry.user_id,
        inquiryId: inquiry.id,
        replyId: created.id,
        inquiryTitle: inquiry.title,
      });
    } catch (pushError) {
      console.error("Failed to send inquiry reply push", pushError);
    }
  }
  return NextResponse.json({ inquiry, reply: created }, { status: 201 });
}
