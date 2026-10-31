# Detail app reminder card

- Located immediately after the booking information, before the location section.
- Uses a flat light-green surface, dark-green download button, and a single level notification illustration. No English eyebrow or rotated artwork. Hover, touch, and keyboard focus play a short vertical notification-arrival animation without rotation. Reduced-motion preferences disable the animation. The layout adapts to narrow mobile screens.
- Only shown for tennis courts with an active rule whose next booking opening can be calculated, matching the current tennis-only notification delivery scope. Outdoor-open courts are excluded.
- Hidden until browser hydration, and hidden in native WebViews, the app user agent, `?app=1` previews, and `html[data-courts-korea-app="true"]`. CSS also hides the card if the native attribute is applied after hydration.

## Release activation

This card is intended to ship with the public app launch. **앱 다운로드하기** links to `https://play.google.com/store/apps/details?id=com.courtskorea.app` by default. Verify public installation before deploying the launch release.

`NEXT_PUBLIC_ANDROID_APP_STORE_URL` can override the public listing URL (for the same package). Closed-test URLs are not accepted. This change does not implement app opening or post-install facility restoration.

The install link uses the existing `data-ph-event` convention with event `detail_app_reminder_store_clicked`.

## Dismissible download banner

`AppDownloadBanner` appears below the header in the normal page flow on the brand home, tennis/badminton home, and facility detail pages. It does not overlay search or booking content. The home filter sidebar is capped to the remaining available height.

- Uses the existing logo mark, dark surface, and green action button.
- Closing hides the strip for seven days across these pages and browser tabs. The expiry is stored in `courtskorea:app-banner-dismissed-until`. If storage is blocked, dismissal lasts for the current page session.
- Hidden on iPhone/iPad, native WebViews, and `?app=1` previews. Admin, account, support, and map screens do not include this banner.
- Store URL follows the same public Android listing configuration as the detail card.
- Click and dismiss events: `app_download_banner_clicked`, `app_download_banner_dismissed`.
- The detail reminder card remains independent of the strip's dismissal.
