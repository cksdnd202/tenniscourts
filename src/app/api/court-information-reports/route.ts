import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isCourtInformationReportCategory } from "@/lib/courtInformationReports";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || body.website) {
    return NextResponse.json({ error: "제보 내용을 확인해 주세요." }, { status: 400 });
  }

  const courtId = text(body.courtId, 80);
  const facilityName = text(body.facilityName, 200);
  const content = text(body.content, 5000);
  if (
    !courtId ||
    !facilityName ||
    !isCourtInformationReportCategory(body.category) ||
    content.length < 5
  ) {
    return NextResponse.json(
      { error: "시설, 정보 유형, 제보 내용을 정확히 입력해 주세요." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data: court, error: courtError } = await admin
    .from("courtinfo")
    .select("id,sport_type")
    .eq("id", courtId)
    .maybeSingle();

  if (courtError) {
    return NextResponse.json({ error: "시설 정보를 확인하지 못했습니다." }, { status: 500 });
  }
  if (!court) {
    return NextResponse.json({ error: "해당 시설을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("court_information_reports")
    .insert({
      court_id: court.id,
      court_name: facilityName,
      sport_type: court.sport_type === "badminton" ? "badminton" : "tennis",
      category: body.category,
      content,
      status: "new",
      source: "web",
      page_url: text(body.pageUrl, 1000) || req.headers.get("referer"),
      user_agent: text(req.headers.get("user-agent"), 1000) || null,
    })
    .select("id,created_at")
    .single();

  if (error) {
    console.error("시설 정보 제보 저장 실패:", error.message);
    return NextResponse.json(
      { error: "제보를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ report: data }, { status: 201 });
}
