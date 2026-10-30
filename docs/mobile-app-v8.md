# Courts Korea mobile v8

## Product structure

- Search: renders the production Courts Korea home/search experience without a separate native reinterpretation.
- Map: renders the production map view.
- Court detail: renders the production court detail page and adds one native reservation-reminder action above the bottom navigation.
- Notifications: native list of the signed-in user's active `notification_subscriptions` only.
- Bottom navigation: Search, Map, Notifications.

## Reminder flow

1. Open a court detail page.
2. Tap **이 테니스장 예약 알림 설정**.
3. Select a booking rule and one or both reminder timings (`1일 전`, `10분 전`).
4. If required, complete Kakao login and notification permission setup.
5. The Notifications tab lists only active subscriptions. Tapping an active timing removes it.

The existing Supabase RLS policies continue to scope subscriptions and device tokens to `auth.uid()`.

## Verification

- `npx tsc --noEmit`
- `npx expo lint`
- `npx expo export --platform android --output-dir /tmp/courtskorea-mobile-v8-export`
