import { NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isCourtInformationReportStatus } from "@/lib/courtInformationReports";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const { data, error } = await getSupabaseAdmin()
    .from("court_information_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { reports: data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = text(body?.id, 80);
  if (!id || !isCourtInformationReportStatus(body?.status)) {
    return NextResponse.json({ error: "제보와 처리 상태를 확인해 주세요." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("court_information_reports")
    .update({
      status: body.status,
      reviewed_at: body.status === "new" ? null : now,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
