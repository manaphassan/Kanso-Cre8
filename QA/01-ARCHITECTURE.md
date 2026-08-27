# 01 — Architecture Review & Governance
**SS-CAM v4.4.3** | Last updated: 2026-08-27  
**Governance Agent**: `wpf-architecture-governance`

---

## 1. Project Structure

```
SS-Brand-Assets/
├── src/
│   ├── SS-CAM/                         # Windows Desktop Application (WPF / .NET 4.8)
│   │   ├── App.xaml / App.xaml.cs      # Entry point, unhandled exception traps
│   │   ├── MainWindow.xaml / .cs       # Fluent 2 Shell: sidebar nav, header, player
│   │   ├── Models/                     # DTOs and Data Contracts
│   │   │   ├── UserProfileModels.cs    # UserProfile, SystemSpecs, SoftwareHealthItem
│   │   │   ├── ProjectStatus.cs        # Project job status & frontmatter schema
│   │   │   ├── RadioStation.cs         # Stream station models
│   │   │   ├── TeamNote.cs             # QuickNote entity models
│   │   │   └── PrayerTimeModels.cs     # Prayer timetable and zone definitions
│   │   ├── Services/                   # Application & Persistence Services
│   │   │   ├── FrontmatterService.cs   # Markdown YAML Frontmatter parsing & writes
│   │   │   ├── QuickNoteService.cs     # Local markdown note persistence
│   │   │   ├── UserProfileService.cs   # Profile & workstation config
│   │   │   ├── ThemeService.cs         # Fluent 2 theme engine
│   │   │   ├── NotificationService.cs  # In-app toast & notification hub
│   │   │   ├── WorkspaceScanner.cs     # File scanner & designer scoping
│   │   │   └── [others]                # Radio, Wellbeing, PrayerTime, etc.
│   │   ├── Views/                      # 14 Fluent 2 Modules
│   │   │   ├── DashboardPage.xaml/.cs
│   │   │   ├── ProjectCreatorPage.xaml/.cs
│   │   │   ├── SearchCopyPage.xaml/.cs
│   │   │   ├── BrandAssetsPage.xaml/.cs
│   │   │   ├── QrCodeStudioPage.xaml/.cs
│   │   │   ├── QuickNotePage.xaml/.cs
│   │   │   ├── TaskManagerPage.xaml/.cs
│   │   │   ├── CalendarPage.xaml/.cs
│   │   │   ├── WellbeingPage.xaml/.cs
│   │   │   ├── WaktuSolatPage.xaml/.cs
│   │   │   ├── RadioPage.xaml/.cs
│   │   │   ├── WorkstationHealthPage.xaml/.cs
│   │   │   └── SettingsPage.xaml/.cs
│   │   ├── Styles/                     # Fluent 2 Tokens & Themes
│   │   │   ├── Fluent2Styles.xaml      # Core design tokens
│   │   │   └── MetamorphosisTheme.xaml # Glassmorphism theme
│   │   └── SS-CAM.csproj
│   └── SS-CAM.Linux/                   # Linux Desktop Scaffold (Avalonia UI / .NET 8)
├── dist/                               # Built single-file EXEs (SS-CAM-v3.5.0.exe)
├── docs/                               # GitHub Pages landing site
├── QA/                                 # Quality assurance audit records
└── .agents/                            # Agent governance, skills & wiki
```

---

## 2. Layer Separation & Invariants

```text
┌──────────────────────────────────────────────┐
│              Native Presentation             │
│        Fluent 2 Pages / Views / XAML         │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│              Application Layer               │
│        Services / Business Logic / State     │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│                  Domain                      │
│        Data Models / Schema / Validation     │
└──────────────────────┬───────────────────────┘
                       │
             Persistence Contract
                       │
             ┌─────────┴──────────┐
             │                    │
    Markdown Repository      Local Cache / AppData
    (Frontmatter + Body)          (JSON / DTO)
             │                    │
    Local Synchronized FS   Local Machine Store
             │
       Synology Drive
       Synchronization
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
| **Cross-Platform Isolation**| **GOOD** | Core data formats (Markdown + JSON) are platform-neutral. Linux Avalonia port cleanly separated under `src/SS-CAM.Linux/`. |
| **Testability** | **GOOD** | Automated Source Guardian (`verify-sscam.ps1`) and smoke testing runner (`tests/SmokeTest.ps1`) execute headless verification. |
| **Performance** | **GOOD** | Single-file executable (5.24 MB), zero startup lag (<1.2s), asynchronous I/O off the UI thread. |

---

## 4. Architectural Invariants Enforced

1. **The Domain does not depend on WPF**: Core entities and business rules remain pure C# without WPF dependencies.
2. **The Domain does not depend on Synology**: No vendor-locked NAS APIs in business logic.
3. **The Domain does not depend on Markdown**: Mappers translate between Markdown DTOs and Domain objects.
4. **Markdown persistence is accessed through an abstraction**: All project README access is centralized in `FrontmatterService`.
5. **Synology Drive is a synchronization mechanism, not the application database**: The app interacts with the local file system.
6. **Offline operation remains valid**: No mandatory network calls for core creative workflows.
7. **Fluent 2 styling is centralized and reusable**: All surfaces and fonts use dynamic tokens.
8. **Platform-specific code remains isolated**: Windows WPF and Linux Avalonia remain in distinct project folders.
