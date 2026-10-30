"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AdminAuthGate } from "./AdminAuthGate";

type IconName = "dashboard" | "court" | "notice" | "inquiry" | "chart" | "instagram" | "api" | "update" | "external" | "logout" | "menu" | "close";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    court: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 12h18M7 8v8M17 8v8"/></>,
    notice: <><path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M7 13v7l5-3 5 3v-7M8 8h8"/></>,
    inquiry: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/></>,
    api: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
    update: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8.2A7 7 0 0 1 18.4 6L20 7M4 17l1.6 1A7 7 0 0 0 17.9 15.8"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    logout: <><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>{paths[name]}</svg>;
}

const groups = [
  { label: "개요", items: [{ href: "/admin/dashboard", label: "대시보드", icon: "dashboard" as const }] },
  { label: "서비스 관리", items: [{ href: "/admin/courtslist", label: "테니스장 관리", icon: "court" as const }] },
  { label: "고객 관리", items: [
    { href: "/admin/notices", label: "공지사항", icon: "notice" as const },
    { href: "/admin/inquiries", label: "고객문의", icon: "inquiry" as const },
    { href: "/admin/reports", label: "사용자 정보 제보", icon: "court" as const },
  ]},
  { label: "운영 도구", items: [
    { href: "/admin/app-updates", label: "앱 업데이트 관리", icon: "update" as const },
    { href: "/admin/analytics", label: "데이터 분석", icon: "chart" as const },
    { href: "/admin/instagramgenerator", label: "인스타 생성기", icon: "instagram" as const },
  ]},
  { label: "개발자 도구", items: [{ href: "/admin/esharetest", label: "API 테스트", icon: "api" as const }] },
];

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("관리자");
  const [unanswered, setUnanswered] = useState(0);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setEmail(data.session?.user.email ?? "관리자");
      if (!data.session?.access_token) return;
      const response = await fetch("/api/admin/dashboard", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { counts?: { unansweredInquiries?: number } };
      setUnanswered(result.counts?.unansweredInquiries ?? 0);
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin");
    router.refresh();
  };

  const sidebar = <>
    <div className="flex h-[76px] items-center justify-between border-b border-[#E8ECEF] px-6">
      <Link href="/admin/dashboard" className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#32C985] text-lg font-black text-[#14372A] shadow-[0_5px_14px_rgba(50,201,133,.18)]">C</span>
        <span><strong className="block text-[15px] tracking-tight text-[#202428]">Courts Korea</strong><span className="mt-0.5 block text-[10px] font-semibold tracking-[.18em] text-[#939AA2]">ADMIN</span></span>
      </Link>
      <button className="text-[#69717A] lg:hidden" onClick={() => setOpen(false)} aria-label="메뉴 닫기"><Icon name="close" /></button>
    </div>
    <nav className="admin-sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
      {groups.map((group) => <div key={group.label} className="mb-6">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-[.08em] text-[#9AA1A9]">{group.label}</p>
        <div className="space-y-1">{group.items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? "bg-[#E7F8F0] text-[#158158]" : "text-[#5F6872] hover:bg-[#F3F6F5] hover:text-[#24292E]"}`}>
            <Icon name={item.icon} /><span>{item.label}</span>{item.href === "/admin/inquiries" && unanswered > 0 ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-[#32C985] text-[#14372A]" : "bg-[#E7F8F0] text-[#158158]"}`}>{unanswered > 99 ? "99+" : unanswered}</span> : null}
          </Link>;
        })}</div>
      </div>)}
    </nav>
    <div className="border-t border-[#E8ECEF] bg-[#FBFCFC] p-3">
      <Link href="/" target="_blank" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#69717A] hover:bg-white hover:text-[#202428]"><Icon name="external" />웹사이트로 이동</Link>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E7EAED] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,.03)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F8F0] text-xs font-bold text-[#158158]">AD</span>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#252A2E]">관리자</p><p className="mt-0.5 truncate text-[11px] text-[#9299A2]">{email}</p></div>
        <button onClick={logout} className="text-[#9299A2] hover:text-[#B42318]" aria-label="로그아웃"><Icon name="logout" className="h-[18px] w-[18px]" /></button>
      </div>
    </div>
  </>;

  return <AdminAuthGate>
    <main className="admin-theme min-h-screen bg-[#F6F8F9] text-[#171717]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#E2E6E9] bg-white lg:flex">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="메뉴 닫기"/><aside className="relative flex h-full w-[276px] flex-col border-r border-[#E2E6E9] bg-white shadow-2xl">{sidebar}</aside></div> : null}
      <div className="min-h-screen lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#E4E7EB] bg-white/95 px-4 backdrop-blur md:px-7 lg:hidden">
          <button onClick={() => setOpen(true)} className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E5E9]" aria-label="메뉴 열기"><Icon name="menu" /></button>
          <span className="font-bold">Courts Korea Admin</span>
        </header>
        <div className="admin-workspace mx-auto w-full max-w-[1600px] p-4 md:p-7 xl:p-9">{children}</div>
      </div>
    </main>
  </AdminAuthGate>;
}
