// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// .env.local에 넣어둔 환경변수(로컬/배포 모두 같은 이름)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수 검증
if (!url || !anon) {
  throw new Error(
    "Supabase 환경 변수가 설정되지 않았습니다.\n" +
    "프로젝트 루트에 .env.local 파일을 생성하고 다음을 추가하세요:\n\n" +
    "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n" +
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n" +
    "Supabase 프로젝트 설정에서 URL과 anon key를 확인할 수 있습니다."
  );
}

// 개발중 HMR로 여러 번 생성되는 걸 방지(선택: 있어도 무방)
declare global {
  // eslint-disable-next-line no-var
  var _supabase: ReturnType<typeof createClient> | undefined;
}

export const supabase =
  global._supabase ?? createClient(url, anon);

// dev 환경에서만 전역에 보관
if (process.env.NODE_ENV !== "production") {
  global._supabase = supabase;
}