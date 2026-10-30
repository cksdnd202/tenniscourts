export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: {
    path: string;
    type: "booking_open" | "notice" | "inquiry_reply";
    notificationId?: string;
    deliveryId?: string;
    bookingRuleId?: string;
  };
  richContent: { image: string };
  sound: "default";
  channelId: "default";
  priority?: "high";
  ttl: number;
};

export type ExpoResult = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

export async function expoRequest<T>(operation: "send" | "getReceipts", body: unknown): Promise<T> {
  const response = await fetch(`https://exp.host/--/api/v2/push/${operation}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
  const payload = await response.json() as { data?: T; errors?: unknown[] };
  if (!payload.data || payload.errors?.length) throw new Error("Expo 푸시 응답을 확인하지 못했습니다.");
  return payload.data;
}

export function bookingPushMessage(input: {
  token: string; courtName: string; slug: string; ruleId: string;
  opensAt: string; leadMinutes: number; deliveryId?: string; test?: boolean;
  eligibility?: string | null; targetCondition?: string | null;
}): ExpoMessage {
  const timeParts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(new Date(input.opensAt));
  const dayPeriod = timeParts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const hour = timeParts.find((part) => part.type === "hour")?.value ?? "";
  const minute = timeParts.find((part) => part.type === "minute")?.value ?? "00";
  const openTime = minute === "00"
    ? `${dayPeriod} ${hour}시`
    : `${dayPeriod} ${hour}시 ${minute}분`;
  const eligibilityLabels: Record<string, string> = {
    resident: "구민",
    citizen: "시민",
    inhabitant: "주민",
    normal: "누구나",
    non_resident: "전체",
    none: "전체",
  };
  const eligibility = eligibilityLabels[input.eligibility ?? "normal"]
    ?? input.eligibility?.trim()
    ?? "누구나";
  const targetCondition = input.targetCondition?.trim();
  const target = targetCondition ? `${eligibility} · ${targetCondition}` : eligibility;
  const message = input.leadMinutes === 10
    ? `${input.courtName}, 10분 뒤 예약 오픈. 눌러서 코트 예약을 준비하세요!`
    : input.leadMinutes === 1440
      ? `${input.courtName}, 내일 ${openTime} 예약 오픈. 눌러서 코트 예약을 준비하세요!`
      : `${input.courtName}, ${input.leadMinutes}분 뒤 예약 오픈. 눌러서 코트 예약을 준비하세요!`;
  return {
    to: input.token,
    title: `${input.test ? "[테스트] " : ""}${input.courtName} 예약 알림`,
    body: `${message}\n예약 대상: ${target}`,
    data: {
      path: `/courts/${encodeURIComponent(input.slug)}?ruleId=${encodeURIComponent(input.ruleId)}`,
      type: "booking_open",
      bookingRuleId: input.ruleId,
      ...(input.deliveryId ? { deliveryId: input.deliveryId } : {}),
    },
    richContent: { image: "https://courtskorea.com/notification-brand.png" },
    sound: "default", channelId: "default", priority: "high",
    ttl: input.test ? 300 : Math.max(1, Math.min(86400,
      Math.floor((Date.parse(input.opensAt) - Date.now()) / 1000))),
  };
}

export function groupedBookingPushMessage(input: {
  token: string;
  reminders: Array<{
    courtName: string;
    opensAt: string;
    leadMinutes: number;
  }>;
}): ExpoMessage {
  if (input.reminders.length < 2) {
    throw new Error("묶음 예약 알림에는 두 개 이상의 알림이 필요합니다.");
  }

  const first = input.reminders[0];
  const sameLeadMinutes = input.reminders.every(
    (reminder) => reminder.leadMinutes === first.leadMinutes
  );
  const timing = sameLeadMinutes
    ? first.leadMinutes === 10
      ? "10분 뒤"
      : first.leadMinutes === 1440
        ? "내일"
        : `${first.leadMinutes}분 뒤`
    : null;
  const body = timing
    ? `${first.courtName} 외 ${input.reminders.length - 1}곳, ${timing} 예약이 열려요. 알림함에서 확인하세요.`
    : `신청한 시설 ${input.reminders.length}곳의 예약 오픈 알림을 알림함에서 확인하세요.`;
  const ttl = Math.max(
    1,
    Math.min(
      86400,
      ...input.reminders.map((reminder) =>
        Math.floor((Date.parse(reminder.opensAt) - Date.now()) / 1000)
      )
    )
  );

  return {
    to: input.token,
    title: `예약 오픈 알림 ${input.reminders.length}개`,
    body,
    data: {
      path: "/notification-history",
      type: "booking_open",
    },
    richContent: { image: "https://courtskorea.com/notification-brand.png" },
    sound: "default",
    channelId: "default",
    priority: "high",
    ttl,
  };
}

export function servicePushMessage(input: {
  token: string;
  title: string;
  body: string;
  path: string;
  type: "notice" | "inquiry_reply";
  notificationId: string;
}): ExpoMessage {
  return {
    to: input.token,
    title: input.title,
    body: input.body,
    data: {
      path: input.path,
      type: input.type,
      notificationId: input.notificationId,
    },
    richContent: { image: "https://courtskorea.com/notification-brand.png" },
    sound: "default",
    channelId: "default",
    ttl: 86400,
  };
}
