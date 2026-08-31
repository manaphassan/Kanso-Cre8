# SS-CAM FIX LOG

## v4.6.0 — 2026-09-01 (Beta Release — Preflight Quality Auditor, Android Bento Telemetry, Persistent Caching, Live Radio Streaming & Desk Standby Mode)
- **Assembly Version**: `4.6.0.0` / Android `versionCode = 460`, `versionName = "4.6.0"`
- **Desktop Preflight Quality Auditor (`PreflightValidatorService.cs`)**: Automated 5-folder vault hierarchy audit, YAML frontmatter validation, `COPY.md` script length checks, deliverable file inspection, and canonical asset naming validation with 1-Click Auto-Fix scaffolding.
- **Android 2×2 Bento KPI Telemetry (`DashboardCompanionScreen.kt`)**: Zero-scroll telemetry grid with instant touch filtering for Active Tasks, Due Projects, Active Brands, and NAS Assets.
- **Android Left Severity Accent Strips (`CommonComponents.kt`)**: 4.5dp rounded status indicator strips (🔴 Crimson for Urgent, 🟠 Amber for High, 🟡 Gold for Standard, 🟢 Green for Done) on Task Review cards.
- **Android Persistent Local Caching & Zero-Mock Flow (`ProjectCacheManager`, `MainActivity.kt`)**: Local JSON serialization in `SharedPreferences` enabling instant 0ms offline launch without dummy placeholder data.
- **Live Stream Radio Metadata Engine**: Implemented `LiveStreamMetadataFetcher` for AzuraCast API, Laut.fm, Plaza One, SomaFM, and universal ICY header byte chunk parsing (`icy-metaint`) with real-time station track titles on `TopAppBar` equalizer pill and cassette deck ribbon.
- **Ss-Hero Animated Splash Screen**: Implemented dynamic particle wave canvas backdrop with ambient glow, vector SuamiSihat logomark, and Biometric PIN lock gateway.
- **Interactive Fluent Markdown Viewer**: Implemented high-performance Markdown parser in Compose supporting interactive task checkbox state toggling and direct disk/memory persistence.
- **Standby Desk Companion Mode**: Full-screen OLED black standby clock with focus sprint timer, focus progress rings, and landscape/portrait orientation adaptation.
- **Material You Monochromatic Iconography**: Added adaptive launcher icons and monochrome drawables for Android 13+.
- **Source Guardian & Quality Suite**: 9/9 checks passed (Encoding, Fluent 2, Data Safety, Thread Safety).
- **Physical Device Wireless Verification**: Built and verified over ADB TLS on physical TECNO KL8 device and Android emulator.

---

## v4.5.1 — 2026-08-30 (Cross-Platform Ecosystem Synchronization & Major Stable Release)
- **Assembly Version**: `4.5.1.0`
- **Windows Desktop Client**: Compiled single-file portable executable (`dist/SS-CAM-v4.5.1.exe`), 100% theme-adaptive DynamicResource tokens in `WellbeingPage.xaml`, and UTF-8 BOM compliance.
- **Web Management Portal**: Resolved desktop mobile bottom dock rendering defect, hardened theme persistence in `appState.svelte.ts`, zero-emoji Fluent 2 design system with 45+ SVG icons, and 28/28 passing test suite.
- **Android Companion App**: Null-safe `ManageProjectBottomSheet.kt`, bottom navigation standardization (`Overview`, `Tasks`, `Studio`, `Lounge`), and successful Gradle debug build (`assembleDebug`).
- **Source Guardian & Quality Suite**: 9/9 checks passed, 100% test coverage.

---

## v4.5.0 — 2026-08-28 (Master Brand System v3.5.1 Integration & Brand Assets Vault Modernization)
- **Assembly Version**: `4.5.0.0`
- **Master Brand System Integration**: Synchronized with official SuamiSihat Master Brand System Guide v3.5.1 with Two-Layer System Architecture.
- **Multi-Format Color Matrix**: Added Primary, Secondary Warm, Foundation, and Semantic palettes (`#107C10`, `#D83B01`, `#A80000`) and calibrated 7-stop grayscale with corrected Grey 90 (`#3C3C3B`).
- **Live Specification Inspector**: Real-time readout of HEX, RGB, CMYK, BAL/RAL Standard, and Pantone PMS with 1-click copy buttons.
- **5 Operating Corporate Sub-Brands Hub**: Dedicated cards and 1-click Explorer folder launchers for SS Health, SS Clinic, SS Wellness, SS Ecommerce, and SS Technology.
- **Master Logo Surface Contrast Previewer**: Interactive stage switcher for Light Porcelain, Dark Void, and Prussian Blue validating the HSL L ≥ 50% lightness rule.
- **4-Tier Typography Scale Reference**: Visual hierarchy guidelines for Poppins, Montserrat, Helvetica Neue, and Calibri.
- **Source Guardian & Smoke Tests**: 9/9 checks passed; 100% smoke test pass rate.

---

## v4.4.3 — 2026-08-27 (Radio Visualizer Overhaul & Station Upgrades)
- **Assembly Version**: `4.4.3.0`
- **Dynamic Real-Time Playback Gating**: Mars symbols and logomarks automatically hide (`Opacity = 0.0`) when radio is stopped/idle, smoothly fading in on active playback.
- **Song Wavelength & Beat Modulation**: Particles oscillate along sinusoidal wavelength across canvas width; beat kicks trigger size pulse (+35%) and upward acceleration.
- **Cross-Mode Visualizer Architecture**: Unlinked backdrop particles from `HeroMesh` so they animate seamlessly across `WaterDrop`, `Waveform`, `SpectrumBars`, and `HeroMesh`.
- **Curated Radio Presets**: Replaced `CITYPlus FM` with `Nightwave Plaza` (Synthwave) and `SomaFM: Groove Salad` (Ambient/Chill).
- **Calendar Malaysia Public Holidays**: Added full Malaysia public holidays schedule into calendar event dispatcher.
- **Copywriting Studio Rich FlowDocument Mode**: Script canvas renders FlowDocument formatted markdown preview by default with smooth edit toggle.

---

## v4.4.2 — 2026-08-27 (Art Director Polish & Live Ad/WhatsApp Preview Engine)
- **Assembly Version**: `4.4.2.0`
- **Copywriting Studio Split-View Live Preview**: Built real-time 3-mode segmented switcher (`Split Preview`, `Rendered Doc`, `Editor Only`) with dual-pane layout.
- **WhatsApp Live Chat Bubble Simulation**: Real-time rendering of formatted WhatsApp broadcast copy (`*bold*`, emojis, live timestamp, double checkmarks).
- **Meta Ad Primary Text Preview**: Real-time mock rendering of sponsored feed ad with official brand avatar, headline, and `[Send Message]` CTA button.
- **Creative Snippet & Hook Drawer**: 1-click insertion chips for viral frameworks (TikTok 3-Hook, Meta PAS, Neubrutalist, Retro Story) and instant snippets (WhatsApp link, Promo Voucher, KKM Disclaimer, 100% Original Halal Guarantee, Urgency Timer).
- **Status Pill Badge**: Dynamic status indicator (`[● Ready / NAS Synced / Unsaved Changes]`).
- **Typographic Rhythm & Overlines**: Standardized overlines (`11px Bold CharacterSpacing="50"` in `FluentBrand80`) for visual hierarchy.

---

## v4.4.1 — 2026-08-26 (Maintenance & Enhancement Release — PUBLISHED)
- **GitHub Release**: PUBLISHED (`v4.4.1` set as Latest on SuamiSihat/ss_cam)
- **Documentation**: Updated (CHANGELOG.md, ROADMAP.md, QA suite headers aligned to v4.4.1)
- **Source Guardian**: PASS (9/9 checks passed)
- **Web Test Suite**: PASS (20/20 tests passed)
- **Wiki**: N/A (wiki update deferred)

### Features
- **Official SuamiSihat Radio Stream**: Integrated live stream (`https://dj.suamisihat.myds.me/listen/suamisihat-radio/radio.mp3`) as pinned `#1` preset in `RadioStreamService.cs` with migration preservation.
- **Deep Month-Container Vault Discovery**: Updated directory matching regex to bypass intermediate month containers (`202608_August`) across `WorkspaceScanner.cs`, `WorkloadSlaService.cs`, and `CopywritingPage.xaml.cs`.
- **Dynamic Project ID Counter Calculation**: Multi-tier directory scan in `ProjectCreatorPage.xaml.cs` to accurately compute sequential job IDs across containers and year vaults.
- **Copywriting Studio Rich FlowDocument Rendering**: Integrated `MarkdownHelper.ToFlowDocument` into `CopywritingPage.xaml.cs` with default rendered preview and icon-only Preview/Edit mode toggles (`Eye24` / `Edit24`).
- **Catalog Designer Filtering Sanitization**: Filtered out raw system folders (`#recycle`, `2026`) and mapped projects to team members via `UserProfileService.GetStaffDirectory()` and `ResolveProjectDesigner`.
- **UI Text Clipping Remediation**: Standardized ComboBox heights and paddings in `SearchCopyPage.xaml`.

### Fixes
- **Dashboard Workload Year Bug**: Fixed `ComputeDesignerWorkloads` erroneously returning year folder names (`2026`) as designer names. Overhauled to use staff directory + `ResolveProjectDesigner`.
- **Manager Role Exclusion — Metrics & Filters**: Added `IsDesignerOrAdminRole` predicate; excluded Manager / CEO / Executive roles from Dashboard capacity radar (Desktop & Web), all designer filter dropdowns (`WorkspaceScanner.GetDesignerFolders`, `TaskManagerPage`, `CalendarPage`), Web metrics (`WorkspaceService.js`, `TeamService.js`).
- **Mouse Wheel Scrolling Restored (All 15 Pages)**: Added global `OnGlobalPreviewMouseWheel` on `MainWindow` NavigationView (walks visual tree). Per-page `PreviewMouseWheel` wire-up on 10 previously broken pages. Kanban board gains horizontal wheel scroll support.

---

## v4.4.0 — 2026-08-20 (Designer Workload Heatmaps & Creative SLA Analytics)
- **GitHub Release**: PUBLISHED (`v4.4.0` set as Latest on SuamiSihat/ss_cam)
- **Designer Workload & Capacity Radar**: Integrated `WorkloadSlaService.cs` and `DashboardPage.xaml` radar grid computing real-time designer capacity scores and bandwidth statuses (`Optimal`, `High Load`, `At Capacity`).
- **Creative SLA Turnaround Telemetry**: Added First-Time Right %, Average Turnaround Days, and Average Revision Rounds tracking.
- **Web Portal Analytics**: Extended `WorkspaceService.js` and `DashboardView.svelte` with capacity progress bars and SLA analytics cards.
- **Source Guardian**: PASS (9/9 checks passed).
- **Test Suite**: PASS (20/20 web tests passed, MSBuild Release build passed).

---

## v4.3.0 — 2026-08-20 (Asset Export, Packaging & Naming Engine)
- **1-Click Creative Handover Packaging**: Built `ExportPackagingService.cs` and `ExportService.js` with auto-generated `HANDOVER_SUMMARY.html`.
- **Canonical Asset Naming & Sanitizer**: Built `AssetNamingService.cs` canonical validator and batch sanitizer.
- **Source Guardian & Build**: PASS (9/9 checks, 19/19 tests).

---

## v4.2.0 — 2026-08-20 (Desktop NAS Sync & Batch Operations + Web Real-Time SSE)
- **Desktop NAS File Watcher & Thumbnail Engine**: Built `WorkspaceWatcherService.cs` and `ThumbnailCacheService.cs`.
- **Desktop Batch Operations & Virtualization**: Extended `SearchCopyPage.xaml` with multi-select ribbon and virtualization.
- **Web Real-Time SSE Feed & Video Range Streaming**: Built `SseService.js` and HTTP 206 partial content range requests in `DeliverableService.js`.

---

## v4.1.0 — 2026-08-19 (Desktop Feature Parity & Studio Overhaul)
- **Desktop Copywriting Studio**: Built `CopywritingPage.xaml` and `CopywritingDesktopService.cs`.
- **Contextual Discussions & Comments Engine**: Built `ProjectCommentService.cs` for `_comments.jsonl`.
- **ClickUp 3.0-Style 2-Column Task Workspace**: Upgraded `SearchCopyPage.xaml`.

---

## v4.0.0 — 2026-08-18 (Centralized Vault Hierarchy & Web Management Portal)
- Unified Year-first hierarchy (`Creative-Team/[YYYY]/[YYYYMM_Month]/[ProjectFolder]`).
- Built Svelte 5 + Node.js Web Management Portal (`SS-CAM.Web`).

---

### Added & Refined Modules
- **Metamorphosis Theme Surface Opacity (`MetamorphosisTheme.xaml`)**: Replaced all semi-transparent white card background brushes (`#26FFFFFF`, `#14FFFFFF`) with solid opaque deep space navy surface colors (`#0F1A3A`, `#142045`), eliminating background text bleed-through on overlay drawers (`DayDetailPanel`) and cards.
- **Input & Control Surfaces**: Replaced transparent control fills with solid navy control fills (`#0C1633` input background, `#14224B` control fill) and updated border stroke tokens (`#1E2E5C`, `#243977`).
- **Web Portal Alignment (`fluent2-tokens.css`)**: Set `--glass-bg` to `#0F1A3A` for `[data-theme="metamorphosis"]`.
- **Automated Quality Attestation**: Source Guardian audit 100% PASS (9/9 checks).

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe` / `dist/SS-CAM-v3.6.1.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v3.6.0 — 2026-08-17 (Fluent UI Web & Data Visualization Release)
- **Fluent UI Web Integration**: Incorporated official Microsoft Fluent UI Web token custom properties (`--colorNeutralBackground1`, `--colorBrandBackground`) and `sscam-fluentui-web` skill guidelines.
- **3-Tier F-Pattern Dashboard**: Built 5-KPI Strategic Summary Bar, Production Stage Pipeline Velocity Flow, and Designer Capacity Heatmap in `DashboardView.js`.
- **Copywriting AI Presets**: Built TikTok Hooks, Facebook Problem/Solution Angles, and Product Packaging Benefit Claims presets in `CopyStudioView.js`.

---

## v3.5.0 — 2026-08-17 (In-App Project Brief Editor, Workspace Designer Scoping & Repository Hygiene)

### Added & Refined Modules
- **In-App Project Brief Markdown Editor (`SearchCopyPage`)**: Live editing and saving of project `README.md` and YAML frontmatter directly inside the Search & Copy catalog pane with Markdown formatting toolbar (Headings, Bold, Italic, Code, List) and real-time feedback via `NotificationService`.
- **Workspace Designer Scoping**: Dynamic discovery and dropdown filtering across designer workspaces (`0001D`, `0002S`, etc.) on local and Synology NAS shares.
- **Minimal Brand Assets & Swatch Inspector**: Minimal 2-column layout with tabbed Primary/Secondary/Neutrals swatches and live HEX/RGB/CMYK/Pantone inspector.
- **Repository Hygiene & Architecture Cleanup**: Eliminated redundant root build binaries, old log files, and obsolete scratch files. Updated `.gitignore` to prevent test workspaces and ephemeral files from dirtying the working tree.
- **Automated Source Guardian Validation**: 100% PASS on UTF-8 BOM, Fluent 2 standards, thread and data safety.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe` / `dist/SS-CAM-v3.5.0.exe`).
- Smoke Test: PASS (`tests/SmokeTest.ps1` — 100% clean instantiation).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v3.5.0-linux — 2026-08-14 (Fedora Linux Native Desktop Port)
- **Linux Platform**: Native Avalonia UI (.NET 8) desktop app scaffolded (`src/SS-CAM.Linux/`).
- **Target OS & NAS**: Fedora Linux (GNOME / Wayland) & Synology Drive Client (`~/SynologyDrive/`).
- **Windows Safety**: Existing Windows WPF application (`src/SS-CAM/`) remained 100% untouched.
- **Source Guardian**: PASS (9/9 automated checks passed).
- **Git Housekeeper**: Cleaned temporary build artifacts, restored UTF-8 BOM, and pushed to `origin/SS-Master`.

---

## v3.4.0 — 2026-08-13 (Starter Canvas Engine, Category Filtering & Calendar Quick Status Actions)

### Added & Refined Modules
- **Starter Canvas Engine**: Integrated `.af`, `.psd`, and `.ai` starter canvas format generation with default Affinity Designer format support (`.af`) and 2026 industry platform specs.
- **Project Creator Presets & Dynamic Category Filtering**: Added Rollup Bunting (80x200cm), Trifold A4 Brochure, A5 Leaflet, and Web Design category presets. Dynamically filters target platform options and highlights visual cards based on category.
- **Search & Copy Category Filter**: Added category filter dropdown in `SearchCopyPage` for dynamic asset and copy snippet filtering.
- **Creative Calendar Quick Status Actions**: Integrated direct project status actions (`In Progress`, `Review`, `Done`) inside `CalendarPage.xaml.cs` day detail view overlay with automatic frontmatter synchronization.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v3.3.0 — 2026-08-13 (Fluent 2 Splash, Notification & Clipboard Services Release)

### Added & Refined Modules
- **Fluent 2 Startup Splash Window (`SplashWindow`)**: Branded Fluent 2 startup splash screen with smooth progress initialization, animated branding visual, and background service loading.
- **Centralized Notification & Clipboard Services (`NotificationService`, `ClipboardService`)**: Toast notification dispatcher for background tasks, copy events, and file system warnings alongside safe non-blocking clipboard helpers.
- **Task Manager Queue & Parser Upgrades**: Expanded drawer sorting options, date sorting refinements, and frontmatter parser enhancements for Markdown rendering.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v3.2.0 — 2026-08-12 (Big Calendar & Task Manager Upgrade Release)

### Added & Refined Modules
- **Big Calendar Module (`CalendarPage`)**: Native 7×6 monthly calendar timetable displaying project creation start dates and campaign deadlines as color-coded chips, Friday Solat indicators, interactive Day Detail Overlay inspector, and month navigation.
- **Task Manager Queue Management**: `created:` frontmatter tag support, auto-inferring legacy project creation dates (`InferCreatedDate`), queue age display (`📅 14d in queue`), FIFO Queue Order sorting (`Oldest First`), and `Created Date` drawer editor.
- **SSNAS Synology Drive Setup Guide**: Created official setup guide (`docs/SSNAS-SETUP.md`).

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

## v3.1.2 — 2026-08-12 (Multi-User NAS Isolation Release)

### Multi-User NAS Scoping & Isolation
- **User Scoped Config Files**: Personal configs (`user_profile_{username}.json`, `theme_config_{username}.json`, `Notes_{username}/`) are automatically isolated per designer on shared NAS folders.
- **Shared Team Resources**: Category presets (`category_presets.json`) and Team Board announcements (`_Team\team-notes.json`) remain team-wide shared.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).
- GitHub Release: PUBLISHED (v3.1.2 set as Latest on SuamiSihat/ss_cam).

---

## v3.1.1 — 2026-08-12 (NAS Settings & Preferences Auto-Sync Release)

### Native NAS Settings Auto-Sync
- **`NasConfigSyncService`**: Implemented timestamp-aware auto-sync for `user_profile.json`, `theme_config.json`, `category_presets.json`, and `Notes/` directory to `<WorkspaceRoot>\_Team\_Config\`.
- **Multi-PC Seamless Sync**: Setting changes on PC 1 automatically update NAS config files; PC 2 auto-detects and loads newer NAS config on launch.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).
- GitHub Release: PUBLISHED (v3.1.1 set as Latest on SuamiSihat/ss_cam).

---

## v3.1.0 — 2026-08-12 (QR Code Studio & Audio Visualizer Release)

### QR Code Generator & Studio Visualizer Upgrades
- **QR Code Studio Module**: Added `QrCodePage.xaml` / `QrCodeEncoderService.cs` supporting URL, Plain Text, Wi-Fi, and VCard payload types with brand palette customization, high-res PNG file export, and Clipboard copying.
- **Sound Engineer Studio Visualizer**: Upgraded `VisualizerService` with floating Mars symbols (♂), SuamiSihat crest particle physics, peak-reactive motion, and watermark removal.
- **Radio & Audio Studio**: Enhanced `RadioPage` layout, spectrum feedback, and station controls.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).
- GitHub Release: PUBLISHED (v3.1.0 set as Latest on SuamiSihat/ss_cam).
- Documentation: Updated (README, ROADMAP, CHANGELOG, QA Suite aligned to v3.1.0).

---

## v3.0.1 — 2026-08-12 (Art Director Full QA Run)

### Sidebar Navigation & Footer Collapse
- **Categorized Navigation**: Grouped all 11 application modules into 5 logical categories (`OVERVIEW`, `CREATION & ASSETS`, `PRODUCTIVITY`, `WELLBEING & FAITH`, `SYSTEM`) using `ui:NavigationViewItemHeader` and `ui:NavigationViewItemSeparator`.
- **Adaptive Footer Collapse**: `OnNavigationPaneOpened` / `OnNavigationPaneClosed` handlers hide status text and switch bottom player to compact mode when sidebar collapses.
- **Footer Icon Centering**: Status icons correctly centered in compact collapsed mode.

### Verification
- Release Build: PASS (`src/SS-CAM/bin/Release/SS-CAM.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).
- GitHub Release: PUBLISHED (v3.0.1 set as Latest on SuamiSihat/ss_cam).
- Documentation: Updated (README, FINAL-QA-REPORT, QA/README, 10-FIX-LOG aligned to v3.0.1).

---

## v3.0.0 — 2026-08-12 (Major Release)

### Major UI/UX & Settings Module Overhaul
- **Settings & Profile Revamp**: Rebuilt `SettingsPage.xaml` with Fluent 2 two-column grid, section icon badges, interactive theme swatches (Falconia, Metamorphosis, Catppuccin, Rosé Pine, Nord), workstation payload installer, category preset management, and reset action rows.
- **Theme Engine Expansion**: Added 3 new switchable theme profiles (`Catppuccin`, `RosePine`, `Nord`) to `SettingsPage.xaml.cs` and `ThemeService.cs`.
- **Navigation Safety**: Relocated Settings item to `MenuItems` in `MainWindow.xaml` to eliminate hit-test collisions.
- **100% Clean Source Guardian & Encoding**: Fixed non-ASCII characters with XML entities, restored UTF-8 BOM, and verified zero undefined `DynamicResource` tokens.

### Verification
- Release Build: PASS (`SS-CAM-v3.0.0.exe`).
- Source Guardian: PASS with 9/9 passed, 0 warnings, 0 fails (`verify-sscam.ps1`).

---

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

## P1: Creative Wellbeing & Biometric Suite Overhaul (v4.4.4)

- **Biometric Radar Mathematical Label Positioning**:
  - Replaced hardcoded text offsets with dynamic quadrant-specific text measurement (`Measure(Size)`), resolving label-polygon overlap across all 5 axes (`Energy`, `Focus`, `Rest`, `Pressure`, `Flow`).
- **Biometric Flow Calibrator**:
  - Integrated 1–5 baseline rating system for Vitality, Cognitive Lock, and Perceived Stress with standardized Segoe UI Variable typography.
- **Hydration Tracker & Full-Height Balance**:
  - Fixed empty top/bottom whitespace by normalizing Fluent 2 card padding and wave container height.
- **Dynamic 30-Day Heatmap**:
  - Standardized day coordinate math, day labels (`Mon`, `Wed`, `Fri`), and high-contrast theme-aware 0-minute day tiles.


