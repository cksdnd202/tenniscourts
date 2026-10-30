"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppUpdateMode, PublicAppUpdatePolicy } from "@/lib/appUpdatePolicy";
import { AdminPageHeader, AdminSpinner } from "../AdminUI";
import { adminFetch } from "../adminClient";
import styles from "./AppUpdatesClient.module.css";

type FormState = Omit<PublicAppUpdatePolicy, "platform" | "updatedAt"> & {
  confirmForceUpdate: boolean;
};

const modeOptions: Array<{ value: AppUpdateMode; label: string; description: string }> = [
  { value: "none", label: "안내 없음", description: "버전이 달라도 팝업을 표시하지 않습니다." },
  { value: "recommend", label: "권장 업데이트", description: "나중에 할 수 있는 업데이트 안내를 표시합니다." },
  { value: "force", label: "강제 업데이트", description: "업데이트 전까지 앱을 사용할 수 없습니다." },
];

function toForm(policy: PublicAppUpdatePolicy): FormState {
  return {
    enabled: policy.enabled,
    mode: policy.mode,
    latestVersionName: policy.latestVersionName,
    latestBuildNumber: policy.latestBuildNumber,
    minimumBuildNumber: policy.minimumBuildNumber,
    title: policy.title,
    message: policy.message,
    storeUrl: policy.storeUrl,
    remindAfterHours: policy.remindAfterHours,
    confirmForceUpdate: false,
  };
}

export function AppUpdatesClient() {
  const [form, setForm] = useState<FormState | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const result = await adminFetch<{ policy: PublicAppUpdatePolicy }>(
          "/api/admin/app-update-policy?platform=android"
        );
        setForm(toForm(result.policy));
        setLastUpdatedAt(result.policy.updatedAt);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "업데이트 정책을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const policySummary = useMemo(() => {
    if (!form?.enabled || form.mode === "none") return "현재 앱에는 업데이트 안내가 노출되지 않습니다.";
    if (form.mode === "force") return `빌드 ${form.latestBuildNumber} 미만 사용자는 앱을 계속 사용할 수 없습니다.`;
    return `빌드 ${form.latestBuildNumber} 미만 사용자에게 권장 업데이트가 표시됩니다.`;
  }, [form]);

  const setValue = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setSuccess("");
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await adminFetch<{ policy: PublicAppUpdatePolicy }>("/api/admin/app-update-policy", {
        method: "PUT",
        body: JSON.stringify({ platform: "android", ...form }),
      });
      setForm(toForm(result.policy));
      setLastUpdatedAt(result.policy.updatedAt);
      setSuccess("Android 업데이트 정책을 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "업데이트 정책을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="MOBILE APP RELEASE"
        title="앱 업데이트 관리"
        description="Android 앱에 노출할 권장·강제 업데이트 안내를 관리합니다."
      >
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${form?.enabled && form.mode !== "none" ? "bg-[#E7F8F0] text-[#16875A]" : "bg-[#EEF0F2] text-[#69717A]"}`}>
          {form?.enabled && form.mode !== "none" ? "노출 중" : "비활성"}
        </span>
      </AdminPageHeader>

      {error ? <div className="mb-4 rounded-xl border border-[#F2CACA] bg-[#FFF7F7] px-4 py-3 text-sm text-[#B42318]">{error}</div> : null}
      {success ? <div className="mb-4 rounded-xl border border-[#BFE8D5] bg-[#F3FCF8] px-4 py-3 text-sm text-[#16875A]">{success}</div> : null}

      {loading || !form ? <AdminSpinner /> : (
        <div className={styles.layout}>
          <section className="space-y-6 rounded-2xl border border-[#E4E7EB] bg-white p-5 md:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-[#EDF0F2] pb-5">
              <div><h2 className="font-bold text-[#252A2E]">Android 정책</h2><p className="mt-1 text-xs text-[#8A929D]">패키지: com.courtskorea.app</p></div>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <span>{form.enabled ? "사용" : "중지"}</span>
                <input type="checkbox" className="h-5 w-5 accent-[#24B978]" checked={form.enabled} onChange={(event) => setValue("enabled", event.target.checked)} />
              </label>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-bold text-[#33383E]">업데이트 방식</legend>
              <div className={styles.modeGrid}>
                {modeOptions.map((option) => (
                  <label key={option.value} className={`${styles.modeOption} ${form.mode === option.value ? styles.modeOptionSelected : ""}`}>
                    <input
                      type="radio"
                      name="updateMode"
                      value={option.value}
                      checked={form.mode === option.value}
                      onChange={() => {
                        setValue("mode", option.value);
                        setValue("confirmForceUpdate", false);
                      }}
                      className={styles.modeRadio}
                    />
                    <span className={styles.modeTitleRow}><span className={styles.modeTitle}>{option.label}</span><span className={styles.modeCheck}>✓</span></span>
                    <span className={styles.modeDescription}>{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-[#4D555E]">최신 버전명<input className={`${styles.input} mt-2`} value={form.latestVersionName} onChange={(event) => setValue("latestVersionName", event.target.value)} placeholder="예: 1.1.0" /></label>
              <label className="text-sm font-semibold text-[#4D555E]">최신 빌드 번호<input type="number" min={1} className={`${styles.input} mt-2`} value={form.latestBuildNumber} onChange={(event) => setValue("latestBuildNumber", Number(event.target.value))} /></label>
              <label className="text-sm font-semibold text-[#4D555E]">최소 지원 빌드<input type="number" min={1} className={`${styles.input} mt-2`} value={form.minimumBuildNumber} onChange={(event) => setValue("minimumBuildNumber", Number(event.target.value))} /></label>
            </div>
            <p className="-mt-3 text-xs leading-5 text-[#8A929D]">권장 업데이트에서도 최소 지원 빌드보다 오래된 앱에는 닫을 수 없는 안내가 표시됩니다.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#4D555E]">팝업 제목<input className={`${styles.input} mt-2`} value={form.title} onChange={(event) => setValue("title", event.target.value)} /></label>
              <label className="text-sm font-semibold text-[#4D555E]">권장 안내 다시 표시<input type="number" min={1} max={720} className={`${styles.input} mt-2`} value={form.remindAfterHours} onChange={(event) => setValue("remindAfterHours", Number(event.target.value))} /><span className="mt-1 block text-xs font-normal text-[#8A929D]">시간 단위 (강제 업데이트에는 적용되지 않음)</span></label>
            </div>
            <label className="block text-sm font-semibold text-[#4D555E]">안내 문구<textarea className={`${styles.textarea} mt-2`} value={form.message} onChange={(event) => setValue("message", event.target.value)} /></label>
            <label className="block text-sm font-semibold text-[#4D555E]">Google Play 주소<input className={`${styles.input} mt-2`} value={form.storeUrl} onChange={(event) => setValue("storeUrl", event.target.value)} /></label>

            {form.mode === "force" ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#F0C7C2] bg-[#FFF8F7] p-4 text-sm leading-6 text-[#7A3129]">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#C24132]" checked={form.confirmForceUpdate} onChange={(event) => setValue("confirmForceUpdate", event.target.checked)} />
                <span><strong className="block">새 빌드가 Google Play에 공개된 것을 확인했습니다.</strong>스토어 공개 전에 강제 업데이트를 켜면 모든 사용자가 앱에 진입하지 못할 수 있습니다.</span>
              </label>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-[#EDF0F2] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#8A929D]">마지막 저장: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString("ko-KR") : "-"}</p>
              <button type="button" onClick={() => void save()} disabled={saving || (form.mode === "force" && !form.confirmForceUpdate)} className={styles.saveButton}>{saving ? "저장 중..." : "정책 저장"}</button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E4E7EB] bg-white p-5">
              <p className="text-xs font-semibold text-[#8A929D]">현재 동작</p><p className="mt-3 text-sm font-semibold leading-6 text-[#33383E]">{policySummary}</p>
            </div>
            <div className={`${styles.safetyCard} rounded-2xl p-5`}>
              <h3 className="text-sm font-bold text-[#255C45]">안전한 배포 순서</h3>
              <ol className="mt-3 space-y-2 text-xs leading-5 text-[#537263]"><li>1. 빌드 번호를 올린 AAB를 Google Play에 등록</li><li>2. 스토어에서 새 버전 공개 여부 확인</li><li>3. 어드민의 최신 빌드 번호 입력</li><li>4. 권장 또는 강제 업데이트 활성화</li></ol>
            </div>
            <div>
              <p className={styles.previewLabel}>앱 팝업 미리보기</p>
              <div className={styles.phonePreview}>
                <div className={styles.phoneScreen}>
                  <div className={styles.phoneStatusBar} aria-hidden><span>9:41</span><span>● ᯤ ▰</span></div>
                  <div className={styles.phoneAppContent} aria-hidden>
                    <div className={styles.phoneHeader}><div className={styles.phoneSearch}>⌕&nbsp;&nbsp;체육시설을 검색해 보세요</div><span className={styles.phoneBell}>♢</span></div>
                    <div className={styles.phoneSportTabs}><span className={styles.phoneSportActive}>◉ 테니스장</span><span>◉ 배드민턴장</span></div>
                    <div className={styles.phoneFilterTabs}><span>전체</span><span>⌖ 내 주변</span><span>▮ 찜</span></div>
                    <div className={styles.phoneResultLabel}>724개의 코트</div>
                    <div className={styles.phoneCourtCard}><div className={styles.phoneCourtImage} /><div><strong>테니스장 이름</strong><p>서울 · 실외 코트</p><span>예약 정보 확인하기</span></div></div>
                    <div className={styles.phoneCourtCard}><div className={styles.phoneCourtImageAlt} /><div><strong>가까운 체육시설</strong><p>경기 · 실내 코트</p><span>예약 정보 확인하기</span></div></div>
                  </div>
                  <div className={styles.phoneDim} />
                  <div className={styles.previewModal}>
                    <h3 className={styles.previewTitle}>{form.title || "업데이트 안내"}</h3>
                    <p className={styles.previewMessage}>{form.message || "안내 문구가 여기에 표시됩니다."}</p>
                    <div className={styles.previewButton}>업데이트하기</div>
                    {form.mode === "recommend" ? <p className={styles.previewLater}>나중에</p> : null}
                    {form.mode === "force" ? <p className={styles.previewForceHint}>업데이트 후 앱을 계속 이용할 수 있어요.</p> : null}
                  </div>
                  <span className={styles.phoneHomeIndicator} aria-hidden />
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
