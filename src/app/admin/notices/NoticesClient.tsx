"use client";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminSpinner, EmptyPanel } from "../AdminUI";
import { adminFetch } from "../adminClient";
import { formatSupportDate, type Notice, type NoticeChannel, type NoticeStatus } from "@/lib/support";

type Draft = { id?: string; title: string; body: string; channels: NoticeChannel[]; status: NoticeStatus; isPinned: boolean; publishedAt: string; publishEndsAt: string; actionLabel: string; actionUrl: string; sendPush: boolean; pushSentAt: string | null; pushError: string | null };
const blank: Draft = { title: "", body: "", channels: ["app", "web"], status: "draft", isPinned: false, publishedAt: "", publishEndsAt: "", actionLabel: "", actionUrl: "", sendPush: false, pushSentAt: null, pushError: null };
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const toDraft = (notice: Notice): Draft => ({ id: notice.id, title: notice.title, body: notice.body, channels: notice.channels, status: notice.status, isPinned: notice.is_pinned, publishedAt: localDate(notice.published_at), publishEndsAt: localDate(notice.publish_ends_at), actionLabel: notice.action_label ?? "", actionUrl: notice.action_url ?? "", sendPush: Boolean(notice.push_requested_at), pushSentAt: notice.push_sent_at, pushError: notice.push_error });

function noticeState(notice: Notice) {
  if (notice.status === "draft") return ["임시저장", "bg-[#F1F3F5] text-[#68717C]"];
  if (notice.status === "archived") return ["게시 종료", "bg-[#FDECEC] text-[#B42318]"];
  if (notice.published_at && new Date(notice.published_at) > new Date()) return ["예약 게시", "bg-[#FFF4DA] text-[#9A6700]"];
  return ["게시 중", "bg-[#E7F8F0] text-[#16875A]"];
}

export function NoticesClient() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | NoticeChannel>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const data = await adminFetch<{ notices: Notice[] }>("/api/admin/notices");
      setNotices(data.notices);
      const selected = new URLSearchParams(window.location.search).get("id");
      if (selected) { const found = data.notices.find((item) => item.id === selected); if (found) setDraft(toDraft(found)); }
    } catch (e) { setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => notices.filter((item) => (channel === "all" || item.channels.includes(channel)) && (!query || item.title.toLowerCase().includes(query.toLowerCase()))), [channel, notices, query]);

  const toggleChannel = (value: NoticeChannel) => setDraft((current) => current ? ({ ...current, channels: current.channels.includes(value) ? current.channels.filter((item) => item !== value) : [...current.channels, value] }) : current);
  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.body.trim() || !draft.channels.length) { setError("제목, 내용, 노출 채널을 모두 입력해 주세요."); return; }
    setSaving(true); setError("");
    try {
      await adminFetch("/api/admin/notices", {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft,
          publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : "",
          publishEndsAt: draft.publishEndsAt ? new Date(draft.publishEndsAt).toISOString() : "",
        }),
      });
      setDraft(null); setToast(draft.id ? "공지사항을 수정했습니다." : "공지사항을 저장했습니다.");
      await load(); setTimeout(() => setToast(""), 2400);
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  };
  const remove = async (notice: Notice) => {
    if (!window.confirm(`‘${notice.title}’ 공지를 삭제할까요?`)) return;
    try { await adminFetch(`/api/admin/notices?id=${notice.id}`, { method: "DELETE" }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
  };

  return <>
    <AdminPageHeader eyebrow="CUSTOMER COMMUNICATION" title="공지사항" description="앱과 웹에 노출할 공지를 채널별로 작성하고 관리합니다.">
      <button onClick={() => setDraft({ ...blank })} className="h-11 rounded-xl bg-[#32C985] px-5 text-sm font-bold text-[#14372A] shadow-[0_5px_14px_rgba(50,201,133,.16)] hover:bg-[#29B979]">새 공지 작성</button>
    </AdminPageHeader>
    {toast ? <div className="fixed right-6 top-6 z-[70] rounded-xl border border-[#BFE9D4] bg-[#EDFAF4] px-5 py-3 text-sm font-semibold text-[#147A50] shadow-xl">{toast}</div> : null}
    {error ? <div className="mb-4 rounded-xl border border-[#F2CACA] bg-[#FFF7F7] px-4 py-3 text-sm text-[#B42318]">{error}</div> : null}
    <section className="rounded-2xl border border-[#E4E7EB] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#EDF0F2] p-4 md:flex-row md:items-center">
        <div className="flex rounded-xl bg-[#F3F5F7] p-1">{(["all", "app", "web"] as const).map((item) => <button key={item} onClick={() => setChannel(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${channel === item ? "bg-white text-[#171717] shadow-sm" : "text-[#777F89]"}`}>{item === "all" ? "전체" : item.toUpperCase()}</button>)}</div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="공지 제목 검색" className="h-11 w-full rounded-xl border border-[#DDE1E6] bg-white px-4 text-sm outline-none focus:border-[#32C985] md:ml-auto md:max-w-xs" />
      </div>
      {loading ? <AdminSpinner /> : filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-[#FAFBFC] text-xs text-[#7A828C]"><tr><th className="px-5 py-3.5 font-semibold">제목</th><th className="px-5 py-3.5 font-semibold">노출 채널</th><th className="px-5 py-3.5 font-semibold">상태</th><th className="px-5 py-3.5 font-semibold">게시 시각</th><th className="px-5 py-3.5 font-semibold">수정일</th><th className="px-5 py-3.5" /></tr></thead><tbody className="divide-y divide-[#EDF0F2]">{filtered.map((notice) => { const state = noticeState(notice); return <tr key={notice.id} className="hover:bg-[#FAFBFC]"><td className="max-w-md px-5 py-4"><button onClick={() => setDraft(toDraft(notice))} className="block max-w-full truncate text-left text-sm font-semibold text-[#222]">{notice.is_pinned ? <span className="mr-2 text-[#22A76F]">중요</span> : null}{notice.title}</button></td><td className="px-5 py-4"><div className="flex gap-1">{notice.channels.map((item) => <span key={item} className={`rounded-md px-2 py-1 text-[11px] font-bold ${item === "app" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#EEF2FF] text-[#4F5FB8]"}`}>{item.toUpperCase()}</span>)}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${state[1]}`}>{state[0]}</span></td><td className="px-5 py-4 text-sm text-[#69717C]">{formatSupportDate(notice.published_at)}</td><td className="px-5 py-4 text-sm text-[#69717C]">{formatSupportDate(notice.updated_at)}</td><td className="px-5 py-4 text-right"><button onClick={() => setDraft(toDraft(notice))} className="mr-3 text-sm font-semibold text-[#16875A]">수정</button><button onClick={() => void remove(notice)} className="text-sm text-[#B42318]">삭제</button></td></tr>; })}</tbody></table></div> : <div className="p-5"><EmptyPanel title="표시할 공지가 없습니다." description="새 공지를 작성하거나 검색 조건을 변경해 보세요." /></div>}
    </section>

    {draft ? <div className="fixed inset-0 z-[60] flex justify-end bg-black/35"><button className="absolute inset-0" onClick={() => setDraft(null)} aria-label="닫기"/><section className="relative h-full w-full max-w-[620px] overflow-y-auto bg-white p-5 shadow-2xl md:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-[#8A929D]">NOTICE EDITOR</p><h2 className="mt-2 text-2xl font-bold">{draft.id ? "공지 수정" : "새 공지 작성"}</h2></div><button onClick={() => setDraft(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F4F6] text-2xl">×</button></div>
      <div className="mt-8 space-y-6">
        <label className="block"><span className="text-sm font-semibold">제목</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] px-4 text-sm outline-none focus:border-[#32C985]" placeholder="공지 제목을 입력하세요" /></label>
        <label className="block"><span className="text-sm font-semibold">내용</span><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={10} className="mt-2 w-full resize-y rounded-xl border border-[#DDE1E6] p-4 text-sm leading-6 outline-none focus:border-[#32C985]" placeholder="사용자에게 안내할 내용을 입력하세요" /></label>
        <div><span className="text-sm font-semibold">노출 채널</span><div className="mt-2 grid grid-cols-2 gap-2">{(["app", "web"] as NoticeChannel[]).map((item) => <button key={item} onClick={() => toggleChannel(item)} className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold ${draft.channels.includes(item) ? "border-[#32C985] bg-[#ECFBF4] text-[#137B51]" : "border-[#DDE1E6] text-[#737B85]"}`}>{item === "app" ? "앱" : "웹"}</button>)}</div></div>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="text-sm font-semibold">게시 상태</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as NoticeStatus })} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] bg-white px-4 text-sm"><option value="draft">임시저장</option><option value="published">게시</option><option value="archived">게시 종료</option></select></label><label className="flex items-end"><button onClick={() => setDraft({ ...draft, isPinned: !draft.isPinned })} className={`h-12 w-full rounded-xl border text-sm font-semibold ${draft.isPinned ? "border-[#32C985] bg-[#ECFBF4] text-[#137B51]" : "border-[#DDE1E6] text-[#737B85]"}`}>{draft.isPinned ? "중요 공지로 설정됨" : "중요 공지로 설정"}</button></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="text-sm font-semibold">게시 시작</span><input type="datetime-local" value={draft.publishedAt} onChange={(e) => setDraft({ ...draft, publishedAt: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] px-3 text-sm" /></label><label><span className="text-sm font-semibold">게시 종료</span><input type="datetime-local" value={draft.publishEndsAt} onChange={(e) => setDraft({ ...draft, publishEndsAt: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] px-3 text-sm" /></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label><span className="text-sm font-semibold">이동 버튼 문구</span><input value={draft.actionLabel} onChange={(e) => setDraft({ ...draft, actionLabel: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] px-4 text-sm" placeholder="자세히 보기" /></label><label><span className="text-sm font-semibold">이동 주소</span><input value={draft.actionUrl} onChange={(e) => setDraft({ ...draft, actionUrl: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-[#DDE1E6] px-4 text-sm" placeholder="/notifications 또는 https://..." /></label></div>
        <div className="rounded-2xl border border-[#DDE1E6] bg-[#FAFBFC] p-4">
          <button
            type="button"
            disabled={Boolean(draft.pushSentAt)}
            onClick={() => setDraft({ ...draft, sendPush: !draft.sendPush })}
            className={`flex w-full items-center justify-between text-left ${draft.pushSentAt ? "cursor-not-allowed opacity-65" : ""}`}
          >
            <span><span className="block text-sm font-semibold">앱 푸시로도 알리기</span><span className="mt-1 block text-xs leading-5 text-[#7A828C]">앱 채널 게시 시 한 번만 발송되며, 예약 게시라면 게시 시작 시각에 발송됩니다.</span></span>
            <span className={`relative ml-4 h-7 w-12 shrink-0 rounded-full transition-colors ${draft.sendPush ? "bg-[#32C985]" : "bg-[#CDD2D7]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${draft.sendPush ? "translate-x-6" : "translate-x-1"}`} /></span>
          </button>
          {draft.pushSentAt ? <p className="mt-3 text-xs font-semibold text-[#16875A]">푸시 발송 완료 · {formatSupportDate(draft.pushSentAt)}</p> : null}
          {draft.pushError ? <p className="mt-3 text-xs font-semibold text-[#B42318]">이전 발송을 확인해야 합니다. 다시 선택해 저장하면 재시도됩니다.</p> : null}
          {draft.sendPush && (draft.status !== "published" || !draft.channels.includes("app")) ? <p className="mt-3 text-xs font-semibold text-[#B42318]">앱 채널을 선택하고 게시 상태로 변경해 주세요.</p> : null}
        </div>
      </div><div className="sticky bottom-0 mt-8 flex gap-2 border-t border-[#EDF0F2] bg-white py-5"><button onClick={() => setDraft(null)} className="h-12 flex-1 rounded-xl border border-[#DDE1E6] text-sm font-semibold text-[#59626C]">취소</button><button disabled={saving} onClick={() => void save()} className="h-12 flex-[2] rounded-xl bg-[#32C985] text-sm font-bold text-[#14372A] hover:bg-[#29B979] disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button></div>
    </section></div> : null}
  </>;
}
