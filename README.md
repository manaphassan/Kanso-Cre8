<div align="center">

# SS-CAM — SuamiSihat™ Creative Assets Management

**The official creative workstation management suite for SuamiSihat™ design teams.**

Standardized project generation · Brand asset deployment · Designer intelligence · Creative wellbeing · Prayer times · Task tracking

[![Latest Release](https://img.shields.io/badge/release-v3.1.2-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8-purple?style=flat-square)](https://dotnet.microsoft.com/en-us/download/dotnet-framework/net48)
[![Design](https://img.shields.io/badge/design-Fluent%202-0078D4?style=flat-square)](https://fluent2.microsoft.design)
[![License](https://img.shields.io/badge/licence-Internal%20Use-orange?style=flat-square)](./installer/EULA.txt)

</div>

---

## Overview

SS-CAM is a native Windows desktop application built with **C# WPF (.NET Framework 4.8)**. It provides SuamiSihat designers with a unified workstation suite — from generating standardized project folders and deploying brand assets, to tracking workspace health, generating custom QR codes, managing tasks, listening to live radio, and supporting Islamic creative work habits.

The application ships as a **true single-file executable (~5 MB)** with all dependencies embedded via Fody/Costura. No installer, no runtime prerequisites. The UI follows the **Microsoft Fluent 2 Design System** using WPF-UI, Segoe Fluent Icons, and switchable themes (Falconia, Metamorphosis, Catppuccin, Rosé Pine, Nord).

---

## What's New in v3.1.0

| # | Change | Details |
|---|--------|---------|
| 1 | **QR Code Studio & Generator Module** | Native vector/raster QR Code Generator supporting URL, Plain Text, Wi-Fi network, and VCard payload formats with custom brand styling, high-res PNG file export, and instant Clipboard copy. |
| 2 | **Sound Engineer Visualizer & Mars Emblem FX** | Upgraded `VisualizerService` with scattered floating Mars symbols (♂) and SuamiSihat brand crest, custom canvas particle physics, audio peak reactive motion, and clean canvas watermark removal. |
| 3 | **Radio & Audio Studio Polish** | Enhanced `RadioPage` layout and control feedback, audio spectrum visualization, and streamlined broadcast controls. |

### Previous: v3.0.1 Highlights

| # | Change | Details |
|---|--------|---------|
| 1 | **Categorized Fluent 2 Sidebar Navigation** | All 11 modules grouped into 5 logical categories (`OVERVIEW`, `CREATION & ASSETS`, `PRODUCTIVITY`, `WELLBEING & FAITH`, `SYSTEM`) with `NavigationViewItemHeader` labels and visual separators. |
| 2 | **Adaptive Bottom Live Bar Collapse** | Status text hides and bottom player transitions to compact mode when the sidebar pane is collapsed — maximizing canvas space. |

---

## Application Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Live workspace metrics: storage analytics, project-type breakdown, sub-brand workload share, six-month activity chart, largest project detector, stale project alerts |
| **Creative Wellbeing** | DPAPI-encrypted Mind Drops, focus session timer with idle detection, energy/pressure check-ins, 16-second box breathing with synchronized animations, fatigue-aware break suggestions |
| **Waktu Solat** | JAKIM API prayer timetable for 41 Malaysian zones, countdown timer, adhan reminder, Hijri date display |
| **Project Creator** | Standardized folder generation (`YYYYMM_NNNNX_BRAND_Name`), auto-calculated Job IDs, preset-specific subfolder templates, live directory tree preview |
| **Search & Copy** | Full-text project search, designer filtering, rendered README preview, project file browser, controlled asset copying into active work orders |
| **Brand Assets** | In-app launcher for installed colour palettes, asset libraries, logo files, and official brand links |
| **QR Code Studio** | Vector & raster QR Code generator supporting URL, Plain Text, Wi-Fi credentials, and VCard payloads with brand palette customization, high-res PNG export, and Clipboard copying |
| **Radio Player** | Live stream player with preloaded Malaysian stations (BFM 89.9, Hitz FM, Era FM, Hot FM, Suria FM, THR Raaga), lo-fi beats, custom streams, album art, persistent status-bar mini-player |
| **Quick Notes** | Rich-text note editor with Markdown preview, local storage, keyboard shortcuts |
| **Task Manager** | YAML frontmatter project board — reads `README.md` task headers from workspace, status columns, due-date tracking |
| **Workstation Health** | Real-time CPU, RAM, disk monitoring with threshold alerts and historical trend |
| **Settings & Profile** | Designer name, department, avatar photo, workspace root, NAS path, theme preference |

---

## Themes

| Theme | Style | WPF-UI Mode |
|-------|-------|-------------|
| **SS Default** | Deep navy sidebar, white content canvas, SuamiSihat brand blue | Light |
| **Falconia** | Full white Fluent 2 Light — clean, minimal, Fluent-native | Light |
| **Metamorphosis** | Glassmorphism — deep space navy canvas, electric cyan accent, glass cards | Dark |

Switch themes by clicking the theme indicator in the sidebar status bar.

---

## Core Capabilities

| Capability | Detail |
|-----------|--------|
| **Single-file exe** | ~5 MB, no dependencies, runs from USB/Downloads |
| **NAS Health Monitor** | 30-second background probe of Synology DDNS with click-to-recheck |
| **Auto-Update Banner** | Version check against NAS endpoint; one-click download when newer build available |
| **Zero Telemetry** | No analytics, no crash reporting to external services |
| **Offline Resilient** | All features gracefully degrade when NAS/network unavailable |
| **DPAPI Encryption** | Mind Drops encrypted with Windows Data Protection API |

---

## Workstation Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Windows 10 (1903+) or Windows 11 |
| Architecture | x64 |
| RAM | 4 GB |
| .NET Framework | 4.8 (pre-installed on Win 10/11) |
| Affinity Designer | 2.x (for starter canvas templates) |
| Display | 1280 × 720 minimum, 1920 × 1080 recommended |

---

## Installation

1. Download `SS-CAM-v3.0.1.exe` from the [Releases](https://github.com/SuamiSihat/ss_cam/releases/latest) page
2. Run the exe — no installation step required
3. On first launch, SS-CAM will:
   - Copy itself to `%LocalAppData%\Programs\SuamiSihat\`
   - Register a Start Menu shortcut
   - Deploy brand fonts to the system font directory

---

## First-Time Configuration

1. Open **Settings & Profile**
2. Set your **Designer Name** and **Department**
3. Set your **Workspace Root** (local folder or mapped NAS drive, e.g. `D:\Projects`)
4. Set your **Synology NAS Path** if applicable
5. Choose your preferred **Theme**
6. Select your **Waktu Solat Zone** (41 Malaysian zones supported)

---

## Project Folder Convention

All generated project folders follow:

```
YYYYMM_NNNNX_BRAND_ProjectName
```

| Segment | Example | Description |
|---------|---------|-------------|
| `YYYYMM` | `202608` | Year + Month of creation |
| `NNNN` | `0001` | Auto-incremented 4-digit job number |
| `X` | `A`–`Z` | Sub-variant letter within same month |
| `BRAND` | `SS` | Brand code (SS = SuamiSihat) |
| `ProjectName` | `brand_campaign` | Sanitized project descriptor |

---

## Agent Skills

SS-CAM includes three built-in agent skills for AI-assisted development:

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `sscam-code-guardian` | Any code change | Verifies encoding, Fluent 2 compliance, paths, safety |
| `sscam-release-manager` | "release vX.Y.Z" | Full release pipeline automation |
| `sscam-page-scaffold` | "new page", "add module" | Generates Fluent 2 compliant page boilerplate |

Skills are in `.agents/skills/`. Verification script: `QA/verify-sscam.ps1`.

---

## Release History

| Version | Date | Highlights |
|---------|------|------------|
| v3.1.2 | 2026-08-12 | Multi-user isolation on shared NAS drives (`_{username}` scoping), team-wide shared presets |
| v3.1.1 | 2026-08-12 | Native NAS settings & preferences auto-sync (`NasConfigSyncService`), multi-PC profile sync |
| v3.1.0 | 2026-08-12 | QR Code Studio & Generator module, Sound Engineer visualizer with floating Mars symbols, Radio studio polish |
| v3.0.1 | 2026-08-12 | Categorized Fluent 2 sidebar navigation, adaptive bottom live bar collapse state |
| v3.0.0 | 2026-08-12 | Major Release: Full 12-module Fluent 2 overhaul, 5 switchable theme profiles, Settings revamp, Workstation Payload installer |
| v2.6.3 | 2026-08-11 | Art Director & Architecture audit remediation, 100% clean Source Guardian |
| v2.6.1 | 2026-08-11 | Header rebranding, persistent deep blue bottom player bar, fluid 60 FPS wavelength visualizer |
| v2.6.0 | 2026-08-11 | Waktu Solat, Quick Notes, Task Manager, Workstation Health, Metamorphosis theme |
| v2.5.1 | 2026-07 | Metamorphosis glassmorphism theme foundation |
| v2.4.0 | 2026-07 | Brand Assets page, NAS health monitor |
| v2.3.x | 2026-06 | Radio Player with Malaysian stations, lo-fi beats |
| v2.2.0 | 2026-06 | Creative Wellbeing — box breathing, fatigue rules |
| v2.1.0 | 2026-05 | Search & Copy with README preview |

Full history: [CHANGELOG.md](./CHANGELOG.md)

---

## Troubleshooting

| Symptom | Resolution |
|---------|-----------|
| Garbled text / mojibake | Re-run `QA/verify-sscam.ps1 -Fix` and rebuild |
| NAS shows Offline | Check VPN / network; click status dot to re-probe |
| Radio won't play | Verify stream URL is accessible; check Windows firewall |
| Prayer times not loading | Check internet connection; JAKIM API requires outbound HTTPS |
| Workspace scan slow | Large workspaces (>5000 files) take 2–4s — this is expected |
| Theme not applying | Delete `%AppData%\SuamiSihat\theme_config.json` to reset |

---

## QA Documentation

| Document | Coverage |
|----------|----------|
| [01-ARCHITECTURE.md](./QA/01-ARCHITECTURE.md) | Service layer, data flow, MVVM structure |
| [02-FUNCTIONAL-TESTS.md](./QA/02-FUNCTIONAL-TESTS.md) | Feature test cases and results |
| [03-COMPONENT-AUDIT.md](./QA/03-COMPONENT-AUDIT.md) | UI component inventory |
| [04-TERMINOLOGY.md](./QA/04-TERMINOLOGY.md) | Canonical naming reference |
| [05-DUPLICATION.md](./QA/05-DUPLICATION.md) | Code duplication audit |
| [06-ACCESSIBILITY.md](./QA/06-ACCESSIBILITY.md) | Keyboard nav, screen reader, cursor feedback |
| [07-WINDOWS-QA.md](./QA/07-WINDOWS-QA.md) | OS compatibility, DPI, encoding |
| [08-SECURITY.md](./QA/08-SECURITY.md) | Data storage, network, path safety |
| [09-PERFORMANCE.md](./QA/09-PERFORMANCE.md) | Startup, memory, background timers |
| [10-FIX-LOG.md](./QA/10-FIX-LOG.md) | Defect and hotfix history |

---

## Governance & Licensing

SS-CAM is an **internal tool** developed exclusively for SuamiSihat Sdn Bhd creative teams.

- **Owner:** SuamiSihat Digital
- **Maintainer:** Creative Technology Division
- **License:** Internal use only — see [EULA](./installer/EULA.txt)
- **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md)
