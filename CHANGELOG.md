# Changelog

All notable SS-CAM changes are documented here.

## [4.6.0] - 2026-09-01 (Android Native Companion Modernization, Live ICY Stream Metadata Engine & Desk Companion Standby Mode)

### Added & Refined — Android Studio Companion Modernization, Live Real-Time Radio Metadata & Desk Standby Mode
- **Real-Time Live Radio Metadata & Broadcasting Engine (`LiveStreamMetadataFetcher`, `StudioRadioManager`)**:
  - Direct live API integration with **SuamiSihat AzuraCast** (`https://dj.suamisihat.myds.me/api/nowplaying/suamisihat-radio`) resolving live artist, track title, and album metadata on-air.
  - Integration with **Laut.fm** (`animefm`, `lofi`), **Nightwave Plaza** (`https://api.plaza.one/status`), and **SomaFM Groove Salad** (`https://somafm.com/songs/groovesalad.json`).
  - Universal ICY stream metadata extractor (`Icy-MetaData: 1`) reading chunked byte intervals for any Shoutcast / Icecast AAC/MP3 radio stream.
  - Reactive `TopAppBar` live track pill with animated equalizer bars, tactile mechanical cassette deck track title ribbon, and **Now Playing Bottom Sheet** live station playlist.
- **Interactive Ss-Hero Background Banner (`SsHeroSplashScreen.kt`)**:
  - Implemented dynamic interactive particle wave mesh background canvas with ambient glow, floating geometry, and SuamiSihat brand symbols.
  - Added smooth transition into Biometric PIN authentication and Studio dashboard.
- **Interactive Markdown Viewer & Task Checklists (`FluentMarkdownViewer.kt`)**:
  - High-performance Jetpack Compose markdown renderer supporting live checkbox toggling with automatic underlying markdown persistence.
  - Live split raw edit tab, formatted headings, tables, blockquotes, and code snippets for project briefs and `README.md` files.
- **Standby Desk Companion Mode (`DeskCompanionMode.kt`)**:
  - Added full-screen OLED pitch-black standby desk clock with live Pomodoro sprint timer, focus progress rings, and orientation-adaptive landscape/portrait layouts.
- **Fluent Pull-to-Refresh & Haptics (`FluentPullToRefresh.kt`)**:
  - Integrated smooth overscroll pull-to-refresh with tactile haptic feedback across Tasks, Studio, and Lounge screens.
- **Adaptive Monochromatic Iconography (`ic_launcher_monochrome.xml`, `ic_suamisihat_mark_*.xml`)**:
  - Full Android 13+ Material You themed app icon support with vector SuamiSihat logomarks.

## [4.5.1] - 2026-08-30 (Cross-Platform Ecosystem Synchronization & Companion Harmonization)

### Synchronized & Unified — Desktop Client, Web Portal Manager Cockpit & Android Companion
- **Cross-Platform Architecture Alignment**:
  - **SS-CAM Desktop Client (WPF)**: Authoring Engine for canonical project creation, folder scaffolding, PSD/AI/AE/CapCut dielines, and local filesystem watchers.
  - **SS-CAM.Web Management Portal (Svelte 5)**: Governance Cockpit for reviews, annotations, 1-Click Approve / Request Revision, and production ZIP exports.
  - **SS-CAM.Android Companion App (Compose)**: Mobile studio companion strictly for managing existing project statuses, live `README.md` editing, Quick Notes scratchpad, and Studio Lounge (Pomodoro, Waktu Solat, Lo-Fi Radio).
- **Desktop Dynamic Token Compliance**:
  - Refactored `WellbeingPage.xaml` to 100% theme-adaptive DynamicResource tokens.
  - Enforced UTF-8 BOM encoding across all high-byte XAML and C# files.
  - Configured 64-bit MSBuild path resolution for Windows 11 Smart App Control.
- **Web Portal Manager Review & Client Build**:
  - ESM Vite 5 bundling configured with `vite.config.mjs` and clean production build (`dist/index.html`).
  - Passed full 28-test backend unit and integration test suite.
- **Android Companion App**:
  - Null-safe `ManageProjectBottomSheet.kt` with live NAS status syncing and deliverables queue.
  - Standardized bottom navigation (`Overview`, `Tasks`, `Studio`, `Lounge`).

## [4.5.0] - 2026-08-29 (Master Brand System Integration, Web Portal Zero-Emoji Overhaul & Brand Assets Vault Modernization)

### Added & Refined — Master Brand System v3.5.1, Web Portal Zero-Emoji Overhaul, Multi-Format Color Matrix & 5 Sub-Brands Hub
- **Web Portal Brand System & Zero-Emoji Modernization (`SS-CAM.Web`)**:
  - Full eradication of informal/playful raw Unicode emojis across all **10 views** and all **11 modals/drawers**.
  - Built canonical [`FluentIcons.svelte`](file:///d:/HaNa_Innovation/ss_cam/src/SS-CAM.Web/client/src/lib/components/ui/FluentIcons.svelte) providing 45+ type-safe Microsoft Fluent 2 SVG icons styled in the official SuamiSihat brand palette.
  - Complete modernization of `DashboardView`, `ProjectsView`, `ProjectDetailView`, `DeliverablesView`, `CopyStudioView`, `TeamView`, `ProfileView`, `AdminView`, `LoginView`, and `ClientReviewView`.
  - Upgraded all 11 modals: `CreativeAiAssistantModal`, `ProjectVersionTimelineModal`, `PreflightValidatorModal`, `BatchResizerModal`, `DeliverableLightbox`, `DeliverableAnnotationCanvas`, `DeliverableVisualDiffSlider`, `ShareLinkModal`, `VaultIngesterModal`, `CommandPaletteModal`, and `NotificationDrawer`.
- **Creative AI Assistant Key Persistence (`CreativeAiAssistantModal.svelte`, `GeminiService.js`)**:
  - Implemented resilient dual-layer API key persistence: saving instantly to backend `ai-config.json` while simultaneously mirroring to browser `localStorage` as client-side fallback.
- **Master Brand System Architecture Alignment (`BrandAssetsPage.xaml`, `BrandAssetsPage.xaml.cs`)**:
  - Full synchronization with the authoritative [SuamiSihat™ Master Brand System Guide](https://assets.suamisihat.myds.me/brand-system/).
  - Implemented the Two-Layer System Architecture: SuamiSihat Identity Visual Layer combined with Fluent 2 Dynamic Interaction Logic.
- **Multi-Format Color Matrix & Live Specification Inspector (`BrandAssetsPage.xaml`, `BrandAssetsPage.xaml.cs`)**:
  - **Primary Palette**: Prussian Blue (`#022057`), SS Blue (`#043388`), Azure (`#21A1F7`), Malibu (`#6DC6EC`), Neutral Black (`#1C1C1C`), and Porcelain White (`#FCFAF6`).
  - **Secondary Warm Palette**: Lion Gold (`#BD9A73`), Fawn Warm (`#CCAC8D`), Arylide Yellow (`#E5D15C`), and Banana Yellow (`#FCE53D`).
  - **Foundation & Semantic Tokens**: Canvas Light (`#F8FAFC`), Void Dark (`#090D16`), Semantic Success (`#107C10`), Semantic Warning (`#D83B01`), and Semantic Danger (`#A80000`).
  - **7-Stop Grayscale Ribbon**: Calibrated with official Grey 90 (`#3C3C3B`) and uniform luminance distribution.
  - **Live Specification Inspector**: Real-time readout of HEX, RGB, CMYK, BAL/RAL Standard (e.g. `RAL 5013 Cobalt Blue`), and Pantone PMS with 1-click **Copy HEX** and **Copy Token** (`--ss-prussian-blue`, etc.) buttons.
- **5 Operating Corporate Sub-Brands Hub (`BrandAssetsPage.xaml`, `BrandAssetsPage.xaml.cs`)**:
  - Dedicated identity cards with visual badges, operational scope descriptions, and 1-click local Explorer folder launchers for:
    - **SS Health** (`01_logo_ssHealth`) — Parent holding company, governance & legal
    - **SS Clinic** (`02_logo_ssClinic`) — Clinical men's health consultations & medical care
    - **SS Wellness** (`03_logo_ssWellness`) — Physiotherapy, vitality recovery & lifestyle care
    - **SS Ecommerce** (`04_logo_ssEcom`) — Official store vectors, packaging & digital retail
    - **SS Technology** (`05_logo_ssTech`) — Digital health apps, EHR integrations & developer graphics
- **Master Logo & Surface Contrast Previewer (`BrandAssetsPage.xaml`, `BrandAssetsPage.xaml.cs`)**:
  - Interactive background stage switcher (Porcelain Light `#FCFAF6`, Void Dark `#090D16`, Prussian Blue `#022057`).
  - Dynamic visual validation of the HSL Lightness Rule ($L \ge 50\%$ for primary light vs $L < 50\%$ for primary dark).
  - Direct "Open Master Kit" folder launcher for `00_logo_SuamiSihat`.
- **4-Tier Typography Scale Reference (`BrandAssetsPage.xaml`)**:
  - Visual hierarchy cards detailing standard weights and usage roles for:
    - **Poppins** (Display & Hero • 600, 700, 800)
    - **Montserrat** (Subtitles & UI • 500, 600, 700)
    - **Helvetica Neue** (Body & Web • 400, 500, 700)
    - **Calibri** (Office & Email • 400, 700)
- **Workstation Asset Deployment Hub (`BrandAssetsPage.xaml`, `PayloadInstallerService.cs`)**:
  - One-click font registration, vector asset local deployment (`%LOCALAPPDATA%\SuamiSihat\Assets`), and desktop shortcuts creation.

### Integrity
| File | Details |
|---|---|
| `src/SS-CAM/bin/Release/SS-CAM.exe` | AssemblyVersion `4.5.0.0` |
| `src/SS-CAM/Properties/AssemblyInfo.cs` | AssemblyFileVersion `4.5.0.0` |

## [4.4.4] - 2026-08-27 (Creative Wellbeing & Biometric Suite Overhaul)

### Added & Refined — Real-Time Biometric Radar, 30-Day Heatmap & Hydration Tracker
- **Real-Time 5-Axis Biometric Radar (`WellbeingPage.xaml`, `WellbeingPage.xaml.cs`)**:
  - Live spider chart tracking 5 creative dimensions: **Energy**, **Focus**, **Rest**, **Pressure**, and **Flow**.
  - Real-time mathematical updates triggered by focus timer sessions, box breathing, 5m breaks, hydration logs, and manual flow calibration.
  - Quadrant-aware text bounding box measurement ensuring zero overlap between polygon vertices and metric labels.
- **Biometric Flow Calibrator & 1-Click Rebalancers (`WellbeingPage.xaml`)**:
  - Tactile 1-to-5 baseline calibrators for Vitality, Cognitive Focus, and Perceived Stress with proportional Segoe UI Variable typography.
  - 1-Click Rebalancer actions: `2m Box Breath`, `+250 mL Hydrate`, `20s Eye Rest`, and `5m Break Reset`.
- **Dynamic 30-Day Creative Focus & Flow Heatmap (`WellbeingPage.xaml`, `WellbeingPage.xaml.cs`)**:
  - Full 30-day focus intensity matrix with 4 color-graded tiers (`0m`, `<25m`, `<60m`, `<120m`, `120m+`) and live tooltips.
  - Active Streak and 30-day total focus minutes aggregation.
- **Interactive Vector Water Hydration Tracker (`WellbeingPage.xaml`, `WellbeingPage.xaml.cs`)**:
  - Smooth sinusoidal water wave animation with live fill percentage.
  - 8 interactive Fluent 2 glass cup tiles with dynamic theme-adaptive backgrounds.
  - One-click `+250 mL`, `+500 mL`, and `Reset` quick logging buttons.
- **Layout & Visual Hierarchy Polish (`WellbeingPage.xaml`)**:
  - Eliminated excess padding and dead white space for a compact, high-density Fluent 2 aesthetic.
  - Synchronized top summary bar with `FLOW HARMONIC` score and `BURNOUT RISK INDEX`.

## [4.4.3] - 2026-08-27 (Radio Visualizer Overhaul & Station Upgrades)

### Added & Refined — Dynamic Hero Audio Visualizer, Playback Gating & Curated Stations
- **Dynamic Real-Time Playback Gating (`RadioPage.xaml`, `RadioPage.xaml.cs`)**:
  - The hero backdrop scattered Mars symbols (`♂`) and SuamiSihat logomarks are completely hidden (`Opacity = 0.0`) when radio is stopped or paused, seamlessly fading in on active playback.
- **Song Wavelength & Beat Modulation (`RadioPage.xaml.cs`)**:
  - Mars symbols and logomarks oscillate vertically along a continuous sinusoidal wave parameterized across canvas width.
  - Beat kicks (`e.IsBassHit` / `e.IsKickHit`) trigger size pulsing (up to +35%), accelerated upward flow velocity, and audio-amplitude luminance twinkling.
  - Multi-hue palette with vibrant brand colors (`#21A1F7`, `#38BDF8`, `#6DC6EC`, `#60A5FA`, `#FCE53D`) and 8px stroke thickness for clear visibility.
- **Unified Cross-Mode Visualizer Architecture (`RadioPage.xaml.cs`)**:
  - Decoupled floating backdrop particles from single-mode restrictions, allowing them to animate across all visualizer modes (`HeroMesh`, `WaterDrop`, `Waveform`, `SpectrumBars`).
- **Curated Radio Preset Station Upgrades (`RadioStreamService.cs`)**:
  - Replaced `CITYPlus FM` with two high-uptime creative focus stations:
    - **Nightwave Plaza** (`preset_nightwave`): 24/7 Vaporwave & Synthwave.
    - **SomaFM: Groove Salad** (`preset_groovesalad`): Chilled ambient & downtempo grooves.
- **Calendar Malaysia Public Holidays Integration (`CalendarPage.xaml.cs`)**:
  - Added comprehensive Malaysian national and state public holiday observances into the studio calendar.
- **Copywriting Studio Rich FlowDocument Mode & Search UI (`CopywritingPage.xaml`, `SearchCopyPage.xaml`)**:
  - Default FlowDocument markdown rendering for script canvas with smooth edit toggle.
  - Fixed ComboBox padding and text overlap issues across high-DPI scaling.

### Integrity
| File | Details |
|---|---|
| `src/SS-CAM/bin/Release/SS-CAM.exe` | AssemblyVersion `4.4.3.0` |
| `src/SS-CAM/Properties/AssemblyInfo.cs` | AssemblyFileVersion `4.4.3.0` |

## [4.4.1] - 2026-08-26 (Maintenance & Enhancement Release)

### Added & Refined — Radio Stream Integration, Deep Scanner Routing & Copywriting FlowDocument Engine
- **Official SuamiSihat Radio Stream Integration (`RadioStreamService.cs`)**:
  - Integrated official SuamiSihat Radio Stream (`https://dj.suamisihat.myds.me/listen/suamisihat-radio/radio.mp3`) as pinned `#1` preset station with live audio playback.
  - Automatic station migration preserving user custom radio presets.
- **Deep Month-Container Project Vault Discovery (`WorkspaceScanner.cs`, `WorkloadSlaService.cs`, `CopywritingPage.xaml.cs`)**:
  - Updated project directory matching regex from `^\d{6}_([A-Z0-9]+)` to `^\d{6}_(\d[A-Z0-9]*)` to prevent premature stoppage at intermediate month containers (e.g. `202608_August`), correctly indexing nested projects (`202608_0001D_SS_brand campaign`).
- **Dynamic Project ID Auto-Calculation Overhaul (`ProjectCreatorPage.xaml.cs`)**:
  - Implemented multi-tier directory scanning (`ScanDirectoryForMaxProjectId`) checking active month containers, year folders, and local workspaces to reliably calculate the next sequential project ID (e.g., `0001D` -> `0002P` -> `0003D`).
- **Copywriting Studio Default FlowDocument Markdown Rendering (`CopywritingPage.xaml` & `CopywritingPage.xaml.cs`)**:
  - Script canvas now renders rich formatted Markdown preview by default when loading or selecting projects.
  - Added compact icon-only mode toggles (`Eye24` for Preview, `Edit24` for Edit) with real-time text sync and automated focus switching.
- **Catalog Designer Resolution & System Folder Filtering (`SearchCopyPage.xaml.cs` & `WorkspaceScanner.cs`)**:
  - Sanitized Designer filter to load active team members from `UserProfileService.GetStaffDirectory()` while stripping out NAS system/year folders (`#recycle`, `2026`).
  - Added `ResolveProjectDesigner` to accurately attribute projects to designers via frontmatter, job codes (`0001D`, `0004P`), and staff directory.
- **UI Control & ComboBox Layout Enhancements (`SearchCopyPage.xaml`)**:
  - Increased ComboBox heights, padding, and vertical centering to eliminate text clipping across Windows scaling modes.

### Fixed — Dashboard, Role Filtering & Scroll
- **Dashboard Designer Workload — Year Bug (`WorkloadSlaService.cs`)**:
  - Fixed `ComputeDesignerWorkloads` returning year folders (`2026`) as designer names instead of actual designer names. Overhauled to seed staff directory members and traverse nested project vaults via `ResolveProjectDesigner`.
- **Manager Role Excluded from All Metrics & Filters**:
  - Added `IsDesignerOrAdminRole` predicate to `WorkloadSlaService.cs` to exclude Manager / CEO / Executive roles from Designer Workload & Capacity Radar (Desktop & Web).
  - Updated `WorkspaceScanner.GetDesignerFolders` to filter out management staff from all designer dropdown filters.
  - Updated `TaskManagerPage.xaml.cs` and `CalendarPage.xaml.cs` `PopulateDesignerFilter()` to exclude any manager-role entries derived from project metadata.
  - Updated Web portal `WorkspaceService.js` and `TeamService.js` to exclude manager roles from dashboard metrics and team directory filter.
- **Mouse Wheel Scrolling Restored Across All Pages**:
  - Diagnosed root cause: `PreviewMouseWheel` event not wired on root `ScrollViewer` for 10+ pages; inner controls (ListBox, ComboBox, FlowDocumentScrollViewer) swallowing wheel events.
  - Added global `OnGlobalPreviewMouseWheel` handler on `MainWindow` `NavigationView` — walks visual tree to find nearest scrollable `ScrollViewer`, performs step-clamped `LineUp()`/`LineDown()`/`LineLeft()`/`LineRight()`. Covers all pages automatically.
  - Per-page `PreviewMouseWheel` wire-up added to all 10 broken pages: `DashboardPage`, `WorkstationHealthPage`, `WellbeingPage`, `SettingsPage`, `WaktuSolatPage`, `QrCodePage`, `ProjectCreatorPage`, `RadioPage`, `TaskManagerPage`, `DesignTokensPage`.
  - Added missing `OnScrollViewerPreviewMouseWheel` handler to `TaskManagerPage.xaml.cs` and `DesignTokensPage.xaml.cs`.
  - `TaskManagerPage` kanban board now also supports **horizontal mouse wheel scrolling** through columns.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.4.1.exe` | Compiled Native C# WPF Executable (5.61 MB) |
| `AssemblyVersion` | 4.4.1.0 |
| `AssemblyFileVersion` | 4.4.1.0 |

---

## [4.4.0] - 2026-08-20 (Stable Release)

### Added & Refined — Designer Workload Heatmaps & Creative SLA Analytics
- **Live Designer Workload & Capacity Radar (`DashboardPage.xaml` & `WorkloadSlaService.cs`)**:
  - Real-time aggregation of active project queues across top-level NAS designer folders (`0001D`, `0002S`, etc.).
  - Automated bandwidth capacity scoring (`Optimal Bandwidth` 0-2 tasks, `High Load` 3-4 tasks, `At Capacity` 5+ tasks) with color-coded progress meters.
  - Active task breakdown across In-Progress, Review/Revision, and Completed.
- **Operational Creative SLA & Turnaround Telemetry**:
  - First-Time Right Rate % tracking percentage of campaigns signed off without revisions.
  - Average Turnaround Velocity (days from brief kickoff to deliverable sign-off).
  - Average Revision Rounds per deliverable.
  - Brand-level SLA velocity breakdown across holding subsidiaries (`SSH`, `SSC`, `SSW`, `SSE`, `SST`).
- **Web Portal Capacity & SLA Analytics (`DashboardView.svelte` & `WorkspaceService.js`)**:
  - Live capacity progress bars and status badges in Executive Deck Designer Production Load panel.
  - 3-card Creative SLA telemetry section in Executive Board Deck.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.4.0.exe` | Compiled Native C# WPF Executable (5.61 MB) |
| `AssemblyVersion` | 4.4.0.0 |
| `AssemblyFileVersion` | 4.4.0.0 |

---

## [4.3.0] - 2026-08-20 (Stable Release)

### Added & Refined — Asset Export, Packaging & Naming Engine
- **1-Click Creative Handover Packaging (`ExportPackagingService.cs` & `ExportService.js`)**:
  - Async ZIP generation bundling deliverables from `05_DELIVERABLES/`, `03_COPYWRITING/COPY.md`, and project briefs.
  - Auto-generated `HANDOVER_SUMMARY.html` with project metadata, sign-off status, and tabular asset inventory.
  - 1-Click UI export button in desktop footer and web project header (`/api/projects/:id/export`).
- **Canonical Asset Naming & Sanitizer (`AssetNamingService.cs`)**:
  - Enforces canonical SuamiSihat standard `{YEARMONTH}_{JOBID}_{BRAND}_{PROJECT}_{TYPE}_{VERSION}.{EXT}`.
  - Automated 1-click batch renaming tool with instant preview and gallery refresh.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.3.0.exe` | Compiled Native C# WPF Executable (5.60 MB) |
| `AssemblyVersion` | 4.3.0.0 |
| `AssemblyFileVersion` | 4.3.0.0 |

---

## [4.2.0] - 2026-08-20 (Stable Release)

### Added & Refined — Desktop NAS Sync & Batch Operations + Web Real-Time SSE
- **Native Desktop NAS File Watcher (`WorkspaceWatcherService.cs`)**:
  - Background `FileSystemWatcher` with 600ms debouncing, live auto-reconnect, and multi-view synchronization.
- **Desktop Deliverable Thumbnail Engine (`ThumbnailCacheService.cs`)**:
  - Async 320px decode with disk cache in `%LOCALAPPDATA%\SS-CAM\Thumbnails\` and memory LRU cache.
- **Desktop Batch Operations Ribbon & UI Virtualization (`SearchCopyPage.xaml`)**:
  - Extended multi-selection with bulk status transitions and UI virtualization for 1,000+ items.
- **Web Real-Time SSE Feed & Video Range Streaming (`SseService.js` & `DeliverableService.js`)**:
  - Server-Sent Events at `/api/events` broadcasting task decisions, comments, and project updates.
  - HTTP 206 Partial Content range requests for seamless in-browser deliverable video playback.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.2.0.exe` | Compiled Native C# WPF Executable (5.56 MB) |
| `AssemblyVersion` | 4.2.0.0 |
| `AssemblyFileVersion` | 4.2.0.0 |

---

## [4.1.0] - 2026-08-19 (Stable Release)

### Added & Refined — Desktop Feature Parity & Studio Overhaul
- **Desktop Copywriting Studio (`CopywritingPage.xaml` & `CopywritingDesktopService.cs`)**:
  - Dedicated NAS Markdown persistence to `03_COPYWRITING/COPY.md` with live word, char, and reading time telemetry.
- **Contextual In-App Comments Engine (`ProjectCommentService.cs`)**:
  - JSONL discussions stored in `_comments.jsonl` with `@mention` support.
- **ClickUp 3.0-Style 2-Column Task Workspace (`SearchCopyPage.xaml`)**:
  - 68% Left Canvas (Markdown Brief / Raw / Deliverables Gallery) + 32% Right Inspector.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.1.0.exe` | Compiled Native C# WPF Executable (5.53 MB) |
| `AssemblyVersion` | 4.1.0.0 |
| `AssemblyFileVersion` | 4.1.0.0 |

---

### Fixed
- **`OnCheckUpdates` was a hardcoded stub** (`SettingsPage.xaml.cs`): The "Software Updates" button in Settings always showed "Software is up to date" without ever making a network call. Replaced with a real async check against the GitHub Releases API (`api.github.com/repos/SuamiSihat/ss_cam/releases/latest`) with NAS `version.json` fallback. Update dialog now offers a one-click download when a newer version is detected.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.0.1.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 4.0.1.0 |
| `AssemblyFileVersion` | 4.0.1.0 |

---

## [4.0.0] - 2026-08-18 (Stable Major Release)


### Added & Refined — Centralized Studio Hierarchy, ClickUp Task Workspace & Copywriting Studio
- **Centralized Year-First Hierarchy Standardization (`FOLDER-STRUCTURE.md`)**:
  - Unified project folder structure across desktop and web to canonical `Creative-Team/[YYYY]/[YYYYMM_Month]/[ProjectFolder]`.
  - Standardized the 5-folder anatomy: `01_BRIEF_ASSETS`, `02_SOURCE_FILES`, `03_COPYWRITING`, `04_WORK_IN_PROGRESS`, and `05_DELIVERABLES`.
  - Maintained 100% backward compatibility for legacy `[Staff_ID]/SS-[YYYY]/...` directory scanning.
- **ClickUp 3.0-Style 2-Column Task Workspace (`ProjectDetailView.svelte`)**:
  - Main Canvas (68%): Split markdown editor with live preview, dedicated Copywriting Studio, deliverables gallery, and creative direction matrix.
  - Right Inspector Panel (32%): Collapsible drawer with properties sheet and live in-context discussion feed.
  - Top Task Command Bar with breadcrumbs, status dropdown pills, quick sign-off button, and revision request triggers.
- **Dedicated Copywriting Studio & Live Analytics (`CopywritingService.js` & `COPY.md`)**:
  - Dedicated storage inside `03_COPYWRITING/COPY.md` on Synology NAS.
  - Real-time word count, character count, and estimated reading time calculations.
  - Pre-scaffolded templates for TikTok/Reels video script tables, Meta ad copy angles, and packaging benefit claims.
- **Contextual In-Project Comments & Notification Feed (`CommentService.js` & `_comments.jsonl`)**:
  - JSONL-backed discussion threads with `@mention` tagging, resolution toggles, and deliverable attachments.
  - Slide-out Notification Drawer in portal header with unread count badge and one-click navigation.
- **Official SuamiSihat Brand Guidelines & Strict Typography Synchronization**:
  - Integrated official brand system color tokens (`--ss-prussian-blue: #022057`, `--ss-blue: #043388`, `--ss-azure: #21A1F7`, `--ss-lion: #BD9A73`, `--ss-fawn: #CCAC8D`, `--ss-arylide: #E5D15C`, `--ss-banana: #FCE53D`).
  - Enforced strict typography rule: Neutral Black (`#1C1C1C`) for all digital typography (no pure `#000000` body text).
  - Aligned 60:30:10 visual color balance across all surfaces and views.
- **Automated QA & Security Attestation**:
  - 15/15 PASS on automated test suite.
  - 9/9 PASS on Source Guardian security and UTF-8 BOM audit.
  - Compiled clean MSBuild Release binary (`SS-CAM-v4.0.0.exe`).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v4.0.0.exe` | Compiled Native C# WPF Executable (5.24 MB single-file) |
| `AssemblyVersion` | 4.0.0.0 |
| `AssemblyFileVersion` | 4.0.0.0 |

---

## [3.6.1] - 2026-08-17

### Added & Refined — Metamorphosis Theme Legibility & Surface Opacity Overhaul
- **Metamorphosis Theme Opacity Overhaul (`MetamorphosisTheme.xaml`)**:
  - Removed all semi-transparent white card background brushes (`#26FFFFFF`, `#14FFFFFF`) and replaced them with solid opaque deep space navy surface colors (`#0F1A3A` default card surface, `#142045` secondary surface).
  - Fixed transparency bleed-through on side overlay drawers (such as `DayDetailPanel` on `CalendarPage`) and elevated cards, ensuring text and calendar items behind drawers do not bleed through.
  - Replaced transparent input/control backgrounds with solid navy control fills (`#0C1633` input background, `#14224B` control fill).
  - Replaced semi-transparent white border strokes with solid navy border tokens (`#1E2E5C`, `#243977`) and replaced white glare with a soft electric cyan accent sheen (`#1A00CFFF`).
- **Web Portal Token Alignment (`fluent2-tokens.css`)**:
  - Updated `--glass-bg` token for Metamorphosis theme to `#0F1A3A` (solid opaque dark navy surface).
- **Automated QA & Security Attestation**:
  - 100% PASS on Source Guardian audit (UTF-8 BOM encoding, Fluent 2 compliance, thread and data safety).
  - Compiled clean MSBuild Release binary (`SS-CAM-v3.6.1.exe`).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.6.1.exe` | Compiled Native C# WPF Executable (5.24 MB single-file) |
| `AssemblyVersion` | 3.6.1.0 |
| `AssemblyFileVersion` | 3.6.1.0 |

---

## [3.6.0] - 2026-08-17

### Added & Refined — Fluent UI Web Design System & Data Visualization Analytics Release
- **Microsoft Fluent UI Web (`sscam-fluentui-web`) Skill & Guidelines**:
  - Analyzed official [`github.com/microsoft/fluentui`](https://github.com/microsoft/fluentui) repository architecture (React v9 `@fluentui/react-components`, Web Components `@fluentui/web-components`, and Fluent 2 Design Tokens `@fluentui/tokens`).
  - Authored canonical workspace skill `.agents/skills/sscam-fluentui-web/SKILL.md` and reference guidelines `.agents/skills/sscam-fluentui-web/references/fluentui-web-guideline.md`.
  - Mapped official Microsoft Fluent UI Web token custom properties (`--colorNeutralBackground1`, `--colorBrandBackground`, `--colorNeutralForeground1`, `--shadow4`, `--shadow16`, `--borderRadiusMedium`) into `SS-CAM.Web` CSS.
- **Art Director Web Portal UI/UX Overhaul (`src/SS-CAM.Web`)**:
  - Refined theme engine with glassmorphism backdrop blurs (`--glass-blur`), smooth cubic-bezier motion tokens, and multi-layered elevation shadows across `Falconia`, `Metamorphosis`, and `Catppuccin` profiles.
  - Built dynamic `.card-hover-lift` spring transitions, `.stat-trend` growth pills, and `.filter-pill` buttons.
  - Upgraded global toast notification system (`showToast()`) with smooth slide-in/fade-out animations and bound keyboard `Escape` dismissal for modal dialogs.
- **Data Visualization Specialist Studio Dashboard Re-architecture (`DashboardView.js`)**:
  - Built 3-Tier F-Pattern Dashboard: 5-KPI Strategic Summary Bar (Total Assets with growth sparklines, On-Time Delivery Rate, First-Pass Approval Index, Review Queue, Operational Risk).
  - Production Stage Pipeline Velocity Flow diagram tracking stage lead times (`2.4 Days`) and QA gate throughput.
  - Designer Capacity & Bandwidth Heatmap with color-coded load bars (`Available`, `Optimal`, `Overloaded Alert`).
  - Sub-brand Portfolio Distribution progress bars and 6-axis Creative Skill Coverage Radar.
- **Copywriting Studio AI Script Presets (`CopyStudioView.js`)**:
  - Added AI Copywriting Preset Bar featuring one-click copy presets for **TikTok Viral Hooks**, **Facebook Problem/Solution Ad Angles**, and **Product Packaging Benefit Claims** with instant toast feedback.
- **Automated QA & Security Attestation**:
  - 100% PASS on Source Guardian audit (UTF-8 BOM encoding, Fluent 2 compliance, thread and data safety).
  - Compiled clean MSBuild Release binary (`SS-CAM.exe`).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.6.0.exe` | Compiled Native C# WPF Executable (5.24 MB single-file) |
| `AssemblyVersion` | 3.6.0.0 |
| `AssemblyFileVersion` | 3.6.0.0 |

---

## [3.5.0] - 2026-08-17

### Added & Refined — Designer Companion & In-App Brief Editor Release
- **In-App Project Brief Markdown Editor (`SearchCopyPage`)**:
  - Live editing and saving of project `README.md` and frontmatter directly inside the Search & Copy catalog pane.
  - Interactive Markdown formatting toolbar (Headings, Bold, Italic, Code, List) with real-time feedback via `NotificationService`.
- **Workspace Designer Scoping & Discovery**:
  - Dynamic discovery and dropdown filtering across designer workspaces (`0001D`, `0002S`, etc.) on local and Synology NAS shares.
- **Minimal 2-Column Brand Assets & Live Swatch Inspector (`BrandAssetsPage`)**:
  - Replaced legacy multi-card layout with a sleek 2-column responsive design.
  - Interactive **Primary**, **Secondary**, and **Neutrals** swatch ribbons.
  - Live Inspector Card displaying color preview tile, Swatch Title, **HEX**, **RGB**, **CMYK**, and **Pantone** breakdowns with auto-copy to clipboard.
- **Dynamic Theme Contrast & Fluent 2 Standardization**:
  - Standardized all 14 page views to use native WPF-UI dynamic resource tokens (`ApplicationPageBackgroundThemeBrush`, `CardBackgroundFillColorDefaultBrush`, `TextFillColorPrimaryBrush`, `TextFillColorSecondaryBrush`).
  - Standardized all page titles to `FontSize="24"` and section headers to `FontSize="16"`.
- **Task Manager FIFO Queue & Date Filter Upgrades (`TaskManagerPage`)**:
  - Added `created:` frontmatter tag support, queue age display (`📅 14d in queue`), FIFO Queue Order sorting (`Oldest First`), and `Created Date` drawer editor.
- **Repository Hygiene & Architecture Cleanup**:
  - Eliminated redundant root build binaries, old log files, and obsolete scratch files.
  - Updated `.gitignore` to prevent test workspaces and ephemeral files from dirtying the working tree.
  - Automated Source Guardian validation (100% PASS on UTF-8 BOM, Fluent 2 standards, thread and data safety).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.5.0.exe` | Compiled Native C# WPF Executable (5.24 MB single-file) |
| `AssemblyVersion` | 3.5.0.0 |
| `AssemblyFileVersion` | 3.5.0.0 |

---

## [3.4.0] - 2026-08-13

### Added & Refined — Feature Release
- **Starter Canvas Engine & 2026 Industry Platform Specs**:
  - Integrated `.af`, `.psd`, and `.ai` starter canvas format generation with default Affinity Designer format support (`.af`).
  - Added Web Design category presets and platform-specific canvas generators.
- **Project Creator Presets & Dynamic Category Filtering**:
  - Added new production presets: Rollup Bunting (80x200cm), Trifold A4 Brochure, and A5 Leaflet.
  - Dynamically filters target platform options and highlights visual cards based on the selected project category.
- **Search & Copy Category Filter**:
  - Implemented category filter dropdown in `SearchCopyPage.xaml` / `SearchCopyPage.xaml.cs` to filter copy items and assets seamlessly.
- **Creative Calendar Quick Status Actions**:
  - Integrated direct project status actions (`In Progress`, `Review`, `Done`) inside `CalendarPage.xaml.cs` day detail view overlay with automatic frontmatter synchronization.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.4.0.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.4.0.0 |
| `AssemblyFileVersion` | 3.4.0.0 |

---

>>>>>>> c0832ca (feat(v3.5.0): in-app project brief editor, workspace designer scoping, and QA verification)
## [3.3.0] - 2026-08-13

### Added & Refined — Feature Release
- **Fluent 2 Startup Splash Window (`SplashWindow`)**: Branded Fluent 2 startup splash screen with smooth progress initialization, animated branding visual, and background service loading.
- **Centralized Notification & Clipboard Services (`NotificationService`, `ClipboardService`)**:
  - Native toast notification dispatching for background tasks, copy events, and file system warnings.
  - Safe, non-blocking clipboard interaction wrapper with error handling and fallback support.
- **Task Manager Queue Enhancements**:
  - Expanded queue drawer sorting and date sorting options (`TaskManagerPage.xaml`).
  - Improved frontmatter date parsing and markdown rendering enhancements (`MarkdownHelper.cs`, `ProjectStatus.cs`, `ProjectGeneratorService.cs`).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.3.0.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.3.0.0 |
| `AssemblyFileVersion` | 3.3.0.0 |

---

## [3.2.0] - 2026-08-12

### Added & Refined — Feature Release
- **Big Calendar Module (`CalendarPage`)**: Native 7×6 monthly calendar timetable displaying project creation start dates and campaign deadlines as color-coded chips, Friday Solat indicators, interactive Day Detail Overlay inspector, month switcher navigation (`◀ Prev`, `Today`, `Next ▶`), and real-time search & designer filters.
- **Task Manager Queue Management & Calendar Dates**:
  - `created:` frontmatter tag support in `README.md` and `FrontmatterService`.
  - `InferCreatedDate()`: Auto-detects creation dates for legacy projects using `YYYYMM` folder date codes or filesystem creation dates.
  - `AgeDisplay` & `AgeBadgeColor`: Visual queue age indicators on project cards (e.g. `📅 14d in queue`, color-coded amber for `>30d` and red for `>60d`).
  - **Queue Order Sorting**: Added `Oldest First (Queue)` sorting option to prioritize long-standing projects (FIFO queue order).
  - **Created Date Drawer Binding**: Added `Created Date (YYYY-MM-DD)` input field to the detail drawer.
- **SSNAS Synology Drive Setup Documentation**: Created official setup guide (`docs/SSNAS-SETUP.md`) for Synology Drive Client folder sync task mapping SSNAS `/Creative-Team` share to `E:\SynologyDrive\Creative-Team` local workstation directory.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.2.0.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.2.0.0 |
| `AssemblyFileVersion` | 3.2.0.0 |

---

## [3.1.2] - 2026-08-12

### Added & Refined — Patch Release
- **Multi-User Isolation on Shared NAS (`NasConfigSyncService`)**: Implemented Windows username scoping (`_{username}`) for personal profile settings, visual themes, and Quick Notes files stored on NAS.
- **Shared Team Resources**: Maintains shared team presets (`category_presets.json`) and shared team board announcements (`_Team\team-notes.json`) while isolating personal user configs across multiple team members on the same NAS share.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.1.2.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.1.2.0 |
| `AssemblyFileVersion` | 3.1.2.0 |

---

## [3.1.1] - 2026-08-12

### Added & Refined — Patch Release
- **Native NAS Settings & Preferences Auto-Sync (`NasConfigSyncService`)**: Automatic real-time mirroring and auto-syncing of user profile (`user_profile.json`), theme preferences (`theme_config.json`), category presets (`category_presets.json`), and Quick Notes (`Notes/`) to `<WorkspaceRoot>\_Team\_Config\` on the NAS / Synology Drive.
- **Multi-PC Workstation Sync**: Automatically detects newer settings saved on PC 1 when launching SS-CAM on PC 2 without requiring manual config copying.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.1.1.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.1.1.0 |
| `AssemblyFileVersion` | 3.1.1.0 |

---

## [3.1.0] - 2026-08-12

### Added & Refined — Minor Release
- **QR Code Studio & Generator Module (`QrCodePage`)**: Native vector/raster QR Code Generator supporting URL, Plain Text, Wi-Fi network, and VCard payload formats with custom brand palette styling, PNG file export, and instant Clipboard copy integration.
- **Sound Engineer Studio Visualizer & Mars Crest FX**: Upgraded `VisualizerService` with scattered floating Mars symbols (♂) and SuamiSihat brand crest, custom canvas particle physics, audio peak reactive motion, and clean canvas removal of text watermarks.
- **Radio & Audio Studio Polish**: Enhanced `RadioPage` layout and control feedback, audio spectrum visualization, and streamlined broadcast controls.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.1.0.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.1.0.0 |
| `AssemblyFileVersion` | 3.1.0.0 |

---

## [3.0.1] - 2026-08-12

### Added & Refined
- **Fluent 2 Categorized Sidebar Navigation**: Grouped all 11 application modules into 5 distinct, logically sorted categories separated by headers (`ui:NavigationViewItemHeader`) and visual dividers (`ui:NavigationViewItemSeparator`): `OVERVIEW`, `CREATION & ASSETS`, `PRODUCTIVITY`, `WELLBEING & FAITH`, and `SYSTEM`.
- **Adaptive Bottom Live Bar & Footer Collapse**: Implemented `OnNavigationPaneOpened` and `OnNavigationPaneClosed` event handlers. When sidebar pane is collapsed (`IsPaneOpen = False`), status text labels hide and bottom player transitions to a streamlined compact mode to maximize canvas space.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.0.1.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.0.1.0 |
| `AssemblyFileVersion` | 3.0.1.0 |

---

## [3.0.0] - 2026-08-12

### Added & Refined — Major Release
- **Complete Fluent 2 UI/UX Modernization**: Revamped all 12 core application modules to adhere 100% to Microsoft Fluent 2 design principles.
- **Designer Profile & Settings Revamp**: Rebuilt `SettingsPage` with 2-column layout, section icon badges, interactive theme swatches (Falconia, Metamorphosis, Catppuccin, Rosé Pine, Nord), workstation payload installer, category preset management, and reset/maintenance action rows.
- **Multi-Theme Engine Expansion**: Native support for 5 distinct visual theme profiles with instant switching capabilities.
- **Enhanced Reliability & Data Safety**: Reinforced Synology NAS network backoff retry logic, path validation, and BOM encoding protection across all views.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v3.0.0.exe` | Compiled Native C# WPF Executable |
| `AssemblyVersion` | 3.0.0.0 |
| `AssemblyFileVersion` | 3.0.0.0 |

---

## [2.6.3] - 2026-08-11

### Added & Refined
- **Art Director & Architectural Audit Remediation**: Comprehensive 4-phase audit remediation across all 12 modules.
- **Dynamic Surface & Control Tokens**: Refactored `SearchCopyPage`, `QuickNotePage`, `TaskManagerPage`, and `ProjectCreatorPage` to utilize dynamic Fluent 2 theme tokens (`TextControlBackground`, `CardBackgroundFillColorDefaultBrush`), eliminating broken dark mode backgrounds.
- **Icon Vector Standardization**: Replaced raw text emojis in `ProjectCreatorPage` with vector Segoe Fluent icons (`&#xE713;`, `&#xE8B7;`, `&#xE8EA;`, `&#xE8B2;`, `&#xE749;`).
- **Synology NAS Resilience**: Added 3-attempt exponential backoff retry loop for `IOException` (file lock collisions) in `TeamBoardService.Save` and 240-character `MAX_PATH` guard rails in `ProjectGeneratorService`.

### Fixed & Remediated
- **Diagnostic Logging**: Replaced all silent `catch {}` blocks across `PrayerTimeService`, `ThemeService`, `ProjectCreatorPage`, `SearchCopyPage`, and `MainWindow` with `Debug.WriteLine` diagnostic logging.
- **100% Clean Source Guardian**: Resolved all UTF-8 BOM, XAML unicode attribute strings, and control template target types (9/9 passed, 0 warnings, 0 fails).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v2.6.3.exe` | Compiled Native C# WPF Single-File Executable |
| `AssemblyVersion` | 2.6.3.0 |
| `AssemblyFileVersion` | 2.6.3.0 |

---

## [2.6.1] - 2026-08-11

### Added & Refined
- **Header Title Rebranding & TitleBar Overhaul**: Rebranded app header title to `SS Creative Assets Management`. Applied a 100% full-width `#022057` SuamiSihat deep blue TitleBar with transparent caption buttons (`— 🗖 ✕`) and window dragging capability (`DragMove`).
- **Persistent SS Blue Bottom Player Bar**:
  - Styled bottom player with full SuamiSihat deep blue background (`#022057`) and `#043388` accent border.
  - **Fluid Wavelength Audio Visualizer**: Integrated a 60 FPS real-time vector path visualizer (`StreamGeometry`) featuring a 4-stop gradient stroke (`#60A5FA` → `#38BDF8` → `#34D399` → `#818CF8`) and ambient gradient fill under the wave curve.
  - **Station Cover Image**: Integrated station cover art image loader (`BitmapImage`) supporting local/remote artwork with seamless emoji fallback.
  - **Aligned Now-Playing Layout**: Aligned Station Name + Emerald Green `LIVE` Pill on Line 1, and `NOW PLAYING:` tag + track subtext on Line 2, centered vertically alongside the 40x40 cover image.
- **Top Hero Featured Radio Player Banner**: Refactored `RadioPage.xaml` into a 4-row layout featuring a Top Hero Featured Station Banner, eliminating player redundancy.
- **Strict Equal-Height Dashboard KPI Grid**: Enforced `UniformGrid Rows="2" Columns="4" Height="224"` with `VerticalAlignment="Stretch"` on all 8 KPI widgets for 100% uniform cell heights across all rows.
- **Sidebar Cleanup**: Removed redundant radio status text from left navigation sidebar footer (`PaneFooter`).

### Fixed & Remediated
- **Source Guardian Checks**: Resolved all UTF-8 BOM encoding issues and verified full Fluent 2 design compliance across all XAML and C# files.
- **TitleBar Background Mismatches**: Removed white background behind user profile card and window control buttons.

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v2.6.1.exe` | Compiled Native C# WPF Single-File Executable |
| `AssemblyVersion` | 2.6.1.0 |
| `AssemblyFileVersion` | 2.6.1.0 |

---

## [2.6.2] - 2026-08-11

### Added — Phase 1: High-Impact UI/UX Modernization
- **Dashboard Metric Cards**: Standardized rhythm with large relative time readouts ("Today", "2 days ago") and elevated Fluent 2 `<ui:Card>` containers.
- **Project Creator UI**: Replaced legacy `GroupBox` containers with elevated `<ui:Card>` components and converted text emojis to scalable `ui:SymbolIcon` vector icons.

### Added — Phase 2: High-Impact Workflow Automation
- **Deep Adobe/Figma App Bridge**: Added dynamic canvas launcher button ("Open in Photoshop / Illustrator / Affinity") to Project Creator upon canvas generation.
- **One-Click Project Finalizer**: Integrated "Finalize & Archive..." feature into Search & Copy inspector. Automatically locates and compresses `04_Production`/`_Deliverables` and `01_Artwork_Design`/`_Raw_Assets` into standardized ZIP archives.
- **Dependencies**: Added `System.IO.Compression` and `System.IO.Compression.FileSystem` assembly references to `SS-CAM.csproj`.

### Added — Phase 3: Visual Tools & Assets Management
- **Global Brand Kit Quick-Tray**: Added `🎨 Brand Kit` quick button to title bar with a popover tray for 1-click HEX color swatch clipboard copying application-wide.
- **Visual Asset Lightbox**: Upgraded image previewer in Search & Copy to a high-definition dark Fluent 2 Lightbox modal backdrop (`#0B1120`) displaying pixel dimensions, file size, format badges, and action controls (`📋 Copy Path`, `⚡ Open File`).
- **Visual Version Control Timeline View**: Added `Timeline` tab to Search & Copy inspector. Scans project directory and renders chronological revision timeline with color-coded status badges (`Revision`, `Production`, `Master Canvas`, `Asset`).

### Integrity
| File | Details |
|---|---|
| `SS-CAM-v2.6.2-Phase3.exe` | Compiled Native C# WPF Single-File Executable |
| `AssemblyVersion` | 2.6.2.0 |
| `AssemblyFileVersion` | 2.6.2.0 |

---

## [2.6.0] - 2026-08-11

### Fixed — Critical (P0)

- **`FrontmatterService.ParseFrontmatter`** — Parser discarded all successfully-parsed key-value pairs when a README.md was missing its closing `---` delimiter (fell through to `return null`). Changed to `return result` so partially-formed frontmatter is still honoured. Affected Task Manager column placement for any project with a malformed README.

### Fixed — High (P1)

- **Theme toggle** — `OnStatusThemeToggle` event handler existed but had no XAML binding. Added `MouseLeftButtonDown` and `Cursor="Hand"` to the Theme status row in the sidebar footer with a `ToolTip` describing the cycle order (SS Default → Falconia → Metamorphosis).
- **Orphaned handlers removed** — `OnOpenGithub` and `OnOpenAboutWindow` were dead code-behind methods with no XAML targets. Removed to reduce maintenance surface.
- **Dead sidebar-collapse fields removed** — `isSidebarExpanded` (bool) and `_lastActiveNavBtn` (Button) were written but never read. These were remnants of the pre-WPF-UI custom sidebar. Removed; compiler warnings eliminated.

### Fixed — Medium (P2)

- **Hardcoded `D:\Testing` workspace default** — `DashboardPage`, `SearchCopyPage`, and `ProjectCreatorPage` all used `D:\Testing` as the initial `workspaceRoot` value. Changed to `string.Empty` so unconfigured installs show an empty/graceful state instead of silently scanning a non-existent path.
- **Team Board offline write** — `TeamBoardService.GetNotesPath` previously created the `_Team` folder on whatever path was provided, including local fallbacks. Added an early guard (`Directory.Exists(workspaceRoot)`) that returns `null` for inaccessible roots. `Save()` now checks for a `null` path and returns `false` immediately, propagating the correct error to the UI.
- **Workstation Health rescan count** — `OnRescanSoftwareClicked` showed a hardcoded "11 design software packages" confirmation regardless of actual scan results. Refactored to call `ScanInstalledDesignSoftware()` once and use the real count with proper pluralisation.
- **Static `HttpClient`** — `FetchDesignArticlesAsync` created a new `HttpClient` instance per fetch. Replaced with a `private static readonly HttpClient _httpClient` singleton on `DashboardPage` to prevent socket exhaustion. `UserAgent` is now cleared and re-set on each call.
- **Quick Notes H3 preview** — `RenderPreview` handled `# H1` and `## H2` but had no branch for `### H3`. Added `###` case with `FontSize=14, FontWeight=SemiBold`. Corrected check order to `### → ## → #` to prevent prefix collision.

### Fixed — Low (P3)

- **Silent `catch {}` blocks** — `FrontmatterService` (ReadStatus, WriteStatus) and `TeamBoardService` (LoadNotes, Save, GetNotesPath) now log exceptions via `System.Diagnostics.Debug.WriteLine` with `[ServiceName]` prefixes instead of silently discarding errors. Aligns with AGENTS.md error-handling rules.

### Integrity

| File | Details |
|---|---|
| `SS-CAM-v2.6.0.exe` | Compiled Native C# WPF Single-File Executable |
| `AssemblyVersion` | 2.6.0.0 |
| `AssemblyFileVersion` | 2.6.0.0 |

---

## [2.5.0] - 2026-08-10

### Added — Quick Notes Module
- **`QuickNotePage`** — Full-page Markdown note editor backed by `QuickNoteService`. Notes are saved as `.md` files in `%APPDATA%\SS-CAM\notes\` with automatic 3-second debounce via `DispatcherTimer`.
- **Sidebar nav item** (📝 Quick Notes) between Radio Player and Workstation Health.

### Added — Task Manager Module
- **`TaskManagerPage`** — Kanban-style board reading project status from `README.md` YAML frontmatter via `FrontmatterService`. Columns: Not Started · In Progress · Review · Done · On Hold.
- **Inline drawer** — Clicking a project card opens a slide-in editor with status, priority, deadline, and brief fields that writes back to frontmatter on save.
- **Sidebar nav item** (🗂 Task Manager) between Quick Notes and Workstation Health.

### Added — Team Board (Dashboard)
- **Team Board card** on the Dashboard page — displays last 10 shared notes from `_Team/team-notes.json` on NAS, with Author, timestamp, pin toggle, and delete actions.
- **Post Note input row** — Post a message visible to all team members; falls back gracefully when NAS is offline.
- **30-second auto-refresh** via `DispatcherTimer` that starts/stops cleanly with page navigation lifecycle.

### Added — Services
- **`QuickNoteService`** — Load/save personal Markdown notes to `%APPDATA%\SS-CAM\notes\`.
- **`FrontmatterService`** — Read and write YAML frontmatter blocks (`--- ... ---`) in any Markdown file without disturbing body content. Includes `BuildDefaultFrontmatter()` for new projects.
- **`TeamBoardService`** — Load, post, pin/unpin, and delete team notes via a shared `_Team/team-notes.json` file on the NAS workspace root.

### Changed — Project Creator: Frontmatter Injection
- **README.md now includes YAML frontmatter** — Every newly created project folder generates a `README.md` prefixed with a default frontmatter block (`status`, `priority`, `designer`, `brand`, `deadline`, `revision`, `tags`) so the Task Manager can index it from day one.
- Sub-brand code is extracted from the ComboBox selection and written into the `brand:` field automatically.

### Changed — Navigation
- **MainWindow nav** — Two new nav buttons registered and routed: Quick Notes (icon `&#xE70B;`) and Task Manager (icon `&#xE9D5;`).

### Changed — Version
- Version badge bumped from `v2.3.6` → `v2.5.0` in `DashboardPage.xaml` and window title.

### Integrity

| File | Details |
|---|---|
| `SS-CAM-v2.5.0.exe` | Compiled Native C# WPF Single-File Executable |

---

## [2.4.0] - 2026-08-10 (Latest Stable Release)

### Added — Dashboard: Designer Inspiration Widget
- **Designer Insight card** — Full-width widget below the metric tiles showing a rotating pool of 40 curated design tips (colour theory, print production, typography, file hygiene, brand discipline, creative wellbeing, and more).
- **Auto-advance timer** — Tips rotate automatically every 60 seconds via a `DispatcherTimer` that is cleanly stopped on page unload.
- **Next Tip button** — Manually advance to the next tip at any time.
- **Smashing Magazine RSS feed** — Toggle the "Articles" button to fetch and display the 5 latest design articles from Smashing Magazine as clickable links. Falls back silently to offline tip pool if the network is unavailable or times out (6-second threshold).

### Changed — Project Creator: Three Refinements
- **Editable canvas extension** — `TemplateExtensionComboBox` is now editable (`IsEditable="True"`), allowing designers to type any custom file extension (e.g. `.indd`, `.sketch`, `.fla`). The live directory tree preview and the generated file on disk reflect the typed value immediately.
- **Project Brief → Markdown Editor** — Replaced the 64px `ui:TextBox` for *Project Brief / Remarks* with a taller 200px scrollable `TextBox` preceded by a 6-button **Markdown toolbar**: Bold (`**`), Italic (`*`), Inline Code (`` ` ``), H2 Heading (`##`), List Item (`-`), and Horizontal Rule (`---`). Toolbar buttons wrap or prefix selected text; if no text is selected they insert a placeholder. The richer Markdown content is written verbatim into `README.md` on folder creation.
- **Checkbox labels cleaned** — Removed numeric folder-prefix noise from checkbox labels: `Include 05_Revisions folder` → `Include Client Revisions folder`, `Include 06_Raw_Media folder` → `Include Raw Media folder`. The created folder names on disk are unchanged.

### Changed — Search & Copy: Catalog Book Layout
- **Catalog book layout** — Completely redesigned from a wide DataGrid + narrow sidebar to a **270px fixed sidebar + dominant README pane**: the right README preview now fills all available vertical height using `DockPanel.LastChildFill` rather than a fixed `Height="360"` DataGrid.
- **Project sidebar cards** — Replaced the `DataGrid` with a styled `ListBox` of folder cards. Each card shows a folder icon glyph, project name, and a compact metadata line (`files · size · modified date`). Selected card is highlighted with `FluentBrandLight` background and `FluentBrandTint` border.
- **Mode toggle strip** — PREVIEW / Raw / Gallery toggle buttons moved from below the search bar into the selected project header badge for immediate access without scrolling.
- **Action buttons docked to footer** — Copy Path and Copy Whole Project Folder buttons repositioned to a docked footer panel at the bottom of the right pane, keeping the README preview area unobstructed.
- **Live project count** — The sidebar header now shows a live count label (e.g. "42 projects") that updates after every search.

### Integrity

| File | Details |
|---|---|
| `SS-CAM-v2.4.0.exe` | Compiled Native C# WPF Single-File Executable (4.73 MB) |

## [2.3.6] - 2026-08-06 (Stable Release)

### Fixed
- **Version badge showing wrong version** — The dashboard version badge (`TxtVersionBadge`) was displaying `v2.1.0` at runtime because it is populated dynamically from `AssemblyVersion`. Updated `Properties/AssemblyInfo.cs` to `2.3.6.0`, `CurrentVersion` const in `MainWindow.xaml.cs`, the hardcoded "Check for Updates" dialog in `SettingsPage.xaml.cs`, and the fallback XAML strings in `AboutWindow.xaml` and `DashboardPage.xaml`.

### Changed — Fluent 2 Design System Compliance
- **Segoe Fluent Icons** — Replaced all emoji used in UI chrome (buttons, headers, status indicators) with proper `Segoe Fluent Icons` font glyphs across all pages:
  - `DashboardPage`: Refresh button `&#xE72C;`, project folder icon `&#xED25;`
  - `WellbeingPage`: Focus `&#xE7C3;`, Break `&#xEA86;`, Breathing `&#xE9F5;`, info icon `&#xE82F;`
  - `SearchCopyPage`: Search `&#xE721;`, Copy Path `&#xE8C8;`, Copy Folder `&#xE7C5;`, Image Gallery `&#xEB9F;`
  - `RadioPage`: Header icon `&#xE768;`, Import `&#xE8B5;`, Reset `&#xE72C;`, Add Stream `&#xE710;`, Hero icon `&#xE768;`
- **Token-based colour system** — Removed all raw hex colour literals from `WellbeingPage.xaml`, `SearchCopyPage.xaml`, `RadioPage.xaml`. All foreground, background, border, and status colours now reference `FluentBrand80`, `FluentLightTextPrimary`, `FluentLightTextSecondary`, `FluentLightCardBg`, `FluentLightCardSubBg`, `FluentLightStroke`, `FluentBrandLight`, `FluentBrandTint`, `FluentDanger`, and `FluentSuccess` token brushes defined in `Styles/Fluent2Styles.xaml`.
- **Typography consistency** — Applied `{StaticResource FluentFontFamily}` to all TextBlocks that previously used hard-coded `Segoe UI Variable Text` or `Segoe UI Variable Display` font family strings.
- **Button spec** — All primary action buttons now use `FluentBrand80` background / White foreground with `BorderThickness="0"` and `Cursor="Hand"`. Secondary buttons use `FluentLightCardSubBg`. Danger-zone buttons use `FluentDanger`.

### Integrity

| File | Details |
|---|---|
| `SS-CAM-v2.3.6.exe` | Compiled Native C# WPF Single-File Executable (4.71 MB) |

## [2.1.0] - 2026-08-06 (Stable Release)

### Added
- **Radio & Focus Stream Player Module**:
  - **Live Radio Stations**: Preloaded Malaysian radio stations including BFM 89.9, Hitz FM, Era FM, Hot FM, Suria FM, and THR Raaga.
  - **Focus & Lo-Fi Streams**: Preloaded ambient audio streams (Lofi Focus Beats, Smooth Jazz Workstation).
  - **Custom Stream Management**: Support for adding, editing, filtering, and deleting custom HTTP/HTTPS/M3U8 audio streams with custom genres and emoji icons.
  - **Status Bar Mini-Player Widget**: Persistent audio controls (`▶`/`⏸` play toggle, live station indicator) built directly into the bottom status bar, accessible from all pages.
  - **Interactive Station Grid & Visualizer**: Station cards with category filter tabs (`⭐ Favorites`, `Focus`, `Pop/Hits`, `Talk/News`, `Jazz/Chill`, `Custom`) and animated EQ visualizer bars during active playback.
  - **Configuration Persistence**: Automatically saves custom streams, starred favorites, last played station, and volume preferences to `%LOCALAPPDATA%\SuamiSihat\radio_config.json`.

### Integrity

| File | Details |
|---|---|
| `SS-CAM-v2.1.0.exe` | Compiled Native WPF Single-File Executable |

## [2.0.7] - 2026-08-05 (Stable Release)

### Added
- **Native C# WPF Release Architecture**: Replaced legacy PowerShell bootstrapper packaging with a single-file compiled executable using Fody/Costura assembly embedding.
- **Designer Intelligence Dashboard Enhancements**:
  - **Interactive ToolTips**: Added hover tooltips across all metric cards and the Workspace Synology Flow diagram.
  - **Largest Project Widget**: Tracks and displays the largest project folder on disk by physical size.
  - **Stale Projects Widget**: Identifies and flags idle projects modified over 90 days ago.
  - **Storage Usage by Sub-Brand**: Added a visual chart breakdown for physical storage consumption per sub-brand.
- **Auto Job ID Calculation**: Automatically scans existing workspace folders to determine and pre-fill the next incremental Job ID sequence starting from `0001`.
- **Synchronized 16-Second Box Breathing**: Updated breathing animation and phase color transitions (Inhale, Hold, Exhale, Hold) synchronized with real-time breathing guidance.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v2.0.7.exe` | Compiled Native WPF Single-File Executable |

## [1.9.10] - 2026-08-04 (Stable Release)

### Added
- **Creative Wellbeing Module** – A completely local, private companion for designers to help maintain healthy work habits.
  - **Focus Timer**: Includes monotonic stopwatch tracking for standard focus, deep flow, and gentle focus sessions. Automatically detects when you're idle and safely pauses sessions.
  - **Wellbeing Check-Ins**: Quick interface to rate energy and pressure levels, supporting self-reflection.
  - **Fatigue Rule Engine**: Suggests appropriate rests or breathing breaks based on work duration and recorded check-ins without any diagnostic labeling.
  - **Mind Drops**: Instantly capture blocking thoughts during a session; saved securely with DPAPI encryption to remain completely private to your Windows user account.
  - **Zero Telemetry**: All data is kept strictly on your local disk at `%LOCALAPPDATA%` with zero cloud sync or network footprint.

### Fixed
- **Window Icon** — Fixed an issue where the WPF Window taskbar icon and title bar were displaying as the default PowerShell logo by loading the `suamisihat-logo-on-dark-ui.png` directly as the WPF `Window.Icon` instead of relying on `.ico` format parsing.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.10.exe` | `D0595B94F0228C412D671B03BCAC68B9C743EC3E5CA31A4E8B5BAD330B784AAC` |

## [1.9.9] - 2026-08-04 (Pre-release)

### Fixed
- **App Icon** — Fixed an issue where the application icon was displaying as the default PowerShell logo by generating and embedding a proper `.ico` asset containing the SuamiSihat brand logo.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.9.exe` | `FC7D2BDF2BD953AC57672B101388C404535A691BDE802F0E7559EB6679E4E788` |

## [1.9.8] - 2026-08-04 (Pre-release)

### Added
- **Collapsible sidebar** — Added a hamburger menu button in the header (top left) that allows the sidebar to be collapsed/expanded to maximize workspace area.

### Fixed
- **Circular avatar profile picture** — Fixed the avatar picture displaying as a square by updating the `Image` to a `Border` with a rounded `CornerRadius` using an `ImageBrush` background, making it perfectly circular.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.8.exe` | `CAA9C009DB915351F175E9FBA019198DCBD6251A71231EA600CD4BCD1A272FD3` |

## [1.9.7] - 2026-08-04 (Pre-release)

### Fixed

- **App crash on launch** — Fixed a bug where the app would crash immediately upon opening because the animated header canvas was not in the script scope, causing the `DispatcherTimer` tick handler to fail.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.7.exe` | `01B5AD5515AB976216F3FD2E668C115063E61B527D85D5009AD7357C2841DDDD` |

## [1.9.6] - 2026-08-04 (Pre-release)

### Added

- **Avatar click-to-preview** — clicking the circular profile photo in the sidebar now opens a full-size image popup (`860×660` resizable dark window). The click is captured via `PreviewMouseLeftButtonDown` with `Handled=true` so it doesn't trigger the NavProfile navigation.
- **Department/role in sidebar** — the subtitle under the designer name now shows the department/role from User Profile settings (e.g. "Design Lead"), falling back to "User Profile" when empty. Implemented via a new `DepartmentDisplay` computed property on `AppViewModel` that reacts to `Department` changes.
- **Production / Export thumbnail tab** — a new third tab in the Search & Copy right panel scans `Production`, `Export`, `Exports`, `Output`, and `Outputs` subfolders of the selected project for image files (`.png .jpg .jpeg .gif .bmp .tiff .webp`). Results appear as `160×120` thumbnail cards in a `WrapPanel`; clicking any card opens the full-size popup.
- **Animated header** — the dark navy header has a looping PS Vita-style animation of 8 semi-transparent floating circle outlines (`Ellipse`, white stroke, 5–9% opacity). Driven by a 33 ms `DispatcherTimer`; shapes wrap around canvas edges. Timer is stopped cleanly on `Window.Closed`.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.6.exe` | `0421AF93D1B7C6BE32123C9F1902B962560F4536152B08F3C1BEA912FBEAB391` |

## [1.9.5] - 2026-08-04 (Pre-release)

### Fixed

- **Avatar image** uploaded in User Profile is now shown in the sidebar immediately after saving. Previously the sidebar always displayed the static person placeholder icon regardless of `AvatarPath`. The fix adds a named `<Image>` overlay in the sidebar XAML, a new `Update-AvatarDisplay` helper that loads the image via `BitmapImage.BeginInit/EndInit`, and wires it up on `ContentRendered`, every `AvatarPath` property change, and after `Save-WpfSettings`.

### Verification

- Smoke test passed for Settings view.
- Self-contained v1.9.5 executable smoke test passed.
- Release executable signed with SuamiSihat certificate, timestamped via DigiCert (2026-08-04).

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.5.exe` | `E2535C2B6710D55D44F8470FA40B0D7D4FE1091070D95EE617D18F298B4D3434` |

## [1.9.4] - 2026-08-04 (Pre-release)

### Fixed

- **Job ID code** no longer stays stuck on `D` when switching creative presets. Changing the preset now immediately updates the suffix letter in the Job ID field (e.g. `0003D` → `0003S` for Social, `0003V` for Video, `0003P` for Brand Identity).
- **README preview** in Search & Copy no longer shows YAML frontmatter (`---` block). Frontmatter is now stripped before the FlowDocument renderer processes the file.
- **Asset folder cards** text is no longer cropped. Changed fixed `Height="132"` to `MinHeight="132"` so card height grows to fit the subtitle text.

### Verification

- Smoke test passed for Projects, BrandAssets, Search, Dashboard, Settings, and Setup views.
- Self-contained v1.9.4 executable smoke test passed.
- Release executable signed with SuamiSihat certificate, timestamped via DigiCert (2026-08-04).

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.4.exe` | `FF4EB88986DB185BA0EF692F6AC38C444EC0C38ABCC7BA29405A542AFF624DB4` |

## [1.9.3] - 2026-08-04 (Pre-release)

### Changed

- Update checker now shows a **Yes/No dialog** when a newer version is available, with a direct link to the GitHub release download page.
- Update checker status text now confirms the running version when already up to date: `You are running the latest version (vX.Y.Z)`.
- Hardcoded fallback version strings in `Get-SuamiSihatLatestRelease` and `Build-Installer.ps1` bumped to `1.9.3` for consistency.

### Documentation

- Replaced outdated WinForms installer screenshots in `docs/` with fresh WPF v1.9.3 captures:
  - `app-dashboard.png` — Creative Workspace Dashboard
  - `app-project-creator.png` — Creative Project Folder Creator
  - `app-search-copy.png` — Search & Copy
  - `app-brand-assets.png` — Brand Assets module
  - `app-profile-settings.png` — User Profile & Settings
  - `app-installer-setup.png` — Installer Setup wizard

### Verification

- Update checker dialog and browser launch tested in smoke-test mode.
- All six `RenderTargetBitmap` screenshot exports verified.
- Self-contained v1.9.3 executable smoke test passed.
- Release executable signed with SuamiSihat certificate, timestamped via DigiCert (2026-08-04).

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.3.exe` | `39035C252CA31D694EDBD92FC980B9BBB2362E7D58526B70CCD156C33898B565` |

## [1.9.2] - 2026-08-03 (Stable Release)

### Added

- Rendered `README.md` preview in Search & Copy, with Preview and Raw Markdown modes.
- Conditional Brand Assets module with large cards for Colour Palettes, Asset Libraries, and Logos.
- In-app rendered Markdown views for workstation and font-inventory reports.
- Public Brand Assets link and updated Internal Assets endpoint.
- Font Awesome Free vector icons and SuamiSihat favicon integration for the window, taskbar, and report dialogs.
- Custom master-canvas extension entry and designer-based project-folder filtering.

### Changed

- Job IDs now place their work-type code after the sequential number, for example `0001D` and `0001S`.
- Legacy prefix-format IDs such as `D0001` remain readable and migrate to the suffix format in application state.
- Sub-brand selectors now display the full registered business names while project folders retain concise codes.
- Project Management separates project/template inputs from generated location and subfolder structure.
- Search operates on project-folder names and loads the selected project's `README.md` and file list.

### Installer

- Brand Kit installation registers its asset path for conditional module discovery.
- Express and Custom installation retain the four-step component, configuration, licence, and report flow.
- Brand Kit options are skipped when Brand Kit is not selected.
- Uninstall controls remain hidden when no Creative Project Management installation is detected.

### Verification

- PowerShell parsing and WPF construction tests passed.
- Legacy and suffix Job ID scanning tests passed.
- README Preview/Raw toggle and Markdown rendering tests passed.
- Self-contained v1.9.2 executable smoke test passed.
- Release executable signed with SuamiSihat certificate (SHA1: `9A73B71BEE3AFEDA9E4CCECA2466FB5FFE0255AC`), timestamped via DigiCert on 2026-08-04.
- Signed executable SHA-256: `99B929F06D4A41CF33FFC1A3111955FB8A57B98C1B2D1AB738F495B62B20A21C`.

## [1.9.1] - 2026-08-03

- Introduced folder-name Search & Copy with designer filtering, README loading, and project file selection.
- Added local/NAS Job ID pooling and pending offline synchronization.
- Improved dashboard widgets, charts, installer component flow, repair, and uninstall behavior.

## [1.9.0] - 2026-08-03

- Introduced the responsive WPF application and installer interface.
- Added Dashboard, Project Management, Search & Copy, and User Profile modules.
