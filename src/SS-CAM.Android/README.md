# SS-CAM Android Native Client (`src/SS-CAM.Android`)

### *Native Mobile Companion & Creative Approvals Studio*

---

## 📱 Overview

**SS-CAM Android** is the official native mobile companion app for **SuamiSihat Creative Assets Management**. It is designed specifically for creative leads, directors, and on-the-go designers to review deliverables, submit 1-tap approvals, track task SLAs, and reference brand design tokens.

---

## 🛠️ Tech Stack & Architecture

- **Language**: Kotlin 2.0+
- **UI Toolkit**: Jetpack Compose (Material 3 with SuamiSihat 60:30:10 & Fluent 2 design tokens)
- **Architecture Pattern**: MVVM with Kotlin Coroutines & Flow
- **Networking**: Retrofit 2.11 + OkHttp 4.12 (REST + Server-Sent Events / SSE)
- **Image Pipeline**: Coil 2.7 (Hardware bitmap acceleration & zero-copy caching)
- **Target OS**: Android 8.0 (API 26) through Android 15/16 (API 35+)

---

## 🌟 Core Features

1. **Dashboard & SLA Metrics**: Live overview of in-review queues, in-progress tasks, and holding subsidiary breakdown (SSH, SSC, SSW, SSE, SST).
2. **Deliverable Review & Approval**: High-resolution image/video previews with one-tap `✓ Sign-Off` or `⚠️ Request Revision` actions communicating directly with the Web Portal REST API.
3. **Task & Campaign Board**: Filtered list of active projects, assigned designers, deadlines, and priority tags.
4. **Brand Asset Quick-Tray**: Instant tap-to-copy for hex codes and visual color swatches.

---

## 🚀 Building & Running

### Using Android Studio
1. Open Android Studio.
2. Select **Open** and navigate to `d:\HaNa_Innovation\ss_cam\src\SS-CAM.Android`.
3. Allow Gradle to sync dependencies from `libs.versions.toml`.
4. Select your connected Android device or emulator and press **Run (Shift+F10)**.

### Using Gradle CLI
```bash
./gradlew assembleDebug
```
Output APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`
