import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_ADMIN_EMAILS = ["cksdnd200@naver.com"];

export function isLocalhostRequest(req: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(req.nextUrl.hostname);
}

function getAdminEmails() {
  const configuredEmails = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  const source = configuredEmails ? configuredEmails.split(",") : DEFAULT_ADMIN_EMAILS;

  return new Set(source.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function denyUnlessAdmin(req: NextRequest) {
  if (isLocalhostRequest(req)) return null;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();

  if (error || !email) {
    return NextResponse.json({ error: "로그인 정보를 확인하지 못했습니다." }, { status: 401 });
  }

  if (!getAdminEmails().has(email)) {
    return NextResponse.json({ error: "어드민 접근 권한이 없습니다." }, { status: 403 });
  }

  return null;
}
