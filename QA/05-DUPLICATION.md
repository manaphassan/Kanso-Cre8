# 05 — Duplication Audit
**SS-CAM v4.6.1** | Last updated: 2026-09-04

---

## 1. Code Duplication Areas

### XAML Control Styling (Severe)
A static analysis of the XAML files reveals a massive amount of inline styling duplication. While the `FontFamily` duplication was significantly reduced (now only 18 instances), there are still **190 instances** of inline `Background` color declarations and **177 instances** of inline `Foreground` declarations.
*Recommendation:* XAML should be stripped of inline colors and rely entirely on dynamic theme brushes (`DynamicResource`) to ensure Dark Mode compatibility.

### Filesystem Scanning (Frontmatter)
Both `SearchCopyPage` and `TaskManagerPage` need to read `README.md` files from project folders.
- `SearchCopyPage` uses `WorkspaceScanner.cs` directly.
- `TaskManagerPage` uses `WorkspaceScanner.cs` but then passes the path to `FrontmatterService.ReadStatus`.
*Status:* Partially abstracted via `WorkspaceScanner`, but the logic for finding valid project folders is slightly duplicated in how the results are filtered.

### JSON Serialization/Deserialization
Multiple services implement identical file read/write patterns using `Newtonsoft.Json`:
- `UserProfileService` (profile.json)
- `ThemeService` (theme_config.json)
- `PrayerTimeService` (prayertimes cache)
- `QuickNoteService` (notes JSON)
- `RadioStreamService` (stations JSON)

**Typical duplicated block:**
```csharp
if (File.Exists(path)) {
    string json = File.ReadAllText(path);
    var data = JsonConvert.DeserializeObject<T>(json);
}
```
*Recommendation:* Create a central `JsonPersistenceHelper<T>` to handle standard read/write, directory creation, and error handling safely.

### UI Event Handlers
While `MainWindow.xaml` successfully uses `ui:NavigationView` to handle global routing natively, there are duplicate wrapper implementations for Buttons across the app. Instead of applying semantic styles (e.g. `<ui:Button Appearance="Primary">`), developers have repeatedly wrapped transparent buttons inside colored `Border` tags.
*Recommendation:* Standardize on `Appearance` attributes to reduce nested visual trees.

### Hardcoded File Paths
`Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData)` + `SS-CAM` is hardcoded in at least 5 different service classes.
*Recommendation:* Create a central `AppConstants.AppDataPath` or `PathResolverService`.

## 2. Refactor Candidates

| Candidate | Priority | Effort | Benefit |
|---|---|---|---|
| Refactor Hex Colors to Theme Tokens | P0 | Medium | Fixes Dark Mode & Fluent 2 design consistency |
| Convert Border Cards to ui:Card | P1 | High | Standardizes layout spacing and elevation |
| Central `JsonPersistenceHelper` | P1 | Low | Reduces filesystem bugs, centralizes serialization. |
| Central `AppPaths` static class | P2 | Low | Prevents typos in AppData directory resolution. |
