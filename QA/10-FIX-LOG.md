# SS-CAM FIX LOG

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

