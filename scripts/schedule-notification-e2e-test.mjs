import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { createClient } = require("@supabase/supabase-js");

const delayArg = process.argv.find((value) => value.startsWith("--delay-minutes="));
const delayMinutes = Number(delayArg?.split("=")[1] ?? 2);
if (!Number.isInteger(delayMinutes) || delayMinutes < 1 || delayMinutes > 10) {
  throw new Error("--delay-minutes는 1~10 사이의 정수여야 합니다.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase 서버 환경변수가 필요합니다.");
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: subscriptions, error: subscriptionError } = await db
  .from("notification_subscriptions")
  .select("id,user_id,booking_rule_id,created_at")
  .eq("is_enabled", true)
  .order("created_at", { ascending: false });
if (subscriptionError) throw subscriptionError;
if (!subscriptions?.length) throw new Error("활성 알림 구독이 없습니다.");

let selected = null;
let selectedTokens = [];
for (const subscription of subscriptions) {
  const { data: tokens, error } = await db.from("device_push_tokens")
    .select("id").eq("user_id", subscription.user_id).eq("is_enabled", true).limit(10);
  if (error) throw error;
  if (tokens?.length) {
    selected = subscription;
    selectedTokens = tokens;
    break;
  }
}
if (!selected || !selectedTokens.length) throw new Error("활성 기기가 연결된 알림 구독이 없습니다.");

const recentCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
const { count, error: recentError } = await db.from("notification_scheduled_test_jobs")
  .select("id", { count: "exact", head: true })
  .eq("subscription_id", selected.id).gte("created_at", recentCutoff);
if (recentError) throw recentError;
if ((count ?? 0) > 0) throw new Error("이 구독은 최근 10분 안에 자동 발송 테스트를 실행했습니다.");

const scheduledFor = new Date(Date.now() + delayMinutes * 60_000).toISOString();
const jobs = selectedTokens.map((token) => ({
  subscription_id: selected.id,
  device_push_token_id: token.id,
  scheduled_for: scheduledFor,
}));
const { data: inserted, error: insertError } = await db
  .from("notification_scheduled_test_jobs").insert(jobs).select("id");
if (insertError) throw insertError;

const { data: rule, error: ruleError } = await db.from("court_booking_rules")
  .select("court_id").eq("id", selected.booking_rule_id).single();
if (ruleError) throw ruleError;
const { data: court, error: courtError } = await db.from("courtinfo")
  .select("basic_court_name").eq("id", rule.court_id).single();
if (courtError) throw courtError;

console.log(JSON.stringify({
  scheduled: inserted?.length ?? 0,
  court: court.basic_court_name,
  scheduledFor,
  delayMinutes,
}, null, 2));
