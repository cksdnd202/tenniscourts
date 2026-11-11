import assert from "node:assert/strict";
import { getBookingRuleCondition, getBookingRuleTargetText, getBookingRuleDisplayContext, getBookingMethodLabel } from "../src/lib/bookingRuleDisplay.ts";

const rule = (values) => ({ eligibility: "resident", label: "구민 예약", ...values });
assert.equal(getBookingRuleTargetText(rule({ target_condition: " 3인 이상 팀 " })), "구민 · 3인 이상 팀");
assert.equal(getBookingRuleTargetText(rule({ target_condition: "2인 이상 팀" })), "구민 · 2인 이상 팀");
assert.equal(getBookingRuleTargetText(rule({ eligibility: "normal", target_condition: "" })), "누구나");
assert.equal(getBookingRuleTargetText(rule({ label: "구민, 3인 이상 팀" })), "구민 · 3인 이상 팀");
assert.equal(getBookingRuleCondition(rule({ label: "구민, 3인 이상 팀", target_condition: "" })), "");
assert.equal(getBookingRuleTargetText(rule({ label: "도봉구 테니스연합 소속 클럽 우선" })), "도봉구 테니스연합 소속 클럽");
assert.equal(getBookingRuleTargetText(rule({ eligibility: "none", target_condition: "등록 클럽" })), "등록 클럽");
assert.equal(getBookingRuleTargetText(rule({ eligibility: "citizen", target_condition: "팀" })), "시민 · 팀");
assert.deepEqual(getBookingRuleDisplayContext(rule({ label: "1차 예약" })), ["1차 예약"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ label: "2차 예약" })), ["2차 예약"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ booking_round_label: "우선 접수" })), ["우선 접수"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ label: "추첨 전체 예약", rule_type: "lottery" })), ["추첨 예약"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ label: "잔여분 실시간" })), ["잔여분 실시간"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ label: "관내 팀 정규대관", usage_period_label: "익월 이용분" })), ["정규대관", "익월 이용분"]);
assert.deepEqual(getBookingRuleDisplayContext(rule({ booking_round_label: "전월 20일 17:00 오픈", usage_period_label: "다음 달 1~15일 이용분" })), ["다음 달 1~15일 이용분"]);
for (const sort_order of [10, 20, 30]) assert.deepEqual(getBookingRuleDisplayContext(rule({ sort_order })), []);
console.log("예약 규칙 표시 테스트 통과");

for (const eligibility of [null, undefined, "", "   "]) {
  assert.equal(getBookingRuleTargetText(rule({ eligibility, label: null })), "대상 미확인");
}
assert.equal(getBookingRuleTargetText(rule({ eligibility: null, label: null, target_condition: "2인 이상" })), "대상 미확인 · 2인 이상");
assert.equal(getBookingMethodLabel("on_site"), "현장 예약");
assert.equal(getBookingMethodLabel("phone"), "전화 예약");
assert.equal(getBookingMethodLabel("outdoor_open"), "실외 개방");
assert.equal(getBookingMethodLabel("checking"), null);
assert.equal(getBookingMethodLabel("fixed_schedule"), null);
