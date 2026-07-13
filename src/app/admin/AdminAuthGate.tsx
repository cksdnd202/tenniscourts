"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "cksdnd200@naver.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type AuthState = "checking" | "signed-out" | "denied" | "allowed";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      const userEmail = session?.user.email?.toLowerCase() ?? null;
      setEmail(userEmail);

      if (!session) {
        setAuthState("signed-out");
      } else if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        setAuthState("allowed");
      } else {
        setAuthState("denied");
      }
    }

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      alert(`카카오 로그인 연결에 실패했습니다: ${error.message}`);
    }
  };

  if (authState === "allowed") {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <section className="w-full max-w-sm rounded-xl border border-[#2C2C2C] bg-[#191B1E] p-6">
        {authState === "checking" ? (
          <>
            <h1 className="text-xl font-semibold">어드민 권한 확인 중</h1>
            <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
              로그인 정보를 확인하고 있습니다.
            </p>
          </>
        ) : authState === "signed-out" ? (
          <>
            <h1 className="text-xl font-semibold">로그인이 필요합니다.</h1>
            <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
              어드민 페이지는 허용된 카카오 계정으로만 접근할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={login}
              className="mt-6 w-full rounded-lg bg-[#2C8B56] px-4 py-3 text-sm font-semibold text-white hover:bg-[#53A978]"
            >
              카카오 로그인
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">접근 권한이 없습니다.</h1>
            <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
              현재 로그인된 계정{email ? `(${email})` : ""}은 어드민 접근 권한이 없습니다.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
