# 01 — Architecture Review
**SS-CAM v3.2.0** | Last updated: 2026-08-12

---

## 1. Project Structure

```
SS-Brand-Assets/
├── src/SS-CAM/
│   ├── App.xaml / App.xaml.cs          # Application entry point, startup wiring
│   ├── MainWindow.xaml / .cs           # Shell: sidebar nav, theme toggle, status bar
│   ├── Models/                         # Plain data models (no business logic)
│   │   ├── UserProfileModels.cs        # UserProfile, SystemSpecs, SoftwareHealthItem
│   │   ├── ProjectStatus.cs            # Project job models
│   │   ├── RadioStation.cs             # Radio station data model
│   │   ├── TeamNote.cs                 # Collaboration team note model
│   │   └── PrayerTimeModels.cs         # PrayerTimeEntry, PrayerState, PrayerZoneInfo
│   ├── Services/                       # Business logic and external integrations
│   │   ├── UserProfileService.cs       # Load/save UserProfile JSON
│   │   ├── ThemeService.cs             # Theme enum, hot-swap, persistence
│   │   ├── RadioStreamService.cs       # ICY stream, cover art, station list
│   │   ├── QuickNoteService.cs         # Note persistence
│   │   ├── PrayerTimeService.cs        # JAKIM API fetch, cache, ComputeState
│   │   └── [others]                    # WorkspaceScanner, DashboardService, etc.
│   ├── Views/                          # WPF Pages (one per module)
│   │   ├── DashboardPage.xaml/.cs
│   │   ├── RadioPage.xaml/.cs
│   │   ├── WaktuSolatPage.xaml/.cs     # NEW v2.6.0
│   │   ├── WellbeingPage.xaml/.cs
│   │   ├── SearchCopyPage.xaml/.cs
│   │   ├── ProjectCreatorPage.xaml/.cs
│   │   ├── QuickNotePage.xaml/.cs
│   │   ├── TaskManagerPage.xaml/.cs
│   │   ├── CalendarPage.xaml/.cs       # NEW v3.2.0 — Big Calendar timetable
│   │   ├── BrandAssetsPage.xaml/.cs
│   │   ├── WorkstationHealthPage.xaml/.cs
│   │   └── SettingsPage.xaml/.cs
│   ├── Styles/
│   │   ├── Fluent2Styles.xaml          # Base design token dictionary
│   │   └── MetamorphosisTheme.xaml     # NEW v2.5.1 — glassmorphism overrides
│   └── SS-CAM.csproj
├── dist/                               # Built distributable EXEs
├── installer/                          # Build-Installer.ps1
├── QA/                                 # ← This folder
└── AGENTS.md                           # Agent behaviour rules
```

---

## 2. Layer Separation

| Layer | Files | Responsibility |
|---|---|---|
| **Entry** | `App.xaml.cs` | App startup, window placement, global exception handling |
| **Shell** | `MainWindow.xaml.cs` | Navigation host, theme, sidebar, status bar |
| **Views** | `Views/*.xaml/.cs` | Page UI + page-level event handlers |
| **Services** | `Services/*.cs` | All I/O, API, computation logic |
| **Models** | `Models/*.cs` | DTOs — pure data, no methods |
| **Styles** | `Styles/*.xaml` | Design token resource dictionaries |

> [!NOTE]
> The project follows a lightweight MVVM-adjacent pattern. Pages use code-behind
> rather than full ViewModels. This is acceptable for an in-house single-user
> desktop app, but new complex pages should consider extracting logic to Services.

---

## 3. Navigation Architecture

```
MainWindow
  └── Frame (x:Name="MainFrame")
        └── Page.Navigate(typeof(PageType))   ← NavigateTo() helper
```

- Navigation state is maintained by `MainWindow._currentNavBtn` (active button reference)
- Active nav indicator (blue left-bar Rectangle) toggled via `SetActiveNavItem()`
- Pages are instantiated fresh on each navigation (no page cache)

> [!WARNING]
> Pages are **not cached** — navigating away from RadioPage stops the stream.
> This is the current design; a future improvement could use `NavigationCacheMode="Required"`.

---

## 4. Theme Architecture

```
AppTheme enum { SSDefault, Falconia, Metamorphosis }
      │
ThemeService.ApplyTheme(theme)
      │
      ├── SwapResourceDictionary()
      │     Removes: Fluent2Styles.xaml (or MetamorphosisTheme.xaml)
      │     Inserts: MetamorphosisTheme.xaml (or Fluent2Styles.xaml)
      │     Target:  App.Resources.MergedDictionaries[2]
      │
      ├── OnThemeModeChanged(theme) in MainWindow
      │     Sets WindowBackdropType, Background colour
      │
      └── Saves to %APPDATA%\SS-CAM\theme_config.json
```

---

## 5. Data Persistence Locations

| Data | Location |
|---|---|
| User profile | `%APPDATA%\SS-CAM\profile.json` |
| Theme config | `%APPDATA%\SS-CAM\theme_config.json` |
| Quick notes | `%APPDATA%\SS-CAM\notes\` |
| Radio cover art | `%APPDATA%\SS-CAM\covers\{stationId}.jpg` |
| Prayer time cache | `%APPDATA%\SS-CAM\prayertimes\{zone}-{date}.json` |
| Station list | `%APPDATA%\SS-CAM\stations.json` |
| **SSNAS Sync Root** | `E:\SynologyDrive\Creative-Team` (Synology Drive Client ↔ `/Creative-Team`) |
| **NAS Team Config Sync** | `E:\SynologyDrive\Creative-Team\_Team\_Config\` (`NasConfigSyncService`) |

---

## 6. External Dependencies

| Dependency | Version | Purpose | Licence |
|---|---|---|---|
| `Wpf.Ui` | 3.0.4 | Fluent 2 WPF controls | MIT |
| `Newtonsoft.Json` | 13.0.3 | JSON serialisation | MIT |
| `Fody` + `Costura.Fody` | 6.5.5 / 5.7.0 | Single-file EXE embedding | MIT |

No other NuGet packages. All DLLs are Costura-embedded at Release build time.

---

## 7. Architecture Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| A01 | `ThemeService` is a static class defined inline in `MainWindow.xaml.cs` — makes unit testing harder | ⚠️ Low | Accepted (scope) |
| A02 | Pages instantiated fresh on every navigation — state lost on nav away | ⚠️ Medium | Known — future backlog |
| A03 | No global exception handler registered in `App.xaml.cs` — unhandled exceptions will crash silently | ❌ Medium | Open |
| A04 | `RadioStreamService` is ~1100 lines — consider splitting ICY parsing vs station management | ⚠️ Low | Backlog |
| A05 | `PrayerTimeService` catches all exceptions silently in `ParseEntry` — needs structured error reporting | ⚠️ Low | Open |
