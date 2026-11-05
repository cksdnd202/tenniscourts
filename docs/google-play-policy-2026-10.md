# Google Play policy follow-up (2026-11-05)

Sources:
- https://support.google.com/googleplay/android-developer/answer/18100766
- https://support.google.com/googleplay/android-developer/answer/16909972
- https://support.google.com/googleplay/android-developer/answer/17594752
- https://support.google.com/googleplay/android-developer/answer/17492799

## Location: precise foreground access restored for nearby distance ordering

Version 37's coarse-only build was superseded before upload. Version 38 restores fine location alongside coarse location, and Android one-shot retrieval requests High accuracy. Users can still choose approximate access; background location and location foreground services remain blocked. No continuous/background tracking is introduced.

Nearby search and the map share the location helper. Cache acceptance follows the user's Android permission choice (500 m for fine; 3,000 m for coarse). A fresh fix with better accuracy updates the UI even if its coordinates changed less than 50 m. iOS retains Balanced retrieval and the existing cache threshold.

The January 2027 minimum-scope policy still requires a product justification for precise location; accurate nearby ordering is the intended reason, not proof of Google approval. Reassess the Android system location button when targeting API 37+. The current target is API 36. Do not represent the app as policy-approved merely because fine access is restored.

Device verification required: precise vs approximate grant; permission denied; precise enabled after approximate cache use; nearby order and map recenter; location services disabled; upgrade from version 36 or 37 without loss of login or saved facilities. Native permission changes require a new AAB.

## Trader declaration: saved in Console

User confirmed Korea-only distribution, currently free with future advertising plans. User explicitly approved non-trader declaration and public-profile disclosure. Console now shows non-trader status. Reassess status before changing distribution to EEA/UK or changing the business activity. No personal contact or address details are stored in this report.

## Optimization: existing setup confirmed, full threshold validation pending

Console version 36: DEX optimization High; obfuscation 89%; optimization ratio and shrinking ratio not reported (dash); R8 full mode; optimized resource shrinking; uncompressed DEX 11.2 MB. Existing release optimization plugin already enables minification, resource shrinking and optimized ProGuard defaults. Do not interpret missing metrics as a pass of the February 2027 25% thresholds. Recheck uploaded-bundle metrics as Console exposes them; avoid speculative dependency upgrades while current settings are already active.

Memory compliance must be assessed from device profiling and Android vitals data, not source inspection alone.

## Sign-in restoration: separate implementation pending (April 2027)

No explicit Restore Credentials / Block Store integration was found in app source. Existing session persistence is not proof of cross-device zero-tap restoration. This needs a dedicated native Android and authentication-backend design: create a restore credential after sign-in, securely exchange a restored credential for a session, delete it on sign-out/account deletion, and test actual device-transfer/cloud-restore flows. Never implement this by placing a long-lived session/refresh token into an unreviewed backup mechanism.
