import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isInquiryCategory } from "@/lib/support";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.website) {
    return NextResponse.json({ error: "문의 내용을 확인해 주세요." }, { status: 400 });
  }

  const title = text(body.title, 120);
  const content = text(body.body, 10000);
  const contactEmail = text(body.contactEmail, 320).toLowerCase();
  const category = isInquiryCategory(body.category) ? body.category : "other";
  if (!title || !content || !emailPattern.test(contactEmail)) {
    return NextResponse.json({ error: "제목, 내용, 이메일을 정확히 입력해 주세요." }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let userId: string | null = null;
  if (token) {
    const { data } = await getSupabaseAdmin().auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("customer_inquiries")
    .insert({
      user_id: userId,
      source: "web",
      category,
      title,
      body: content,
      contact_name: text(body.contactName, 80) || null,
      contact_email: contactEmail,
      status: "new",
      page_url: text(body.pageUrl, 1000) || req.headers.get("referer"),
      user_agent: text(req.headers.get("user-agent"), 1000) || null,
    })
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  return NextResponse.json({ inquiry: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: "로그인 정보를 확인하지 못했습니다." }, { status: 401 });

  const { data, error } = await admin
    .from("customer_inquiries")
    .select("*,customer_inquiry_replies(*)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "문의 내역을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ inquiries: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
