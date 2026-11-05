# Google Play policy follow-up (2026-11-05)

Sources:
- https://support.google.com/googleplay/android-developer/answer/18100766
- https://support.google.com/googleplay/android-developer/answer/16909972
- https://support.google.com/googleplay/android-developer/answer/17594752
- https://support.google.com/googleplay/android-developer/answer/17492799

## Location: source change ready, release validation pending

The uploaded version 36 (1.0.1) targets API 36 and includes both coarse and fine location. It does not list background location. The next native build blocks fine location, background location and location foreground service permissions; coarse foreground location remains for nearby discovery. Expo introspection confirms the manifest removal directives. Existing Expo native foreground-permission code reports the coarse permission independently of fine permission.

Android cached fixes now accept accuracy up to 3,000 m rather than 500 m so approximate fixes can be reused. iOS retains the existing 500 m cutoff. Location remains an estimate; this app is not turn-by-turn navigation.

Validated: mobile TypeScript check; Expo config introspection; mocked runtime checks for coarse cache reuse, iOS cutoff and fresh location retrieval. Still required on a new native Android build: fresh install permission prompt, denied permission behavior, nearby list and map using approximate location, upgrade from an existing precise-location grant, and merged release manifest inspection. An OTA/web update cannot change native manifest permissions. No AAB was built or uploaded in this task.

The API 37 location-button requirement must be revisited if precise one-shot location is introduced. Do not add fine permission merely to increase distance accuracy without reassessing the policy.

## Trader declaration: saved in Console

User confirmed Korea-only distribution, currently free with future advertising plans. User explicitly approved non-trader declaration and public-profile disclosure. Console now shows non-trader status. Reassess status before changing distribution to EEA/UK or changing the business activity. No personal contact or address details are stored in this report.

## Optimization: existing setup confirmed, full threshold validation pending

Console version 36: DEX optimization High; obfuscation 89%; optimization ratio and shrinking ratio not reported (dash); R8 full mode; optimized resource shrinking; uncompressed DEX 11.2 MB. Existing release optimization plugin already enables minification, resource shrinking and optimized ProGuard defaults. Do not interpret missing metrics as a pass of the February 2027 25% thresholds. Recheck uploaded-bundle metrics as Console exposes them; avoid speculative dependency upgrades while current settings are already active.

Memory compliance must be assessed from device profiling and Android vitals data, not source inspection alone.

## Sign-in restoration: separate implementation pending (April 2027)

No explicit Restore Credentials / Block Store integration was found in app source. Existing session persistence is not proof of cross-device zero-tap restoration. This needs a dedicated native Android and authentication-backend design: create a restore credential after sign-in, securely exchange a restored credential for a session, delete it on sign-out/account deletion, and test actual device-transfer/cloud-restore flows. Never implement this by placing a long-lived session/refresh token into an unreviewed backup mechanism.
