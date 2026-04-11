import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var _supabaseAdmin: SupabaseClient | undefined;
}

let productionAdminClient: SupabaseClient | undefined;

/**
 * 서버 전용(Route Handler, Server Action). RLS 우회 — 클라이언트에서 import 금지.
 * 빌드 시점(next build)에는 env가 없을 수 있으므로, 호출 시점에만 클라이언트를 만든다.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (process.env.NODE_ENV !== "production") {
    return (global._supabaseAdmin ??= createSupabaseAdmin());
  }
  return (productionAdminClient ??= createSupabaseAdmin());
}

function createSupabaseAdmin(): SupabaseClient {
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
