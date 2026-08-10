# Contributing & Developer Guide

Technical reference for maintainers and contributors of **SS-CAM — SuamiSihat Creative Assets Management**. For the end-user deployment guide, refer to [README.md](./README.md).

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Repository Structure](#2-repository-structure)
3. [Development Prerequisites](#3-development-prerequisites)
4. [Building the Application](#4-building-the-application)
5. [Running in Development Mode](#5-running-in-development-mode)
6. [Testing & Verification](#6-testing--verification)
7. [Branch & Release Workflow](#7-branch--release-workflow)
8. [Release Lifecycle & Versioning](#8-release-lifecycle--versioning)
9. [Code Standards & Security](#9-code-standards--security)
10. [Branding & Design Tokens](#10-branding--design-tokens)
11. [Extending the Payload](#11-extending-the-payload)

---

## 1. Project Architecture

SS-CAM v2.0+ is a **native C# WPF application** targeting .NET Framework 4.8, distributed as a single self-contained executable. All dependencies are embedded at compile time using **Fody/Costura** assembly weaving.

```
Application Stack
─────────────────────────────────────────────────────
UI Layer          WPF + WPF-UI (Fluent Design System)
Business Logic    C# .NET Framework 4.8
Data Storage      JSON (AppData/Local) + DPAPI encryption
Build Pipeline    MSBuild + Fody/Costura (single-file EXE)
Dependency Mgmt   NuGet (packages.config)
```

### Application Modules

| Module | Namespace | Description |
| --- | --- | --- |
| **Dashboard** | `SS_CAM.Views.DashboardPage` | Workspace intelligence metrics, storage analytics, sub-brand charts, and Designer Inspiration widget |
| **Project Creator** | `SS_CAM.Views.ProjectCreatorPage` | Standardized folder generator with auto Job ID, live preview, and Markdown brief editor |
| **Search & Copy** | `SS_CAM.Views.SearchCopyPage` | Catalog-book workspace browser with rendered README preview, gallery, designer filter, and inline README editor |
| **Task Manager** | `SS_CAM.Views.TaskManagerPage` | Project status board driven by YAML frontmatter in each project's `README.md` _(v2.5.0)_ |
| **Quick Note** | `SS_CAM.Views.QuickNotePage` | Persistent Markdown scratchpad with two-panel layout and auto-save _(v2.5.0)_ |
| **Radio Player** | `SS_CAM.Views.RadioPage` | Live Malaysian radio & lo-fi focus streams; card grid with cover art and genre filter tabs |
| **Creative Wellbeing** | `SS_CAM.Views.WellbeingPage` | Focus timer, breathing guides, energy check-ins, DPAPI encrypted Mind Drops |
| **Brand Assets** | `SS_CAM.Views.BrandAssetsPage` | Asset library, logo, palette, and report launcher |
| **Settings** | `SS_CAM.Views.SettingsPage` | Designer identity, workspace config, update checker |
| **Workstation Health** | `SS_CAM.Views.WorkstationHealthPage` | Font repair, software scanner, NAS diagnostics |

### Core Services

| Service | Description |
| --- | --- |
| `WorkspaceScanner` | Scans workspace directories, aggregates metrics, builds chart datasets, enumerates designer folders |
| `UserProfileService` | Loads and persists designer identity, workspace root, avatar |
| `AudioFeedbackService` | Plays ambient/interaction audio via MediaElement |
| `WellbeingTimerService` | Monotonic focus session tracking with idle detection |
| `WellbeingDataService` | DPAPI-encrypted Mind Drop storage and energy check-in persistence |
| `PayloadInstallerService` | Deploys fonts and brand assets to the Windows user profile |
| `QuickNoteService` | Creates, loads, saves, and deletes Markdown note files from `%LOCALAPPDATA%\SS-CAM\Notes\` _(v2.5.0)_ |
| `FrontmatterService` | Parses and writes YAML frontmatter blocks from/to project `README.md` files _(v2.5.0)_ |
| `TeamBoardService` | Reads/writes shared `_Team/team-notes.json` on NAS; provides polling for collaboration _(v2.5.0)_ |
| `RadioStreamService` | Manages station list, `.pls`/`.m3u` import, playback control, and cover image download |

---

## 2. Repository Structure

```
SS-Brand-Assets/
├── src/
│   └── SS-CAM/                        C# WPF application source
│       ├── Models/                    Data models (Dashboard, UserProfile, Wellbeing, Radio, Team)
│       ├── Services/                  Business logic and data access services
│       ├── Views/                     XAML pages and code-behind
│       ├── Properties/                Assembly metadata (version, GUID)
│       ├── packages/                  NuGet restored dependencies
│       ├── SS-CAM.csproj              MSBuild project file
│       └── app.ico                    Application icon
├── installer/
│   ├── src/                           Legacy PowerShell setup scripts (v1.x)
│   ├── bootstrapper/                  Legacy C# EXE bootstrapper (v1.x)
│   ├── assets/                        Installer branding images
│   ├── EULA.txt                       End User Licence Agreement
│   └── Build-Installer.ps1            Versioned build script (supports v1.x and v2.x+)
├── payload/
│   ├── Fonts/                         Installable desktop typefaces and licences
│   ├── Audio/                         Ambient and interaction sound effects
│   └── Brand Assets/
│       ├── Logos/                     SVG and PNG logo variants per sub-brand
│       ├── Libraries/                 .afassets and .cclibs files
│       └── Colour Palettes/           .afpalette and .ase swatch files
├── tests/                             PowerShell smoke and integration tests
├── docs/                              Application screenshot assets
├── dist/                              Build output — not committed (see .gitignore)
├── CHANGELOG.md                       Release history with integrity hashes
├── CONTRIBUTING.md                    This document
├── FOLDER-STRUCTURE.md                Workspace folder naming convention and frontmatter spec
├── ROADMAP.md                         Living feature roadmap and version milestones
└── README.md                          End-user deployment and setup guide
```

---

## 3. Development Prerequisites

| Requirement | Minimum Version | Notes |
| --- | --- | --- |
| **Windows** | 10 (64-bit) | WPF requires Windows |
| **.NET Framework** | 4.8 | Pre-installed on Windows 10 1903+ |
| **Visual Studio** | 2019 or later | Community edition is sufficient |
| **MSBuild** | 4.0 (bundled with .NET Framework) | Located at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe` |
| **NuGet** | Any | `src/nuget.exe` is committed for offline restore |
| **PowerShell** | 5.1+ | Required to run `Build-Installer.ps1` and test scripts |
| **Git** | Any | For version control and tagging |
| **GitHub CLI (`gh`)** | Any | For publishing GitHub releases with assets |

> **NuGet Restore**: Before building for the first time, restore packages by opening the solution in Visual Studio (it restores automatically), or run:
> ```powershell
> .\src\nuget.exe restore .\src\SS-CAM\SS-CAM.csproj -PackagesDirectory .\src\SS-CAM\packages
> ```

---

## 4. Building the Application

The build system uses MSBuild with a PowerShell wrapper. Two build paths exist depending on the version target.

### v2.0+ Native WPF Build (Current)

```powershell
# Build with default version
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1

# Build with explicit version
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version 2.5.0
```

**Build output:**

```
dist\SS-CAM-v2.5.0.exe   (~5 MB, single-file, all dependencies embedded)
```

> **C# Language Version:** The MSBuild compiler at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319` only accepts `/langversion:5` (C# 5). Do **not** add `<LangVersion>` to the `.csproj` or use features requiring C# 6+ (expression-bodied members, null-conditional operators, string interpolation). Use `string.Format()` and explicit null checks throughout.

### Legacy v1.x Bootstrapper Build

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version 1.9.10
```

**Build output:**

```
dist\SS-CAM-v1.9.10.exe   (~48 MB, PowerShell wizard + payload ZIP)
```

### How the v2.0+ Build Works

1. MSBuild compiles `SS-CAM.csproj` in `Release` configuration.
2. **Fody/Costura** weaves all NuGet DLL dependencies (WPF-UI, Newtonsoft.Json, etc.) directly into the output EXE as compressed embedded resources.
3. The build script copies `bin\Release\SS-CAM.exe` to `dist\SS-CAM-v{VERSION}.exe`.
4. The result is a genuine single-file Windows executable — no runtime extraction required.

---

## 5. Running in Development Mode

Open `src\SS-CAM\SS-CAM.csproj` in **Visual Studio** and press **F5** (Debug) or **Ctrl+F5** (Start without debugging).

The app reads user settings from `%LOCALAPPDATA%\SuamiSihat\SS-CAM\` and workspace configuration from the same location.

To reset to a clean state during development, delete:

```
%LOCALAPPDATA%\SuamiSihat\SS-CAM\
```

---

## 6. Testing & Verification

All test scripts are located in `tests\`.

### Smoke Test

Validates that all WPF pages construct and render without errors:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\SmokeTest.ps1
```

Expected output: `[PASS] ALL SMOKE TESTS PASSED CLEANLY!`

### Targeted Tests

| Script | Purpose |
| --- | --- |
| `SmokeTest.ps1` | Full WPF page construction and navigation validation |
| `TestNasConnection.ps1` | Synology DDNS health check probe |
| `TestAudioSounds.ps1` | Audio playback and MediaElement verification |
| `TestNavigationTimerPersistence.ps1` | Focus timer cross-page state persistence |
| `TestResetDefaults.ps1` | User profile and settings reset validation |
| `WellbeingTimer.tests.ps1` | Monotonic timer logic and idle detection |
| `WellbeingMindDrop.tests.ps1` | DPAPI encryption and Mind Drop storage |
| `WellbeingFatigue.tests.ps1` | Fatigue rule engine logic |

---

## 7. Branch & Release Workflow

### Branch Structure

| Branch | Purpose |
| --- | --- |
| `SS-Master` | Production-stable code. All stable releases ship from here. |
| `staging` | Integration testing before promotion to `SS-Master`. |
| `feature/*` | Feature development branches, merged via pull request. |

### Release Procedure

```powershell
# 1. Ensure all changes are on the feature branch and committed
git checkout feature/my-feature
git add .
git commit -m "feat: describe the change"

# 2. Merge into SS-Master
git checkout SS-Master
git merge feature/my-feature --no-ff -m "merge: feature/my-feature for vX.Y.Z"

# 3. Build and verify
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version X.Y.Z
powershell -ExecutionPolicy Bypass -File .\tests\SmokeTest.ps1

# 4. Tag the release
git tag -a vX.Y.Z -m "Release vX.Y.Z — <brief description>"
git push origin SS-Master --tags

# 5. Update staging
git checkout staging
git merge SS-Master
git push origin staging

# 6. Create the GitHub release with asset
gh release create vX.Y.Z dist\SS-CAM-vX.Y.Z.exe `
  --title "SS-CAM vX.Y.Z" `
  --notes-file CHANGELOG_SECTION.md `
  --latest
```

### Pre-release Tagging

For intermediate builds, append the `--prerelease` flag:

```powershell
gh release create vX.Y.Z dist\SS-CAM-vX.Y.Z.exe --prerelease --title "SS-CAM vX.Y.Z (Pre-release)"
```

---

## 8. Release Lifecycle & Versioning

SS-CAM uses **Semantic Versioning**: `MAJOR.MINOR.PATCH`

| Component | Increment When |
| --- | --- |
| **MAJOR** | Architectural overhaul (e.g., v1 PowerShell → v2 C# WPF) |
| **MINOR** | New feature module or significant UI enhancement |
| **PATCH** | Bug fix, text correction, or documentation update |

### Current Release Matrix

| Version | Status | Notes |
| --- | --- | --- |
| `v2.3.6` | **Latest Stable** | Fluent 2 full compliance — Segoe Fluent Icons, token colours |
| `v2.1.0` | Stable | Radio & Focus Stream Player |
| `v2.0.7` | Stable | Dashboard Intelligence Suite |
| `v1.9.10` | Stable | Legacy PowerShell bootstrapper |
| `v1.9.2` | Stable | Legacy PowerShell bootstrapper |
| `v1.9.3` – `v1.9.9` | Pre-release | Intermediate builds |
| `v2.0.0` – `v2.0.6` | Pre-release | C# WPF refactoring builds |
| `v2.1.1` – `v2.3.5` | Pre-release | Incremental feature builds |

Version strings must be updated consistently across:

| File | Field |
| --- | --- |
| `src\SS-CAM\Properties\AssemblyInfo.cs` | `AssemblyVersion`, `AssemblyFileVersion` |
| `src\SS-CAM\MainWindow.xaml` | `Title`, header `TextBlock` |
| `src\SS-CAM\MainWindow.xaml.cs` | `CurrentVersion` constant |
| `src\SS-CAM\Views\AboutWindow.xaml` | Version badge and changelog header |
| `src\SS-CAM\Views\DashboardPage.xaml` | Version badge TextBlock fallback |
| `src\SS-CAM\Views\SettingsPage.xaml.cs` | Update check fallback string |
| `installer\Build-Installer.ps1` | Default `$Version` parameter |
| `CHANGELOG.md` | New release section header |
| `README.md` | Download link, version badge, and release table |

---

## 9. Code Standards & Security

### C# / WPF Guidelines

- Follow the existing MVVM-lite pattern: page code-behind acts as the view-model controller.
- Do not introduce new NuGet dependencies without team discussion.
- Dispose `DispatcherTimer` instances on `Window.Closed` or page unload.
- Use `try { } catch { }` defensively for all file system operations (workspace may be a NAS path with intermittent connectivity).

### Security Practices

| Area | Requirement |
| --- | --- |
| **Secrets** | No passwords, tokens, or credentials in source code, scripts, or the embedded payload |
| **DPAPI** | Mind Drop notes are encrypted with `ProtectedData.Protect` (CurrentUser scope) — never stored as plain text |
| **Execution Policy** | `Build-Installer.ps1` uses `-ExecutionPolicy Bypass` scoped to the build session only |
| **Font Licensing** | Verify multi-seat licensing for commercial typefaces before distributing outside the internal team |
| **Binary Exclusion** | `dist/` is `.gitignore`d — compiled EXEs are distributed via GitHub Releases only |
| **Code Signing** | Sign release EXEs with the organisation OV certificate via `signtool.exe` to suppress Windows SmartScreen |

---

## 10. Branding & Design Tokens

All UI elements must conform to the SuamiSihat official brand palette.

### Colour System

All colours are defined as `SolidColorBrush` resources in `Styles/Fluent2Styles.xaml`. Always reference the named token — **never use raw hex literals in XAML**.

| Token Key | Hex | Usage |
| --- | --- | --- |
| `FluentBrand80` | `#043388` | Primary headings, interactive elements, key metrics |
| `FluentBrandTint` | `#21A1F7` | Supporting accent, badges, chart highlights |
| `FluentBrandLight` | `#EFF6FF` | Tinted highlight backgrounds (info cards, selected rows) |
| `FluentDarkCanvasBg` | `#022057` | App header background, dark hero surfaces |
| `FluentLightTextPrimary` | (system) | Primary label text |
| `FluentLightTextSecondary` | `#64748B` | Secondary text, metadata labels, column headers |
| `FluentLightCardBg` | `#FFFFFF` | Card surface background |
| `FluentLightCardSubBg` | `#F8FAFC` | Sub-card, alternating row, secondary surface |
| `FluentLightStroke` | `#CBD5E1` | Border lines, dividers |
| `FluentSuccess` | `#10B981` | Positive states (growth, active, online) |
| `FluentWarning` | `#F59E0B` | Warning states, storage highlights |
| `FluentDanger` | `#EF4444` | Error states, stale/offline indicators, stop buttons |

### Icon System

Use **Segoe Fluent Icons** exclusively for UI chrome icons. Set `FontFamily="Segoe Fluent Icons"` on a `TextBlock` with the Unicode glyph (e.g. `Text="&#xE72C;"`). Do **not** use emoji characters (`📁`, `🔄`, `📻`) in any button, header, or status element. Emoji are acceptable only in user-generated content contexts (e.g. radio station icons bound from user data).

### Logo Usage

- Use the **dark-background variant** on the `#022057` header.
- Use the **light-background variant** on white/light surfaces.
- Do not recolour, distort, apply effects, or alter the logo proportions.

---

## 11. Extending the Payload

### Adding Fonts

1. Place font files in `payload\Fonts\` in the appropriate numbered sub-folder.
2. Add a licence file alongside the fonts.
3. Rebuild with `Build-Installer.ps1`.
4. Update the typography table in [README.md](./README.md).

### Adding Brand Assets

1. Place logos in `payload\Brand Assets\Logos\`.
2. Place design library files in `payload\Brand Assets\Libraries\`.
3. Place colour palettes in `payload\Brand Assets\Colour Palettes\`.
4. Rebuild the EXE with an incremented `PATCH` version.

### Adding Audio

1. Place `.mp3` and `.ogg` files in `payload\Audio\`.
2. Reference the audio file path in `AudioFeedbackService.cs`.
3. Test playback with `tests\TestAudioSounds.ps1`.

---

*For user-facing documentation, see [README.md](./README.md). For the full version history, see [CHANGELOG.md](./CHANGELOG.md).*
