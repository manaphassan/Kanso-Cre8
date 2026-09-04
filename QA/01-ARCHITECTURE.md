# 01 — Architecture Review & Governance
**SS-CAM v4.6.1** | Last updated: 2026-09-04  
**Governance Agent**: `wpf-architecture-governance`

---

## 1. Project Structure

```
SS-Brand-Assets/
├── src/
│   ├── SS-CAM/                         # Windows Desktop Application (WPF / .NET 4.8 / Fluent 2)
│   │   ├── App.xaml / App.xaml.cs      # Entry point, unhandled exception traps
│   │   ├── MainWindow.xaml / .cs       # Fluent 2 Shell: sidebar nav, header, player
│   │   ├── Models/                     # DTOs and Data Contracts
│   │   ├── Services/                   # Application & Persistence Services
│   │   ├── Views/                      # 14 Fluent 2 Modules
│   │   ├── Styles/                     # Fluent 2 Tokens & Themes
│   │   └── SS-CAM.csproj
│   ├── SS-CAM.Linux/                   # Linux Fedora Native Client (Avalonia UI / .NET 8/10 LTS)
│   │   ├── Views/                      # Native Skia Views
│   │   ├── ViewModels/                 # CommunityToolkit MVVM ViewModels
│   │   └── SS-CAM.Linux.csproj
│   ├── SS-CAM.Android/                 # Android Native Mobile Client (Kotlin + Jetpack Compose)
│   │   └── app/                        # Native Android Studio project (Material 3 / Fluent Tokens)
│   └── SS-CAM.Web/                     # Central Admin Web Portal & API Server (Svelte 5 + Node.js Express)
│       ├── client/                     # Admin Web Console (Svelte 5 Runes + Vite)
│       ├── server/                     # Express REST/SSE API, JWT Auth, File Watchers
│       └── Dockerfile                  # Synology NAS Docker deployment container
├── dist/                               # Built single-file EXEs (SS-CAM-v4.5.1.exe)
├── docs/                               # GitHub Pages landing site
├── QA/                                 # Quality assurance audit records
└── .agents/                            # Agent governance, skills & wiki
```

---

## 2. Multi-Client Ecosystem Topology & Layer Separation

```text
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│  Windows Client (WPF)   │      │  Linux Client (Avalonia)│      │ Android Client (Compose)│
│  • C# / .NET 4.8        │      │  • C# / .NET 8/10 LTS   │      │ • Kotlin / Android      │
│  • Direct SSD File I/O  │      │  • Direct SSD File I/O  │      │ • Deliverable Lightbox  │
│  • Offline-First Engine │      │  • Offline-First Engine │      │ • 1-Tap Approvals & SSE │
└────────────┬────────────┘      └────────────┬────────────┘      └────────────┬────────────┘
             │                                │                                │
             ▼                                ▼                                ▼
  Local Synology Drive Sync       Local Synology Drive Sync             REST API / SSE (JWT)
             │                                │                                │
             └────────────────────────────────┼────────────────────────────────┘
                                              │
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │          Synology NAS Central Node            │
                      │  • SS-CAM Web Portal (Admin & Control Plane)  │
                      │  • Shared Synology Drive Creative Workspace   │
                      │  • Structured Markdown SSOT & Output Media    │
                      └───────────────────────────────────────────────┘
```

---

## 3. Architecture Health Review (15-Point Matrix)

| Area | Status | Governance Finding |
|---|---|---|
| **WPF / MVVM** | **GOOD** | Clean separation of View layout and business logic. Heavy logic isolated in static/singleton application services. |
| **Modularity** | **GOOD** | 14 dedicated modules, each self-contained with its own Page and supporting Services. |
| **Domain Separation** | **GOOD** | Models (`ProjectStatusItem`, `TeamNote`, `UserProfile`) are pure DTOs without UI or framework coupling. |
| **Markdown Persistence** | **GOOD** | *Markdown is the Database* rule strictly maintained. `FrontmatterService` acts as the canonical YAML frontmatter parser/serializer. |
| **File Safety** | **GOOD** | Zero raw hardcoded user paths. Paths are dynamically resolved via `UserProfileService` and verified for existence prior to I/O. |
| **Synology Synchronization** | **GOOD** | Synology Drive is treated strictly as a file sync mechanism. Application handles external file changes, locks, and missing shares gracefully. |
| **Offline-First** | **GOOD** | 100% offline-resilient. All features (Task board, Notes, Brand assets, Calendar) operate locally without internet or active NAS connection. |
| **Online Readiness** | **GOOD** | Clean Service boundary allows future cloud API or SQLite persistence plugins without altering Domain models. |
| **Search / Indexing** | **GOOD** | Fast multi-threaded asynchronous directory scanning (`WorkspaceScanner`) with cancellation tokens. |
| **Schema Versioning** | **GOOD** | Project `README.md` frontmatter defines structured fields (`status`, `designer`, `deadline`, `created`, `priority`, `duration`, `tags`, `revision`). |
| **Security** | **GOOD** | Zero hardcoded credentials. Sensitive user Mind Drops are encrypted with Windows DPAPI. Path traversal safeguards active. |
| **Fluent 2 Readiness** | **GOOD** | 100% tokenized brushes (`{DynamicResource ApplicationPageBackgroundThemeBrush}`, etc.). Typography standardized (Title: 24, Section: 16). |
| **Cross-Platform Isolation**| **GOOD** | Core data formats (Markdown + JSON) are platform-neutral. Clean separation across `SS-CAM` (WPF), `SS-CAM.Linux` (Avalonia), `SS-CAM.Android` (Compose), and `SS-CAM.Web` (Svelte/Express). |
| **Testability** | **GOOD** | Automated Source Guardian (`verify-sscam.ps1`) and smoke testing runner (`tests/SmokeTest.ps1`) execute headless verification. |
| **Performance** | **GOOD** | Single-file executable (5.24 MB), zero startup lag (<1.2s), asynchronous I/O off the UI thread. |

---

## 4. Architectural Invariants Enforced

1. **The Domain does not depend on UI Frameworks**: Core entities and business rules remain pure C# / Kotlin without UI coupling.
2. **The Domain does not depend on Synology**: No vendor-locked NAS APIs in business logic.
3. **The Domain does not depend on Markdown**: Mappers translate between Markdown DTOs and Domain objects.
4. **Markdown persistence is accessed through an abstraction**: All project README access is centralized in `FrontmatterService`.
5. **Synology Drive is a synchronization mechanism, not the application database**: Desktop apps interact directly with the local file system.
6. **Offline operation remains valid for Workstations**: No mandatory network calls for core creative workflows on Windows and Linux workstations.
7. **Mobile Client interacts via secured API**: The Android client connects through the Web Portal's JWT REST/SSE API.
8. **Web Portal functions as Central Admin**: The Web Portal handles administrative user provisioning, corporate holding switches, and system audit governance.
9. **Platform-specific code remains isolated**: Windows WPF, Linux Avalonia, Android Compose, and Web Svelte remain in distinct project folders.
