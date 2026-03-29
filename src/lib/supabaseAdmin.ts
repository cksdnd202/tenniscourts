import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined;
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "서버에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 서버 전용(Route Handler, Server Action). RLS 우회 — 클라이언트에서 import 금지. */
export const supabaseAdmin =
  process.env.NODE_ENV === "production"
    ? getSupabaseAdmin()
    : (global._supabaseAdmin ??= getSupabaseAdmin());
