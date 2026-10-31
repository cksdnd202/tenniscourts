# Detail app reminder card

- Located immediately after the booking information, before the location section.
- Uses a flat light-green surface, dark-green download button, and a single level notification illustration. No English eyebrow or rotated artwork. Hover, touch, and keyboard focus play a short vertical notification-arrival animation without rotation. Reduced-motion preferences disable the animation. The layout adapts to narrow mobile screens.
- Only shown for tennis courts with an active rule whose next booking opening can be calculated, matching the current tennis-only notification delivery scope. Outdoor-open courts are excluded.
- Hidden until browser hydration, and hidden in native WebViews, the app user agent, `?app=1` previews, and `html[data-courts-korea-app="true"]`. CSS also hides the card if the native attribute is applied after hydration.

## Release activation

This card is intended to ship with the public app launch. **앱에서 열기** opens an accessible app handoff dialog. The Google Play action links to `https://play.google.com/store/apps/details?id=com.courtskorea.app` by default. Verify public installation before deploying the launch release.

`NEXT_PUBLIC_ANDROID_APP_STORE_URL` can override the public listing URL (for the same package). Closed-test URLs are not accepted. Automatic post-install facility restoration is not implemented.

Opening the dialog captures `app_handoff_opened` with `source: detail_card` and the validated destination.

## Dismissible download banner

`AppDownloadBanner` appears below the header in the normal page flow on the brand home, tennis/badminton home, and facility detail pages. It does not overlay search or booking content. The home filter sidebar is capped to the remaining available height.

- Uses the existing logo mark, dark surface, and green action button.
- Only shown when the browser User-Agent explicitly includes the `KAKAOTALK` or `Instagram` token (case-insensitive). Ordinary browsers and other in-app browsers are excluded, even when referred from a social app. Unidentified browser versions are hidden by default.
- Closing hides the strip for seven days across these pages and browser tabs. The expiry is stored in `courtskorea:app-banner-dismissed-until`. If storage is blocked, dismissal lasts for the current page session.
- Hidden on iPhone/iPad, native WebViews, and `?app=1` previews. Admin, account, support, and map screens do not include this banner.
- Store URL follows the same public Android listing configuration as the detail card.
- Dialog and dismiss events: `app_handoff_opened` (`source: header_banner`), `app_download_banner_dismissed`.
- The detail reminder card remains independent of the strip's dismissal.

## App handoff

- Both entry points use `AppLaunchButton` and `AppLaunchPanel`. A native dialog supports Escape, close, backdrop click, focus trapping and focus restoration. Web continue dismisses it without leaving the facility.
- Android users explicitly select an intent link targeting `com.courtskorea.app` and the existing `courtskorea` scheme. Facility paths remain `/courts/<slug>`; sport home pages open the app home.
- Supported browsers can fall back to `/app/open?path=...&attempted=1`. This noindex route preserves the facility, offers retry, download and web continue, and never redirects on a timer. It is a handoff utility, not the future `/app` marketing page.
- KakaoTalk/Instagram users see external-browser guidance and a copyable production handoff link. Browser detection is best effort; no private app schemes are used to force external navigation.
- Desktop users get the Play listing and a link to open on an Android phone. iOS users get web continue. Arbitrary URLs, query strings and malformed facility paths are rejected before constructing native or web destinations.
- Events: `app_open_attempted` (destination, browser), `app_handoff_store_clicked` (destination). These measure attempts and store clicks, not successful app opens or installations.
- After installation, users currently return to the handoff screen and press app open. Public-release Android testing remains necessary for installed/uninstalled cases in Chrome, KakaoTalk and Instagram; desktop browser verification cannot prove native launch success.

## Automatic post-install restoration: reviewed, not implemented

The mobile app already includes `expo-application` with `getInstallReferrerAsync`, and `pendingDeepLink.ts` can retain a facility for 24 hours through login and onboarding. `_layout.tsx` consumes it when the user is ready.

A later mobile change can read a validated Play Install Referrer on first installation, persist the facility before authentication/onboarding, and consume it once when ready. A directly opened link should take precedence over an older referrer; missing, stale or unsupported referrers should use the home screen. Transient read failures need retry handling without repeatedly navigating on later launches. The web store URL must then supply the corresponding encoded referrer. This requires a coordinated app release and real Play-install validation.

References: [Android intents in Chrome](https://developer.chrome.com/docs/android/intents), [Expo Application API](https://docs.expo.dev/versions/latest/sdk/application/).
