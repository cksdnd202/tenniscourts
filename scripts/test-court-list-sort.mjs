import assert from "node:assert/strict";
import { compareCourtsByBookingAndRecent, hasCourtBookingInformation } from "../src/lib/courtListSort.ts";

const rule = (rule_type, is_active = true) => ({ rule_type, is_active });
const court = (id, created_at, extra = {}) => ({ id, created_at, basic_court_name: id, booking_rule_type: null, ...extra });

for (const sport_type of ["tennis", "badminton", "basketball"]) {
  const rows = [
    court("unknown-new", "2026-11-27", { court_booking_rules: [rule(null)] }),
    court("known-old", "2026-01-01", { court_booking_rules: [rule("rolling")] }),
    court("unknown-old", "2026-02-01", { booking_rule_type: "checking" }),
    court("mixed-new", "2026-11-26", { court_booking_rules: [rule(null), rule("phone")] }),
    court("known-new", "2026-11-25", { booking_rule_type: "outdoor_open" }),
  ].map((row) => ({ ...row, sport_type }));
  assert.deepEqual([...rows].sort(compareCourtsByBookingAndRecent).map((row) => row.id),
    ["mixed-new", "known-new", "known-old", "unknown-new", "unknown-old"], sport_type);
}
assert.equal(hasCourtBookingInformation(court("stale", null, {booking_rule_type:"rolling",court_booking_rules:[rule("checking")]})),false);
assert.equal(hasCourtBookingInformation(court("inactive", null, {court_booking_rules:[rule("rolling",false)]})),false);
assert.equal(hasCourtBookingInformation(court("legacy", null, {booking_rule_type:"phone",court_booking_rules:[rule(null,false)]})),true);
assert.equal(hasCourtBookingInformation(court("link-only", null, {booking_site_link:"https://example.com"})),false);
for (const booking_rule_type of ["phone","on_site","outdoor_open","lottery","irregular","monthly_relative"]) {
  assert.equal(hasCourtBookingInformation(court("known", null, {booking_rule_type})),true);
}
const missingDate = [court("나", "invalid"),court("가", null)];
assert.deepEqual(missingDate.sort(compareCourtsByBookingAndRecent).map((row)=>row.id),["가","나"]);
console.log("PASS: 세 종목 정보 우선·그룹 내 최신순, 혼합/미입력/비활성/기존 필드, 날짜 누락");
