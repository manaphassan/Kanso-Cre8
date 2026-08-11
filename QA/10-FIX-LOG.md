# SS-CAM FIX LOG

## v2.6.3 — 2026-08-11 (Art-Director & Architecture Audit Remediation)

### Phase P0: Git Hygiene & Core Logic Fixes
- **Binary Untracking**: Un-tracked ~50 MB of binary files (`src/SS-CAM/packages/`, `SS-CAM-v2.6.1.exe`, `nuget.exe`) from Git tracking.
- **Regex Capture Fix**: Updated `ProjectPattern` in `WorkspaceScanner.cs` to `^(\d{6})_([A-Z0-9]+)(?:_([A-Z0-9_-]+))?` to parse job and brand codes.
- **Hardcoded Path Clean**: Removed machine-specific `e:\Dev\...` path fallback from `PayloadInstallerService.cs`.

### Phase P1: Async Network & Timer Leak Prevention
- **Async Network Fetch**: Replaced synchronous `HttpWebRequest` in `PrayerTimeService.cs` with static `HttpClient` singleton and `FetchTodayAsync`.
- **UI Responsiveness**: Made `WaktuSolatPage.xaml.cs` fetch asynchronous to eliminate 2–9s UI thread freezes.
- **Timer Leak Fixes**: Added `Unloaded` handlers to stop `DispatcherTimer` instances on `WaktuSolatPage`, `WellbeingPage`, and `DesignTokensPage`.
- **Dark Mode Repair**: Fixed hardcoded hex avatar border colors in `SettingsPage.xaml` using `{DynamicResource FluentBrand80}` and `{DynamicResource FluentBrand70}`.

### Phase P2: UI/UX Token & Icon Standardization
- **Dynamic Surface Tokens**: Converted hardcoded white backgrounds in `SearchCopyPage.xaml`, `QuickNotePage.xaml`, `TaskManagerPage.xaml`, and `ProjectCreatorPage.xaml` to `{DynamicResource TextControlBackground}` and card tokens.
- **Icon Vector Migration**: Replaced raw text emojis in `ProjectCreatorPage.xaml` with vector Segoe Fluent icons (`&#xE713;`, `&#xE8B7;`, `&#xE8EA;`, `&#xE8B2;`, `&#xE749;`).
- **Control Template Target**: Fixed `ControlTemplate TargetType="ui:Button"` in `DesignTokensPage.xaml`.

### Phase P3: Synology NAS & Diagnostics Safety
- **NAS File Lock Resilience**: Added 3-attempt exponential backoff retry loop for `IOException` in `TeamBoardService.Save`.
- **MAX_PATH Protection**: Added 240-character path validation to `ProjectGeneratorService.cs`.
- **Diagnostic Logging**: Replaced all silent `catch {}` blocks across `PrayerTimeService`, `ThemeService`, `ProjectCreatorPage`, `SearchCopyPage`, and `MainWindow` with `Debug.WriteLine` logging.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v2.6.1 — 2026-08-11 (Header Title Rebranding & Persistent SS Blue Wavelength Player)

### Key Updates & Fixes
- **Header Title Rebranding**: Rebranded app title to `SS Creative Assets Management` with a 100% full-width `#022057` SuamiSihat deep blue TitleBar strip, transparent window caption buttons (`— 🗖 ✕`), and native window dragging (`DragMove`).
- **Persistent SS Blue Bottom Radio Player Bar**:
  - Full SuamiSihat deep blue background (`#022057`) with `#043388` accent border.
  - **Fluid Wavelength Vector Audio Visualizer**: 60 FPS real-time vector path visualizer (`StreamGeometry`) featuring a 4-stop gradient stroke (`#60A5FA` → `#38BDF8` → `#34D399` → `#818CF8`) and ambient gradient fill under the wave curve.
  - **Station Cover Image**: Integrated station cover art image loader (`BitmapImage`) supporting local/remote artwork with seamless emoji fallback.
  - **Aligned Now-Playing Layout**: Aligned Station Name + Emerald Green `LIVE` Pill on Line 1, and `NOW PLAYING:` tag + track subtext on Line 2, centered vertically alongside the 40x40 cover image.
- **Top Hero Featured Radio Player Banner**: Refactored `RadioPage.xaml` into a 4-row layout featuring a Top Hero Featured Station Banner, eliminating player redundancy.
- **Strict Equal-Height Dashboard KPI Grid**: Enforced `UniformGrid Rows="2" Columns="4" Height="224"` with `VerticalAlignment="Stretch"` on all 8 KPI widgets for 100% uniform cell heights across all rows.
- **Sidebar Cleanup**: Removed redundant radio status text from left navigation sidebar footer (`PaneFooter`).

### Verification
- Release Build: PASS (`bin\Release\SS-CAM.exe`).
- Source Guardian: PASS with 0 FAIL findings (`verify-sscam.ps1`).
- Package Executables: `SS-CAM-v2.6.1.exe` and `dist\SS-CAM-v2.6.1.exe` verified.

---

### Phase 1 — UI/UX Modernization
- **Dashboard Enhancements**: Updated metric cards with relative time calculations ("Today", "2 days ago") and replaced GroupBox containers with elevated `<ui:Card>` components.
- **Project Creator Polish**: Replaced all GroupBox containers with Fluent 2 `<ui:Card>` wrappers and migrated text emojis to `ui:SymbolIcon` vector icons.

### Phase 2 — High-Impact Workflow Automation
- **Deep App Bridge**: Added dynamic canvas launcher button ("Open in Photoshop / Illustrator / Affinity") to Project Creator success UI.
- **One-Click Project Finalizer**: Added "Finalize & Archive..." feature to Search & Copy inspector. Automatically locates and compresses `04_Production`/`_Deliverables` and `01_Artwork_Design`/`_Raw_Assets` into standardized ZIP archives.
- **Dependencies**: Added `System.IO.Compression` and `System.IO.Compression.FileSystem` assembly references.

### Phase 3 — Visual Tools & Assets Management
- **Global Brand Kit Quick-Tray**: Added `🎨 Brand Kit` title bar button and popover tray with 1-click HEX swatch clipboard copying accessible anywhere in the app.
- **Visual Asset Lightbox**: Upgraded image previewer in Search & Copy to a dark Fluent 2 Lightbox modal (`#0B1120`) displaying pixel dimensions, file size, format badges, and action controls.
- **Visual Version Control Timeline View**: Added `Timeline` mode tab to Search & Copy inspector. Scans project directory and renders chronological revision timeline with color-coded status badges (`Revision`, `Production`, `Master Canvas`, `Asset`).

### Verification
- Debug Build: PASS (`SS-CAM -> bin\Debug\SS-CAM.exe`).
- Source Guardian: PASS with zero FAIL findings (`verify-sscam.ps1`).
- Package Executable: [`SS-CAM-v2.6.2-Phase3.exe`](file:///e:/Dev/Projects/SS-Brand-Assets/SS-CAM-v2.6.2-Phase3.exe) generated and verified.

## Unreleased — 2026-08-11 (SS Default Theme and Title Bar)

### P1 — High

- **BUG-11** SS Default applied WPF-UI Dark mode despite declaring a light canvas and card palette. It now applies Light mode, restoring the intended light content surface while retaining the SS navy navigation pane and blue title bar.

### P2 — Medium

- **BUG-12** Title bar header content was allowed to measure to its content width, leaving a large left gap before the navigation toggle. The title bar header now stretches through the supported WPF-UI content-alignment properties; the explicit toggle inset was also removed.

### P3 — Low

- **BUG-13** Replaced all silent `catch {}` blocks with diagnostic logging, including best-effort cleanup paths, so recoverable failures remain traceable without changing existing fallback behaviour.
- **BUG-14** Replaced raw Unicode title-bar tooltip characters with XML entities to prevent source encoding regressions.

### Verification

- Debug build: PASS.
- Source Guardian: PASS with no warnings.
- Visual desktop confirmation: BLOCKED; the available desktop-capture session could not initialize.

## v2.6.0 — 2026-08-11 (Smoke Test Bug Fix Release)

### P0 — Critical

- **BUG-01** `FrontmatterService.ParseFrontmatter` — `return null` on unclosed frontmatter block replaced with `return result`. Task Manager now correctly reads projects whose README.md has missing closing `---`.

### P1 — High

- **BUG-02** Version string mismatch — `CurrentVersion`, `AssemblyVersion`, window title, and CHANGELOG all aligned to v2.6.0.
- **BUG-03** `OnStatusThemeToggle` — wired to the Theme row in `MainWindow.xaml` via `MouseLeftButtonDown` + `Cursor="Hand"` + ToolTip. Theme cycling from sidebar footer is now functional.
- **BUG-03** Orphaned handlers `OnOpenGithub` and `OnOpenAboutWindow` removed from `MainWindow.xaml.cs` (no XAML targets existed).
- **BUG-04** Dead fields `isSidebarExpanded` and `_lastActiveNavBtn` removed from `MainWindow.xaml.cs`. Compiler warnings eliminated.

### P2 — Medium

- **BUG-05** `workspaceRoot` default changed from `D:\Testing` to `string.Empty` in `DashboardPage`, `SearchCopyPage`, and `ProjectCreatorPage`. Unconfigured installs no longer silently scan a non-existent path.
- **BUG-06** `TeamBoardService.GetNotesPath` now guards against creating `_Team` folder on an inaccessible or unconfigured `workspaceRoot` (returns `null`). `Save()` checks for `null` path and returns `false` immediately. Fixes silent local write when NAS is offline.
- **BUG-07** `WorkstationHealthPage.OnRescanSoftwareClicked` — dynamic count from `ScanInstalledDesignSoftware()` with correct pluralisation replaces hardcoded "11 packages".
- **BUG-08** `DashboardPage._httpClient` — singleton `static readonly HttpClient` replaces per-fetch `new HttpClient()` inside `using`. Eliminates socket exhaustion risk.
- **BUG-09** `QuickNotePage.RenderPreview` — added `###` H3 branch (`FontSize=14, SemiBold`) before `##` and `#` checks to fix check-order collision.

### P3 — Low

- **BUG-10** `FrontmatterService` — `ReadStatus` and `WriteStatus` silent `catch {}` replaced with `catch (Exception ex) { Debug.WriteLine(...) }`.
- **BUG-10** `TeamBoardService` — `LoadNotes`, `Save`, and `GetNotesPath` silent `catch {}` replaced with `Debug.WriteLine` logging. `using System.Diagnostics` added to both services.

---

## P0: Component Refactoring (MainWindow & Fluent 2 UI)

- Migrated legacy Sidebar to `Wpf.Ui NavigationView`.
- Refactored `MainWindow.xaml` and `MainWindow.xaml.cs`.
- Converted all 117 `<Button>` instances to `<ui:Button>` across 11 XAML Pages.
- Converted all `<TextBlock>` instances to `<ui:TextBlock>` across all Pages.
- Globally configured `Wpf.Ui.Appearance.Accent` to use Brand Cyan.

## P1 & P2: Backend Reliability

- Implemented `JsonPersistenceHelper.cs` to eliminate serialization crashes and duplication.
- Refactored `UserProfileService.cs` and `ThemeService.cs` to use the helper.
- Hardened `PrayerTimeService.cs` to enforce TLS 1.2 and use a 10s timeout to prevent UI freezes.
- Added NAS Pre-flight checks (`Directory.Exists`) to `ProjectGeneratorService.cs` and `WorkspaceScanner.cs`.

