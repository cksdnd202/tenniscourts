import { NextRequest, NextResponse } from "next/server";
import {
  isAppUpdatePlatform,
  toPublicAppUpdatePolicy,
  type AppUpdatePolicyRow,
} from "@/lib/appUpdatePolicy";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") ?? "android";
  if (!isAppUpdatePlatform(platform)) {
    return NextResponse.json({ error: "지원하지 않는 플랫폼입니다." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("app_update_policies")
    .select("platform,enabled,update_mode,latest_version_name,latest_build_number,minimum_build_number,title,message,store_url,remind_after_hours,updated_at")
    .eq("platform", platform)
    .maybeSingle();

  if (error) {
    console.error("Failed to load app update policy", error);
    return NextResponse.json({ error: "업데이트 정보를 확인하지 못했습니다." }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ policy: null }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { policy: toPublicAppUpdatePolicy(data as AppUpdatePolicyRow) },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
