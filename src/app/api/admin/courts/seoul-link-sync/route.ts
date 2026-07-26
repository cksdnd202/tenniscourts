import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { syncSeoulReservationLinks } from "@/lib/seoulReservationSync";

export async function POST(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

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
