import { NextRequest, NextResponse } from "next/server";
import { syncNotificationOccurrences } from "@/lib/notificationOccurrenceSync";

export const dynamic = "force-dynamic";

function authorizeCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json(
          { error: "CRON_SECRET이 설정되지 않았습니다." },
          { status: 503 }
        )
      : null;
  }

  return req.headers.get("authorization") === `Bearer ${secret}`
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const authorizationError = authorizeCronRequest(req);
  if (authorizationError) return authorizationError;

  try {
    const result = await syncNotificationOccurrences();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "예약 오픈 시각 생성에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
