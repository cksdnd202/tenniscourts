import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { bookingPushMessage, expoRequest, type ExpoResult } from "@/lib/expoPush";

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: auth, error: authError } = await db.auth.getUser(bearer);
  if (authError || !auth.user) return NextResponse.json({ error: "다시 로그인해 주세요." }, { status: 401 });
  const body = await req.json().catch(() => null) as { ruleId?: string } | null;
  if (!body?.ruleId || !/^[0-9a-f-]{36}$/i.test(body.ruleId)) {
    return NextResponse.json({ error: "예약 규칙을 선택해 주세요." }, { status: 400 });
  }
  const [subscription, rule, tokens] = await Promise.all([
    db.from("notification_subscriptions").select("id").eq("user_id", auth.user.id)
      .eq("booking_rule_id", body.ruleId).eq("is_enabled", true).limit(1),
    db.from("court_booking_rules").select("id,court_id,eligibility,target_condition")
      .eq("id", body.ruleId).eq("is_active", true).maybeSingle(),
    db.from("device_push_tokens").select("id,expo_push_token").eq("user_id", auth.user.id).eq("is_enabled", true).limit(10),
  ]);
  if (subscription.error || rule.error || tokens.error) return NextResponse.json({ error: "알림 설정 확인에 실패했습니다." }, { status: 500 });
  if (!subscription.data?.length || !rule.data || !tokens.data?.length) {
    return NextResponse.json({ error: "이 예약 규칙의 알림을 저장하고 휴대폰 알림을 연결해 주세요." }, { status: 409 });
  }
  const selectedRule = rule.data;
  const { data: court, error } = await db.from("courtinfo").select("id,slug,basic_court_name")
    .eq("id", selectedRule.court_id).eq("sport_type", "tennis")
    .eq("use_or_not", true).maybeSingle();
  if (error || !court) return NextResponse.json({ error: "테니스장을 확인하지 못했습니다." }, { status: 404 });
  try {
    const tickets = await expoRequest<ExpoResult[]>("send", tokens.data.map((token) => bookingPushMessage({
      token: token.expo_push_token, courtName: court.basic_court_name,
      slug: court.slug || court.id, ruleId: body.ruleId!, opensAt: new Date().toISOString(),
      leadMinutes: 10, eligibility: selectedRule.eligibility,
      targetCondition: selectedRule.target_condition, test: true,
    })));
    const accepted = tickets.filter((ticket) => ticket.status === "ok").length;
    if (!accepted) return NextResponse.json({ error: "푸시 전송에 실패했습니다. 알림 연결을 다시 확인해 주세요." }, { status: 502 });
    return NextResponse.json({ accepted }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "푸시 서버 응답을 확인하지 못했습니다." }, { status: 502 });
  }
}
