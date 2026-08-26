# SS-CAM FINAL QA REPORT

## Status: PASS — v4.4.1 Stable Release

**QA Date**: 2026-08-26  
**Configuration**: Release (MSBuild 4.8)  
**Source Guardian**: **PASS — 9 checks passed, 0 warned, 0 failed**  
**Web Test Suite**: **PASS — 20 passed, 0 failed**

---

### Build & Code Quality Status
- Desktop Release build: **PASS** (`SS-CAM.exe` compiled cleanly)
- Web Production build: **PASS** (`npm run build:client` completed cleanly)
- Source Guardian: **PASS** (9 passed / 0 warned / 0 failed)
- Test Suite: **PASS** (20 passed / 0 failed)

---

### Resolved Issues (v4.0.0 – v4.4.1)

| ID | Severity | Description | Resolution | Status |
|---|---|---|---|---|
| SCROLL-01 | P0 | Mouse wheel scrolling broken on all pages | Global `OnGlobalPreviewMouseWheel` on `MainWindow` + per-page wire-up on 10 broken pages | **Resolved** |
| ROLE-01 | P0 | Manager / CEO roles appearing in designer filters | `IsDesignerOrAdminRole` predicate; filtered from `WorkspaceScanner`, `TaskManagerPage`, `CalendarPage`, Web metrics | **Resolved** |
| DASH-01 | P0 | Dashboard workload showing `2026` (year folder) as designer name | `ComputeDesignerWorkloads` overhauled to use staff directory + `ResolveProjectDesigner` | **Resolved** |
| RAD-01 | P0 | Official SuamiSihat Radio Stream | Pinned `#1` preset station with live audio playback (`RadioStreamService.cs`) | **Resolved** |
| SCAN-01 | P0 | Deep Month-Container Vault Discovery | Bypasses intermediate month folders to index nested project vaults (`WorkspaceScanner.cs`) | **Resolved** |
| PID-01 | P0 | Dynamic Project ID Counter Auto-Calculation | Scans active month containers, year folders, and local workspaces for next sequential ID | **Resolved** |
| COPY-02 | P0 | Copywriting Studio FlowDocument Preview | Default rendered rich markdown preview with compact icon-only mode toggles | **Resolved** |
| CAT-01 | P0 | Catalog Designer Resolution & Filtering | Sanitized designer filter mapped to staff directory with system folder exclusion | **Resolved** |
| SLA-01 | P0 | Designer Workload & Capacity Radar | Live capacity calculations (`WorkloadSlaService.cs`) and bandwidth status tags | **Resolved** |
| SLA-02 | P0 | Creative SLA & Turnaround Telemetry | First-time right %, turnaround days, revision averages across desktop & web | **Resolved** |
| EXP-01 | P0 | 1-Click Handover Packaging & Manifest | Async ZIP packaging with `HANDOVER_SUMMARY.html` and REST endpoint | **Resolved** |
| NAME-01 | P0 | Canonical Asset Naming & Sanitizer | Canonical `{YEARMONTH}_{JOBID}_{BRAND}_{PROJECT}_{TYPE}_{VERSION}.{EXT}` sanitizer | **Resolved** |
| SYNC-01 | P0 | Desktop NAS File Watcher & SSE Stream | Real-time `WorkspaceWatcherService` and Web Server-Sent Events | **Resolved** |
| COPY-01 | P0 | Desktop Copywriting Studio | Dedicated `CopywritingPage.xaml` with `COPY.md` and live metrics | **Resolved** |
| VAULT-01 | P0 | Centralized 5-Folder Hierarchy | Canonical `Creative-Team/[YYYY]/[YYYYMM_Month]/[Project]` vault hierarchy | **Resolved** |

---

### Executable Binary
- Desktop Binary: [`dist/SS-CAM-v4.4.1.exe`](file:///e:/Dev/Projects/SS-Brand-Assets/dist/SS-CAM-v4.4.1.exe) (5.61 MB)
- Assembly Version: `4.4.1.0`
