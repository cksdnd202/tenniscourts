import { expoRequest, servicePushMessage, type ExpoResult } from "@/lib/expoPush";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const EXPO_BATCH_SIZE = 100;

type PushTokenRow = { id: string; expo_push_token: string };

async function disableInvalidTokens(
  tokens: PushTokenRow[],
  results: ExpoResult[]
) {
  const db = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  const invalidIds = results.flatMap((result, index) =>
    result?.details?.error === "DeviceNotRegistered" && tokens[index]?.id
      ? [tokens[index].id]
      : []
  );
  if (!invalidIds.length) return;
  const { error } = await db.from("device_push_tokens").update({
    is_enabled: false,
    disabled_at: timestamp,
    updated_at: timestamp,
  }).in("id", invalidIds);
  if (error) throw error;
}

export async function sendInquiryReplyPush(input: {
  userId: string;
  inquiryId: string;
  replyId: string;
  inquiryTitle: string;
}) {
  const db = getSupabaseAdmin();
  const [{ data: notification, error: notificationError }, { data: tokens, error: tokenError }] = await Promise.all([
    db.from("app_notifications")
      .select("id,title,body,path")
      .eq("source_key", `inquiry_reply:${input.replyId}`)
      .maybeSingle(),
    db.from("device_push_tokens")
      .select("id,expo_push_token")
      .eq("user_id", input.userId)
      .eq("is_enabled", true),
  ]);
  if (notificationError) throw notificationError;
  if (tokenError) throw tokenError;
  if (!notification || !tokens?.length) return { attempted: 0, accepted: 0 };

  let accepted = 0;
  for (let index = 0; index < tokens.length; index += EXPO_BATCH_SIZE) {
    const batch = tokens.slice(index, index + EXPO_BATCH_SIZE);
    const results = await expoRequest<ExpoResult[]>("send", batch.map((token) => servicePushMessage({
      token: token.expo_push_token,
      title: notification.title,
      body: input.inquiryTitle,
      path: notification.path,
      type: "inquiry_reply",
      notificationId: notification.id,
    })));

    for (let itemIndex = 0; itemIndex < results.length; itemIndex += 1) {
      const result = results[itemIndex];
      const token = batch[itemIndex];
      if (result?.status === "ok") {
        accepted += 1;
        continue;
      }
      void token;
    }
    await disableInvalidTokens(batch, results);
  }

  return { attempted: tokens.length, accepted };
}

export async function dispatchPendingNoticePushes() {
  const db = getSupabaseAdmin();
  const now = new Date();
  const staleClaim = new Date(now.getTime() - 15 * 60_000).toISOString();
  const { data: notices, error } = await db.from("notices")
    .select("id,title,body,published_at")
    .eq("status", "published")
    .contains("channels", ["app"])
    .not("push_requested_at", "is", null)
    .is("push_sent_at", null)
    .is("push_error", null)
    .or(`published_at.is.null,published_at.lte.${now.toISOString()}`)
    .or(`publish_ends_at.is.null,publish_ends_at.gt.${now.toISOString()}`)
    .or(`push_started_at.is.null,push_started_at.lt.${staleClaim}`)
    .order("push_requested_at")
    .limit(3);
  if (error) throw error;

  let processed = 0;
  let attempted = 0;
  let accepted = 0;
  for (const notice of notices ?? []) {
    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await db.from("notices")
      .update({ push_started_at: claimedAt })
      .eq("id", notice.id)
      .is("push_sent_at", null)
      .is("push_error", null)
      .or(`push_started_at.is.null,push_started_at.lt.${staleClaim}`)
      .select("id");
    if (claimError) throw claimError;
    if (!claimed?.length) continue;

    try {
      const [{ data: notification, error: notificationError }, { data: tokens, error: tokenError }] = await Promise.all([
        db.from("app_notifications").select("id,path").eq("source_key", `notice:${notice.id}`).single(),
        db.from("device_push_tokens").select("id,expo_push_token").eq("is_enabled", true),
      ]);
      if (notificationError) throw notificationError;
      if (tokenError) throw tokenError;

      for (let index = 0; index < (tokens?.length ?? 0); index += EXPO_BATCH_SIZE) {
        const batch = (tokens ?? []).slice(index, index + EXPO_BATCH_SIZE) as PushTokenRow[];
        const results = await expoRequest<ExpoResult[]>("send", batch.map((token) => servicePushMessage({
          token: token.expo_push_token,
          title: notice.title,
          body: notice.body.slice(0, 180),
          path: notification.path,
          type: "notice",
          notificationId: notification.id,
        })));
        attempted += batch.length;
        accepted += results.filter((result) => result.status === "ok").length;
        await disableInvalidTokens(batch, results);
      }

      const { error: sentError } = await db.from("notices").update({
        push_sent_at: new Date().toISOString(),
        push_error: null,
      }).eq("id", notice.id).eq("push_started_at", claimedAt);
      if (sentError) throw sentError;
      processed += 1;
    } catch (dispatchError) {
      const { error: updateError } = await db.from("notices").update({
        // Do not retry an ambiguous provider response automatically. An admin
        // can explicitly request a retry after reviewing the failure.
        push_error: dispatchError instanceof Error ? dispatchError.message.slice(0, 500) : "unknown",
      }).eq("id", notice.id).eq("push_started_at", claimedAt);
      if (updateError) throw updateError;
    }
  }

  return { noticesProcessed: processed, noticePushAttempted: attempted, noticePushAccepted: accepted };
}
