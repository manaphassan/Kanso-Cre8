# SS-CAM Project Roadmap

> **Living document.** Updated with every release. Last updated: 2026-08-20.

---

## ✅ Released Milestones

| Version | Date | Highlights |
|---------|------|-----------|
| **v1.9.0** | 2024 | Initial internal release — Project Creator, basic dashboard |
| **v2.0.0** | 2025-01 | WPF-UI Fluent 2 redesign, Wellbeing module, Mind Drop notes |
| **v2.1.0** | 2025-03 | Radio player, Brand Assets vault |
| **v2.2.0** | 2025-06 | Workstation Health scanner, dark mode tokens |
| **v2.3.0** | 2026-01 | Search & Copy v1, Markdown README preview |
| **v2.3.6** | 2026-08-06 | Version badge fix, AV metadata patch, stability improvements |
| **v2.4.0** | 2026-08-10 | Dashboard Inspiration Widget (40 tips + RSS), Project Brief Markdown Editor, Search & Copy Catalog layout |
| **v2.5.0** | 2026-08-10 | Quick Notes module, Task Manager Kanban, Team Board, Frontmatter injection in Project Creator |
| **v2.6.0** | 2026-08-11 | Smoke-test bug-fix release: FrontmatterService P0 fix, theme toggle wired, dead code removed, dynamic rescan count, static HttpClient |
| **v2.6.2** | 2026-08-11 | Creative Workflow Modernization: App bridge launcher, 1-Click ZIP Finalizer, Brand Kit Quick-Tray, Visual Asset Lightbox |
| **v2.6.3** | 2026-08-11 | Audit Remediation & Diagnostic Logging: Dynamic token standardization across 4 modules, Segoe Fluent vector icon standardization |
| **v3.0.0** | 2026-08-12 | Major Release: Full Fluent 2 overhaul across all 12 modules, 5 theme profiles (Falconia, Metamorphosis, Catppuccin, Rosé Pine, Nord) |
| **v3.0.1** | 2026-08-12 | Categorized Fluent 2 sidebar navigation (5 visual categories + headers/separators), adaptive bottom live bar collapse state |
| **v3.1.0** | 2026-08-12 | QR Code Studio & Generator module, Sound Engineer visualizer with floating Mars symbols, Radio studio polish |
| **v3.1.2** | 2026-08-12 | Multi-user isolation on shared NAS drives (`_{username}` scoping), team-wide shared presets |
| **v3.2.0** | 2026-08-12 | Big Calendar module (`CalendarPage`), Task Manager Calendar Date & FIFO Queue Order sorting, SSNAS Synology Drive Setup guide |
| **v3.3.0** | 2026-08-13 | Fluent 2 Startup Splash Window, Centralized Notification & Clipboard Services, Task Manager queue & parser upgrades |
| **v3.4.0** | 2026-08-13 | Starter Canvas Engine (.af/.psd/.ai), Web Design presets, Search Category Filter, Calendar Quick Actions |
| **v3.5.0** | 2026-08-17 | In-App Project Brief Markdown Editor in Search & Copy, Workspace Designer Folder Scoping, Repository Hygiene & Architecture Cleanup |
| **v3.5.0-linux** | 2026-08-14 | Linux Desktop Edition: Initial native Avalonia UI (.NET 8) port for Fedora Linux & Synology Drive Client (`~/SynologyDrive/`) |
| **v3.6.0** | 2026-08-17 | Microsoft Fluent UI Web (`sscam-fluentui-web`) design tokens, 3-Tier F-Pattern Dashboard analytics, Copywriting AI script presets |
| **v3.6.1** | 2026-08-17 | Metamorphosis theme solid surface opacity overhaul, legibility fixes for drawer panels & cards |
| **v4.0.0** | 2026-08-18 | **Centralized Vault Hierarchy & ClickUp 3.0 Task Workspace**: Year-first NAS hierarchy (`Creative-Team/[YYYY]/[YYYYMM_Month]/[Project]`), 5-folder structure, 68%/32% 2-column task workspace, in-app Copywriting Studio (`03_COPYWRITING/COPY.md`), JSONL contextual comments (`_comments.jsonl`), enterprise RBAC & immutable audit logs |
| **v4.0.1** | 2026-08-18 | **Patch Release**: Real async GitHub Releases API update checker with NAS `version.json` fallback, landing page synchronization |
| **v4.1.0** | 2026-08-19 | **Desktop Feature Parity & Studio Overhaul**: Desktop Copywriting Studio (`CopywritingPage`), contextual discussions data layer (`ProjectCommentService`), and ClickUp 3.0-style 2-column task workspace |
| **v4.2.0** | 2026-08-20 | **Desktop NAS Sync & Batch Operations + Web Real-Time SSE**: Background `WorkspaceWatcherService`, `ThumbnailCacheService`, UI virtualization, batch operations ribbon, and Web SSE event stream + HTTP 206 video range streaming |
| **v4.3.0** | 2026-08-20 | **Asset Export, Packaging & Naming Engine**: Desktop `ExportPackagingService` (1-click ZIP with `HANDOVER_SUMMARY.html`), `AssetNamingService` canonical sanitizer, and Web `ExportService` ZIP streaming |
| **v4.4.0** | 2026-08-20 | **Designer Workload Heatmaps & Creative SLA Analytics**: Live designer capacity radars (`WorkloadSlaService`), capacity progress meters, and operational SLA telemetry across Desktop and Web |

---

## 🔄 In Progress — v4.5.0: Visual Asset Revision Diff & Side-by-Side Comparison (Target: Q3/Q4 2026)

### 1. Interactive Split-Slider Visual Diff (Desktop & Web)
* Split-slider comparison between deliverable revisions (`_v1.png` vs `_v2.png`, or artwork mockup vs print dieline).
* Synchronized zoom and pan for high-resolution print exports and packaging dielines.

### 2. Copywriting & Brief Revision Diff Engine
* Visual color-coded diff viewer (green additions / red deletions) for `COPY.md` scripts and `README.md` project briefs across revision cycles.

---

## 🗓️ Planned — v4.2.0: Desktop-First Real-Time Automation & Web Synchronization (Target: Q4 2026)

### Phase 1: Native Desktop Operations & Media Engine (Desktop First)
* **Desktop Real-Time NAS File Watcher**: Native `FileSystemWatcher` service monitoring `_comments.jsonl`, `audit_log.jsonl`, and project frontmatter changes across the shared Synology NAS with live in-app notifications and zero manual refresh needed.
* **Native Desktop Deliverable Thumbnail & Quick-Preview**: Asynchronous thumbnail extractor and local cache engine for `.afdesign`, `.psd`, `.ai`, and deliverable exports, enabling instantaneous lightbox loading.
* **Desktop Batch Project Operations**: Multi-selection command bar in desktop catalog for bulk status transitions, batch tag edits, and 1-click quarterly ZIP exports.
* **Desktop UI Virtualization & High-Volume NAS Performance**: `VirtualizingWrapPanel` and incremental background streaming for 1,000+ project vaults with zero UI frame drops.

### Phase 2: Web Portal Real-Time & Media Pipeline (Web Synchronization)
* **Server-Sent Events (SSE) Live Feed**: Lightweight HTTP event streaming pushing live comment mentions and sign-off events to browser clients.
* **Server Thumbnail Endpoint & Media Delivery**: Background image caching and thumbnail pipeline serving the web portal deliverable lightbox.

---

## 🐧 Planned — v4.3.0: Cross-Platform Linux & Multi-Workspace (Target: Q1 2027)

| Feature | Description |
|---------|-------------|
| **Avalonia UI Linux v4.x Port** | Complete feature parity for Fedora/Ubuntu workstations with Fluent 2 styling and .NET 8 LTS |
| **Multi-Workspace NAS Switching** | Fast switching between business unit shares (`Creative-Team`, `Video-Production`, `Marketing-Assets`) |

---

## 🔮 Future Exploration — v5.0.0: Enterprise Intelligence & Asset Versioning (Target: Q2 2027)

| Area | Idea |
|------|------|
| **Asset Revision Snapshots** | Visual diff timeline and rollback engine for `.afdesign` and `.psd` binaries |
| **AI Creative Assistant** | Local/Offline LLM integration for generating ad hooks, drafting campaign briefs, and translating copy |
| **Mobile Companion PWA** | Responsive touch-first web app for creative directors to review and sign-off deliverables on tablets/phones |

---

## Architecture Constraints

The following constraints apply to all versions and must be respected in planning:

| Constraint | Reason |
|-----------|--------|
| **C# 5 syntax only** | MSBuild `v4.0.30319` on the build machine caps at `/langversion:5` |
| **No new NuGet packages** | `Costura.Fody` single-file bundling makes adding packages complex and risky |
| **`System.Net.Http`** | Already a framework assembly on .NET 4.8; use for all HTTP instead of `WebClient` |
| **`System.Xml.Linq`** | Available; use for RSS/XML parsing |
| **No WPF-UI breaking changes** | Locked to `WPF-UI 3.0.4` |
| **JSON via Newtonsoft.Json** | Already bundled; use for all serialisation |
| **NAS path separator** | Always use `Path.Combine` — never hardcode `\` or `/` |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture, namespace conventions, and build instructions.
