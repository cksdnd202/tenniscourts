"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader, AdminSpinner } from "../AdminUI";
import { adminFetch } from "../adminClient";
import { formatSupportDate, inquiryStatusLabels, type InquiryStatus } from "@/lib/support";

type DashboardData = { counts: { courts: number; visibleCourts: number; publishedNotices: number; unansweredInquiries: number }; recentInquiries: Array<{ id: string; title: string; source: string; status: InquiryStatus; contact_email: string; created_at: string }>; recentNotices: Array<{ id: string; title: string; channels: string[]; status: string; updated_at: string }> };

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<DashboardData>("/api/admin/dashboard").then(setData).catch((e) => setError(e.message)); }, []);
  return <>
    <AdminPageHeader eyebrow="OVERVIEW" title="대시보드" description="서비스 현황과 지금 처리할 운영 업무를 확인하세요." />
    {error ? <div className="rounded-2xl border border-[#F2CACA] bg-[#FFF7F7] p-4 text-sm text-[#B42318]">{error}</div> : !data ? <AdminSpinner /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["전체 테니스장", data.counts.courts, `${data.counts.visibleCourts}개 노출 중`, "/admin/courtslist"],
          ["노출 중 테니스장", data.counts.visibleCourts, "서비스에서 확인 가능", "/admin/courtslist"],
          ["게시 중 공지", data.counts.publishedNotices, "앱·웹 채널 합계", "/admin/notices"],
          ["답변 대기 문의", data.counts.unansweredInquiries, "확인이 필요한 문의", "/admin/inquiries"],
        ].map(([label, count, sub, href]) => <Link href={href as string} key={label as string} className="rounded-2xl border border-[#E4E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.03)] transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-sm font-medium text-[#69717C]">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-[#171717]">{count}</p><p className="mt-2 text-xs text-[#9299A2]">{sub}</p>
        </Link>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-[#E4E7EB] bg-white"><div className="flex items-center justify-between border-b border-[#EDF0F2] px-5 py-4"><h2 className="font-bold">최근 고객문의</h2><Link href="/admin/inquiries" className="text-sm font-semibold text-[#16875A]">전체 보기</Link></div><div className="divide-y divide-[#F0F2F4]">{data.recentInquiries.length ? data.recentInquiries.map((item) => <Link href={`/admin/inquiries?id=${item.id}`} key={item.id} className="flex items-center gap-3 px-5 py-4 hover:bg-[#FAFBFC]"><span className={`rounded-md px-2 py-1 text-[11px] font-bold ${item.source === "app" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#EEF2FF] text-[#4F5FB8]"}`}>{item.source.toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#9299A2]">{item.contact_email} · {formatSupportDate(item.created_at)}</p></div><span className="text-xs text-[#69717C]">{inquiryStatusLabels[item.status]}</span></Link>) : <p className="px-5 py-12 text-center text-sm text-[#9299A2]">접수된 문의가 없습니다.</p>}</div></section>
        <section className="overflow-hidden rounded-2xl border border-[#E4E7EB] bg-white"><div className="flex items-center justify-between border-b border-[#EDF0F2] px-5 py-4"><h2 className="font-bold">최근 공지사항</h2><Link href="/admin/notices" className="text-sm font-semibold text-[#16875A]">전체 보기</Link></div><div className="divide-y divide-[#F0F2F4]">{data.recentNotices.length ? data.recentNotices.map((item) => <Link href={`/admin/notices?id=${item.id}`} key={item.id} className="flex items-center gap-3 px-5 py-4 hover:bg-[#FAFBFC]"><div className="flex min-w-0 flex-1 flex-col"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#9299A2]">{item.channels.map((v) => v.toUpperCase()).join(" · ")} · {formatSupportDate(item.updated_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "published" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#F1F3F5] text-[#69717C]"}`}>{item.status === "published" ? "게시 중" : item.status === "draft" ? "임시저장" : "종료"}</span></Link>) : <p className="px-5 py-12 text-center text-sm text-[#9299A2]">작성된 공지가 없습니다.</p>}</div></section>
      </div>
      <section className="mt-6 rounded-2xl border border-[#DDE7E2] bg-[#F2FAF6] p-6"><p className="text-xs font-semibold text-[#5C8C76]">QUICK ACTIONS</p><h2 className="mt-2 text-xl font-bold text-[#24312B]">바로 시작하기</h2><div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/notices" className="rounded-xl bg-[#32C985] px-4 py-2.5 text-sm font-bold text-[#14372A] hover:bg-[#29B979]">공지 작성</Link><Link href="/admin/inquiries" className="rounded-xl border border-[#D7E3DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#3E4C45] hover:bg-[#F8FBF9]">문의 확인</Link><Link href="/admin/courtslist" className="rounded-xl border border-[#D7E3DD] bg-white px-4 py-2.5 text-sm font-semibold text-[#3E4C45] hover:bg-[#F8FBF9]">테니스장 관리</Link></div></section>
    </>}
  </>;
}
