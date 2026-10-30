import { NextRequest, NextResponse } from "next/server";
import { dispatchBookingNotifications } from "@/lib/notificationDelivery";
import { dispatchPendingNoticePushes } from "@/lib/serviceNotificationPush";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.NOTIFICATION_DISPATCH_ENABLED !== "true") {
    return NextResponse.json({ error: "알림 자동 발송이 아직 활성화되지 않았습니다." }, { status: 503 });
  }
  try {
    const [booking, notices] = await Promise.all([
      dispatchBookingNotifications(),
      dispatchPendingNoticePushes(),
    ]);
    const result = { booking, notices };
    console.info("[notification-dispatch]", JSON.stringify(result));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[notification-dispatch] failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "알림 발송 작업에 실패했습니다. 서버 로그를 확인하세요." }, { status: 500 });
  }
}

export const GET = POST;
