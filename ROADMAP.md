# SS-CAM Project Roadmap

> **Living document.** Updated with every release. Last updated: 2026-08-14.

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
| **v2.6.0** | 2026-08-11 | Smoke-test bug-fix release: FrontmatterService P0 fix, theme toggle wired, dead code removed, hardcoded D:\Testing paths eliminated, Team Board offline guard, dynamic rescan count, static HttpClient, H3 preview, Debug logging |
| **v2.6.2** | 2026-08-11 | Creative Workflow Modernization: Modernized Dashboard & Project Creator cards, Adobe/Affinity app bridge launcher, 1-Click ZIP Finalizer, Brand Kit Quick-Tray popover, Visual Asset Lightbox modal, Revision Timeline view, SS Default theme contrast fix |
| **v2.6.3** | 2026-08-11 | Audit Remediation & Diagnostic Logging: Phase 1-4 audit fixes, dynamic token standardization across 4 modules, Segoe Fluent vector icon standardization, 100% clean Source Guardian |
| **v3.0.0** | 2026-08-12 | Major Release: Full Fluent 2 overhaul across all 12 modules, Designer Profile & Settings 2-column revamp, 5 switchable theme profiles (Falconia, Metamorphosis, Catppuccin, Rosé Pine, Nord), Workstation Payload installer |
| **v3.0.1** | 2026-08-12 | Categorized Fluent 2 sidebar navigation (5 visual categories + headers/separators), adaptive bottom live bar collapse state |
| **v3.1.0** | 2026-08-12 | QR Code Studio & Generator module, Sound Engineer visualizer with floating Mars symbols, Radio studio polish |
| **v3.1.2** | 2026-08-12 | Multi-user isolation on shared NAS drives (`_{username}` scoping), team-wide shared presets |
| **v3.2.0** | 2026-08-12 | Big Calendar module (`CalendarPage`), Task Manager Calendar Date & FIFO Queue Order sorting, SSNAS Synology Drive Setup guide |
| **v3.3.0** | 2026-08-13 | Fluent 2 Startup Splash Window, Centralized Notification & Clipboard Services, Task Manager queue & parser upgrades |
| **v3.4.0** | 2026-08-13 | Starter Canvas Engine (.af/.psd/.ai), Web Design presets, Search Category Filter, Calendar Quick Actions |
| **v3.5.0** | 2026-08-17 | In-App Project Brief Markdown Editor in Search & Copy, Workspace Designer Folder Scoping, Repository Hygiene & Architecture Cleanup |
| **v3.5.0-linux** | 2026-08-14 | Linux Desktop Edition: Initial native Avalonia UI (.NET 8) port for Fedora Linux & Synology Drive Client (`~/SynologyDrive/`) |

---

## 🔄 In Progress — v3.6.0 (Target: Q4 2026 / Q1 2027)

### 1. Quick Note — Markdown Scratchpad

A dedicated scratchpad module for capturing ideas, client call notes, and creative briefs in Markdown format. Two-panel layout: note list sidebar + full editor with Markdown toolbar and live preview toggle. Auto-saves on idle.

### 2. Task Manager — Project Status Board

Reads `status`, `deadline`, `priority`, and `revision` from YAML frontmatter embedded in each project's `README.md`. Presents all projects as a filterable status board (Backlog / In Progress / Review / Done). Designers can update status inline; SS-CAM writes changes back to the frontmatter without touching the rest of the document.

**Frontmatter spec (v2.5.0):**

```yaml
---
status: in-progress          # backlog | in-progress | review | done | on-hold
designer: 0001D
client: SS
deadline: 2026-09-30
priority: high               # low | medium | high | urgent
tags: [branding, print]
revision: 2
---
```

### 3. NAS File Structure — Designer Filter in Search & Copy

Makes the designer folder filter in the Search & Copy catalog functional. SS-CAM enumerates first-level subdirectories of the workspace root to discover all designer folders, populates a dropdown, and scopes search results accordingly.

### 4. Search & Copy — Edit README In-App

Adds an "Edit Brief" button to the project detail pane. One click switches to edit mode with a Markdown-capable textarea (same toolbar as Project Creator). Saves changes directly back to the project `README.md` on disk.

### 5. Radio Player — UI Overhaul + Station Cover Art

Redesigns the radio player with an album-art-first card grid, genre filter tabs, a persistent mini-player bar, and lazily-loaded station cover images (from community radio API or local cache). Falls back to a branded monogram tile when no image is available.

### 6. Collaboration — Team Notes Board

A lightweight, serverless team board stored as a JSON file on the shared NAS workspace (`_Team/team-notes.json`). Designers can post, read, and pin team announcements directly in SS-CAM. Auto-refreshes every 30 seconds.

---

## 🗓️ Planned — v2.7.0 (Target: Q1 2027)

| Feature | Description |
|---------|-------------|
| **Kanban Drag-and-Drop** | Full drag-and-drop between Kanban columns in the Task Manager |
| **Project Timeline View** | Gantt-style timeline visualising all active projects and their deadlines |
| **Asset Quick Export** | Right-click an artboard in the Brand Assets vault to export as PNG/PDF without opening Affinity |
| **Client Portal Link Generator** | Generate a shareable read-only link to a project's `Artwork Mockup` folder (via Synology sharing API) |
| **Notification Centre** | In-app toast for approaching deadlines and team note mentions |

---

## 🔭 Future Exploration — v3.x

| Area | Idea |
|------|------|
| **AI Brief Generation** | Input client name + campaign type → generate a structured Markdown project brief using a local or cloud LLM |
| **Version Control** | Track revision history for key asset files using lightweight Git operations via `LibGit2Sharp` |
| **Multi-workspace** | Support multiple NAS mount points (e.g. one per business unit) switchable from the settings page |
| **Mobile Companion** | Read-only Android/iOS app to view project status and team notes while away from the workstation |
| **Design Review Mode** | Full-screen presentation mode for showing mockups to stakeholders directly from SS-CAM |

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
