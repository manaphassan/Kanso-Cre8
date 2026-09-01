---
name: sscam-android-release
description: >
  Automates building, version-bumping, cryptographic signing, and packaging
  of the SS-CAM Android Companion App (AAB/APK) for Google Play Console.
  Triggers: "build android", "release android", "android release", "build aab",
  "publish playstore", "publish android", "package android", "android bundle".
---

# SS-CAM Android Release Skill (`sscam-android-release`)

This skill automates the complete build, signing, and release pipeline
for the **SS-CAM Android Companion App** (`src/SS-CAM.Android`), compiling
an optimized Android App Bundle (`.aab`) ready for Google Play Console.

---

## 1. Automated Capabilities

1. **Environment Auto-Configuration**:
   - Locates or sets `JAVA_HOME` (Microsoft OpenJDK 17 LTS).
   - Locates Android SDK (`%LOCALAPPDATA%\Android\Sdk` Platform 35)
     and auto-configures `local.properties`.
2. **Version Bumping**:
   - Automatically increments `versionCode` in `app/build.gradle.kts`
     to prevent Google Play duplicate version code errors.
   - Synchronizes `versionName` with project release milestones.
3. **Cryptographic Release Signing**:
   - Signs the `.aab` using the official 2048-bit RSA upload key
     (`sscam-release.jks`).
   - Verifies bundle signature integrity with `jarsigner`.
4. **Google Play Console Release Notes Generator**:
   - Generates character-counted, XML-tagged `<en-GB>` and `<ms-MY>`
     release notes under Google Play's 500-character limit.

---

## 2. Usage & Execution Script

Run the automated release script:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\.agents\skills\sscam-android-release\scripts\build-android-release.ps1
```

### Optional Parameters

- `-BumpVersion`: Increments `versionCode` by 1 (default: `$true`).
- `-VersionName <String>`: Override `versionName` (e.g. `"4.6.1"`).
- `-BuildApk`: Also outputs a standalone APK in addition to `.aab`.

```powershell
# Example: Bump version code and build both AAB and APK
.\.agents\skills\sscam-android-release\scripts\build-android-release.ps1 `
  -BumpVersion -BuildApk
```

---

## 3. Output Artifacts

- **Release Bundle (Google Play)**:
  `src/SS-CAM.Android/app/build/outputs/bundle/release/app-release.aab`
- **Release APK (Direct Device Sideload)**:
  `src/SS-CAM.Android/app/build/outputs/apk/release/app-release.apk`
- **Proguard Mapping & Seed Symbols**:
  `src/SS-CAM.Android/app/build/outputs/mapping/release/`

---

## 4. Google Play Console Checklist Reference

| Section | Required Value |
|---|---|
| **Package Name (`applicationId`)** | `com.suamisihat.creative` |
| **Target SDK** | `35` (Android 15) |
| **Signing Key** | `sscam-release.jks` (`sscam_key`) |
| **Advertising ID** | `No` (App does not use Ad ID) |
| **Financial Features** | `No financial features` |
| **Health Declaration** | `Not a health app` (Creative asset management) |
| **Target Audience** | `18 and over` |
| **Privacy Policy URL** | `https://suamisihat.clinic/privacy-policy/` |

---

## 5. Google Play Closed Testing — Tester Join Links

Testers can join the **SS-CAM Android Companion** Closed Testing track via:

| Platform | Link |
|---|---|
| **Android (Google Play)** | https://play.google.com/store/apps/details?id=com.suamisihat.creative |
| **Web Opt-In Page** | https://play.google.com/apps/testing/com.suamisihat.creative |

> **Note:** Testers must have a Google account and be invited to the testing
> programme. The web opt-in link allows testers to join without a device
> present. Once joined, updates are delivered automatically via Google Play.
