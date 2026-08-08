"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Court, CourtBlogLink, CourtBookingRule } from "../types";
import { CheckingContent } from "../CheckingContent";
import { FixedScheduleContent } from "../FixedScheduleContent";
import { IrregularContent } from "../IrregularContent";
import { LotteryContent } from "../LotteryContent";
import { OnSiteContent } from "../OnSiteContent";
import { OrdinalContent } from "../ordinal";
import { PhoneContent } from "../PhoneContent";
import { RollingContent } from "../RollingContent";
import { supabase } from "@/lib/supabase";
import { hasPriorityEligibility } from "@/lib/bookingEligibility";
import {
  getNextNormalBookingOpen,
  getNextOwnerBookingOpen,
  getPriorityBookingLabel,
  type NextOpenResult,
} from "@/lib/nextBookingOpen";
import { getCourtDetailPath } from "@/lib/courtPath";
import { fmt, formatTime, td, tdIcon, th } from "../styles";

type CourtForm = Partial<Court>;
type CourtSortKey = "name" | "updated_at" | "use_or_not";
type SortDirection = "asc" | "desc";
type CourtBlogLinkDraft = Partial<CourtBlogLink>;
type CourtBookingRuleDraft = Partial<CourtBookingRule>;
type RulePreviewMode = "full" | "grouped" | "compact";

type FieldConfig = {
  key: keyof Court;
  label: string;
  type?: "text" | "textarea" | "number" | "time" | "select" | "boolean";
  placeholder?: string;
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

const previewCardClass =
  "grid min-h-[380px] content-start rounded-xl border border-transparent bg-[#191B1E] p-5 gap-2 min-w-0";

const rulePreviewModeLabels: Record<RulePreviewMode, string> = {
  full: "전체형",
  grouped: "묶음형",
  compact: "압축형",
};
const TEMP_BOOKING_RULE_ID_PREFIX = "temp-booking-rule-";

function createTempBookingRuleId() {
  return `${TEMP_BOOKING_RULE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyBlogLinks(): CourtBlogLinkDraft[] {
  return Array.from({ length: 3 }, (_, index) => ({
    url: "",
    title: "",
    description: "",
    thumbnail_url: "",
    source: "",
    sort_order: index,
  }));
}

function createEmptyBookingRuleDraft(courtId: string, sortOrder = 0): CourtBookingRuleDraft {
  return {
    court_id: courtId,
    label: "",
    eligibility: "normal",
    rule_type: "fixed_schedule",
    open_type: "day",
    open_day_of_month: null,
    open_day_of_week: null,
    open_ordinal: null,
    open_time: "",
    open_offset: "다음달",
    lottery_desc: "",
    is_active: true,
    sort_order: sortOrder,
  };
}

function createSeoulCandidateBookingRuleDraft(sortOrder = 10): CourtBookingRule {
  return {
    id: createTempBookingRuleId(),
    court_id: "",
    label: "예약 정보 확인 필요",
    eligibility: "normal",
    rule_type: "checking",
    open_type: null,
    open_day_of_month: null,
    open_day_of_week: null,
    open_ordinal: null,
    open_time: null,
    open_offset: null,
    lottery_desc: null,
    is_active: true,
    sort_order: sortOrder,
  };
}

function cloneBookingRulesForImport(
  rules: CourtBookingRule[] | null | undefined,
  courtId: string
): CourtBookingRule[] {
  return sortBookingRules(rules).map((rule, index) => ({
    ...rule,
    id: createTempBookingRuleId(),
    court_id: courtId,
    sort_order: numberOrNull(rule.sort_order) ?? (index + 1) * 10,
  }));
}

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("어드민 기능은 로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

async function readAdminResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        `${fallbackMessage} 서버 응답이 비어 있습니다. Vercel 환경변수(SUPABASE_SERVICE_ROLE_KEY)를 확인해 주세요.`
    );
  }

  return data;
}

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
  { key: "basic_latitude", label: "위도", type: "number" },
  { key: "basic_longitude", label: "경도", type: "number" },
  { key: "time_of_use_same", label: "평일/주말 이용시간 동일", type: "boolean" },
  { key: "basic_time_of_use_weekday_from", label: "평일 이용 시작", type: "time" },
  { key: "basic_time_of_use_weekday_to", label: "평일 이용 종료", type: "time" },
  { key: "basic_time_of_use_weekend_from", label: "주말 이용 시작", type: "time" },
  { key: "basic_time_of_use_weekend_to", label: "주말 이용 종료", type: "time" },
  { key: "booking_site_link", label: "예약 사이트 링크" },
  { key: "booking_reception_time", label: "예약 접수 시간" },
  { key: "booking_open_time_local", label: "예약 오픈 시간 local", type: "time" },
  {
    key: "booking_rule_type",
    label: "예약 규칙",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "고정 일정(fixed_schedule)", value: "fixed_schedule" },
      { label: "상시/롤링(rolling)", value: "rolling" },
      { label: "추첨(lottery)", value: "lottery" },
      { label: "전화(phone)", value: "phone" },
      { label: "현장(on_site)", value: "on_site" },
      { label: "비정기(irregular)", value: "irregular" },
      { label: "확인 필요(checking)", value: "checking" },
      { label: "순번제(ordinal, 몇 번째 요일인지)", value: "ordinal" },
    ],
  },
  { key: "booking_lottery_desc", label: "추첨 방식" },
  {
    key: "booking_open_type",
    label: "오픈 타입",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "일자(day)", value: "day" },
      { label: "요일(week)", value: "week" },
    ],
  },
  {
    key: "booking_eligibility_first",
    label: "1순위 자격",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "resident(구민)", value: "resident" },
      { label: "citizen(시민)", value: "citizen" },
      { label: "inhabitant(주민)", value: "inhabitant" },
    ],
  },
  { key: "booking_open_day_owner", label: "1순위 자격 오픈 일자", type: "number" },
  { key: "booking_open_time_owner", label: "1순위 자격 오픈 시간", type: "time" },
  {
    key: "booking_eligibility_second",
    label: "2순위 자격",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "normal(전체)", value: "normal" },
      { label: "none", value: "none" },
    ],
  },
  { key: "booking_open_day_normal", label: "전체 오픈 일자", type: "number" },
  { key: "booking_open_time_normal", label: "전체 오픈 시간", type: "time" },
  { key: "booking_open_offset", label: "오픈되는 범위", placeholder: "예 : 13 또는 다음달" },
  { key: "booking_normal_iscurrentmonth", label: "전체 예약 이번달 기준", type: "boolean" },
  {
    key: "booking_open_day_of_month",
    label: "월 오픈 일자",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "1(첫째주)", value: "1" },
      { label: "2(둘째주)", value: "2" },
      { label: "3(셋째주)", value: "3" },
      { label: "4(넷째주)", value: "4" },
      { label: "5(다섯째주)", value: "5" },
      { label: "-1(마지막주)", value: "-1" },
    ],
  },
  {
    key: "booking_open_day_of_week",
    label: "오픈 요일",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "0(일요일)", value: "0" },
      { label: "1(월요일)", value: "1" },
      { label: "2(화요일)", value: "2" },
      { label: "3(수요일)", value: "3" },
      { label: "4(목요일)", value: "4" },
      { label: "5(금요일)", value: "5" },
      { label: "6(토요일)", value: "6" },
    ],
  },
  {
    key: "booking_open_ordinal",
    label: "예약 오픈 주차",
    type: "select",
    options: [
      { label: "선택 안 함", value: "" },
      { label: "1(첫 번째 주)", value: "1" },
      { label: "2(두 번째 주)", value: "2" },
      { label: "3(세 번째 주)", value: "3" },
      { label: "4(네 번째 주)", value: "4" },
      { label: "-1(마지막 주)", value: "-1" },
      { label: "-2(첫 번째 영업일)", value: "-2" },
    ],
  },
  { key: "court_count_hard_indoor", label: "하드 실내", type: "number" },
  { key: "court_count_hard_outdoor", label: "하드 실외", type: "number" },
  { key: "court_count_grass_indoor", label: "잔디 실내", type: "number" },
  { key: "court_count_grass_outdoor", label: "잔디 실외", type: "number" },
  { key: "court_count_clay_indoor", label: "클레이 실내", type: "number" },
  { key: "court_count_clay_outdoor", label: "클레이 실외", type: "number" },
  {
    key: "booking_booking_provide",
    label: "예약 제공 방식",
    type: "select",
    options: [
      { label: "NULL", value: "" },
      { label: "앱/웹 서비스(app_web_service)", value: "app_web_service" },
      { label: "네이버(naver)", value: "naver" },
      { label: "사설 사이트(private_site)", value: "private_site" },
      { label: "공공 사이트(public_site)", value: "public_site" },
    ],
  },
  { key: "booking_holiday_week", label: "휴무 주" },
  { key: "booking_online_reserve_possible", label: "온라인 예약 가능", type: "boolean" },
  { key: "booking_today_booking_possible", label: "당일 예약 가능", type: "boolean" },
  { key: "etc_desc", label: "기타 설명", type: "textarea" },
];

const fieldGroups = [
  {
    title: "기본 정보",
    fields: fields.filter(
      (field) => String(field.key).startsWith("basic_") || field.key === "time_of_use_same"
    ),
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
        field.key !== "time_of_use_same" &&
        !String(field.key).startsWith("basic_") &&
        !String(field.key).startsWith("court_") &&
        !String(field.key).startsWith("booking_")
    ),
  },
].filter((group) => group.fields.length > 0);

const commonBookingFieldKeys = new Set<keyof Court>([
  "booking_site_link",
  "booking_reception_time",
  "booking_booking_provide",
  "booking_online_reserve_possible",
  "booking_today_booking_possible",
  "booking_holiday_week",
]);

const legacyBookingRuleFieldKeys = new Set<keyof Court>([
  "booking_rule_type",
  "booking_lottery_desc",
  "booking_open_type",
  "booking_eligibility_first",
  "booking_open_day_owner",
  "booking_open_time_owner",
  "booking_eligibility_second",
  "booking_open_day_normal",
  "booking_open_time_normal",
  "booking_open_offset",
  "booking_normal_iscurrentmonth",
  "booking_open_day_of_month",
  "booking_open_day_of_week",
  "booking_open_ordinal",
  "booking_open_time_local",
]);

const numberFieldKeys = new Set(
  fields.filter((field) => field.type === "number").map((field) => field.key)
);

const sourceFieldKeys = [
  "source_provider",
  "source_service_id",
  "source_service_name",
  "source_place_name",
  "source_area_name",
  "source_time_min",
  "source_time_max",
  "source_match_key",
  "source_synced_at",
] satisfies Array<keyof Court>;

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

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function dateTimeValue(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "업데이트 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "업데이트 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function FieldLabel({
  field,
  showDbKey,
  className = "",
}: {
  field: FieldConfig;
  showDbKey: boolean;
  className?: string;
}) {
  return (
    <span className={`text-sm text-[#cfcfcf] ${className}`}>
      <span className="block">{field.label}</span>
      {showDbKey ? (
        <span className="mt-1 block break-all font-mono text-[11px] leading-tight text-[#777]">
          {field.key}
        </span>
      ) : null}
    </span>
  );
}

function formatRuleEligibility(value: string | null | undefined) {
  switch (value) {
    case "resident":
      return "구민";
    case "citizen":
      return "시민";
    case "inhabitant":
      return "주민";
    case "normal":
      return "전체";
    case "none":
      return "없음";
    default:
      return value || "자격 없음";
  }
}

function formatRuleDisplayText(value: string | null | undefined) {
  return value?.replaceAll("일반", "전체") ?? "";
}

function formatRuleType(value: string | null | undefined) {
  switch (value) {
    case "fixed_schedule":
      return "고정 일정";
    case "rolling":
      return "상시/롤링";
    case "lottery":
      return "추첨";
    case "phone":
      return "전화";
    case "on_site":
      return "현장";
    case "irregular":
      return "비정기";
    case "checking":
      return "확인 필요";
    case "ordinal":
      return "순번제";
    default:
      return value || "규칙 없음";
  }
}

function formatRuleOpenType(value: string | null | undefined) {
  switch (value) {
    case "day":
      return "일자";
    case "week":
      return "요일";
    default:
      return value || "-";
  }
}

function formatRuleWeekday(value: number | null | undefined) {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  return typeof value === "number" && labels[value] ? `${labels[value]}요일` : "-";
}

function formatRuleOrdinal(value: number | null | undefined) {
  switch (value) {
    case 1:
      return "첫 번째 주";
    case 2:
      return "두 번째 주";
    case 3:
      return "세 번째 주";
    case 4:
      return "네 번째 주";
    case -1:
      return "마지막 주";
    case -2:
      return "첫 번째 영업일";
    default:
      return typeof value === "number" ? String(value) : "-";
  }
}

function formatRuleDayOfMonth(value: number | null | undefined) {
  if (value === -1) return "말일";
  return typeof value === "number" ? `${value}일` : "-";
}

function formatRuleTime(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function sortBookingRules(rules: CourtBookingRule[] | null | undefined) {
  return [...(rules ?? [])].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return formatRuleEligibility(a.eligibility).localeCompare(formatRuleEligibility(b.eligibility));
  });
}

function toTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeBookingRuleForSave(rule: CourtBookingRuleDraft) {
  return {
    ...rule,
    label: stringifyValue(rule.label).trim() || null,
    eligibility: stringifyValue(rule.eligibility).trim() || null,
    rule_type: stringifyValue(rule.rule_type).trim() || null,
    open_type: stringifyValue(rule.open_type).trim() || null,
    open_day_of_month: numberOrNull(rule.open_day_of_month),
    open_day_of_week: numberOrNull(rule.open_day_of_week),
    open_ordinal: numberOrNull(rule.open_ordinal),
    open_time: stringifyValue(rule.open_time).trim() || null,
    open_offset: stringifyValue(rule.open_offset).trim() || null,
    lottery_desc: stringifyValue(rule.lottery_desc).trim() || null,
    is_active: rule.is_active !== false,
    sort_order: numberOrNull(rule.sort_order) ?? 0,
  };
}

function isBookingRuleDraftFieldVisible(
  draft: CourtBookingRuleDraft,
  field: keyof CourtBookingRuleDraft
) {
  const ruleType = stringifyValue(draft.rule_type);
  const openType = stringifyValue(draft.open_type);
  const openOrdinal = numberOrNull(draft.open_ordinal);

  if (
    field === "label" ||
    field === "eligibility" ||
    field === "rule_type" ||
    field === "sort_order"
  ) {
    return true;
  }

  if (!ruleType) return false;

  if (ruleType === "phone" || ruleType === "on_site" || ruleType === "irregular" || ruleType === "checking") {
    return false;
  }

  if (ruleType === "lottery") {
    return field === "lottery_desc";
  }

  if (ruleType === "rolling") {
    return field === "open_time" || field === "open_offset";
  }

  if (ruleType === "fixed_schedule") {
    if (field === "open_type" || field === "open_time" || field === "open_offset") return true;
    if (field === "open_day_of_month") return openType === "day" || openType === "week";
    if (field === "open_day_of_week") return openType === "week";
    return false;
  }

  if (ruleType === "ordinal") {
    if (field === "open_type" || field === "open_ordinal" || field === "open_time") return true;
    if (field === "open_day_of_week") return openType === "week" && openOrdinal !== -2;
    if (field === "open_offset") return true;
    return false;
  }

  return false;
}

const bookingRuleEligibilityOptions = [
  { label: "선택 안 함", value: "" },
  { label: "구민(resident)", value: "resident" },
  { label: "시민(citizen)", value: "citizen" },
  { label: "주민(inhabitant)", value: "inhabitant" },
  { label: "전체(normal)", value: "normal" },
  { label: "없음(none)", value: "none" },
];

const bookingRuleTypeOptions = [
  { label: "선택 안 함", value: "" },
  { label: "고정 일정(fixed_schedule)", value: "fixed_schedule" },
  { label: "상시/롤링(rolling)", value: "rolling" },
  { label: "추첨(lottery)", value: "lottery" },
  { label: "전화(phone)", value: "phone" },
  { label: "현장(on_site)", value: "on_site" },
  { label: "비정기(irregular)", value: "irregular" },
  { label: "확인 필요(checking)", value: "checking" },
  { label: "순번제(ordinal)", value: "ordinal" },
];

const bookingRuleOpenTypeOptions = [
  { label: "선택 안 함", value: "" },
  { label: "일자(day)", value: "day" },
  { label: "요일(week)", value: "week" },
];

const bookingRuleWeekdayOptions = [
  { label: "선택 안 함", value: "" },
  { label: "0(일요일)", value: "0" },
  { label: "1(월요일)", value: "1" },
  { label: "2(화요일)", value: "2" },
  { label: "3(수요일)", value: "3" },
  { label: "4(목요일)", value: "4" },
  { label: "5(금요일)", value: "5" },
  { label: "6(토요일)", value: "6" },
];

const bookingRuleOrdinalOptions = [
  { label: "선택 안 함", value: "" },
  { label: "1(첫 번째 주)", value: "1" },
  { label: "2(두 번째 주)", value: "2" },
  { label: "3(세 번째 주)", value: "3" },
  { label: "4(네 번째 주)", value: "4" },
  { label: "-1(마지막 주)", value: "-1" },
  { label: "-2(첫 번째 영업일)", value: "-2" },
];

function RuleDraftTextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  type?: "text" | "number" | "time";
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-[#a7a7a7]">{label}</span>
      <input
        type={type}
        value={type === "time" ? toTimeInputValue(stringifyValue(value)) : stringifyValue(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
      />
    </label>
  );
}

function RuleDraftSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: unknown;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-[#a7a7a7]">{label}</span>
      <select
        value={stringifyValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BookingRulesEditor({
  courtId,
  rules,
  draft,
  editingRuleId,
  isSavingRule,
  onStartCreate,
  onStartEdit,
  onDelete,
  onCancel,
  onSave,
  onChange,
}: {
  courtId: string | null | undefined;
  rules: CourtBookingRule[] | null | undefined;
  draft: CourtBookingRuleDraft | null;
  editingRuleId: string | null;
  isSavingRule: boolean;
  onStartCreate: () => void;
  onStartEdit: (rule: CourtBookingRule) => void;
  onDelete: (rule: CourtBookingRule) => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (key: keyof CourtBookingRuleDraft, value: unknown) => void;
}) {
  const sortedRules = sortBookingRules(rules);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[#2f2f2f] bg-[#101010] p-3">
      <div className="flex items-start justify-between gap-3 border-b border-[#2f2f2f] pb-2">
        <div>
          <h3 className="text-sm font-semibold text-[#4ade80]">새 예약 규칙 관리</h3>
          <p className="mt-1 text-xs text-[#8c8c8c]">
            court_booking_rules에 들어가는 규칙을 직접 추가, 수정, 삭제합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartCreate}
          disabled={Boolean(draft)}
          className="shrink-0 rounded-lg bg-[#4ade80] px-3 py-2 text-xs font-semibold text-black hover:bg-[#3fcf6f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          규칙 추가
        </button>
      </div>

      {!courtId ? (
        <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-4 text-sm text-[#a7a7a7]">
          새 테니스장을 저장하기 전에도 예약 규칙을 미리 추가할 수 있습니다.
        </p>
      ) : null}

      {sortedRules.length > 0 ? (
        <div className="grid gap-2">
          {sortedRules.map((rule) => (
            <div
              key={rule.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-black p-3 ${
                rule.is_active ? "border-[#2f2f2f]" : "border-[#4a2f2f] opacity-60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#12351f] px-2 py-1 text-xs font-semibold text-[#86efac]">
                    {formatRuleEligibility(rule.eligibility)}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {formatRuleDisplayText(rule.label) || "예약 규칙"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#a7a7a7]">
                  {formatRuleType(rule.rule_type)} · {formatRuleOpenType(rule.open_type)} ·{" "}
                  {formatRuleDayOfMonth(rule.open_day_of_month)} ·{" "}
                  {formatRuleWeekday(rule.open_day_of_week)} · {formatRuleTime(rule.open_time)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onStartEdit(rule)}
                  disabled={Boolean(draft)}
                  className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-xs font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(rule)}
                  disabled={isSavingRule}
                  className="rounded-lg border border-[#6b2d2d] bg-[#261313] px-3 py-2 text-xs font-medium text-[#ffb3b3] hover:bg-[#341818] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : courtId ? (
        <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-4 text-sm text-[#a7a7a7]">
          아직 등록된 예약 규칙이 없습니다.
        </p>
      ) : null}

      {draft ? (
        <div className="rounded-lg border border-[#335c43] bg-black p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              {editingRuleId ? "예약 규칙 수정" : "예약 규칙 추가"}
            </h4>
            <label className="flex items-center gap-2 text-xs text-[#cfcfcf]">
              <input
                type="checkbox"
                checked={draft.is_active !== false}
                onChange={(event) => onChange("is_active", event.target.checked)}
                className="custom-checkbox"
              />
              활성화
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <RuleDraftTextInput
              label="레이블"
              value={draft.label}
              onChange={(value) => onChange("label", value)}
              placeholder="예: 구민, 전체, 추첨"
            />
            <RuleDraftSelect
              label="자격"
              value={draft.eligibility}
              options={bookingRuleEligibilityOptions}
              onChange={(value) => onChange("eligibility", value)}
            />
            <RuleDraftSelect
              label="예약 규칙"
              value={draft.rule_type}
              options={bookingRuleTypeOptions}
              onChange={(value) => onChange("rule_type", value)}
            />
            {isBookingRuleDraftFieldVisible(draft, "open_type") ? (
              <RuleDraftSelect
                label="오픈 타입"
                value={draft.open_type}
                options={bookingRuleOpenTypeOptions}
                onChange={(value) => onChange("open_type", value)}
              />
            ) : null}
            {isBookingRuleDraftFieldVisible(draft, "open_day_of_month") ? (
              <RuleDraftTextInput
                label={stringifyValue(draft.open_type) === "week" ? "월 오픈 일자" : "오픈 일자"}
                value={draft.open_day_of_month}
                type="number"
                onChange={(value) => onChange("open_day_of_month", value)}
                placeholder={stringifyValue(draft.open_type) === "week" ? "예: 1 또는 -1" : "예: 13"}
              />
            ) : null}
            {isBookingRuleDraftFieldVisible(draft, "open_day_of_week") ? (
              <RuleDraftSelect
                label="오픈 요일"
                value={draft.open_day_of_week}
                options={bookingRuleWeekdayOptions}
                onChange={(value) => onChange("open_day_of_week", value)}
              />
            ) : null}
            {isBookingRuleDraftFieldVisible(draft, "open_ordinal") ? (
              <RuleDraftSelect
                label="예약 오픈 주차"
                value={draft.open_ordinal}
                options={bookingRuleOrdinalOptions}
                onChange={(value) => onChange("open_ordinal", value)}
              />
            ) : null}
            {isBookingRuleDraftFieldVisible(draft, "open_time") ? (
              <RuleDraftTextInput
                label="오픈 시간"
                value={draft.open_time}
                type="time"
                onChange={(value) => onChange("open_time", value)}
              />
            ) : null}
            {isBookingRuleDraftFieldVisible(draft, "open_offset") ? (
              <RuleDraftTextInput
                label="오픈되는 범위"
                value={draft.open_offset}
                onChange={(value) => onChange("open_offset", value)}
                placeholder={
                  stringifyValue(draft.rule_type) === "rolling" ? "예: 30" : "예: 다음달 또는 당월"
                }
              />
            ) : null}
            <RuleDraftTextInput
              label="정렬 순서"
              value={draft.sort_order}
              type="number"
              onChange={(value) => onChange("sort_order", value)}
            />
          </div>

          {isBookingRuleDraftFieldVisible(draft, "lottery_desc") ? (
            <label className="mt-3 flex flex-col gap-2">
              <span className="text-xs text-[#a7a7a7]">추첨 방식</span>
              <textarea
                value={stringifyValue(draft.lottery_desc)}
                onChange={(event) => onChange("lottery_desc", event.target.value)}
                className="min-h-[76px] w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                placeholder="추첨 방식 설명"
              />
            </label>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSavingRule}
              className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSavingRule}
              className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black hover:bg-[#3fcf6f] disabled:opacity-60"
            >
              {isSavingRule ? "저장 중..." : "규칙 저장"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BookingRulesPreview({ rules }: { rules: CourtBookingRule[] | null | undefined }) {
  const sortedRules = sortBookingRules(rules);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[#2f2f2f] bg-[#101010] p-3">
      <div className="flex items-start justify-between gap-3 border-b border-[#2f2f2f] pb-2">
        <div>
          <h3 className="text-sm font-semibold text-[#4ade80]">새 예약 규칙 테이블 미리보기</h3>
          <p className="mt-1 text-xs text-[#8c8c8c]">
            court_booking_rules에서 읽어온 값입니다. 현재는 비교/검증용이며 사용자 화면 계산에는 적용하지 않습니다.
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[#1c1c1c] px-2 py-1 text-xs text-[#a7a7a7]">
          {sortedRules.length}개
        </span>
      </div>

      {sortedRules.length === 0 ? (
        <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-4 text-sm text-[#a7a7a7]">
          이 테니스장에 연결된 새 예약 규칙이 없습니다.
        </p>
      ) : (
        <div className="grid gap-2">
          {sortedRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-lg border bg-black p-3 ${
                rule.is_active ? "border-[#2f2f2f]" : "border-[#4a2f2f] opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#12351f] px-2 py-1 text-xs font-semibold text-[#86efac]">
                    {formatRuleEligibility(rule.eligibility)}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {formatRuleDisplayText(rule.label) || "예약 규칙"}
                  </span>
                </div>
                <span className="text-xs text-[#777]">sort {rule.sort_order}</span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                <div>
                  <dt className="text-[#777]">규칙</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleType(rule.rule_type)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">오픈 타입</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleOpenType(rule.open_type)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">오픈 일자</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleDayOfMonth(rule.open_day_of_month)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">오픈 요일</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleWeekday(rule.open_day_of_week)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">오픈 주차</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleOrdinal(rule.open_ordinal)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">오픈 시간</dt>
                  <dd className="mt-1 text-[#cfcfcf]">{formatRuleTime(rule.open_time)}</dd>
                </div>
              </dl>

              {rule.open_offset || rule.lottery_desc ? (
                <div className="mt-3 grid gap-2 text-xs">
                  {rule.open_offset ? (
                    <p className="text-[#a7a7a7]">
                      <span className="text-[#777]">오픈되는 범위</span> {rule.open_offset}
                    </p>
                  ) : null}
                  {rule.lottery_desc ? (
                    <p className="text-[#a7a7a7]">
                      <span className="text-[#777]">추첨 방식</span> {rule.lottery_desc}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type BookingOpenComparisonItem = {
  key: string;
  label: string;
  result: NextOpenResult | null;
};

function isNormalRule(rule: CourtBookingRule) {
  return rule.eligibility === "normal" || rule.eligibility === "none";
}

function buildCourtFromBookingRule(baseCourt: Court, rule: CourtBookingRule): Court {
  const isNormal = isNormalRule(rule);

  return {
    ...baseCourt,
    booking_rule_type: rule.rule_type,
    booking_open_type: rule.open_type,
    booking_lottery_desc: rule.lottery_desc,
    booking_eligibility_first: isNormal ? null : rule.eligibility,
    booking_eligibility_second: isNormal ? rule.eligibility : null,
    booking_open_day_owner: isNormal ? null : rule.open_day_of_month,
    booking_open_time_owner: isNormal ? null : rule.open_time,
    booking_open_day_normal: isNormal ? rule.open_day_of_month : null,
    booking_open_time_normal: isNormal ? rule.open_time : null,
    booking_open_day_of_month:
      rule.rule_type === "fixed_schedule" && rule.open_type === "week"
        ? rule.open_day_of_month
        : baseCourt.booking_open_day_of_month,
    booking_open_day_of_week: rule.open_day_of_week,
    booking_open_ordinal: rule.open_ordinal,
    booking_open_offset: rule.open_offset,
  };
}

function formatComparisonOpen(result: NextOpenResult | null) {
  if (!result) return "계산 불가";
  return `${result.dateLabel} ${result.timeLabel}`;
}

function formatRuleCardText(rule: CourtBookingRule) {
  if (rule.rule_type === "phone") return "전화 예약";
  if (rule.rule_type === "on_site") return "현장 예약";
  if (rule.rule_type === "irregular") return "비정기 예약";
  if (rule.rule_type === "checking") return "예약 정보 확인 중";

  if (rule.rule_type === "lottery") {
    return rule.lottery_desc?.trim() || "추첨 방식 확인 필요";
  }

  if (rule.rule_type === "rolling") {
    const time = formatTime(rule.open_time);
    const offset = rule.open_offset?.trim();
    const openText = [time, offset ? `+${offset}일` : ""].filter(Boolean).join(", ");
    return openText ? `매일 ${openText} 예약 오픈` : "상시 예약";
  }

  const time = formatTime(rule.open_time);
  const offset = rule.open_offset?.trim();

  if (rule.open_type === "week") {
    const week = formatRuleDayOfMonth(rule.open_day_of_month);
    const weekday = formatRuleWeekday(rule.open_day_of_week);
    const ordinal = formatRuleOrdinal(rule.open_ordinal);
    const parts = [ordinal !== "-" ? ordinal : week !== "-" ? week : "", weekday !== "-" ? weekday : ""]
      .filter(Boolean)
      .join(" ");
    return [parts, time].filter(Boolean).join(" ") + `${offset ? `, ${offset}` : ""} 예약 오픈`;
  }

  const day = formatRuleDayOfMonth(rule.open_day_of_month);
  const openText = [day, time].filter(Boolean).join(" ");
  return `${openText}${offset ? `, ${offset}` : ""} 예약 오픈`.trim();
}

function groupRulesByOpenText(rules: CourtBookingRule[]) {
  const groups = new Map<string, CourtBookingRule[]>();

  for (const rule of rules) {
    const text = formatRuleCardText(rule);
    const current = groups.get(text) ?? [];
    current.push(rule);
    groups.set(text, current);
  }

  return Array.from(groups.entries()).map(([text, groupedRules]) => ({
    text,
    rules: groupedRules,
  }));
}

function BookingRulesCardBlock({
  rules,
  mode = "full",
  detailHref,
}: {
  rules: CourtBookingRule[];
  mode?: RulePreviewMode;
  detailHref?: string;
}) {
  if (rules.length === 0) {
    return <p className="font-semibold text-[#a7a7a7]">등록된 새 예약 규칙이 없습니다.</p>;
  }

  if (mode === "grouped") {
    return (
      <div className="grid gap-2">
        {groupRulesByOpenText(rules).map((group) => (
          <div key={group.text} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="flex flex-wrap gap-1">
              {group.rules.map((rule) => (
                <span
                  key={rule.id}
                  className="rounded bg-[#12351f] px-1.5 py-0.5 text-xs font-bold text-[#6FCF97]"
                >
                  {formatRuleEligibility(rule.eligibility)}
                </span>
              ))}
            </span>
            <span className="text-sm font-semibold text-white">{group.text}</span>
          </div>
        ))}
      </div>
    );
  }

  if (mode === "compact") {
    const visibleRules = rules.slice(0, 2);
    const hiddenCount = Math.max(rules.length - visibleRules.length, 0);

    return (
      <div className="grid gap-2">
        <p className="text-xs font-semibold text-[#a7a7a7]">
          예약 오픈 정보 {rules.length}개
        </p>
        {visibleRules.map((rule) => (
          <div key={rule.id} className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-sm font-bold text-[#6FCF97]">
              {formatRuleEligibility(rule.eligibility)} :
            </span>
            <span className="min-w-0 truncate text-sm font-semibold text-white">
              {formatRuleCardText(rule)}
            </span>
          </div>
        ))}
        {hiddenCount > 0 ? (
          detailHref ? (
            <a
              href={detailHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-xs font-semibold text-[#a7a7a7] underline decoration-[#5f5f5f] underline-offset-4 transition-colors hover:text-white"
            >
              +{hiddenCount} 상세페이지에서 확인
            </a>
          ) : (
            <span className="text-xs font-semibold text-[#a7a7a7]">
              +{hiddenCount} 상세페이지에서 확인
            </span>
          )
        ) : null}
      </div>
    );
  }

  return (
    <>
      {rules.map((rule) => (
        <p key={rule.id} className="break-words text-sm font-bold text-white">
          <span className="text-[#6FCF97]">
            {formatRuleEligibility(rule.eligibility)} :{" "}
          </span>
          <span className="font-semibold text-white">{formatRuleCardText(rule)}</span>
        </p>
      ))}
    </>
  );
}

function RuleBasedAdminPreviewContent({
  court,
  previewMode = "compact",
}: {
  court: Court;
  previewMode?: RulePreviewMode;
}) {
  const rules = sortBookingRules(court.court_booking_rules).filter((rule) => rule.is_active);
  const detailHref =
    court.slug || court.id !== "admin-preview" ? getCourtDetailPath(court) : undefined;

  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-xl font-semibold text-white">
          {court.basic_court_name ?? "(이름 없음)"}
        </span>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#2C2C2C] text-[#6FCF97]">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v17.1a.75.75 0 0 1-1.2.6L12 17.85l-4.8 3.6a.75.75 0 0 1-1.2-.6V3.75Z" />
          </svg>
        </div>
      </div>

      <div className="my-2 flex h-[112px] flex-col justify-center gap-2 rounded-md bg-[#2C2C2C] px-3 py-3.5 text-sm">
        <BookingRulesCardBlock rules={rules} mode={previewMode} detailHref={detailHref} />
      </div>

      {court.basic_address ? (
        <div className="flex min-w-0 items-center gap-0.5">
          <Image
            src="/icon/icon_map.svg"
            alt="지도"
            width={16}
            height={16}
            className="shrink-0"
          />
          <span className="mr-2 truncate text-sm font-light text-[#B0B0B0]">
            {court.basic_address}
          </span>
          <span className="shrink-0 text-sm font-light text-[#B0B0B0] underline">위치보기</span>
        </div>
      ) : null}

      <table className="w-full table-fixed">
        <thead>
          <tr>
            <th className={th}>구분</th>
            <th className={th}>실내</th>
            <th className={th}>실외</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdIcon}>
              <div className="flex justify-center">
                <Image src="/icon/icon_hard_court.svg" alt="하드코트" width={20} height={36} />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_hard_indoor)}</td>
            <td className={td}>{fmt(court.court_count_hard_outdoor)}</td>
          </tr>
          <tr>
            <td className={tdIcon}>
              <div className="flex justify-center">
                <Image src="/icon/icon_grass_court.svg" alt="잔디코트" width={20} height={36} />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_grass_indoor)}</td>
            <td className={td}>{fmt(court.court_count_grass_outdoor)}</td>
          </tr>
          <tr>
            <td className={tdIcon}>
              <div className="flex justify-center">
                <Image src="/icon/icon_clay_court.svg" alt="클레이코트" width={20} height={36} />
              </div>
            </td>
            <td className={td}>{fmt(court.court_count_clay_indoor)}</td>
            <td className={td}>{fmt(court.court_count_clay_outdoor)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex gap-2 text-sm">
        <div className="flex flex-1 items-center justify-center rounded bg-[#222222] px-3 py-2.5 font-normal text-white">
          상세보기
        </div>
        {court.booking_site_link ? (
          <div className="flex flex-1 items-center justify-center rounded bg-[#2C8B56] px-3 py-2.5 font-normal text-white">
            예약하러가기
          </div>
        ) : null}
      </div>
    </>
  );
}

function BookingOpenComparison({ form }: { form: CourtForm }) {
  if (!form.id) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-[#2f2f2f] bg-[#101010] p-3">
        <h3 className="text-sm font-semibold text-[#4ade80]">예약 오픈일 계산 비교</h3>
        <p className="text-sm text-[#a7a7a7]">
          저장된 테니스장을 선택하면 기존 컬럼과 새 예약 규칙 테이블의 계산 결과를 비교합니다.
        </p>
      </section>
    );
  }

  const court = toPreviewCourt(form);
  const priorityLabel = getPriorityBookingLabel(court);
  const oldItems: BookingOpenComparisonItem[] = [
    priorityLabel
      ? {
          key: "old-priority",
          label: priorityLabel,
          result: getNextOwnerBookingOpen(court),
        }
      : null,
    {
      key: "old-normal",
      label: "전체",
      result: getNextNormalBookingOpen(court),
    },
  ].filter((item): item is BookingOpenComparisonItem => Boolean(item && item.result));

  const newItems: BookingOpenComparisonItem[] = sortBookingRules(form.court_booking_rules)
    .filter((rule) => rule.is_active)
    .map((rule) => {
      const ruleCourt = buildCourtFromBookingRule(court, rule);
      const result = isNormalRule(rule)
        ? getNextNormalBookingOpen(ruleCourt)
        : getNextOwnerBookingOpen(ruleCourt);

      return {
        key: rule.id,
        label: formatRuleDisplayText(rule.label) || formatRuleEligibility(rule.eligibility),
        result,
      };
    });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[#2f2f2f] bg-[#101010] p-3">
      <div className="border-b border-[#2f2f2f] pb-2">
        <h3 className="text-sm font-semibold text-[#4ade80]">예약 오픈일 계산 비교</h3>
        <p className="mt-1 text-xs text-[#8c8c8c]">
          기존 booking_* 계산과 새 court_booking_rules 계산을 나란히 확인합니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
          <h4 className="text-xs font-semibold text-[#cfcfcf]">기존 booking_* 기준</h4>
          <div className="mt-3 grid gap-2">
            {oldItems.length === 0 ? (
              <p className="text-sm text-[#777]">계산 가능한 예약 오픈일이 없습니다.</p>
            ) : (
              oldItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="shrink-0 rounded-md bg-[#202020] px-2 py-1 text-xs text-[#86efac]">
                    {item.label}
                  </span>
                  <span className="text-right font-medium text-white">
                    {formatComparisonOpen(item.result)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
          <h4 className="text-xs font-semibold text-[#cfcfcf]">새 court_booking_rules 기준</h4>
          <div className="mt-3 grid gap-2">
            {newItems.length === 0 ? (
              <p className="text-sm text-[#777]">계산 가능한 새 예약 규칙이 없습니다.</p>
            ) : (
              newItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="shrink-0 rounded-md bg-[#202020] px-2 py-1 text-xs text-[#86efac]">
                    {item.label}
                  </span>
                  <span className="text-right font-medium text-white">
                    {formatComparisonOpen(item.result)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function toForm(court: Court): CourtForm {
  return { ...emptyForm, ...court };
}

function toPreviewCourt(form: CourtForm): Court {
  return {
    id: form.id ?? "admin-preview",
    basic_court_name: form.basic_court_name ?? "(이름 없음)",
    slug: form.slug ?? null,
    basic_owner_type: form.basic_owner_type ?? null,
    basic_address: form.basic_address ?? null,
    basic_map_link: form.basic_map_link ?? null,
    basic_latitude: numberOrNull(form.basic_latitude),
    basic_longitude: numberOrNull(form.basic_longitude),
    basic_region: form.basic_region ?? null,
    basic_city: form.basic_city ?? null,
    time_of_use_same: form.time_of_use_same ?? null,
    basic_time_of_use_weekday_from: form.basic_time_of_use_weekday_from ?? null,
    basic_time_of_use_weekday_to: form.basic_time_of_use_weekday_to ?? null,
    basic_time_of_use_weekend_from: form.basic_time_of_use_weekend_from ?? null,
    basic_time_of_use_weekend_to: form.basic_time_of_use_weekend_to ?? null,
    use_or_not: form.use_or_not ?? null,
    court_count_hard_indoor: form.court_count_hard_indoor ?? null,
    court_count_hard_outdoor: form.court_count_hard_outdoor ?? null,
    court_count_grass_indoor: form.court_count_grass_indoor ?? null,
    court_count_grass_outdoor: form.court_count_grass_outdoor ?? null,
    court_count_clay_indoor: form.court_count_clay_indoor ?? null,
    court_count_clay_outdoor: form.court_count_clay_outdoor ?? null,
    booking_site_link: form.booking_site_link ?? null,
    booking_reception_time: form.booking_reception_time ?? null,
    booking_rule_type: form.booking_rule_type ?? null,
    booking_lottery_desc: form.booking_lottery_desc ?? null,
    booking_open_type: form.booking_open_type ?? null,
    booking_eligibility_first: form.booking_eligibility_first ?? null,
    booking_eligibility_second: form.booking_eligibility_second ?? null,
    booking_open_day_of_month: numberOrNull(form.booking_open_day_of_month),
    booking_open_day_of_week: numberOrNull(form.booking_open_day_of_week),
    booking_open_ordinal: numberOrNull(form.booking_open_ordinal),
    booking_open_day_owner: numberOrNull(form.booking_open_day_owner),
    booking_open_time_owner: form.booking_open_time_owner ?? null,
    booking_open_day_normal: numberOrNull(form.booking_open_day_normal),
    booking_open_time_normal: form.booking_open_time_normal ?? null,
    booking_normal_iscurrentmonth: form.booking_normal_iscurrentmonth ?? null,
    booking_open_time_local: form.booking_open_time_local ?? null,
    booking_open_offset: form.booking_open_offset ?? null,
    booking_online_reserve_possible: form.booking_online_reserve_possible ?? null,
    booking_holiday_week: form.booking_holiday_week ?? null,
    booking_today_booking_possible: form.booking_today_booking_possible ?? null,
    booking_booking_provide: form.booking_booking_provide ?? null,
    etc_desc: form.etc_desc ?? null,
    court_booking_rules: form.court_booking_rules ?? [],
  };
}

function AdminCourtPreviewCard({ form }: { form: CourtForm }) {
  const court = toPreviewCourt(form);
  const hasNewBookingRules = sortBookingRules(court.court_booking_rules).some((rule) => rule.is_active);

  const content =
    hasNewBookingRules ? (
      <RuleBasedAdminPreviewContent court={court} previewMode="compact" />
    ) : court.booking_rule_type === "rolling" ? (
      <RollingContent court={court} />
    ) : court.booking_rule_type === "ordinal" ? (
      <OrdinalContent court={court} />
    ) : court.booking_rule_type === "lottery" ? (
      <LotteryContent court={court} />
    ) : court.booking_rule_type === "phone" ? (
      <PhoneContent court={court} />
    ) : court.booking_rule_type === "on_site" ? (
      <OnSiteContent court={court} />
    ) : court.booking_rule_type === "irregular" ? (
      <IrregularContent court={court} />
    ) : court.booking_rule_type === "checking" ? (
      <CheckingContent court={court} />
    ) : (
      <FixedScheduleContent court={court} />
    );

  return (
    <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
      <div className="pointer-events-none">
        <div className={previewCardClass}>{content}</div>
      </div>
    </div>
  );
}

function AdminCourtPreviewTestCard({
  form,
  previewMode,
}: {
  form: CourtForm;
  previewMode: RulePreviewMode;
}) {
  const court = toPreviewCourt(form);

  return (
    <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
      <div className={previewCardClass}>
        <RuleBasedAdminPreviewContent court={court} previewMode={previewMode} />
      </div>
    </div>
  );
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

  for (const key of sourceFieldKeys) {
    if (key in form) {
      payload[key] = form[key] ?? null;
    }
  }

  return payload;
}

export function AdminCourtManager() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(emptyForm);
  const [blogLinks, setBlogLinks] = useState<CourtBlogLinkDraft[]>(createEmptyBlogLinks);
  const [blogSeenUrls, setBlogSeenUrls] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState<CourtBookingRuleDraft | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<CourtSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingSeoulLinks, setIsSyncingSeoulLinks] = useState(false);
  const [isFetchingSeoulCandidate, setIsFetchingSeoulCandidate] = useState(false);
  const [isFetchingBlogs, setIsFetchingBlogs] = useState(false);
  const [fetchingBlogIndex, setFetchingBlogIndex] = useState<number | null>(null);
  const [isLoadingBlogLinks, setIsLoadingBlogLinks] = useState(false);
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [isFindingCoordinates, setIsFindingCoordinates] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportPickerOpen, setIsImportPickerOpen] = useState(false);
  const [isPreviewTestOpen, setIsPreviewTestOpen] = useState(false);
  const [previewTestMode, setPreviewTestMode] = useState<RulePreviewMode>("compact");
  const [importQuery, setImportQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCourt = useMemo(
    () => courts.find((court) => court.id === selectedId) ?? null,
    [courts, selectedId]
  );

  function isBookingFieldVisible(key: keyof Court) {
    if (legacyBookingRuleFieldKeys.has(key)) return false;

    if (commonBookingFieldKeys.has(key)) return true;

    return false;
  }

  const filteredCourts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const searchedCourts = keyword
      ? courts.filter((court) =>
          [
            court.basic_court_name,
            court.basic_region,
            court.basic_city,
            court.basic_address,
            court.slug,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword))
        )
      : courts;

    return [...searchedCourts].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const nameComparison = stringifyValue(a.basic_court_name).localeCompare(
        stringifyValue(b.basic_court_name),
        "ko"
      );

      if (sortKey === "updated_at") {
        const compared = dateTimeValue(a.updated_at) - dateTimeValue(b.updated_at);
        return compared === 0 ? nameComparison : compared * direction;
      }

      if (sortKey === "use_or_not") {
        const compared = Number(Boolean(a.use_or_not)) - Number(Boolean(b.use_or_not));
        return compared === 0 ? nameComparison : compared * direction;
      }

      return nameComparison * direction;
    });
  }, [courts, query, sortDirection, sortKey]);

  const importPickerCourts = useMemo(() => {
    const keyword = importQuery.trim().toLowerCase();

    return courts.filter((court) => {
      if (court.id === form.id) return false;
      if (!keyword) return true;

      return [
        court.basic_court_name,
        court.basic_region,
        court.basic_city,
        court.basic_address,
        court.slug,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [courts, form.id, importQuery]);

  function handleSort(nextSortKey: CourtSortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  function renderSortLabel(label: string, key: CourtSortKey) {
    if (sortKey !== key) return label;
    return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  async function loadCourts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts", { cache: "no-store" });
      const data = await readAdminResponse(response, "목록을 불러오지 못했습니다.");

      setCourts(data.courts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function syncSeoulLinks() {
    setIsSyncingSeoulLinks(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts/seoul-link-sync", {
        method: "POST",
      });
      const data = await readAdminResponse(response, "서울시 예약 링크를 동기화하지 못했습니다.");

      await loadCourts();
      setMessage(
        `서울시 예약 링크 동기화 완료: ${data.checkedCourts ?? 0}개 확인, ${data.updatedCourts ?? 0}개 업데이트`
      );
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "서울시 예약 링크를 동기화하지 못했습니다.");
    } finally {
      setIsSyncingSeoulLinks(false);
    }
  }

  function padBlogLinks(links: CourtBlogLinkDraft[]) {
    const nextLinks: CourtBlogLinkDraft[] = links.slice(0, 3).map((link, index) => ({
      ...link,
      sort_order: index,
    }));

    while (nextLinks.length < 3) {
      nextLinks.push(createEmptyBlogLinks()[nextLinks.length]);
    }

    return nextLinks;
  }

  function getBlogUrls(links: CourtBlogLinkDraft[]) {
    return links.map((link) => stringifyValue(link.url).trim()).filter(Boolean);
  }

  function rememberBlogUrls(links: CourtBlogLinkDraft[]) {
    const urls = getBlogUrls(links);
    setBlogSeenUrls((current) => Array.from(new Set([...current, ...urls])));
  }

  async function loadBlogLinks(courtId: string) {
    setIsLoadingBlogLinks(true);

    try {
      const response = await adminFetch(
        `/api/admin/courts/blog-links?courtId=${encodeURIComponent(courtId)}`,
        { cache: "no-store" }
      );
      const data = await readAdminResponse(response, "블로그 링크를 불러오지 못했습니다.");

      const loadedLinks = padBlogLinks(data.links ?? []);
      setBlogLinks(loadedLinks);
      setBlogSeenUrls(getBlogUrls(loadedLinks));
    } catch (blogError) {
      setBlogLinks(createEmptyBlogLinks());
      setBlogSeenUrls([]);
      setError(blogError instanceof Error ? blogError.message : "블로그 링크를 불러오지 못했습니다.");
    } finally {
      setIsLoadingBlogLinks(false);
    }
  }

  async function refreshBookingRules(courtId: string) {
    const response = await adminFetch(
      `/api/admin/courts/booking-rules?courtId=${encodeURIComponent(courtId)}`,
      { cache: "no-store" }
    );
    const data = await readAdminResponse(response, "예약 규칙을 불러오지 못했습니다.");
    const rules = sortBookingRules(data.rules ?? []);

    setForm((current) => ({ ...current, court_booking_rules: rules }));
    setCourts((current) =>
      current.map((court) =>
        court.id === courtId ? { ...court, court_booking_rules: rules } : court
      )
    );
    return rules;
  }

  function markCourtUpdatedAt(courtId: string, updatedAt = new Date().toISOString()) {
    setForm((current) =>
      stringifyValue(current.id) === courtId ? { ...current, updated_at: updatedAt } : current
    );
    setCourts((current) =>
      current.map((court) => (court.id === courtId ? { ...court, updated_at: updatedAt } : court))
    );
  }

  useEffect(() => {
    loadCourts();
  }, []);

  function selectCourt(court: Court) {
    setSelectedId(court.id);
    setForm(toForm(court));
    setBlogLinks(createEmptyBlogLinks());
    setBlogSeenUrls([]);
    setRuleDraft(null);
    setEditingRuleId(null);
    loadBlogLinks(court.id);
    setIsFormOpen(true);
    setMessage(null);
    setError(null);
  }

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setBlogLinks(createEmptyBlogLinks());
    setBlogSeenUrls([]);
    setRuleDraft(null);
    setEditingRuleId(null);
    setIsFormOpen(true);
    setMessage(null);
    setError(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setIsImportPickerOpen(false);
    setIsPreviewTestOpen(false);
    setRuleDraft(null);
    setEditingRuleId(null);
    setMessage(null);
    setError(null);
  }

  async function importCourtDetails(source: Court) {
    setForm((current) => {
      const currentCourtId = stringifyValue(current.id);
      const keep = {
        id: current.id,
        basic_court_name: current.basic_court_name,
        slug: current.slug,
        use_or_not: current.use_or_not,
        booking_site_link: current.booking_site_link,
      };
      const importedForm = toForm(source);

      return {
        ...importedForm,
        ...keep,
        court_booking_rules: cloneBookingRulesForImport(source.court_booking_rules, currentCourtId),
      };
    });
    setIsImportPickerOpen(false);
    setImportQuery("");
    setIsLoadingBlogLinks(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch(
        `/api/admin/courts/blog-links?courtId=${encodeURIComponent(source.id)}`,
        { cache: "no-store" }
      );
      const data = await readAdminResponse(response, "블로그 링크를 불러오지 못했습니다.");

      const importedBlogLinks = padBlogLinks(data.links ?? []);
      setBlogLinks(importedBlogLinks);
      setBlogSeenUrls(getBlogUrls(importedBlogLinks));
      setMessage(
        `${source.basic_court_name ?? "선택한 테니스장"}의 정보와 블로그글을 불러왔습니다.`
      );
    } catch (blogError) {
      setBlogLinks(createEmptyBlogLinks());
      setBlogSeenUrls([]);
      setError(
        blogError instanceof Error
          ? blogError.message
          : "블로그 링크를 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingBlogLinks(false);
    }
  }

  function startCreateBookingRule() {
    const nextSortOrder =
      sortBookingRules(form.court_booking_rules).reduce(
        (maxSortOrder, rule) => Math.max(maxSortOrder, rule.sort_order),
        0
      ) + 10;

    setEditingRuleId(null);
    setRuleDraft(createEmptyBookingRuleDraft(stringifyValue(form.id), nextSortOrder));
    setMessage(null);
    setError(null);
  }

  function startEditBookingRule(rule: CourtBookingRule) {
    setEditingRuleId(rule.id);
    setRuleDraft({
      ...rule,
      open_time: toTimeInputValue(rule.open_time),
    });
    setMessage(null);
    setError(null);
  }

function updateBookingRuleDraft(key: keyof CourtBookingRuleDraft, value: unknown) {
    setRuleDraft((current) => {
      if (!current) return current;

      if (key === "rule_type") {
        const ruleType = stringifyValue(value);
        const keepsSchedule = ruleType === "fixed_schedule" || ruleType === "ordinal";
        const keepsTime = keepsSchedule || ruleType === "rolling";

        return {
          ...current,
          rule_type: ruleType,
          open_type: keepsSchedule ? current.open_type || "day" : null,
          open_day_of_month: ruleType === "fixed_schedule" ? current.open_day_of_month : null,
          open_day_of_week: keepsSchedule ? current.open_day_of_week : null,
          open_ordinal: ruleType === "ordinal" ? current.open_ordinal : null,
          open_time: keepsTime ? current.open_time : null,
          open_offset:
            ruleType === "fixed_schedule" || ruleType === "rolling" || ruleType === "ordinal"
              ? current.open_offset
              : null,
          lottery_desc: ruleType === "lottery" ? current.lottery_desc : null,
        };
      }

      if (key === "open_type") {
        const openType = stringifyValue(value);

        return {
          ...current,
          open_type: openType,
          open_day_of_month:
            current.rule_type === "fixed_schedule" && (openType === "day" || openType === "week")
              ? current.open_day_of_month
              : null,
          open_day_of_week: openType === "week" ? current.open_day_of_week : null,
        };
      }

      if (key === "open_ordinal" && numberOrNull(value) === -2) {
        return { ...current, open_ordinal: value as number, open_day_of_week: null };
      }

      return { ...current, [key]: value };
    });
  }

  function cancelBookingRuleEdit() {
    setEditingRuleId(null);
    setRuleDraft(null);
  }

  async function saveBookingRule() {
    const courtId = stringifyValue(form.id);
    if (!ruleDraft) return;

    setIsSavingRule(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        ...normalizeBookingRuleForSave(ruleDraft),
        court_id: courtId || stringifyValue(ruleDraft.court_id),
      };

      if (!courtId) {
        const tempRule = {
          ...payload,
          id:
            editingRuleId ||
            createTempBookingRuleId(),
          court_id: "",
          is_active: payload.is_active !== false,
          sort_order: numberOrNull(payload.sort_order) ?? 0,
        } as CourtBookingRule;

        setForm((current) => {
          const currentRules = sortBookingRules(current.court_booking_rules);
          const nextRules = editingRuleId
            ? currentRules.map((rule) => (rule.id === editingRuleId ? tempRule : rule))
            : [...currentRules, tempRule];

          return { ...current, court_booking_rules: sortBookingRules(nextRules) };
        });
        setEditingRuleId(null);
        setRuleDraft(null);
        setMessage("예약 규칙을 임시로 저장했습니다. 테니스장을 저장하면 함께 저장됩니다.");
        return;
      }

      const response = await adminFetch("/api/admin/courts/booking-rules", {
        method: editingRuleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRuleId ? { ...payload, id: editingRuleId } : payload),
      });
      await readAdminResponse(response, "예약 규칙을 저장하지 못했습니다.");
      await refreshBookingRules(courtId);
      markCourtUpdatedAt(courtId);
      setEditingRuleId(null);
      setRuleDraft(null);
      setMessage("예약 규칙을 저장했습니다.");
    } catch (ruleError) {
      setError(ruleError instanceof Error ? ruleError.message : "예약 규칙을 저장하지 못했습니다.");
    } finally {
      setIsSavingRule(false);
    }
  }

  async function deleteBookingRule(rule: CourtBookingRule) {
    const courtId = stringifyValue(form.id);

    const ok = window.confirm(
      `${formatRuleDisplayText(rule.label) || formatRuleEligibility(rule.eligibility)} 규칙을 삭제할까요?`
    );
    if (!ok) return;

    if (!courtId || rule.id.startsWith(TEMP_BOOKING_RULE_ID_PREFIX)) {
      setForm((current) => ({
        ...current,
        court_booking_rules: sortBookingRules(current.court_booking_rules).filter(
          (currentRule) => currentRule.id !== rule.id
        ),
      }));
      if (editingRuleId === rule.id) {
        setEditingRuleId(null);
        setRuleDraft(null);
      }
      setMessage("임시 예약 규칙을 삭제했습니다.");
      return;
    }

    setIsSavingRule(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch(
        `/api/admin/courts/booking-rules?id=${encodeURIComponent(rule.id)}`,
        { method: "DELETE" }
      );
      await readAdminResponse(response, "예약 규칙을 삭제하지 못했습니다.");
      await refreshBookingRules(courtId);
      markCourtUpdatedAt(courtId);
      if (editingRuleId === rule.id) {
        setEditingRuleId(null);
        setRuleDraft(null);
      }
      setMessage("예약 규칙을 삭제했습니다.");
    } catch (ruleError) {
      setError(ruleError instanceof Error ? ruleError.message : "예약 규칙을 삭제하지 못했습니다.");
    } finally {
      setIsSavingRule(false);
    }
  }

  function updateField(key: keyof Court, value: unknown) {
    setForm((current): CourtForm => {
      if (key === "time_of_use_same") {
        const isSame = Boolean(value);

        return {
          ...current,
          time_of_use_same: isSame,
          basic_time_of_use_weekend_from: isSame
            ? current.basic_time_of_use_weekday_from
            : current.basic_time_of_use_weekend_from,
          basic_time_of_use_weekend_to: isSame
            ? current.basic_time_of_use_weekday_to
            : current.basic_time_of_use_weekend_to,
        };
      }

      if (
        key === "basic_time_of_use_weekday_from" &&
        current.time_of_use_same
      ) {
        return {
          ...current,
          basic_time_of_use_weekday_from: stringifyValue(value) || null,
          basic_time_of_use_weekend_from: stringifyValue(value) || null,
        };
      }

      if (
        key === "basic_time_of_use_weekday_to" &&
        current.time_of_use_same
      ) {
        return {
          ...current,
          basic_time_of_use_weekday_to: stringifyValue(value) || null,
          basic_time_of_use_weekend_to: stringifyValue(value) || null,
        };
      }

      if (
        key === "booking_eligibility_first" &&
        !hasPriorityEligibility(stringifyValue(value))
      ) {
        return {
          ...current,
          booking_eligibility_first: stringifyValue(value) || null,
          booking_open_day_owner: null,
          booking_open_time_owner: null,
        };
      }

      if (key === "booking_eligibility_second" && value !== "normal") {
        return {
          ...current,
          booking_eligibility_second: stringifyValue(value) || null,
          booking_open_day_normal: null,
          booking_open_time_normal: null,
        };
      }

      if (key === "booking_rule_type") {
        const ruleType = stringifyValue(value) || null;
        const keepsSchedule = ruleType === "fixed_schedule" || ruleType === "ordinal";
        const keepsRolling = ruleType === "rolling";
        const keepsLottery = ruleType === "lottery";

        return {
          ...current,
          booking_rule_type: ruleType,
          booking_lottery_desc: ruleType === "lottery" ? current.booking_lottery_desc : null,
          booking_open_type: keepsSchedule ? current.booking_open_type : null,
          booking_eligibility_first:
            keepsSchedule || keepsRolling || keepsLottery ? current.booking_eligibility_first : null,
          booking_eligibility_second:
            keepsSchedule || keepsRolling || keepsLottery ? current.booking_eligibility_second : null,
          booking_open_ordinal: ruleType === "ordinal" ? current.booking_open_ordinal : null,
          booking_open_day_of_month:
            ruleType === "fixed_schedule" ? current.booking_open_day_of_month : null,
          booking_open_day_of_week: keepsSchedule ? current.booking_open_day_of_week : null,
          booking_open_day_owner:
            ruleType === "fixed_schedule" ? current.booking_open_day_owner : null,
          booking_open_time_owner:
            keepsSchedule || keepsRolling || keepsLottery ? current.booking_open_time_owner : null,
          booking_open_day_normal:
            ruleType === "fixed_schedule" ? current.booking_open_day_normal : null,
          booking_open_time_normal:
            keepsSchedule || keepsRolling || keepsLottery ? current.booking_open_time_normal : null,
          booking_open_offset:
            ruleType === "fixed_schedule" || keepsRolling ? current.booking_open_offset : null,
          booking_normal_iscurrentmonth:
            ruleType === "fixed_schedule" ? current.booking_normal_iscurrentmonth : null,
        };
      }

      if (key === "booking_open_type") {
        const openType = stringifyValue(value) || null;

        return {
          ...current,
          booking_open_type: openType,
          booking_open_day_owner:
            openType === "day" ? current.booking_open_day_owner : null,
          booking_open_day_normal:
            openType === "day" ? current.booking_open_day_normal : null,
          booking_open_ordinal:
            current.booking_rule_type === "ordinal" ? current.booking_open_ordinal : null,
          booking_open_day_of_month:
            openType === "week" && current.booking_rule_type === "fixed_schedule"
              ? current.booking_open_day_of_month
              : null,
          booking_open_day_of_week:
            openType === "week" ? current.booking_open_day_of_week : null,
        };
      }

      return { ...current, [key]: value } as CourtForm;
    });
  }

  function openMapLink() {
    const mapLink = stringifyValue(form.basic_map_link).trim();
    if (!mapLink) return;

    window.open(mapLink, "_blank", "noopener,noreferrer");
  }

  function openReservationLink() {
    const reservationLink = stringifyValue(form.booking_site_link).trim();
    if (!reservationLink) return;

    window.open(reservationLink, "_blank", "noopener,noreferrer");
  }

  async function findCoordinates() {
    const address = stringifyValue(form.basic_address).trim();
    const name = stringifyValue(form.basic_court_name).trim();
    const mapLink = stringifyValue(form.basic_map_link).trim();

    if (!address && !name && !mapLink) {
      setError("주소, 테니스장명, 지도 링크 중 하나가 있어야 좌표를 찾을 수 있습니다.");
      return;
    }

    setIsFindingCoordinates(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, name, mapLink }),
      });
      const data = await readAdminResponse(response, "좌표를 찾지 못했습니다.");

      updateField("basic_latitude", String(data.lat));
      updateField("basic_longitude", String(data.lng));
      setMessage(`좌표를 찾았습니다. (${data.source ?? "geocode"})`);
    } catch (coordinateError) {
      setError(coordinateError instanceof Error ? coordinateError.message : "좌표를 찾지 못했습니다.");
    } finally {
      setIsFindingCoordinates(false);
    }
  }

  async function generateSlug() {
    const name = stringifyValue(form.basic_court_name).trim();
    const hasSavedSlug = Boolean(form.id && stringifyValue(form.slug).trim());
    if (!name || hasSavedSlug) return;

    setIsGeneratingSlug(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readAdminResponse(response, "slug를 생성하지 못했습니다.");

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
    setBlogLinks(createEmptyBlogLinks());
    setRuleDraft(null);
    setEditingRuleId(null);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts/seoul-candidate", {
        cache: "no-store",
      });
      const data = await readAdminResponse(response, "서울시 API 후보를 가져오지 못했습니다.");

      setForm({
        ...emptyForm,
        ...data.court,
        court_booking_rules: [createSeoulCandidateBookingRuleDraft()],
      });
      const range = data.meta?.apiRange ? ` API 구간 ${data.meta.apiRange}` : "";
      setMessage(`서울시 API에서 신규 후보 1건을 불러왔습니다.${range} 예약 규칙 확인 필요 항목을 함께 만들었습니다.`);
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

  function updateBlogLink(index: number, key: keyof CourtBlogLinkDraft, value: string) {
    setBlogLinks((current) =>
      padBlogLinks(current).map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value, sort_order: index } : link
      )
    );
  }

  function clearBlogLink(index: number) {
    setBlogLinks((current) =>
      padBlogLinks(current).map((link, linkIndex) =>
        linkIndex === index ? { ...createEmptyBlogLinks()[index], sort_order: index } : link
      )
    );
  }

  async function fetchBlogLinksFromNaver() {
    const courtName = stringifyValue(form.basic_court_name).trim();
    const region = stringifyValue(form.basic_region).trim();
    const city = stringifyValue(form.basic_city).trim();

    if (!courtName) {
      setError("테니스장명을 입력해야 블로그를 불러올 수 있습니다.");
      return;
    }

    setIsFetchingBlogs(true);
    setMessage(null);
    setError(null);

    try {
      const response = await adminFetch("/api/admin/courts/blog-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtName, region, city, count: 3 }),
      });
      const data = await readAdminResponse(response, "블로그를 불러오지 못했습니다.");
      const nextLinks = padBlogLinks(data.links ?? []);

      setBlogLinks(nextLinks);
      setBlogSeenUrls(getBlogUrls(nextLinks));
      setMessage(`네이버 블로그 검색 결과를 불러왔습니다. (${data.query ?? courtName})`);
    } catch (blogError) {
      setError(blogError instanceof Error ? blogError.message : "블로그를 불러오지 못했습니다.");
    } finally {
      setIsFetchingBlogs(false);
    }
  }

  async function fetchAlternativeBlogLink(index: number) {
    const courtName = stringifyValue(form.basic_court_name).trim();
    const region = stringifyValue(form.basic_region).trim();
    const city = stringifyValue(form.basic_city).trim();

    if (!courtName) {
      setError("테니스장명을 입력해야 다른 글을 불러올 수 있습니다.");
      return;
    }

    setFetchingBlogIndex(index);
    setMessage(null);
    setError(null);

    try {
      const excludeUrls = Array.from(new Set([...blogSeenUrls, ...getBlogUrls(blogLinks)]));
      const response = await adminFetch("/api/admin/courts/blog-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtName, region, city, excludeUrls, count: 1 }),
      });
      const data = await readAdminResponse(response, "다른 블로그 글을 불러오지 못했습니다.");
      const nextLink = data.links?.[0];

      if (!nextLink) {
        setError("더 이상 불러올 블로그 글을 찾지 못했습니다.");
        return;
      }

      setBlogLinks((current) =>
        padBlogLinks(current).map((link, linkIndex) =>
          linkIndex === index ? { ...nextLink, sort_order: index } : link
        )
      );
      rememberBlogUrls([nextLink]);
      setMessage(`블로그 ${index + 1}에 다른 글을 불러왔습니다.`);
    } catch (blogError) {
      setError(
        blogError instanceof Error ? blogError.message : "다른 블로그 글을 불러오지 못했습니다."
      );
    } finally {
      setFetchingBlogIndex(null);
    }
  }

  async function saveBlogLinksForCourt(courtId: string) {
    const response = await adminFetch("/api/admin/courts/blog-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courtId, links: blogLinks }),
    });
    const data = await readAdminResponse(response, "블로그 링크를 저장하지 못했습니다.");
    const savedLinks = padBlogLinks(data.links ?? []);

    setBlogLinks(savedLinks);
    rememberBlogUrls(savedLinks);
  }

  async function savePendingBookingRulesForCourt(courtId: string, rules: CourtBookingRule[] | null | undefined) {
    const pendingRules = sortBookingRules(rules).filter((rule) =>
      rule.id.startsWith(TEMP_BOOKING_RULE_ID_PREFIX)
    );

    for (const rule of pendingRules) {
      const response = await adminFetch("/api/admin/courts/booking-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizeBookingRuleForSave(rule),
          court_id: courtId,
        }),
      });
      await readAdminResponse(response, "예약 규칙을 저장하지 못했습니다.");
    }
  }

  async function deletePersistedBookingRulesForCourt(courtId: string) {
    const existingRules = sortBookingRules(
      courts.find((court) => court.id === courtId)?.court_booking_rules
    ).filter((rule) => !rule.id.startsWith(TEMP_BOOKING_RULE_ID_PREFIX));

    for (const rule of existingRules) {
      const response = await adminFetch(
        `/api/admin/courts/booking-rules?id=${encodeURIComponent(rule.id)}`,
        { method: "DELETE" }
      );
      await readAdminResponse(response, "기존 예약 규칙을 삭제하지 못했습니다.");
    }
  }

  async function saveCourt() {
    setMessage(null);
    setError(null);

    if (!stringifyValue(form.slug).trim()) {
      setError("상세페이지 slug를 생성해야 저장할 수 있습니다.");
      return;
    }

    setIsSaving(true);

    try {
      const isUpdate = Boolean(form.id);
      const response = await adminFetch("/api/admin/courts", {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeForSave(form)),
      });
      const data = await readAdminResponse(response, "저장하지 못했습니다.");

      const savedCourt = data.court as Court;
      await saveBlogLinksForCourt(savedCourt.id);
      const hadPendingRules =
        sortBookingRules(form.court_booking_rules).some((rule) =>
          rule.id.startsWith(TEMP_BOOKING_RULE_ID_PREFIX)
        );
      if (hadPendingRules) {
        if (isUpdate) {
          await deletePersistedBookingRulesForCourt(savedCourt.id);
        }
        await savePendingBookingRulesForCourt(savedCourt.id, form.court_booking_rules);
      }
      const savedRules = await refreshBookingRules(savedCourt.id);
      const savedCourtWithRules = {
        ...savedCourt,
        updated_at: hadPendingRules ? new Date().toISOString() : savedCourt.updated_at,
        court_booking_rules: savedRules,
      };
      setCourts((current) => {
        if (isUpdate) {
          return current.map((court) => (court.id === savedCourt.id ? savedCourtWithRules : court));
        }
        return [...current, savedCourtWithRules].sort((a, b) =>
          stringifyValue(a.basic_court_name).localeCompare(stringifyValue(b.basic_court_name), "ko")
        );
      });
      setSelectedId(savedCourtWithRules.id);
      setForm(toForm(savedCourtWithRules));
      setMessage(isUpdate ? "수정했습니다." : "추가했습니다.");
      setIsFormOpen(false);
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
      const response = await adminFetch(`/api/admin/courts?id=${encodeURIComponent(selectedCourt.id)}`, {
        method: "DELETE",
      });
      await readAdminResponse(response, "삭제하지 못했습니다.");

      setCourts((current) => current.filter((court) => court.id !== selectedCourt.id));
      setSelectedId(null);
      setForm(emptyForm);
      setIsFormOpen(false);
      setMessage("삭제했습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-4 border-b border-[#2c2c2c] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-[#a7a7a7]">courtinfo DB 관리</p>
            <h1 className="mt-2 text-3xl font-semibold">테니스장 목록</h1>
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
              onClick={syncSeoulLinks}
              disabled={isSyncingSeoulLinks}
              className="rounded-lg border border-[#2C8B56] bg-[#102217] px-4 py-2 text-sm font-medium text-[#b7f7cd] hover:bg-[#183824] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncingSeoulLinks ? "동기화 중..." : "서울시 링크 동기화"}
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg bg-[#4ade80] px-4 py-2 text-sm font-semibold text-black hover:bg-[#3fcf6f]"
            >
              새 테니스장 추가
            </button>
          </div>
        </section>

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

        <div>
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
                  <li className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_140px_82px] gap-3 border-b border-[#2f2f2f] bg-[#151515] px-4 py-2 text-sm font-semibold text-[#a7a7a7]">
                    <button
                      type="button"
                      onClick={() => handleSort("name")}
                      className="min-w-0 text-left hover:text-white"
                    >
                      {renderSortLabel("테니스장명", "name")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSort("updated_at")}
                      className="text-left hover:text-white"
                    >
                      {renderSortLabel("업데이트날짜", "updated_at")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSort("use_or_not")}
                      className="text-left hover:text-white"
                    >
                      {renderSortLabel("노출여부", "use_or_not")}
                    </button>
                  </li>
                  {filteredCourts.map((court) => (
                    <li key={court.id}>
                      <button
                        type="button"
                        onClick={() => selectCourt(court)}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_140px_82px] items-center gap-3 px-4 py-3 text-left hover:bg-[#202020] ${
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
                        <span className="text-sm text-[#cfcfcf]">
                          {formatDate(court.updated_at)}
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

          {isFormOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/75 px-4 py-6">
              <section className="relative flex max-h-[calc(100vh-48px)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#2f2f2f] bg-[#151515] shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#2f2f2f] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {form.id ? "테니스장 수정" : "테니스장 추가"}
                </h2>
                {form.id ? <p className="mt-1 text-xs text-[#8c8c8c]">{form.id}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!form.id ? (
                  <button
                    type="button"
                    onClick={fetchSeoulCandidate}
                    disabled={isFetchingSeoulCandidate}
                    className="rounded-lg border border-[#3c3c3c] bg-[#151515] px-4 py-2 text-sm font-medium text-white hover:bg-[#242424] disabled:opacity-60"
                  >
                    {isFetchingSeoulCandidate ? "불러오는 중..." : "서울시 신규 1건 불러오기"}
                  </button>
                ) : null}
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
                  onClick={closeForm}
                  className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportPickerOpen(true);
                    setImportQuery("");
                    setMessage(null);
                    setError(null);
                  }}
                  className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                >
                  정보 불러오기
                </button>
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

            {message ? (
              <div className="mx-4 mt-4 rounded-lg border border-[#23543a] bg-[#102217] px-4 py-3 text-sm text-[#b7f7cd]">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mx-4 mt-4 rounded-lg border border-[#533] bg-[#211] px-4 py-3 text-sm text-[#ffd6d6]">
                {error}
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
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

              <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <aside className="min-h-0 overflow-y-auto rounded-lg border border-[#2f2f2f] bg-[#111] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#4ade80]">메인 카드 미리보기</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8c8c8c]">
                        {form.use_or_not ? "노출 YES" : "노출 NO"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewTestOpen(true)}
                        className="rounded-md border border-[#3c3c3c] bg-[#202020] px-2 py-1 text-xs font-medium text-white hover:bg-[#2a2a2a]"
                      >
                        UI 테스트
                      </button>
                    </div>
                  </div>
                  <AdminCourtPreviewCard form={form} />
                </aside>

              <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="flex flex-col gap-6">
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
                      {group.title === "예약 정보" ? (
                        <BookingRulesEditor
                          courtId={form.id}
                          rules={form.court_booking_rules}
                          draft={ruleDraft}
                          editingRuleId={editingRuleId}
                          isSavingRule={isSavingRule}
                          onStartCreate={startCreateBookingRule}
                          onStartEdit={startEditBookingRule}
                          onDelete={deleteBookingRule}
                          onCancel={cancelBookingRuleEdit}
                          onSave={saveBookingRule}
                          onChange={updateBookingRuleDraft}
                        />
                      ) : null}
                      {group.fields.map((field) => {
                if (group.title === "예약 정보" && !isBookingFieldVisible(field.key)) {
                  return null;
                }

                const value = form[field.key];
                const isCourtCountField = courtCountFieldKeys.has(field.key);
                const showDbKey = group.title === "예약 정보";
                const hasSavedSlug = Boolean(form.id && stringifyValue(form.slug).trim());
                const isSlugField = field.key === "slug";
                const isDisabled =
                  (field.key === "basic_time_of_use_weekend_from" ||
                    field.key === "basic_time_of_use_weekend_to") &&
                  Boolean(form.time_of_use_same);
                const isInputDisabled = isDisabled || isSlugField;

                if (field.type === "textarea") {
                  return (
                    <label
                      key={field.key}
                      className={`grid w-full gap-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-start ${
                        isDisabled ? "opacity-45" : ""
                      }`}
                    >
                      <FieldLabel field={field} showDbKey={showDbKey} className="pt-2" />
                      <textarea
                        value={stringifyValue(value)}
                        disabled={isInputDisabled}
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
                      <FieldLabel field={field} showDbKey={showDbKey} />
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
                      <FieldLabel field={field} showDbKey={showDbKey} />
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
                    <FieldLabel field={field} showDbKey={showDbKey} />
                    <span
                      className={
                        field.key === "basic_map_link" ||
                        field.key === "basic_longitude" ||
                        field.key === "booking_site_link" ||
                        field.key === "slug"
                          ? "flex w-full min-w-0 gap-2"
                          : "block w-full min-w-0"
                      }
                    >
                      <input
                        type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
                        min={isCourtCountField ? 0 : undefined}
                        placeholder={field.placeholder}
                        value={stringifyValue(value)}
                        disabled={isInputDisabled}
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
                        <>
                        <button
                          type="button"
                          onClick={openMapLink}
                          disabled={!stringifyValue(form.basic_map_link).trim()}
                          className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          지도
                        </button>
                        <button
                          type="button"
                          onClick={findCoordinates}
                          disabled={
                            isFindingCoordinates ||
                            (!stringifyValue(form.basic_address).trim() &&
                              !stringifyValue(form.basic_court_name).trim() &&
                              !stringifyValue(form.basic_map_link).trim())
                          }
                          className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isFindingCoordinates ? "찾는 중" : "좌표 찾기"}
                        </button>
                        </>
                      ) : null}
                      {field.key === "booking_site_link" ? (
                        <button
                          type="button"
                          onClick={openReservationLink}
                          disabled={!stringifyValue(form.booking_site_link).trim()}
                          className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          이동
                        </button>
                      ) : null}
                      {field.key === "slug" ? (
                        <button
                          type="button"
                          onClick={generateSlug}
                          disabled={
                            hasSavedSlug ||
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
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#2f2f2f] pb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#4ade80]">블로그 정보</h3>
                    <p className="mt-1 text-xs text-[#8c8c8c]">
                      상세페이지에 노출할 후기 링크를 최대 3개까지 저장합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchBlogLinksFromNaver}
                    disabled={isFetchingBlogs || !stringifyValue(form.basic_court_name).trim()}
                    className="shrink-0 rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isFetchingBlogs ? "불러오는 중..." : "블로그 불러오기"}
                  </button>
                </div>
                {isLoadingBlogLinks ? (
                  <p className="rounded-lg border border-[#2f2f2f] bg-black px-3 py-4 text-sm text-[#a7a7a7]">
                    블로그 링크를 불러오는 중...
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {padBlogLinks(blogLinks).map((link, index) => (
                      <div
                        key={index}
                        className="grid gap-3 rounded-lg border border-[#2f2f2f] bg-black p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-[#cfcfcf]">
                            블로그 {index + 1}
                          </span>
                          <div className="flex shrink-0 gap-2">
                          {[
                            link.url,
                            link.title,
                            link.description,
                            link.thumbnail_url,
                            link.source,
                          ].some((value) => stringifyValue(value).trim()) ? (
                            <button
                              type="button"
                              onClick={() => clearBlogLink(index)}
                              className="rounded-lg border border-[#5a2d2d] bg-[#241313] px-3 py-1.5 text-xs font-medium text-[#ffb3b3] hover:bg-[#341818]"
                            >
                              삭제
                            </button>
                          ) : null}
                          {link.url ? (
                            <button
                              type="button"
                              onClick={() => window.open(stringifyValue(link.url), "_blank", "noopener,noreferrer")}
                              className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a2a2a]"
                            >
                              열기
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => fetchAlternativeBlogLink(index)}
                            disabled={
                              fetchingBlogIndex === index ||
                              isFetchingBlogs ||
                              !stringifyValue(form.basic_court_name).trim()
                            }
                            className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {fetchingBlogIndex === index ? "불러오는 중..." : "다른 글 불러오기"}
                          </button>
                          </div>
                        </div>
                        <label className="grid gap-2">
                          <span className="text-xs text-[#a7a7a7]">URL</span>
                          <input
                            value={stringifyValue(link.url)}
                            onChange={(event) => updateBlogLink(index, "url", event.target.value)}
                            className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                            placeholder="https://..."
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs text-[#a7a7a7]">제목</span>
                          <input
                            value={stringifyValue(link.title)}
                            onChange={(event) => updateBlogLink(index, "title", event.target.value)}
                            className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs text-[#a7a7a7]">설명</span>
                          <textarea
                            value={stringifyValue(link.description)}
                            onChange={(event) =>
                              updateBlogLink(index, "description", event.target.value)
                            }
                            rows={2}
                            className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="grid gap-2">
                            <span className="text-xs text-[#a7a7a7]">썸네일 URL</span>
                            <input
                              value={stringifyValue(link.thumbnail_url)}
                              onChange={(event) =>
                                updateBlogLink(index, "thumbnail_url", event.target.value)
                              }
                              className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                            />
                          </label>
                          <label className="grid gap-2">
                            <span className="text-xs text-[#a7a7a7]">출처</span>
                            <input
                              value={stringifyValue(link.source)}
                              onChange={(event) => updateBlogLink(index, "source", event.target.value)}
                              className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
                  </div>
                </div>
              </div>
            </div>
            {isPreviewTestOpen ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 px-4">
                <section className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#2f2f2f] bg-[#151515] shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-[#2f2f2f] p-4">
                    <div>
                      <h3 className="text-lg font-semibold">메인 카드 UI 테스트</h3>
                      <p className="mt-1 text-xs text-[#8c8c8c]">
                        저장과 무관하게 현재 입력값과 새 예약 규칙 표시 방식을 크게 확인합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPreviewTestOpen(false)}
                      className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="overflow-y-auto p-5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(Object.keys(rulePreviewModeLabels) as RulePreviewMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPreviewTestMode(mode)}
                          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            previewTestMode === mode
                              ? "bg-[#4ade80] text-black"
                              : "bg-[#202020] text-[#a7a7a7] hover:text-white"
                          }`}
                        >
                          {rulePreviewModeLabels[mode]}
                        </button>
                      ))}
                    </div>

                    <AdminCourtPreviewTestCard form={form} previewMode={previewTestMode} />

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
                        <h4 className="text-sm font-semibold text-white">전체형</h4>
                        <p className="mt-2 text-xs leading-relaxed text-[#a7a7a7]">
                          규칙을 모두 보여줘서 누락이 없습니다. 3개까지는 명확하지만, 4개 이상부터
                          카드 높이가 커집니다.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#2C8B56] bg-[#07140c] p-3">
                        <h4 className="text-sm font-semibold text-[#86efac]">묶음형 추천</h4>
                        <p className="mt-2 text-xs leading-relaxed text-[#a7a7a7]">
                          같은 오픈 시각을 구민/시민/주민/전체 태그로 묶습니다. 우선순위가 여러
                          개인 4~6개 규칙에서 가장 덜 답답합니다.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#2f2f2f] bg-black p-3">
                        <h4 className="text-sm font-semibold text-white">압축형</h4>
                        <p className="mt-2 text-xs leading-relaxed text-[#a7a7a7]">
                          카드 높이를 가장 잘 지킵니다. 대신 일부 규칙은 +N개로 숨겨져 상세페이지나
                          별도 펼침이 필요합니다.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-[#2f2f2f] bg-black p-3 text-xs leading-relaxed text-[#a7a7a7]">
                      6건처럼 구민, 시민, 전체가 여러 회차로 나뉘는 경우는 “자격별 6줄”보다
                      “같은 날짜/시간끼리 묶음”이 더 좋아 보입니다. 예를 들면 1차 오픈 행에
                      구민/시민 태그를 붙이고, 2차 오픈 행에 전체 태그를 붙이는 방식입니다.
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
            {isImportPickerOpen ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-4">
                <section className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#2f2f2f] bg-[#151515] shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-[#2f2f2f] p-4">
                    <div>
                      <h3 className="text-lg font-semibold">정보 불러오기</h3>
                      <p className="mt-1 text-xs text-[#8c8c8c]">
                        테니스장명과 slug는 유지하고 나머지 정보만 가져옵니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsImportPickerOpen(false)}
                      className="rounded-lg border border-[#3c3c3c] bg-[#202020] px-3 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="border-b border-[#2f2f2f] p-4">
                    <input
                      value={importQuery}
                      onChange={(event) => setImportQuery(event.target.value)}
                      className="w-full min-w-0 rounded-lg border border-[#3c3c3c] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#4ade80]"
                      placeholder="이름, 지역, 주소, slug 검색"
                    />
                  </div>
                  <div className="overflow-y-auto">
                    {importPickerCourts.length === 0 ? (
                      <p className="p-4 text-sm text-[#a7a7a7]">불러올 테니스장이 없습니다.</p>
                    ) : (
                      <ul className="divide-y divide-[#2f2f2f]">
                        {importPickerCourts.map((court) => (
                          <li key={court.id}>
                            <button
                              type="button"
                              onClick={() => importCourtDetails(court)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#202020]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-white">
                                  {court.basic_court_name ?? "이름 없음"}
                                </span>
                                <span className="mt-1 block truncate text-xs text-[#a7a7a7]">
                                  {[court.basic_region, court.basic_city, court.basic_address]
                                    .filter(Boolean)
                                    .join(" · ")}
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
              </div>
            ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </div>
  );
}
