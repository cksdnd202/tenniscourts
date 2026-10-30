import assert from 'node:assert/strict';
import { reminderDue } from '../src/lib/notificationPolicy.ts';
import { bookingPushMessage, expoRequest, groupedBookingPushMessage } from '../src/lib/expoPush.ts';

const now = new Date('2026-10-04T00:00:00Z');
const subscribed = '2026-10-03T00:00:00Z';
assert.equal(reminderDue('2026-10-04T00:10:00Z', 10, subscribed, now), true);
assert.equal(reminderDue('2026-10-05T00:00:00Z', 1440, subscribed, now), true);
assert.equal(reminderDue('2026-10-04T00:11:00Z', 10, subscribed, now), false, 'never send early');
assert.equal(reminderDue('2026-10-04T00:04:00Z', 10, subscribed, now), false, 'discard stale reminders');
assert.equal(reminderDue('2026-10-04T00:06:00Z', 10, '2026-10-03T23:59:00Z', now), false, 'no retroactive alert after new subscription');
assert.equal(reminderDue('2026-10-03T23:59:00Z', 10, subscribed, now), false, 'never send after opening');
assert.equal(reminderDue('invalid', 10, subscribed, now), false);
assert.equal(reminderDue('2026-10-04T00:10:00Z', 0, subscribed, now), false);

const input = { token: 'ExponentPushToken[test]', courtName: '면목구립 테니스장', slug: 'myeonmok-court',
  ruleId: 'rule-id', opensAt: '2026-10-04T00:10:00Z', leadMinutes: 10, deliveryId: 'delivery-id' };
const message = bookingPushMessage(input);
assert.equal(message.data.path, '/courts/myeonmok-court?ruleId=rule-id');
assert.equal(message.data.deliveryId, 'delivery-id');
assert.equal(message.channelId, 'default');
assert.equal(message.priority, 'high');
assert.match(message.body, /10분 뒤/);
assert.match(bookingPushMessage({ ...input, test: true }).title, /\[테스트\]/);
assert.equal(bookingPushMessage({ ...input, test: true }).ttl, 300);

const groupedMessage = groupedBookingPushMessage({
  token: input.token,
  reminders: [
    { courtName: '글로벌 실내테니스 아카데미 논현 1호점', opensAt: input.opensAt, leadMinutes: 10 },
    { courtName: '글로벌 실내테니스 아카데미 구월3호점', opensAt: input.opensAt, leadMinutes: 10 },
  ],
});
assert.equal(groupedMessage.priority, 'high');
assert.equal(groupedMessage.data.path, '/notification-history');
assert.equal(groupedMessage.data.deliveryId, undefined);
assert.match(groupedMessage.title, /2개/);
assert.match(groupedMessage.body, /논현 1호점 외 1곳/);
assert.match(groupedMessage.body, /10분 뒤/);

const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async (_url, request) => {
    calls++;
    assert.ok(request.signal);
    assert.deepEqual(JSON.parse(request.body), [message]);
    return new Response(JSON.stringify({ data: [{ status: 'ok', id: 'expo-ticket' }] }));
  };
  assert.deepEqual(await expoRequest('send', [message]), [{ status: 'ok', id: 'expo-ticket' }]);
  assert.equal(calls, 1);
  globalThis.fetch = async () => new Response('error', { status: 503 });
  await assert.rejects(() => expoRequest('send', [message]), /HTTP 503/);
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: [{ code: 'ERROR' }] }));
  await assert.rejects(() => expoRequest('send', [message]));
} finally { globalThis.fetch = originalFetch; }
console.log('예약 알림 발송 시각·신규 구독·오픈 경과·딥링크·Expo 응답 검사 통과');
