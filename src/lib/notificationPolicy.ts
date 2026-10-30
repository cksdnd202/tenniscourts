export const NOTIFICATION_GRACE_MS = 5 * 60_000;

export function reminderDue(opensAt: string, minutes: number, subscribedAt: string, now: Date) {
  const due = Date.parse(opensAt) - minutes * 60_000;
  return [10, 1440].includes(minutes) && Number.isFinite(due)
    && due <= now.getTime() && due >= now.getTime() - NOTIFICATION_GRACE_MS
    && due >= Date.parse(subscribedAt) && Date.parse(opensAt) > now.getTime();
}
