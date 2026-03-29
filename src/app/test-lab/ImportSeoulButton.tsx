"use client";

import { useState } from "react";

export function ImportSeoulButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  const run = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const headers: HeadersInit = {};
      if (adminSecret.trim()) {
        headers.Authorization = `Bearer ${adminSecret.trim()}`;
      }
      const res = await fetch("/api/import/seoul-tennis-one", {
        method: "POST",
        headers,
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(typeof body.error === "string" ? body.error : JSON.stringify(body));
        return;
      }
      setStatus("done");
      const range = body.meta?.apiRange ? ` (API 구간 ${body.meta.apiRange})` : "";
      setMessage(
        `삽입 완료: id=${body.row?.id}, 이름=${body.row?.basic_court_name}${range}`
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "요청 실패");
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-[#2C2C2C] bg-[#141416] p-4">
      <p className="text-sm text-[#C4C7CF]">
        서울시 API에서 <strong className="text-white">테니스장 1건</strong>을 가져와{" "}
        <code className="text-[#8A8F98]">courtinfo</code>에 삽입합니다. (id는 DB가 자동 생성,
        SVCID는 저장하지 않음)
      </p>
      <p className="mt-2 text-xs text-[#8A8F98]">
        서버에 <code className="text-[#C4C7CF]">SUPABASE_SERVICE_ROLE_KEY</code>가 있어야 합니다.
        배포 환경에서 <code className="text-[#C4C7CF]">IMPORT_ADMIN_SECRET</code>을 쓰는 경우 아래에
        같은 값을 입력하세요.
      </p>
      <input
        type="password"
        value={adminSecret}
        onChange={(e) => setAdminSecret(e.target.value)}
        placeholder="IMPORT_ADMIN_SECRET (선택)"
        className="mt-3 w-full max-w-md rounded-lg border border-[#3C3C3C] bg-[#0D0D0F] px-3 py-2 text-sm text-white placeholder:text-[#6B7280]"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={run}
        disabled={status === "loading"}
        className="mt-3 inline-flex items-center rounded-lg bg-[#2C8B56] px-4 py-2 text-sm font-medium text-white hover:bg-[#53A978] disabled:opacity-50"
      >
        {status === "loading" ? "삽입 중…" : "테니스장 1건 DB 삽입"}
      </button>
      {message ? (
        <p
          className={`mt-3 text-sm ${status === "error" ? "text-red-300" : "text-[#4ADE80]"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
