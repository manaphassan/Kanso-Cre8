<div align="center">

# SS-CAM — SuamiSihat™ Creative Assets Management

### *The Ultimate Designer Companion & Second Brain for Creative Workstations*

Standardized Project Generation · Live Brand Inspector · Task Management · Creative Wellbeing · Waktu Solat · Single-File Executable

[![Latest Release](https://img.shields.io/badge/release-v3.5.0-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B%20%7C%20Linux%20%28Fedora%29-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8%20%7C%20.NET%208-purple?style=flat-square)](https://dotnet.microsoft.com)
[![Design](https://img.shields.io/badge/design-Fluent%202%20%2F%20Avalonia-0078D4?style=flat-square)](https://fluent2.microsoft.design)
[![License](https://img.shields.io/badge/licence-Internal%20Use-orange?style=flat-square)](./installer/EULA.txt)

</div>

---

## 🚀 Overview

**SS-CAM** (SuamiSihat Creative Assets Management) is a native Windows desktop application built with **C# WPF (.NET Framework 4.8)**, engineered specifically as an intelligent **second brain** and **productivity companion** for working creative designers.

Designers spend up to 30% of their day on repetitive overhead: naming project directories, digging for brand hex codes, organizing campaign files, tracking task deadlines, and context-switching between disconnected apps. **SS-CAM eliminates this friction entirely.**

Acting as an active assistant on your desktop, SS-CAM automates standardized project generation, unifies brand color and asset management, keeps your work queue structured, and actively safeguards designer **mental health, focus, and daily balance**.

The application ships as a **true single-file executable (~5 MB)** with zero installer or runtime overhead. Built natively on **Microsoft Fluent 2 Design**, SS-CAM seamlessly integrates with Windows 10/11 featuring light, dark, and glassmorphic theme profiles.

---

## What's New in v3.5.0

| # | Change | Details |
|---|--------|---------|
| 1 | **In-App Project Brief Markdown Editor** | Edit and save project `README.md` and frontmatter directly inside the Search & Copy catalog pane with live preview and notification feedback. |
| 2 | **Workspace Designer Scoping** | Dynamically discovers designer folder structures on local and Synology NAS shares and scopes project catalog queries. |
| 3 | **Quick Notes Markdown Studio** | Enhanced formatting toolbar with Headings, Checklist, Code blocks, and Markdown Guide drawer. |
| 4 | **Repository Hygiene & Architecture Cleanup** | Automated Source Guardian validation, eliminated loose duplicate binaries, clean `.gitignore` rules. |

### Previous: v3.4.0 Highlights

| # | Change | Details |
|---|--------|---------|
| 1 | **Starter Canvas Engine** | Integrated `.af`, `.psd`, and `.ai` starter canvas format generation with default Affinity Designer format support and 2026 industry platform specs. |
| 2 | **Project Creator Presets & Dynamic Filter** | Added Rollup Bunting (80x200cm), Trifold A4 Brochure, A5 Leaflet, and Web Design category presets. Dynamic platform filtering and category visual card highlighting. |
| 3 | **Search & Copy Category Filter** | Added category-based filtering dropdown for quick search and copy across asset catalog items. |
| 4 | **Creative Calendar Quick Status Actions** | Integrated direct project status actions (`In Progress`, `Review`, `Done`) inside the Day Detail view overlay. |

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
| **Task Manager** | YAML frontmatter project board — reads `README.md` task headers from workspace, status columns, due-date tracking, queue age calculation |
| **Big Calendar** | Visual monthly project timetable, campaign deadlines, creation schedule overview, and interactive day detail inspector |
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

1. **Configure Synology Drive Client for SSNAS**:
   - Map SSNAS `/Creative-Team` share to local computer path `E:\SynologyDrive\Creative-Team` (see [SSNAS Setup Guide](./docs/SSNAS-SETUP.md)).
2. Open **Settings & Profile** in SS-CAM.
3. Set your **Designer Name** and **Department**.
4. Set your **Workspace Root** to your synchronized Synology Drive folder:
   ```text
   E:\SynologyDrive\Creative-Team
   ```
5. Set your **Synology NAS Path** if applicable (`\\SSNAS\Creative-Team`).
6. Choose your preferred **Theme** (SS Default, Falconia, Metamorphosis).
7. Select your **Waktu Solat Zone** (41 Malaysian zones supported).

---

## Project Folder Convention

All generated project folders follow:
>>>>>>> c0832ca (feat(v3.5.0): in-app project brief editor, workspace designer scoping, and QA verification)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SS-CAM PLATFORM                                     │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ 🧠 SECOND BRAIN          │ ⚡ TASK & QUEUE          │ 🎨 BRAND & ASSET                 │
│    INTELLIGENCE          │    MANAGEMENT            │    INSPECTION                    │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ • Auto Job ID Generator  │ • Frontmatter Task Board │ • Live Color Swatch Inspector    │
│ • Standard Folder Engine │ • FIFO Queue Sorting     │ • Vector & Raster QR Studio      │
│ • Search & Copy Scanner  │ • 7×6 Big Calendar       │ • Font & Asset Payload Installer │
│ • README Previewer       │ • Campaign Deadlines     │ • Brand Guidelines & Links       │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧘 CREATIVE WELLBEING & DAILY RHYTHM                                                   │
│    • DPAPI Mind Drops Journal  • 16s Box Breathing Timer  • Energy & Fatigue Check   │
│    • Live Malaysian Radio      • Focus Session Timer       • JAKIM Waktu Solat Timetable│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 🧠 1. Second Brain & Workspace Intelligence
* **Standardized Project Creator**: Automatically calculates sequential 4-digit job numbers (`YYYYMM_NNNNX_BRAND_Name`) and generates clean directory trees with starter design canvases.
* **Search & Copy Scanner**: Full-text workspace indexer allowing instant search across historical projects, README content rendering, and controlled asset copying into active work orders.
* **Zero Cognitive Load**: Eliminates manual directory organization and file clutter across local drives and Synology NAS shares.

### ⚡ 2. Task & Queue Management
* **YAML Frontmatter Task Board**: Reads project metadata directly from markdown project documentation (`README.md`), categorizing active tasks into visual Kanban columns.
* **7×6 Monthly Big Calendar**: Color-coded campaign timetable mapping project creation dates, delivery deadlines, and Friday Solat markers with interactive day overlays.
* **FIFO Queue & Age Tracking**: Sort work orders by queue age (`📅 14d in queue`), ensuring legacy revisions never get lost under incoming projects.

### 🎨 3. Brand Assets & Studio Toolkit
* **Minimal Swatch Inspector**: Sleek 2-column palette manager with interactive primary/secondary/neutral swatches displaying live **HEX**, **RGB**, **CMYK**, and **Pantone** breakdowns with one-click clipboard copying.
* **QR Code Studio**: Native generator supporting URLs, plain text, Wi-Fi keys, and vCards with custom brand palette styling and PNG export.
* **Workstation Installer**: Single-click installation for official brand typography, Affinity palette presets (`.afpalette`), and asset libraries (`.afassets`).

### 🧘 4. Creative Wellbeing & Mental Health Companion
* **DPAPI Mind Drops**: Encrypted private daily journal for creative thoughts, micro-reflections, and burnout prevention.
* **16-Second Box Breathing**: Animated visual breathing coach designed to reset stress levels during intense design sprints.
* **Fatigue-Aware Check-ins**: Periodic energy probes and focus timers that suggest structured breaks when fatigue accumulates.
* **Live Radio Player**: Embedded low-latency audio player streaming Malaysian stations (BFM 89.9, Hitz, Era, Hot FM, Suria, THR Raaga) and lo-fi focus beats.
* **JAKIM Waktu Solat**: Real-time prayer timetable for 41 Malaysian zones with live countdowns and adhan notifications.

---

## ✨ What's New in v3.5.0

| # | Feature | Impact |
|---|---------|--------|
| 1 | **Minimal Brand Assets & Live Inspector** | Clean 2-column layout featuring tabbed color swatches and a live inspector displaying HEX, RGB, CMYK, and Pantone values. |
| 2 | **Search & Copy Engine Stability** | Reverted to optimized v3.4 scanner architecture for fast full-text workspace indexing and README rendering. |
| 3 | **Dynamic Theme Contrast Compliance** | Standardized all surface colors and text blocks across 14 views to native Fluent 2 dynamic theme tokens. |
| 4 | **FIFO Task Queue & Date Sorting** | Refined Task Manager drawer filters with creation date frontmatter parsing and age indicators. |

---

## 🛠️ Application Modules

| Module | Core Function | Primary Benefit |
|--------|---------------|-----------------|
| **Dashboard** | Storage analytics & project metrics | Bird's-eye view of workspace health and sub-brand volume share. |
| **Project Creator** | Standardized folder generator | Generates compliant project structures in under 3 seconds. |
| **Search & Copy** | Workspace search & README preview | Find past design assets and copy them without file explorer clutter. |
| **Brand Assets** | Live color inspector & installer | Instant access to official color codes, fonts, and brand portals. |
| **QR Code Studio** | Vector & raster QR generator | Create branded QR codes directly inside your workstation. |
| **Task Manager** | Frontmatter Kanban board | Automatically tracks tasks derived from project README files. |
| **Big Calendar** | 7×6 Monthly project timetable | Visual overview of project timelines and campaign deadlines. |
| **Creative Wellbeing** | Mind Drops & box breathing coach | Maintains mental clarity and prevents creative fatigue. |
| **Waktu Solat** | JAKIM prayer timetable (41 zones) | Keeps Malaysian designers on schedule with daily prayer times. |
| **Radio Player** | Live streams & lo-fi focus beats | Background audio companion for deep focus work. |
| **Quick Notes** | Rich-text Markdown note editor | Scratchpad for quick specs, feedback, and copy drafts. |
| **Workstation Health** | System resource monitor (CPU/RAM) | Real-time performance tracking for heavy creative apps. |
| **Settings & Profile** | User preferences & NAS auto-sync | Personalize designer identity, workspace root, and themes. |

---

## 🎨 Theme System

SS-CAM features a native Fluent 2 theme engine supporting instant hot-swapping:

| Theme | Aesthetic | Best For |
|-------|-----------|----------|
| **SS Default** | Deep navy navigation sidebar with clean white content canvas | Daily production work |
| **Falconia** | Full white Fluent 2 Light mode — ultra-minimal and crisp | Focused daytime editing |
| **Metamorphosis** | Dark glassmorphism — deep space canvas with cyan glass cards | Night sessions & low-light |

---

## 💻 Workstation Requirements

| Parameter | Minimum Requirement | Recommended |
|-----------|--------------------|-------------|
| **OS** | Windows 10 (1903+) or Windows 11 | Windows 11 x64 |
| **Architecture** | x64 | x64 |
| **RAM** | 4 GB | 16 GB+ |
| **Runtime** | .NET Framework 4.8 (built-in) | .NET Framework 4.8 |
| **Display** | 1280 × 720 | 1920 × 1080 (100% / 125% DPI) |
| **Executable** | Single-file ~5 MB (`SS-CAM-v3.5.0.exe`) | No installation required |

---

## 📥 Quick Start

1. Download [`SS-CAM-v3.5.0.exe`](https://github.com/SuamiSihat/ss_cam/releases/latest) from Releases.
2. Launch the single-file executable — no setup or admin rights required.
3. On initial startup, SS-CAM will automatically:
   * Register a Start Menu shortcut (`SuamiSihat\SS-CAM`).
   * Deploy official brand typography into system fonts.
   * Initialize local profile settings at `%LocalAppData%\SuamiSihat\`.
4. Open **Settings & Profile** to set your **Designer Name**, **Workspace Root** (e.g., `E:\SynologyDrive\Creative-Team`), and **Waktu Solat Zone**.

---

## 📑 Project Folder Naming Convention

All generated project folders follow the standardized SuamiSihat format:

```text
YYYYMM_NNNNX_BRAND_ProjectName
```

* `YYYYMM`: Year and month of creation (e.g., `202608`)
* `NNNN`: Auto-incremented 4-digit job number (e.g., `0001`)
* `X`: Sub-variant letter within the month (`A`–`Z`)
* `BRAND`: Brand code (`SS` = SuamiSihat)
* `ProjectName`: Clean, sanitized project descriptor

---

## 📜 Governance & License

SS-CAM is an internal productivity desktop application developed exclusively for **SuamiSihat Sdn Bhd** creative teams.

* **Owner**: SuamiSihat Digital
* **Maintainer**: Creative Technology Division
* **License**: Internal Use Only — see [EULA](./installer/EULA.txt)
