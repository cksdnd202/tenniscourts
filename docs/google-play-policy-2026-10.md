# Google Play policy follow-up (2026-11-05)

Sources:
- https://support.google.com/googleplay/android-developer/answer/18100766
- https://support.google.com/googleplay/android-developer/answer/16909972
- https://support.google.com/googleplay/android-developer/answer/17594752
- https://support.google.com/googleplay/android-developer/answer/17492799

## Location: Android system button integration (version 39)

Version 39 supersedes the earlier coarse-only and standard-fine builds. It retires location onboarding and uses the actual AndroidX system LocationButton in Nearby's permission state and over the map's existing current-location control. Fine access is scoped with onlyForLocationButton. Background/service location remain blocked. See [implementation and verification](android-location-button.md) for SDK/AGP requirements, fallback behavior, build compatibility patches, and outstanding device QA.

## Trader declaration: saved in Console

User confirmed Korea-only distribution, currently free with future advertising plans. User explicitly approved non-trader declaration and public-profile disclosure. Console now shows non-trader status. Reassess status before changing distribution to EEA/UK or changing the business activity. No personal contact or address details are stored in this report.

## Optimization: existing setup confirmed, full threshold validation pending

Console version 36: DEX optimization High; obfuscation 89%; optimization ratio and shrinking ratio not reported (dash); R8 full mode; optimized resource shrinking; uncompressed DEX 11.2 MB. Existing release optimization plugin already enables minification, resource shrinking and optimized ProGuard defaults. Do not interpret missing metrics as a pass of the February 2027 25% thresholds. Recheck uploaded-bundle metrics as Console exposes them; avoid speculative dependency upgrades while current settings are already active.

Memory compliance must be assessed from device profiling and Android vitals data, not source inspection alone.

## Sign-in restoration: separate implementation pending (April 2027)

No explicit Restore Credentials / Block Store integration was found in app source. Existing session persistence is not proof of cross-device zero-tap restoration. This needs a dedicated native Android and authentication-backend design: create a restore credential after sign-in, securely exchange a restored credential for a session, delete it on sign-out/account deletion, and test actual device-transfer/cloud-restore flows. Never implement this by placing a long-lived session/refresh token into an unreviewed backup mechanism.
