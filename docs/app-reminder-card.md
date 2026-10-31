# Detail app reminder card

- Located immediately after the booking information, before the location section.
- Uses existing detail card colors, border, radius, and sport accent.
- Only shown for tennis courts with an active rule whose next booking opening can be calculated, matching the current tennis-only notification delivery scope. Outdoor-open courts are excluded.
- Hidden until browser hydration, and hidden in native WebViews, the app user agent, `?app=1` previews, and `html[data-courts-korea-app="true"]`. CSS also hides the card if the native attribute is applied after hydration.

## Release activation

Until a public store link is configured, the card shows **앱 출시 준비 중** without an actionable install link.

After verifying general-public installation, set `NEXT_PUBLIC_ANDROID_APP_STORE_URL` to `https://play.google.com/store/apps/details?id=com.courtskorea.app`, then rebuild the web app. Closed-test URLs are not accepted. The link is explicitly labeled **Google Play에서 설치**; this change does not implement app opening or post-install facility restoration.

The install link uses the existing `data-ph-event` convention with event `detail_app_reminder_store_clicked`.
