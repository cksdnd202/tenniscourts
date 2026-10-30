import type { SportType } from "@/app/types";

export const COURT_INFORMATION_REPORT_CATEGORIES = [
  "booking_open",
  "location",
  "pricing",
  "court_type",
  "amenities",
] as const;

export const COURT_INFORMATION_REPORT_STATUSES = [
  "new",
  "reviewing",
  "resolved",
  "dismissed",
] as const;

export type CourtInformationReportCategory =
  (typeof COURT_INFORMATION_REPORT_CATEGORIES)[number];
export type CourtInformationReportStatus =
  (typeof COURT_INFORMATION_REPORT_STATUSES)[number];

export type CourtInformationReport = {
  id: string;
  court_id: string | null;
  court_name: string;
  sport_type: SportType;
  category: CourtInformationReportCategory;
  content: string;
  status: CourtInformationReportStatus;
  source: "web" | "app";
  page_url: string | null;
  user_agent: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const courtInformationReportStatusLabels: Record<
  CourtInformationReportStatus,
  string
> = {
  new: "신규",
  reviewing: "확인 중",
  resolved: "반영 완료",
  dismissed: "반영하지 않음",
};

export function getCourtInformationReportCategoryLabel(
  category: CourtInformationReportCategory,
  sportType: SportType
) {
  const labels: Record<CourtInformationReportCategory, string> = {
    booking_open: "예약 오픈 정보",
    location: "위치",
    pricing: "이용요금",
    court_type: sportType === "badminton" ? "바닥 종류" : "코트 종류",
    amenities: "편의시설",
  };
  return labels[category];
}

export function isCourtInformationReportCategory(
  value: unknown
): value is CourtInformationReportCategory {
  return COURT_INFORMATION_REPORT_CATEGORIES.includes(
    value as CourtInformationReportCategory
  );
}

export function isCourtInformationReportStatus(
  value: unknown
): value is CourtInformationReportStatus {
  return COURT_INFORMATION_REPORT_STATUSES.includes(
    value as CourtInformationReportStatus
  );
}
