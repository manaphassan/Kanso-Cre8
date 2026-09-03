# SS-CAM Project Roadmap

> **Living document.** Updated with every release. Last updated: 2026-09-03.

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
| **v4.4.1** | 2026-08-26 | **Radio Stream, Deep Scanner & Copywriting FlowDocument Engine**: Official SuamiSihat Radio Stream preset `#1`, deep month-container project discovery, dynamic project ID auto-calculation, FlowDocument markdown rendering by default, sanitized designer catalog filtering |
| **v4.4.2** | 2026-08-27 | **Art Director Polish & Live Ad/WhatsApp Preview Engine**: Live Split-View formatting preview (WhatsApp & Meta Ads), one-click Hook & CTA snippet drawer, dynamic status pill badges, polished vector empty states, and overline typographic rhythm |
| **v4.4.3** | 2026-08-27 | **Radio Visualizer Overhaul & Station Upgrades**: Dynamic real-time playback gating for 69 Mars symbols & 6 SuamiSihat logomarks, song wavelength sinusoidal vertical oscillation & beat kick pulsing across all visualizer modes, curated Nightwave Plaza & SomaFM Groove Salad stations, Malaysia holidays calendar integration |
| **v4.4.4** | 2026-08-27 | **Creative Wellbeing & Biometric Suite Overhaul**: Real-time 5-axis biometric spider radar, dynamic 30-day focus intensity heatmap, interactive vector water hydration tracker with sinusoidal waves, and burnout risk analytics |
| **v4.5.0** | 2026-08-28 | **Master Brand System v3.5.1 Integration & Brand Assets Vault Modernization**: Full alignment with official SuamiSihat Master Brand System Guide, Multi-Format Color Matrix (BAL/RAL standard, CIE-Lab, Pantone, CSS tokens), 5 Corporate Sub-Brands Hub with 1-click folder launchers, interactive Surface Contrast Previewer ($L \ge 50\%$ rule), 4-tier typography scale reference |
| **v4.5.1** | 2026-08-30 | **Cross-Platform Ecosystem Synchronization & Companion Harmonization**: Windows Desktop Client v4.5.1 (single-file executable, UTF-8 BOM, 100% theme-adaptive DynamicResource tokens), Web Management Portal Svelte 5 / Node.js 20 (zero-emoji Fluent 2 design, desktop mobile dock layout fix, 28/28 passed test suite), Android Companion App (Compose UI, Studio Lounge, and live NAS sync) |
| **v4.6.0** | 2026-09-01 | **Beta Release — Android Native Companion Modernization, Live ICY Stream Metadata Engine, Preflight Quality Auditor & Desk Companion Standby Mode**: Desktop Preflight Quality Validator & Auto-Fix Scaffolding, Android 2×2 Bento KPI Telemetry & Persistent Local Caching (`ProjectCacheManager`), real-time AzuraCast/Laut.fm/SomaFM live song broadcasting metadata on TopAppBar & bottom cassette deck, interactive `SsHero` animated wave mesh splash screen, interactive `FluentMarkdownViewer` with live task checkbox syncing, OLED Desk Standby Mode, and Material You monochromatic icons |
| **v4.6.1** | 2026-09-03 | **Patch Release — Creative Direction Matrix Preview, Markdown Auto-Wrapping, Overdue Suppression & Shared Team Board Isolation**: Desktop Task Manager Kanban overdue suppression for completed/approved projects, frontmatter YAML quote stripping, Web Portal Creative Direction preview-first card matrix & header toggle, auto-wrapping markdown editor, and isolated shared team board test suite |

---

## 🎯 Active Milestone — v4.7.0: Production Pipeline Intelligence (Target: Q4 2026)

### 1. Copywriting Studio Split-View Live Preview (Desktop)
* **Live WhatsApp & Ad Message Card**: Real-time side-by-side rendering transforming structured Markdown into live WhatsApp bubbles (bold asterisks `*text*`, emoji spacing, call-to-action link previews) and Meta Ad primary text mockups.
* **Instant Toggle Controls**: View mode switcher (`[Split View]`, `[Editor Only]`, `[Preview Only]`) with live character and word counters.

### 2. Creative Snippet & Hook Drawer
* **1-Click Viral Hook & CTA Inserter**: Pre-approved medical disclaimers, viral hook formulas (Problem-Agitate-Solve, Before-After-Bridge), promo code snippets, and WhatsApp routing links inserted directly at cursor position.

### 3. Visual Polish & Art Director Enhancements
* **Dynamic Status Pill Badges**: Standardized visual indicators for campaign lifecycle (`Active`, `In Review`, `Archived`, `NAS Synced`).
* **Polished Empty States**: Elegant vector empty states with helpful callouts for project selection across Copywriting, Search Copy, and Task Manager.
* **Typographic Hierarchy & Overlines**: Consistent overlines (`11px Bold CharacterSpacing="50"`), 24px hero titles, and enhanced breathing room across cards.

---

## 🔄 In Progress — v4.8.0: Visual Asset Revision Diff & Side-by-Side Comparison (Target: Q4 2026)

### 1. Interactive Split-Slider Visual Diff (Desktop & Web)
* Split-slider comparison between deliverable revisions (`_v1.png` vs `_v2.png`, or artwork mockup vs print dieline).
* Synchronized zoom and pan for high-resolution print exports and packaging dielines.

### 2. Copywriting & Brief Revision Diff Engine
* Visual color-coded diff viewer (green additions / red deletions) for `COPY.md` scripts and `README.md` project briefs across revision cycles.

---

## 🔮 Planned — v4.6.0: Global Studio Command Palette & Ingester (Target: Q4 2026)

### 1. Global Command Palette (`Ctrl + K`)
* Universal keyboard launcher for jumping to projects, copying brand hex codes, searching snippets, or toggling radio stations without leaving the current view.

### 2. Drag-and-Drop Folder Ingester
* Drag external assets directly onto project cards in Project Creator to automatically organize into `01_BRIEF_ASSETS`, `02_SOURCE_FILES`, etc.

---

## 📱 & 🐧 Planned — v4.6.0: Multi-Platform Ecosystem Alignment (Target: Q4 2026 / Q1 2027)

| Feature / Component | Target Stack | Description |
|---|---|---|
| **Linux Fedora Native Client (`src/SS-CAM.Linux`)** | C# / Avalonia UI 12.1 (.NET 8/10 LTS) | Complete feature parity for Fedora/Ubuntu workstations with Fluent 2 styling, local `~/SynologyDrive/` workspace integration, and native Skia desktop rendering. |
| **Android Native Client (`src/SS-CAM.Android`)** | Kotlin + Jetpack Compose | Native mobile companion for creative leads & reviewers: instant deliverable review, 1-tap approvals/revisions, push notifications, task tracking, and brand color palette picker. |
| **Web Portal Admin & Control Console (`src/SS-CAM.Web`)** | Svelte 5 + Node.js Express (Docker) | Central administration hub: corporate holding switcher (SSH, SSC, SSW, SSE, SST), user provisioning, immutable audit log explorer, webhook dispatch, and remote API gateway. |
| **Multi-Workspace NAS Switching** | Cross-Platform | Fast switching between business unit shares (`Creative-Team`, `Video-Production`, `Marketing-Assets`). |

---

## 🔮 Future Exploration — v5.0.0: Enterprise Intelligence & Asset Versioning (Target: Q2 2027)

| Area | Idea |
|------|------|
| **Asset Revision Snapshots** | Visual diff timeline and rollback engine for `.afdesign` and `.psd` binaries |
| **AI Creative Assistant** | Local/Offline LLM integration for generating ad hooks, drafting campaign briefs, and translating copy |
| **Real-time Live Sync Hub** | High-throughput bi-directional synchronization bridge between native clients and NAS storage |

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
