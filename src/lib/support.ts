export const NOTICE_CHANNELS = ["app", "web"] as const;
export type NoticeChannel = (typeof NOTICE_CHANNELS)[number];
export type NoticeStatus = "draft" | "published" | "archived";

export type Notice = {
  id: string;
  title: string;
  body: string;
  channels: NoticeChannel[];
  status: NoticeStatus;
  is_pinned: boolean;
  published_at: string | null;
  publish_ends_at: string | null;
  action_label: string | null;
  action_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  push_requested_at: string | null;
  push_started_at: string | null;
  push_sent_at: string | null;
  push_error: string | null;
  created_at: string;
  updated_at: string;
};

export const INQUIRY_CATEGORIES = [
  "service",
  "court_info",
  "notification",
  "account",
  "bug",
  "other",
] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];
export type InquirySource = "app" | "web";
export type InquiryStatus = "new" | "in_progress" | "answered" | "closed";

export type InquiryReply = {
  id: string;
  inquiry_id: string;
  body: string;
  author_type: "admin" | "customer";
  author_label: string | null;
  created_at: string;
};

export type CustomerInquiry = {
  id: string;
  user_id: string | null;
  source: InquirySource;
  category: InquiryCategory;
  title: string;
  body: string;
  contact_name: string | null;
  contact_email: string;
  status: InquiryStatus;
  app_version: string | null;
  os_name: string | null;
  device_model: string | null;
  page_url: string | null;
  user_agent: string | null;
  last_replied_at: string | null;
  created_at: string;
  updated_at: string;
  customer_inquiry_replies?: InquiryReply[];
};

export const inquiryCategoryLabels: Record<InquiryCategory, string> = {
  service: "서비스 이용",
  court_info: "테니스장 정보",
  notification: "오픈 알림",
  account: "계정",
  bug: "오류 신고",
  other: "기타",
};

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  new: "신규",
  in_progress: "확인 중",
  answered: "답변 완료",
  closed: "종료",
};

export function isNoticeChannel(value: unknown): value is NoticeChannel {
  return typeof value === "string" && NOTICE_CHANNELS.includes(value as NoticeChannel);
}

export function isInquiryCategory(value: unknown): value is InquiryCategory {
  return typeof value === "string" && INQUIRY_CATEGORIES.includes(value as InquiryCategory);
}

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return ["new", "in_progress", "answered", "closed"].includes(String(value));
}

export function formatSupportDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
