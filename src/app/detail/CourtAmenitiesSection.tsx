"use client";

import Image from "next/image";
import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import type { SportType } from "@/app/types";
import {
  COURT_AMENITIES,
  type CourtAmenity,
  type CourtAmenityKey,
} from "@/lib/courtAmenities";
import {
  COURT_INFORMATION_REPORT_CATEGORIES,
  getCourtInformationReportCategoryLabel,
  type CourtInformationReportCategory,
} from "@/lib/courtInformationReports";
import {
  detailSectionTitle,
  detailSectionTitleStyle,
} from "./detailLayoutStyles";
import styles from "./CourtAmenitiesSection.module.css";

const AMENITY_ICON_PATHS: Record<CourtAmenityKey, string> = {
  air_conditioning: "/icon/icon_facility_airconditioner.svg",
  parking: "/icon/icon_facility_parking.svg",
  restroom: "/icon/icon_facility_restroom.svg",
  shower: "/icon/icon_facility_shower.svg",
  changing_room: "/icon/icon_facility_dreesroom.svg",
  drinking_water: "/icon/icon_facility_water.svg",
  rest_area: "/icon/icon_facility_restarea.svg",
  shade: "/icon/icon_facility_shade_shelter.svg",
};

function formatCheckedDate(value: string | null) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}.${part("month")}.${part("day")}`;
}

export function CourtAmenitiesSection({
  amenities = [],
  courtId,
  courtName,
  sportType,
}: {
  amenities?: CourtAmenity[];
  courtId: string;
  courtName: string;
  sportType: SportType;
}) {
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] =
    useState<CourtInformationReportCategory>("amenities");
  const [reportedCourtName, setReportedCourtName] = useState(courtName);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const presentKeys = new Set(
    amenities
      .filter((amenity) => amenity.status === "present")
      .map((amenity) => amenity.amenity_key)
  );
  const visibleAmenities = COURT_AMENITIES.filter(({ key }) => presentKeys.has(key));
  const checkedDate = useMemo(() => {
    const latest = amenities
      .map((amenity) => amenity.checked_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    return formatCheckedDate(latest ?? null);
  }, [amenities]);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [modalOpen]);

  useEffect(() => {
    const nativeBridge = (window as typeof window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }).ReactNativeWebView;
    if (!nativeBridge) return;
    nativeBridge.postMessage(JSON.stringify({
      type: "filter-visibility",
      visible: modalOpen,
    }));
    return () => {
      if (modalOpen) {
        nativeBridge.postMessage(JSON.stringify({
          type: "filter-visibility",
          visible: false,
        }));
      }
    };
  }, [modalOpen]);

  if (visibleAmenities.length === 0) return null;

  const openReportModal = () => {
    setReportedCourtName(courtName);
    setCategory("amenities");
    setContent("");
    setError("");
    setSubmitted(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setModalOpen(false);
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportedCourtName.trim()) {
      setError("시설명을 입력해 주세요.");
      return;
    }
    if (content.trim().length < 5) {
      setError("알려주실 내용을 5자 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/court-information-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          facilityName: reportedCourtName.trim(),
          category,
          content,
          pageUrl: window.location.href,
          website: "",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "제보를 접수하지 못했습니다.");
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "제보를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section
        aria-label="편의시설 정보"
        data-detail-amenities="true"
        className={styles.section}
      >
        <div className={styles.headingRow} data-detail-amenities-heading="true">
          <div className={styles.headingBlock}>
            <div className={styles.titleRow}>
              <h2
                className={`${detailSectionTitle} ${styles.title}`}
                style={detailSectionTitleStyle}
              >
                편의시설
              </h2>
              <span
                className={styles.tooltipAnchor}
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
              >
                <button
                  type="button"
                  className={styles.helpButton}
                  aria-label="편의시설 정보 안내"
                  aria-describedby={tooltipOpen ? tooltipId : undefined}
                  aria-expanded={tooltipOpen}
                  onClick={() => setTooltipOpen(true)}
                  onFocus={() => setTooltipOpen(true)}
                  onBlur={() => setTooltipOpen(false)}
                >
                  ?
                </button>
                {tooltipOpen ? (
                  <span id={tooltipId} role="tooltip" className={styles.tooltip}>
                    온라인 자료를 기반으로 한 정보이며, 실제와 다를 수 있습니다.
                  </span>
                ) : null}
              </span>
            </div>
            <button
              type="button"
              className={styles.reportTrigger}
              data-detail-amenities-report="true"
              onClick={openReportModal}
            >
              내가 알고 있는 정보와 다른가요?
            </button>
          </div>
          {checkedDate ? (
            <time
              className={styles.checkedDate}
              data-detail-amenities-checked-date="true"
              dateTime={checkedDate.replaceAll(".", "-")}
            >
              {checkedDate} 확인
            </time>
          ) : null}
        </div>

        <ul className={styles.grid} data-detail-amenities-grid="true">
          {visibleAmenities.map(({ key, label }) => (
            <li key={key} className={styles.item} data-detail-amenities-item="true">
              <span className={styles.iconFrame} aria-hidden="true">
                <Image
                  src={AMENITY_ICON_PATHS[key]}
                  alt=""
                  width={36}
                  height={36}
                  className={styles.icon}
                  data-detail-amenities-icon="true"
                />
              </span>
              <span className={styles.label} data-detail-amenities-label="true">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {modalOpen ? (
        <div className={styles.modalLayer} data-detail-amenities-modal-layer="true">
          <button
            type="button"
            className={styles.modalBackdrop}
            onClick={closeModal}
            aria-label="제보 팝업 닫기"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="court-report-dialog-title"
            className={styles.modal}
            data-detail-amenities-modal="true"
          >
            {submitted ? (
              <div className={styles.successPanel}>
                <span className={styles.successIcon} aria-hidden="true">✓</span>
                <h2 id="court-report-dialog-title" className={styles.modalTitle}>
                  제보가 접수되었습니다
                </h2>
                <p className={styles.successDescription}>
                  소중한 정보를 알려주셔서 감사합니다.
                </p>
                <button type="button" className={styles.primaryButton} onClick={closeModal}>
                  확인
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport}>
                <div className={styles.modalHeader}>
                  <div>
                    <p className={styles.modalEyebrow}>시설 정보 제보</p>
                    <h2 id="court-report-dialog-title" className={styles.modalTitle}>
                      알고 있는 정보를 알려주세요
                    </h2>
                  </div>
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={closeModal}
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="court-report-name">
                    시설명
                  </label>
                  <input
                    id="court-report-name"
                    className={styles.fieldControl}
                    value={reportedCourtName}
                    onChange={(event) =>
                      setReportedCourtName(event.target.value.slice(0, 200))
                    }
                    maxLength={200}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="court-report-category">
                    정보 유형
                  </label>
                  <span className={styles.selectWrap}>
                    <select
                      id="court-report-category"
                      className={`${styles.fieldControl} ${styles.selectControl}`}
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as CourtInformationReportCategory)
                      }
                    >
                      {COURT_INFORMATION_REPORT_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                          {getCourtInformationReportCategoryLabel(value, sportType)}
                        </option>
                      ))}
                    </select>
                    <svg
                      className={styles.selectArrow}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.5 6 4.5 4 4.5-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="court-report-content">
                    알려주실 내용
                  </label>
                  <textarea
                    id="court-report-content"
                    className={`${styles.fieldControl} ${styles.textarea}`}
                    value={content}
                    onChange={(event) => setContent(event.target.value.slice(0, 5000))}
                    placeholder="현재 정보와 다른 점을 자세히 입력해 주세요."
                    rows={6}
                    maxLength={5000}
                  />
                  <span className={styles.characterCount}>{content.length.toLocaleString()} / 5,000</span>
                </div>

                <input
                  className={styles.honeypot}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  name="website"
                />

                {error ? <p className={styles.errorMessage}>{error}</p> : null}

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeModal}>
                    취소
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={
                      submitting ||
                      !reportedCourtName.trim() ||
                      content.trim().length < 5
                    }
                  >
                    {submitting ? "접수 중…" : "제출"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
