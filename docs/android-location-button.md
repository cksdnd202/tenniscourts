# Android system location button

## Implementation

- Location permission onboarding is retired. Its old route redirects home for restored navigation state. Login, consent, general onboarding, and notification onboarding remain gated.
- The existing Nearby tab remains. Its permission empty state hosts the real AndroidX LocationButton. Denied access retains an explicit Settings action on older Android.
- The map WebView keeps its original layout. An app-only observer finds the existing semantic current-location control, hides that web control without changing layout, and reports its rectangle. A native official icon-only control occupies that rectangle. It is removed when the web control disappears, navigation begins, or a web overlay is open. No web deployment is required.
- Android uses the local Expo module courts-location-button, wrapping androidx.core.locationbutton:locationbutton:1.0.0-alpha01. Android <=16 follows the library fallback permission flow; Android 17+ uses the secure system surface. The app never simulates a press on this component.
- Precise access is flagged onlyForLocationButton and USE_LOCATION_BUTTON is declared. Coarse access is supported. Background location and location foreground services remain excluded.
- Permission checks consult native Android grants to support fine-only session grants and their expiration. Android JS callers do not directly invoke the standard foreground permission prompt.
- iOS retains its existing feature-level permission controls; onboarding location permission is removed there too.

## Build compatibility

The official alpha AAR requires compile SDK 37 and AGP >=9.1.0. Target SDK remains 36; adopting this component does not require changing application targeting in this task. Gradle 9.3.1 and JDK 17 are used.

The config plugin pins AGP 9.1.0, opts into its legacy Kotlin/DSL/source-provider compatibility modes, and applies narrowly scoped source patches during native prebuild:

1. Expo SDK57: omit obsolete library-only targetSdk setter (the application target remains unchanged).
2. React Native 0.86: register global library BuildConfig and namespace finalization callbacks once, avoiding repeated late registration on AGP9.1.

Patches check expected source signatures and fail when dependencies change rather than silently assuming compatibility. Expo's generated source task has an explicit preBuild dependency. Reassess and remove these compatibility patches on a future Expo/React Native upgrade.

## Verification

Run mobile TypeScript and node --test tests/location-access.test.cjs from apps/mobile. The tests cover retired onboarding for existing/new accounts, retained auth gates, fine-only session grants, approximate access, and expiration. Build the signed release AAB and inspect the merged manifest, official AndroidX DEX classes, local module autolinking, and matching upload certificate.

Device QA still required: fresh account skips location onboarding; Nearby and map system buttons render at narrow widths (360/390/412); allow/deny/cancel; coarse-only choice on Android16 fallback; session expiration on Android17; map/list toggle; detail overlays do not leave a floating button; location services off; upgrade preserves session/favorites/notifications. No device or emulator was connected during initial implementation, so compilation does not constitute on-device validation.

Official references:
- https://developer.android.com/guide/topics/permissions/private-alternatives/location-button
- https://developer.android.com/jetpack/androidx/releases/core-locationbutton
- https://support.google.com/googleplay/android-developer/answer/17033915
