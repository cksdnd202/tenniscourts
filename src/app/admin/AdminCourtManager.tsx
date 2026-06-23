"use client";

import { useEffect, useMemo, useState } from "react";
import type { Court } from "../types";

type CourtForm = Partial<Court>;

type FieldConfig = {
  key: keyof Court;
  label: string;
  type?: "text" | "textarea" | "number" | "time" | "select" | "boolean";
  options?: Array<{ label: string; value: string }>;
};

const emptyForm: CourtForm = {
  basic_owner_type: null,
  court_count_hard_indoor: 0,
  court_count_hard_outdoor: 0,
  court_count_grass_indoor: 0,
  court_count_grass_outdoor: 0,
  court_count_clay_indoor: 0,
  court_count_clay_outdoor: 0,
  use_or_not: false,
  booking_eligibility_first: null,
  booking_eligibility_second: null,
  booking_normal_iscurrentmonth: false,
  booking_online_reserve_possible: null,
  booking_today_booking_possible: null,
};

const fields: FieldConfig[] = [
  { key: "use_or_not", label: "노출 여부", type: "boolean" },
  { key: "basic_court_name", label: "테니스장명" },
  { key: "slug", label: "상세페이지 slug" },
  {
    key: "basic_owner_type",
    label: "운영 주체",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "시립", value: "시립" },
      { label: "구립", value: "구립" },
      { label: "사설", value: "사설" },
    ],
  },
  { key: "basic_region", label: "지역" },
  { key: "basic_city", label: "시/군/구" },
  { key: "basic_address", label: "주소", type: "textarea" },
  { key: "basic_map_link", label: "지도 링크" },
  { key: "booking_site_link", label: "예약 사이트 링크" },
  { key: "booking_reception_time", label: "예약 접수 시간" },
  {
    key: "booking_rule_type",
    label: "예약 규칙",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "고정 일정", value: "fixed_schedule" },
      { label: "상시/롤링", value: "rolling" },
      { label: "추첨", value: "lottery" },
      { label: "전화", value: "phone" },
      { label: "현장", value: "on_site" },
      { label: "비정기", value: "irregular" },
      { label: "확인 필요", value: "checking" },
      { label: "순번제", value: "ordinal" },
    ],
  },
  {
    key: "booking_open_type",
    label: "오픈 타입",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "일자", value: "day" },
      { label: "요일", value: "weekday" },
      { label: "순번", value: "ordinal" },
      { label: "상시", value: "rolling" },
    ],
  },
  {
    key: "booking_eligibility_first",
    label: "1순위 자격",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "resident", value: "resident" },
      { label: "citizen", value: "citizen" },
    ],
  },
  { key: "booking_open_day_owner", label: "우선권 오픈 일자", type: "number" },
  { key: "booking_open_time_owner", label: "우선권 오픈 시간", type: "time" },
  {
    key: "booking_eligibility_second",
    label: "2순위 자격",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "normal", value: "normal" },
      { label: "none", value: "none" },
    ],
  },
  { key: "booking_open_day_normal", label: "일반 오픈 일자", type: "number" },
  { key: "booking_open_time_normal", label: "일반 오픈 시간", type: "time" },
  { key: "booking_open_offset", label: "예약 오픈 기준" },
  { key: "booking_normal_iscurrentmonth", label: "일반 예약 이번달 기준", type: "boolean" },
  { key: "booking_open_day_of_month", label: "월 오픈 일자", type: "number" },
  { key: "booking_open_day_of_week", label: "오픈 요일", type: "number" },
  { key: "booking_open_ordinal", label: "오픈 순번", type: "number" },
  { key: "court_count_hard_indoor", label: "하드 실내", type: "number" },
  { key: "court_count_hard_outdoor", label: "하드 실외", type: "number" },
  { key: "court_count_grass_indoor", label: "잔디 실내", type: "number" },
  { key: "court_count_grass_outdoor", label: "잔디 실외", type: "number" },
  { key: "court_count_clay_indoor", label: "클레이 실내", type: "number" },
  { key: "court_count_clay_outdoor", label: "클레이 실외", type: "number" },
  { key: "booking_booking_provide", label: "예약 제공 방식" },
  { key: "booking_holiday_week", label: "휴무 주" },
  { key: "booking_online_reserve_possible", label: "온라인 예약 가능", type: "boolean" },
  { key: "booking_today_booking_possible", label: "당일 예약 가능", type: "boolean" },
  { key: "basic_time_of_use", label: "이용 시간", type: "textarea" },
  { key: "etc_desc", label: "기타 설명", type: "textarea" },
];

const fieldGroups = [
  {
    title: "기본 정보",
    fields: fields.filter((field) => String(field.key).startsWith("basic_")),
  },
  {
    title: "코트 정보",
    fields: fields.filter((field) => String(field.key).startsWith("court_")),
  },
  {
    title: "예약 정보",
    fields: fields.filter((field) => String(field.key).startsWith("booking_")),
  },
  {
    title: "기타",
    fields: fields.filter(
      (field) =>
        field.key !== "use_or_not" &&
        !String(field.key).startsWith("basic_") &&
        !String(field.key).startsWith("court_") &&
        !String(field.key).startsWith("booking_")
    ),
  },
].filter((group) => group.fields.length > 0);

const numberFieldKeys = new Set(
  fields.filter((field) => field.type === "number").map((field) => field.key)
);

const courtCountFieldKeys = new Set<keyof Court>([
  "court_count_hard_indoor",
  "court_count_hard_outdoor",
  "court_count_grass_indoor",
  "court_count_grass_outdoor",
  "court_count_clay_indoor",
  "court_count_clay_outdoor",
]);

const courtSurfaceGroups = [
  {
    label: "하드",
    indoor: "court_count_hard_indoor",
    outdoor: "court_count_hard_outdoor",
  },
  {
    label: "잔디",
    indoor: "court_count_grass_indoor",
    outdoor: "court_count_grass_outdoor",
  },
  {
    label: "클레이",
    indoor: "court_count_clay_indoor",
    outdoor: "court_count_clay_outdoor",
  },
] satisfies Array<{ label: string; indoor: keyof Court; outdoor: keyof Court }>;

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toForm(court: Court): CourtForm {
  return { ...emptyForm, ...court };
}

function normalizeForSave(form: CourtForm) {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const value = form[field.key];
    if (numberFieldKeys.has(field.key)) {
      const numberValue =
        value === "" || value === null || value === undefined
          ? courtCountFieldKeys.has(field.key)
            ? 0
            : null
          : Number(value);
      payload[field.key] =
        numberValue === null
          ? null
          : courtCountFieldKeys.has(field.key)
            ? Math.max(0, numberValue)
            : numberValue;
    } else {
      payload[field.key] = value === "" ? null : value ?? null;
    }
  }

  if (form.id) {
    payload.id = form.id;
  }

  return payload;
}

export function AdminCourtManager() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingSeoulCandidate, setIsFetchingSeoulCandidate] = useState(false);
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCourt = useMemo(
    () => courts.find((court) => court.id === selectedId) ?? null,
    [courts, selectedId]
  );
  const isOwnerOpenEnabled =
    form.booking_eligibility_first === "resident" || form.booking_eligibility_first === "citizen";
  const isNormalOpenEnabled = form.booking_eligibility_second === "normal";

  const filteredCourts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return courts;

    return courts.filter((court) =>
      [
        court.basic_court_name,
        court.basic_region,
        court.basic_city,
        court.basic_address,
        court.slug,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [courts, query]);

  async function loadCourts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/courts", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "목록을 불러오지 못했습니다.");
      }

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

  function selectCourt(court: Court) {
    setSelectedId(court.id);
    setForm(toForm(court));
    setMessage(null);
    setError(null);
  }

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function updateField(key: keyof Court, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openMapLink() {
    const mapLink = stringifyValue(form.basic_map_link).trim();
    if (!mapLink) return;

    window.open(mapLink, "_blank", "noopener,noreferrer");
  }

  async function generateSlug() {
    const name = stringifyValue(form.basic_court_name).trim();
    if (!name || form.id) return;

    setIsGeneratingSlug(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/courts/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "slug를 생성하지 못했습니다.");
      }

      updateField("slug", data.slug);
      setMessage("상세페이지 slug를 생성했습니다.");
    } catch (slugError) {
      setError(slugError instanceof Error ? slugError.message : "slug를 생성하지 못했습니다.");
    } finally {
      setIsGeneratingSlug(false);
    }
  }

  async function fetchSeoulCandidate() {
    setIsFetchingSeoulCandidate(true);
    setSelectedId(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/courts/seoul-candidate", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "서울시 API 후보를 가져오지 못했습니다.");
      }

      setForm({ ...emptyForm, ...data.court });
      const range = data.meta?.apiRange ? ` API 구간 ${data.meta.apiRange}` : "";
      setMessage(`서울시 API에서 신규 후보 1건을 불러왔습니다.${range}`);
    } catch (candidateError) {
      setError(
        candidateError instanceof Error
          ? candidateError.message
          : "서울시 API 후보를 가져오지 못했습니다."
      );
    } finally {
      setIsFetchingSeoulCandidate(false);
    }
  }

  async function saveCourt() {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const isUpdate = Boolean(form.id);
      const response = await fetch("/api/admin/courts", {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeForSave(form)),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "저장하지 못했습니다.");
      }

      const savedCourt = data.court as Court;
      setCourts((current) => {
        if (isUpdate) {
          return current.map((court) => (court.id === savedCourt.id ? savedCourt : court));
        }
        return [...current, savedCourt].sort((a, b) =>
          stringifyValue(a.basic_court_name).localeCompare(stringifyValue(b.basic_court_name), "ko")
        );
      });
      setSelectedId(savedCourt.id);
      setForm(toForm(savedCourt));
      setMessage(isUpdate ? "수정했습니다." : "추가했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCourt() {
    if (!selectedCourt) return;

    const ok = window.confirm(`${selectedCourt.basic_court_name ?? "선택한 테니스장"}을 삭제할까요?`);
    if (!ok) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/courts?id=${encodeURIComponent(selectedCourt.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "삭제하지 못했습니다.");
      }

      setCourts((current) => current.filter((court) => court.id !== selectedCourt.id));
      startCreate();
      setMessage("삭제했습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 py-6 text-white md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-[#a7a7a7]">localhost 전용</p>
            <h1 className="mt-2 text-3xl font-semibold">테니스장 어드민</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadCourts}
              className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium hover:bg-[#242424]"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black hover:bg-[#3fcf6f]"
            >
              새 테니스장
            </button>
            <button
              type="button"
              onClick={fetchSeoulCandidate}
              disabled={isFetchingSeoulCandidate}
              className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] disabled:opacity-60"
            >
              {isFetchingSeoulCandidate ? "불러오는 중..." : "서울시 신규 1건 불러오기"}
            </button>
          </div>
        </header>

        {message ? (
          <div className="rounded-lg border border-[#23543a] bg-[#102217] px-4 py-3 text-sm text-[#b7f7cd]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(520px,1.25fr)_minmax(360px,0.75fr)]">
          <section className="rounded-lg border border-[#2f2f2f] bg-[#151515]">
            <div className="border-b border-[#2f2f2f] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">목록</h2>
                <span className="text-sm text-[#a7a7a7]">{filteredCourts.length}개</span>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-3 w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                placeholder="이름, 지역, 주소, slug 검색"
              />
            </div>
            <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-[#a7a7a7]">불러오는 중...</p>
              ) : filteredCourts.length === 0 ? (
                <p className="p-4 text-sm text-[#a7a7a7]">표시할 테니스장이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-[#2f2f2f]">
                  {filteredCourts.map((court) => (
                    <li key={court.id}>
                      <button
                        type="button"
                        onClick={() => selectCourt(court)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#202020] ${
                          court.id === selectedId ? "bg-[#20281f]" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white">
                            {court.basic_court_name ?? "이름 없음"}
                          </span>
                          <span className="mt-1 block truncate text-xs text-[#a7a7a7]">
                            {[court.basic_region, court.basic_city].filter(Boolean).join(" ")}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                            court.use_or_not
                              ? "bg-[#12351f] text-[#86efac]"
                              : "bg-[#2a2a2a] text-[#b8b8b8]"
                          }`}
                        >
                          {court.use_or_not ? "YES" : "NO"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#2f2f2f] bg-[#151515]">
            <div className="flex flex-col gap-3 border-b border-[#2f2f2f] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {form.id ? "테니스장 수정" : "테니스장 추가"}
                </h2>
                {form.id ? <p className="mt-1 text-xs text-[#8c8c8c]">{form.id}</p> : null}
              </div>
              <div className="flex gap-2">
                {form.id ? (
                  <button
                    type="button"
                    onClick={deleteCourt}
                    disabled={isSaving}
                    className="rounded-lg border border-[#6b2d2d] bg-[#261313] px-4 py-2 text-sm font-medium text-[#ffb3b3] hover:bg-[#341818] disabled:opacity-60"
                  >
                    삭제
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveCourt}
                  disabled={isSaving}
                  className="rounded-lg bg-[#4ade80] px-5 py-2 text-sm font-semibold text-black hover:bg-[#3fcf6f] disabled:opacity-60"
                >
                  {isSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-4">
              <section className="rounded-lg border border-[#2f2f2f] bg-black p-3">
                <label className="flex min-h-[42px] items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#cfcfcf]">노출 여부</span>
                  <input
                    type="checkbox"
                    checked={Boolean(form.use_or_not)}
                    onChange={(event) => updateField("use_or_not", event.target.checked)}
                    className="custom-checkbox"
                  />
                </label>
              </section>

              {fieldGroups.map((group) => (
                <section key={group.title} className="flex flex-col gap-3">
                  <h3 className="border-b border-[#2f2f2f] pb-2 text-sm font-semibold text-[#4ade80]">
                    {group.title}
                  </h3>
                  {group.title === "코트 정보" ? (
                    <div className="grid gap-3">
                      {courtSurfaceGroups.map((surface) => (
                        <div
                          key={surface.label}
                          className="grid gap-3 rounded-lg border border-[#2f2f2f] bg-black p-3"
                        >
                          <span className="text-sm font-medium text-[#cfcfcf]">
                            {surface.label}
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "실내", key: surface.indoor },
                              { label: "실외", key: surface.outdoor },
                            ].map((item) => (
                              <label key={item.key} className="flex flex-col gap-2">
                                <span className="text-xs text-[#a7a7a7]">{item.label}</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={stringifyValue(form[item.key])}
                                  onChange={(event) => {
                                    if (event.target.value === "") {
                                      updateField(item.key, "");
                                      return;
                                    }

                                    updateField(
                                      item.key,
                                      String(Math.max(0, Number(event.target.value)))
                                    );
                                  }}
                                  className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {group.fields.map((field) => {
                const value = form[field.key];
                const isCourtCountField = courtCountFieldKeys.has(field.key);
                const isDisabled =
                  field.key === "slug" && Boolean(form.id)
                    ? true
                    :
                  (field.key === "booking_open_day_owner" ||
                    field.key === "booking_open_time_owner") &&
                  !isOwnerOpenEnabled
                    ? true
                    : (field.key === "booking_open_day_normal" ||
                          field.key === "booking_open_time_normal") &&
                        !isNormalOpenEnabled;

                if (field.type === "textarea") {
                  return (
                    <label
                      key={field.key}
                      className={`grid w-full gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-start ${
                        isDisabled ? "opacity-45" : ""
                      }`}
                    >
                      <span className="pt-2 text-sm text-[#cfcfcf]">{field.label}</span>
                      <textarea
                        value={stringifyValue(value)}
                        disabled={isDisabled}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        rows={2}
                        className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80] disabled:cursor-not-allowed disabled:text-[#777]"
                      />
                    </label>
                  );
                }

                if (field.type === "boolean") {
                  return (
                    <label
                      key={field.key}
                      className={`grid min-h-[42px] w-full gap-3 rounded-lg border border-[#2f2f2f] bg-black px-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center ${
                        isDisabled ? "opacity-45" : ""
                      }`}
                    >
                      <span className="text-sm text-[#cfcfcf]">{field.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        disabled={isDisabled}
                        onChange={(event) => updateField(field.key, event.target.checked)}
                        className="custom-checkbox"
                      />
                    </label>
                  );
                }

                if (field.type === "select") {
                  return (
                    <label
                      key={field.key}
                      className={`grid w-full gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center ${
                        isDisabled ? "opacity-45" : ""
                      }`}
                    >
                      <span className="text-sm text-[#cfcfcf]">{field.label}</span>
                      <select
                        value={stringifyValue(value)}
                        disabled={isDisabled}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80] disabled:cursor-not-allowed disabled:text-[#777]"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label
                    key={field.key}
                    className={
                      `${
                        isCourtCountField
                          ? "flex w-full flex-col gap-2"
                          : "grid w-full gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-center"
                      } ${isDisabled ? "opacity-45" : ""}`
                    }
                  >
                    <span className="text-sm text-[#cfcfcf]">{field.label}</span>
                    <span
                      className={
                        field.key === "basic_map_link" || field.key === "slug"
                          ? "flex w-full min-w-0 gap-2"
                          : "block w-full min-w-0"
                      }
                    >
                      <input
                        type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
                        min={isCourtCountField ? 0 : undefined}
                        value={stringifyValue(value)}
                        disabled={isDisabled}
                        onChange={(event) => {
                          if (isCourtCountField && event.target.value !== "") {
                            updateField(field.key, String(Math.max(0, Number(event.target.value))));
                            return;
                          }

                          updateField(field.key, event.target.value);
                        }}
                        className="w-full min-w-0 flex-1 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80] disabled:cursor-not-allowed disabled:text-[#777]"
                      />
                      {field.key === "basic_map_link" ? (
                        <button
                          type="button"
                          onClick={openMapLink}
                          disabled={!stringifyValue(form.basic_map_link).trim()}
                          className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          지도
                        </button>
                      ) : null}
                      {field.key === "slug" ? (
                        <button
                          type="button"
                          onClick={generateSlug}
                          disabled={
                            Boolean(form.id) ||
                            isGeneratingSlug ||
                            !stringifyValue(form.basic_court_name).trim()
                          }
                          className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isGeneratingSlug ? "생성 중" : "생성"}
                        </button>
                      ) : null}
                    </span>
                  </label>
                );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
