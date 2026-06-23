import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/ga4";

function isAuthorized(req: NextRequest) {
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    const summary = await getAnalyticsSummary();

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GA4 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
