"use client";

import { useEffect, useState } from "react";
import type { Court } from "../types";
import { supabase } from "@/lib/supabase";
import { AdminInstagramGenerator } from "./AdminInstagramGenerator";

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("어드민 기능은 로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

async function readAdminResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export function InstagramGeneratorPageClient() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCourts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts", { cache: "no-store" });
      const data = await readAdminResponse(response, "목록을 불러오지 못했습니다.");
      setCourts(data.courts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCourts();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[#a7a7a7]">인스타그램 콘텐츠 자동 생성</p>
          <h1 className="mt-2 text-3xl font-semibold">인스타 생성기</h1>
        </div>
        <button
          type="button"
          onClick={loadCourts}
          className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424]"
        >
          새로고침
        </button>
      </section>

      {error ? (
        <div className="rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-[#2f2f2f] bg-[#151515] px-4 py-8 text-sm text-[#a7a7a7]">
          테니스장 목록을 불러오는 중...
        </div>
      ) : (
        <AdminInstagramGenerator courts={courts} />
      )}
    </div>
  );
}
