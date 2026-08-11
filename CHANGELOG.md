# Changelog

All notable SS-CAM changes are documented here.

## [2.6.1] - 2026-08-11 (Latest)

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
