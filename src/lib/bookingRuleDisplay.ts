import type { CourtBookingRule } from "@/app/types";

const eligibilityLabels: Record<string, string> = {
  resident: "구민", citizen: "시민", inhabitant: "주민",
  normal: "누구나", non_resident: "타지역", none: "없음",
};

export function getBookingRuleCondition(rule: CourtBookingRule): string {
  // Empty string explicitly clears a legacy condition; undefined/null supports pre-migration rows.
  if (typeof rule.target_condition === "string") return rule.target_condition.trim();
  const label = rule.label?.trim() ?? "";
  if (!/팀|소속|클럽|동호회/.test(label)) return "";
  return label.replace(/^(구민|시민|주민|관내)[,·\s]+/, "")
    .replace(/\s*(우선|정규대관)$/, "").trim();
}

export function getBookingRuleTargetText(rule: CourtBookingRule): string {
  const key = rule.eligibility?.trim() || "";
  const eligibility = key ? eligibilityLabels[key] ?? key : "대상 미확인";
  const condition = getBookingRuleCondition(rule);
  if (condition && (key === "none" || /소속.*클럽/.test(condition))) return condition;
  return condition ? `${eligibility} · ${condition}` : eligibility;
}

export function getBookingRuleDisplayContext(rule: CourtBookingRule): string[] {
  const round = rule.booking_round_label?.trim();
  const legacyLabel = rule.label?.trim() ?? "";
  const explicitPhase = (round && !/\d{1,2}:\d{2}|요일|\d+일.*오픈/.test(round) ? round : round?.match(/\d+차(?:\s*예약)?/)?.[0])
    || legacyLabel.match(/^\d+차(?:\s*예약)?$/)?.[0];
  const method = /추첨/.test(legacyLabel) || rule.rule_type === "lottery" ? "추첨 예약"
    : /정규대관/.test(legacyLabel) ? "정규대관"
    : /수시대관/.test(legacyLabel) ? "수시대관"
    : /취소분/.test(legacyLabel) ? "취소분 추가접수"
    : /잔여분/.test(legacyLabel) ? legacyLabel
    : /선착순/.test(legacyLabel) ? "선착순 예약" : "";
  return [...new Set([explicitPhase, method, rule.usage_period_label?.trim()].filter((v): v is string => Boolean(v)))];
}

export function getBookingMethodLabel(ruleType: string | null | undefined): string | null {
  if (ruleType === "on_site") return "현장 예약";
  if (ruleType === "phone") return "전화 예약";
  if (ruleType === "outdoor_open") return "실외 개방";
  return null;
}
