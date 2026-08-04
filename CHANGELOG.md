# Changelog

All notable SS-CAM changes are documented here.

## [1.9.10] - 2026-08-04

### Fixed
- **Window Icon** — Fixed an issue where the WPF Window taskbar icon and title bar were displaying as the default PowerShell logo by loading the `suamisihat-logo-on-dark-ui.png` directly as the WPF `Window.Icon` instead of relying on `.ico` format parsing.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.10.exe` | `D0595B94F0228C412D671B03BCAC68B9C743EC3E5CA31A4E8B5BAD330B784AAC` |

## [1.9.9] - 2026-08-04

### Fixed
- **App Icon** — Fixed an issue where the application icon was displaying as the default PowerShell logo by generating and embedding a proper `.ico` asset containing the SuamiSihat brand logo.

### Integrity

| File | SHA-256 |
|---|---|
| `SS-CAM-v1.9.9.exe` | `FC7D2BDF2BD953AC57672B101388C404535A691BDE802F0E7559EB6679E4E788` |

## [1.9.8] - 2026-08-04

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

## [1.9.2] - 2026-08-03

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
