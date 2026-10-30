import { NextRequest, NextResponse } from "next/server";
import {
  isAppUpdateMode,
  isAppUpdatePlatform,
  toPublicAppUpdatePolicy,
  type AppUpdatePolicyRow,
} from "@/lib/appUpdatePolicy";
import { denyUnlessAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveInteger(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label}은 1 이상의 정수로 입력해 주세요.`);
  return parsed;
}

function validStoreUrl(value: unknown) {
  const storeUrl = cleanText(value, 1000);
  try {
    const parsed = new URL(storeUrl);
    if (parsed.protocol !== "https:") throw new Error();
    return storeUrl;
  } catch {
    throw new Error("스토어 주소는 https://로 시작하는 올바른 주소여야 합니다.");
  }
}

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const platform = req.nextUrl.searchParams.get("platform") ?? "android";
  if (!isAppUpdatePlatform(platform)) {
    return NextResponse.json({ error: "지원하지 않는 플랫폼입니다." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("app_update_policies")
    .select("platform,enabled,update_mode,latest_version_name,latest_build_number,minimum_build_number,title,message,store_url,remind_after_hours,updated_at")
    .eq("platform", platform)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { policy: toPublicAppUpdatePolicy(data as AppUpdatePolicyRow) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!isAppUpdatePlatform(body.platform)) throw new Error("지원하지 않는 플랫폼입니다.");
    if (!isAppUpdateMode(body.mode)) throw new Error("업데이트 방식을 선택해 주세요.");

    const latestBuildNumber = positiveInteger(body.latestBuildNumber, "최신 빌드 번호");
    const minimumBuildNumber = positiveInteger(body.minimumBuildNumber, "최소 지원 빌드 번호");
    if (minimumBuildNumber > latestBuildNumber) {
      throw new Error("최소 지원 빌드 번호는 최신 빌드 번호보다 클 수 없습니다.");
    }
    if (body.mode === "force" && body.confirmForceUpdate !== true) {
      throw new Error("강제 업데이트 주의사항을 확인해 주세요.");
    }

    const latestVersionName = cleanText(body.latestVersionName, 40);
    const title = cleanText(body.title, 120);
    const message = cleanText(body.message, 500);
    if (!latestVersionName || !title || !message) {
      throw new Error("버전명, 제목, 안내 문구를 모두 입력해 주세요.");
    }

    const remindAfterHours = positiveInteger(body.remindAfterHours, "다시 알림 간격");
    if (remindAfterHours > 720) throw new Error("다시 알림 간격은 최대 720시간입니다.");

    const { data, error } = await getSupabaseAdmin()
      .from("app_update_policies")
      .upsert({
        platform: body.platform,
        enabled: Boolean(body.enabled),
        update_mode: body.mode,
        latest_version_name: latestVersionName,
        latest_build_number: latestBuildNumber,
        minimum_build_number: minimumBuildNumber,
        title,
        message,
        store_url: validStoreUrl(body.storeUrl),
        remind_after_hours: remindAfterHours,
        updated_at: new Date().toISOString(),
      }, { onConflict: "platform" })
      .select("platform,enabled,update_mode,latest_version_name,latest_build_number,minimum_build_number,title,message,store_url,remind_after_hours,updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ policy: toPublicAppUpdatePolicy(data as AppUpdatePolicyRow) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업데이트 정책을 저장하지 못했습니다." },
      { status: 400 }
    );
  }
}
