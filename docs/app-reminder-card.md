# Detail app reminder card

- Located immediately after the booking information, before the location section.
- Uses a dark green surface with a single mint notification illustration. Hover, touch, and keyboard focus play a short notification-arrival animation. Reduced-motion preferences disable the animation. The layout adapts to narrow mobile screens.
- Only shown for tennis courts with an active rule whose next booking opening can be calculated, matching the current tennis-only notification delivery scope. Outdoor-open courts are excluded.
- Hidden until browser hydration, and hidden in native WebViews, the app user agent, `?app=1` previews, and `html[data-courts-korea-app="true"]`. CSS also hides the card if the native attribute is applied after hydration.

## Release activation

This card is intended to ship with the public app launch. **앱 다운로드하기** links to `https://play.google.com/store/apps/details?id=com.courtskorea.app` by default. Verify public installation before deploying the launch release.

`NEXT_PUBLIC_ANDROID_APP_STORE_URL` can override the public listing URL (for the same package). Closed-test URLs are not accepted. This change does not implement app opening or post-install facility restoration.

The install link uses the existing `data-ph-event` convention with event `detail_app_reminder_store_clicked`.
