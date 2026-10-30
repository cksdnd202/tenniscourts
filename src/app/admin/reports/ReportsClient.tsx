"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COURT_INFORMATION_REPORT_CATEGORIES,
  COURT_INFORMATION_REPORT_STATUSES,
  courtInformationReportStatusLabels,
  getCourtInformationReportCategoryLabel,
  type CourtInformationReport,
  type CourtInformationReportCategory,
  type CourtInformationReportStatus,
} from "@/lib/courtInformationReports";
import { formatSupportDate } from "@/lib/support";
import { AdminPageHeader, AdminSpinner, EmptyPanel } from "../AdminUI";
import { adminFetch } from "../adminClient";

const statusStyle: Record<CourtInformationReportStatus, string> = {
  new: "bg-[#EAF2FF] text-[#315DA8]",
  reviewing: "bg-[#FFF4DA] text-[#9A6700]",
  resolved: "bg-[#E7F8F0] text-[#16875A]",
  dismissed: "bg-[#F1F3F5] text-[#68717C]",
};

export function ReportsClient() {
  const [items, setItems] = useState<CourtInformationReport[]>([]);
  const [selected, setSelected] = useState<CourtInformationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"all" | CourtInformationReportStatus>("all");
  const [category, setCategory] =
    useState<"all" | CourtInformationReportCategory>("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch<{ reports: CourtInformationReport[] }>(
        "/api/admin/court-information-reports"
      );
      setItems(result.reports);
      setSelected((current) =>
        current ? result.reports.find((item) => item.id === current.id) ?? null : null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "제보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (category === "all" || item.category === category) &&
        (!keyword ||
          `${item.court_name} ${item.content}`.toLowerCase().includes(keyword))
    );
  }, [category, items, query, status]);

  const counts = useMemo(
    () => ({
      new: items.filter((item) => item.status === "new").length,
      reviewing: items.filter((item) => item.status === "reviewing").length,
      resolved: items.filter((item) => item.status === "resolved").length,
      today: items.filter(
        (item) => new Date(item.created_at).toDateString() === new Date().toDateString()
      ).length,
    }),
    [items]
  );

  const updateStatus = async (next: CourtInformationReportStatus) => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await adminFetch("/api/admin/court-information-reports", {
        method: "PATCH",
        body: JSON.stringify({ id: selected.id, status: next }),
      });
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "처리 상태를 변경하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="COURT INFORMATION REPORTS"
        title="사용자 정보 제보"
        description="상세페이지에서 접수된 시설 정보 수정 제보를 확인하고 처리합니다."
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-[#F2CACA] bg-[#FFF7F7] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["신규", counts.new],
          ["확인 중", counts.reviewing],
          ["반영 완료", counts.resolved],
          ["오늘 접수", counts.today],
        ].map(([label, count]) => (
          <div key={label as string} className="rounded-2xl border border-[#E4E7EB] bg-white p-4">
            <p className="text-xs font-semibold text-[#7A828C]">{label}</p>
            <p className="mt-2 text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#E4E7EB] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#EDF0F2] p-4 xl:flex-row xl:items-center">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-11 rounded-xl border border-[#DDE1E6] bg-white px-3 text-sm"
          >
            <option value="all">모든 상태</option>
            {COURT_INFORMATION_REPORT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {courtInformationReportStatusLabels[value]}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
            className="h-11 rounded-xl border border-[#DDE1E6] bg-white px-3 text-sm"
          >
            <option value="all">모든 정보 유형</option>
            {COURT_INFORMATION_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value === "court_type"
                  ? "코트/바닥 종류"
                  : getCourtInformationReportCategoryLabel(value, "tennis")}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="시설명, 제보 내용 검색"
            className="h-11 w-full rounded-xl border border-[#DDE1E6] px-4 text-sm outline-none focus:border-[#32C985] xl:ml-auto xl:max-w-xs"
          />
        </div>

        {loading ? (
          <AdminSpinner />
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#FAFBFC] text-xs text-[#7A828C]">
                <tr>
                  <th className="px-5 py-3.5">상태</th>
                  <th className="px-5 py-3.5">시설명</th>
                  <th className="px-5 py-3.5">정보 유형</th>
                  <th className="px-5 py-3.5">제보 내용</th>
                  <th className="px-5 py-3.5">접수일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F2]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer hover:bg-[#FAFBFC]"
                  >
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[item.status]}`}>
                        {courtInformationReportStatusLabels[item.status]}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-5 py-4">
                      <p className="truncate text-sm font-semibold">{item.court_name}</p>
                      <p className="mt-1 text-xs text-[#8A929D]">
                        {item.sport_type === "badminton" ? "배드민턴장" : "테니스장"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#69717C]">
                      {getCourtInformationReportCategoryLabel(item.category, item.sport_type)}
                    </td>
                    <td className="max-w-md px-5 py-4">
                      <p className="truncate text-sm text-[#33383E]">{item.content}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#69717C]">
                      {formatSupportDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyPanel
              title="조건에 맞는 제보가 없습니다."
              description="상태나 정보 유형 필터를 변경해 보세요."
            />
          </div>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/35">
          <button
            className="absolute inset-0"
            onClick={() => setSelected(null)}
            aria-label="닫기"
          />
          <section className="relative h-full w-full max-w-[680px] overflow-y-auto bg-[#F7F8FA] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E4E7EB] bg-white px-5 py-5 md:px-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[selected.status]}`}>
                    {courtInformationReportStatusLabels[selected.status]}
                  </span>
                  <span className="rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-bold text-[#4F5FB8]">
                    {selected.sport_type === "badminton" ? "배드민턴" : "테니스"}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{selected.court_name}</h2>
                <p className="mt-1 text-xs text-[#8A929D]">
                  {formatSupportDate(selected.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F4F6] text-2xl"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-8">
              <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5">
                <p className="text-xs font-semibold text-[#8A929D]">정보 유형</p>
                <p className="mt-2 text-sm font-bold text-[#33383E]">
                  {getCourtInformationReportCategoryLabel(selected.category, selected.sport_type)}
                </p>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#33383E]">
                  {selected.content}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5">
                <h3 className="text-sm font-bold">접수 정보</h3>
                <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  {[
                    ["시설 ID", selected.court_id || "-"],
                    ["접수 채널", selected.source.toUpperCase()],
                    ["접수 페이지", selected.page_url || "-"],
                    ["최근 확인", selected.reviewed_at ? formatSupportDate(selected.reviewed_at) : "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-[#8A929D]">{label}</dt>
                      <dd className="mt-1 break-all font-medium text-[#33383E]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold">처리 상태</h3>
                    <p className="mt-1 text-xs text-[#8A929D]">검토 결과에 맞게 상태를 변경하세요.</p>
                  </div>
                  <select
                    disabled={saving}
                    value={selected.status}
                    onChange={(event) =>
                      void updateStatus(event.target.value as CourtInformationReportStatus)
                    }
                    className="h-10 rounded-xl border border-[#DDE1E6] bg-white px-3 text-sm"
                  >
                    {COURT_INFORMATION_REPORT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {courtInformationReportStatusLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
