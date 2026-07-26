import { NextRequest, NextResponse } from "next/server";
import { syncSeoulReservationLinks } from "@/lib/seoulReservationSync";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");

  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSeoulReservationLinks();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서울시 예약 링크 동기화에 실패했습니다." },
      { status: 500 }
    );
  }
}
