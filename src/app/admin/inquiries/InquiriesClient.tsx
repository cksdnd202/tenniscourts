"use client";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminSpinner, EmptyPanel } from "../AdminUI";
import { adminFetch } from "../adminClient";
import { formatSupportDate, inquiryCategoryLabels, inquiryStatusLabels, type CustomerInquiry, type InquiryStatus } from "@/lib/support";

const statusStyle: Record<InquiryStatus, string> = { new: "bg-[#EAF2FF] text-[#315DA8]", in_progress: "bg-[#FFF4DA] text-[#9A6700]", answered: "bg-[#E7F8F0] text-[#16875A]", closed: "bg-[#F1F3F5] text-[#68717C]" };

export function InquiriesClient() {
  const [items, setItems] = useState<CustomerInquiry[]>([]);
  const [selected, setSelected] = useState<CustomerInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"all" | "app" | "web">("all");
  const [status, setStatus] = useState<"all" | InquiryStatus>("all");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const result = await adminFetch<{ inquiries: CustomerInquiry[] }>("/api/admin/inquiries");
      const sorted = result.inquiries.map((item) => ({ ...item, customer_inquiry_replies: [...(item.customer_inquiry_replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) }));
      setItems(sorted);
      const selectedId = new URLSearchParams(window.location.search).get("id") ?? selected?.id;
      setSelected(selectedId ? sorted.find((item) => item.id === selectedId) ?? null : selected);
    } catch (e) { setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
    finally { setLoading(false); }
  };
  // The initial fetch intentionally runs once; subsequent refreshes are explicit after mutations.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((item) => (source === "all" || item.source === source) && (status === "all" || item.status === status) && (!query || `${item.title} ${item.contact_email} ${item.contact_name ?? ""}`.toLowerCase().includes(query.toLowerCase()))), [items, query, source, status]);
  const counts = useMemo(() => ({ new: items.filter((v) => v.status === "new").length, inProgress: items.filter((v) => v.status === "in_progress").length, answered: items.filter((v) => v.status === "answered").length, today: items.filter((v) => new Date(v.created_at).toDateString() === new Date().toDateString()).length }), [items]);

  const updateStatus = async (next: InquiryStatus) => {
    if (!selected) return;
    setSaving(true);
    try { await adminFetch("/api/admin/inquiries", { method: "PATCH", body: JSON.stringify({ id: selected.id, status: next }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "상태를 변경하지 못했습니다."); }
    finally { setSaving(false); }
  };
  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try { await adminFetch("/api/admin/inquiries", { method: "POST", body: JSON.stringify({ id: selected.id, body: reply }) }); setReply(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "답변을 저장하지 못했습니다."); }
    finally { setSaving(false); }
  };

  return <>
    <AdminPageHeader eyebrow="CUSTOMER SUPPORT" title="고객문의" description="앱과 웹에서 접수된 문의를 한곳에서 구분해 처리합니다." />
    {error ? <div className="mb-4 rounded-xl border border-[#F2CACA] bg-[#FFF7F7] px-4 py-3 text-sm text-[#B42318]">{error}</div> : null}
    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{[["신규", counts.new], ["확인 중", counts.inProgress], ["답변 완료", counts.answered], ["오늘 접수", counts.today]].map(([label, count]) => <div key={label as string} className="rounded-2xl border border-[#E4E7EB] bg-white p-4"><p className="text-xs font-semibold text-[#7A828C]">{label}</p><p className="mt-2 text-2xl font-bold">{count}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-[#E4E7EB] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#EDF0F2] p-4 xl:flex-row xl:items-center">
        <div className="flex rounded-xl bg-[#F3F5F7] p-1">{(["all", "app", "web"] as const).map((item) => <button key={item} onClick={() => setSource(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${source === item ? "bg-white shadow-sm" : "text-[#777F89]"}`}>{item === "all" ? "전체 채널" : item.toUpperCase()}</button>)}</div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 rounded-xl border border-[#DDE1E6] bg-white px-3 text-sm"><option value="all">모든 상태</option>{Object.entries(inquiryStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목, 이메일 검색" className="h-11 w-full rounded-xl border border-[#DDE1E6] px-4 text-sm outline-none focus:border-[#32C985] xl:ml-auto xl:max-w-xs" />
      </div>
      {loading ? <AdminSpinner /> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left"><thead className="bg-[#FAFBFC] text-xs text-[#7A828C]"><tr><th className="px-5 py-3.5">상태</th><th className="px-5 py-3.5">채널</th><th className="px-5 py-3.5">문의 내용</th><th className="px-5 py-3.5">유형</th><th className="px-5 py-3.5">고객</th><th className="px-5 py-3.5">접수일</th></tr></thead><tbody className="divide-y divide-[#EDF0F2]">{filtered.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer hover:bg-[#FAFBFC]"><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[item.status]}`}>{inquiryStatusLabels[item.status]}</span></td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-[11px] font-bold ${item.source === "app" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#EEF2FF] text-[#4F5FB8]"}`}>{item.source.toUpperCase()}</span></td><td className="max-w-md px-5 py-4"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-[#8A929D]">{item.body}</p></td><td className="px-5 py-4 text-sm text-[#69717C]">{inquiryCategoryLabels[item.category]}</td><td className="px-5 py-4"><p className="text-sm">{item.contact_name || "-"}</p><p className="mt-1 text-xs text-[#8A929D]">{item.contact_email}</p></td><td className="px-5 py-4 text-sm text-[#69717C]">{formatSupportDate(item.created_at)}</td></tr>)}</tbody></table></div> : <div className="p-5"><EmptyPanel title="조건에 맞는 문의가 없습니다." description="채널이나 상태 필터를 변경해 보세요." /></div>}
    </section>

    {selected ? <div className="fixed inset-0 z-[60] flex justify-end bg-black/35"><button className="absolute inset-0" onClick={() => setSelected(null)} aria-label="닫기"/><section className="relative h-full w-full max-w-[720px] overflow-y-auto bg-[#F7F8FA] shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E4E7EB] bg-white px-5 py-5 md:px-8"><div><div className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-[11px] font-bold ${selected.source === "app" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#EEF2FF] text-[#4F5FB8]"}`}>{selected.source.toUpperCase()}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[selected.status]}`}>{inquiryStatusLabels[selected.status]}</span></div><h2 className="mt-3 text-xl font-bold">{selected.title}</h2><p className="mt-1 text-xs text-[#8A929D]">{formatSupportDate(selected.created_at)}</p></div><button onClick={() => setSelected(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F4F6] text-2xl">×</button></div>
      <div className="space-y-5 p-5 md:p-8">
        <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5"><p className="whitespace-pre-wrap text-sm leading-7 text-[#33383E]">{selected.body}</p></div>
        <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5"><h3 className="text-sm font-bold">고객 및 접수 정보</h3><dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">{[["문의 유형", inquiryCategoryLabels[selected.category]], ["이름", selected.contact_name || "-"], ["이메일", selected.contact_email], ["접수 채널", selected.source.toUpperCase()], ["앱 버전", selected.app_version || "-"], ["운영체제", selected.os_name || "-"], ["기기", selected.device_model || "-"], ["접수 페이지", selected.page_url || "-"]].map(([label, value]) => <div key={label}><dt className="text-xs text-[#8A929D]">{label}</dt><dd className="mt-1 break-all font-medium text-[#33383E]">{value}</dd></div>)}</dl></div>
        {(selected.customer_inquiry_replies ?? []).length ? <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5"><h3 className="text-sm font-bold">답변 내역</h3><div className="mt-4 space-y-3">{selected.customer_inquiry_replies?.map((item) => <div key={item.id} className="rounded-xl bg-[#F2F8F5] p-4"><p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p><p className="mt-2 text-xs text-[#7A828C]">{item.author_label || "관리자"} · {formatSupportDate(item.created_at)}</p></div>)}</div></div> : null}
        <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">처리 상태</h3><select disabled={saving} value={selected.status} onChange={(e) => void updateStatus(e.target.value as InquiryStatus)} className="h-10 rounded-xl border border-[#DDE1E6] bg-white px-3 text-sm">{Object.entries(inquiryStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={6} placeholder="고객에게 전달할 답변을 입력하세요." className="mt-4 w-full resize-y rounded-xl border border-[#DDE1E6] p-4 text-sm leading-6 outline-none focus:border-[#32C985]"/><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-[#8A929D]">답변은 앱 문의 내역에 저장됩니다. 웹 비회원 문의는 이메일 발송 설정 전까지 이메일로 별도 전달해 주세요.</p><button disabled={saving || !reply.trim()} onClick={() => void sendReply()} className="h-11 shrink-0 rounded-xl bg-[#32C985] px-5 text-sm font-bold text-[#14372A] hover:bg-[#29B979] disabled:opacity-40">답변 저장</button></div>
        </div>
      </div></section></div> : null}
  </>;
}
