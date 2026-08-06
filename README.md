<div align="center">

# SS-CAM — SuamiSihat Creative Assets Management

**The official creative workstation management suite for SuamiSihat design teams.**

Standardized project folder generation · Brand asset deployment · Designer intelligence dashboard · Creative wellbeing tools

[![Latest Release](https://img.shields.io/badge/release-v2.3.6-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8-purple?style=flat-square)](https://dotnet.microsoft.com/en-us/download/dotnet-framework/net48)
[![License](https://img.shields.io/badge/licence-Internal%20Use-orange?style=flat-square)](./installer/EULA.txt)

</div>

---

## Overview

SS-CAM is a native Windows desktop application built with C# WPF (.NET Framework 4.8). It provides SuamiSihat designers with a unified workstation management suite — from generating standardized project folders and deploying brand assets to tracking workspace storage, listening to live radio/focus streams, and supporting healthy creative work habits.

The application ships as a **true single-file executable** (~4.7 MB) with all dependencies embedded via Fody/Costura assembly weaving. No installer, no runtime prerequisites, no extraction on launch. The UI is built to the **Microsoft Fluent 2 Design System** specification, using Segoe Fluent Icons and the WPF-UI library throughout.

---

## Table of Contents

1. [Core Capabilities](#core-capabilities)
2. [Application Modules](#application-modules)
3. [Workstation Requirements](#workstation-requirements)
4. [Release Status](#release-status)
5. [Installation](#installation)
6. [First-Time Configuration](#first-time-configuration)
7. [Creative Application Setup](#creative-application-setup)
8. [Project Folder Convention](#project-folder-convention)
9. [Typography Suite](#typography-suite)
10. [Troubleshooting](#troubleshooting)
11. [Governance & Licensing](#governance--licensing)

---

## Core Capabilities

| Capability | Description |
| --- | --- |
| **Radio Stream Player** | Integrated live stream player featuring preloaded Malaysian radio stations (BFM 89.9, Hitz FM, Era FM, Hot FM, Suria FM, THR Raaga), lo-fi focus beats, custom stream management, and a persistent status-bar mini-player |
| **Designer Intelligence Dashboard** | Live workspace metrics with storage analytics, project-type breakdown, sub-brand workload share, six-month output activity, largest project detector, stale project alerts, and interactive tooltips on every widget |
| **Project Folder Generator** | Standardized folder creation following the `YYYYMM_NNNNX_BRAND_Name` naming convention, with auto-calculated Job IDs, preset-specific subfolder templates (Social, Video, Brand Identity, General), and live preview |
| **Search & Copy** | Full-text project folder search, designer filtering, rendered README preview, project file browser, and controlled asset copying into active work orders |
| **Creative Wellbeing** | DPAPI-encrypted Mind Drops, focus session timer with idle detection, energy and pressure check-ins, 16-second box breathing guide with phase-synchronized animations, and fatigue-aware break suggestions — all fully local, zero telemetry |
| **Brand Assets** | In-app launcher for installed colour palettes, asset libraries, logo files, official links, and rendered Markdown workstation reports |
| **Workspace Synology Flow** | Visual NAS hierarchy diagram showing the Synology Drive → Designers → Projects → Files chain with live counts |
| **NAS Health Monitor** | Real-time Synology DDNS connectivity probe (`suamisihat.myds.me`) with 30-second background polling and click-to-recheck from the status bar |
| **Notify & Auto-Update** | Version check against the NAS endpoint; yellow banner notification with one-click download when a newer build is available |

---

## Application Modules

| Module | Purpose |
| --- | --- |
| **Dashboard** | Review workspace totals, storage usage, recent activity, project types, sub-brands, and designer metrics |
| **Project Creator** | Generate standardized project folders, briefs, master canvases, and optional production subfolders with live folder-name preview |
| **Search & Copy** | Search by project-folder name, filter by designer, switch README between rendered Preview and Raw Markdown, and copy selected files into a work order |
| **Radio Player** | Stream live Malaysian radio stations and lo-fi focus beats, manage custom stream URLs, and control playback via status bar mini-player |
| **Creative Wellbeing** | Focus sessions, breathing guides, energy check-ins, and secure private Mind Drop notes — all stored locally with DPAPI encryption |
| **Brand Assets** | Open installed palettes, libraries, logos, and reports — shown only when Brand Kit installation is detected |
| **Settings & Profile** | Manage designer identity, avatar, workspace root, recent-project history, Job ID override, font repair, and update controls |
| **Workstation Health** | System diagnostics, font integrity validation, and NAS connectivity status |

---

## Workstation Requirements

| Component | Minimum | Recommended |
| --- | --- | --- |
| **Operating System** | Windows 10 64-bit (21H2+) | Windows 11 64-bit |
| **System Memory** | 16 GB RAM | 32 GB or greater |
| **Processor** | 64-bit multi-core CPU | Intel Core i7 / AMD Ryzen 7 (6+ cores) |
| **Graphics** | DirectX 11 compatible | DirectX 12 GPU with 4 GB VRAM |
| **Storage** | 5 GB available | NVMe SSD with 100 GB+ available |
| **Display** | 1280 × 720 | 1920 × 1080 IPS or higher |
| **Network** | LAN or Wi-Fi | Gigabit LAN (for NAS asset sync) |

> **Note:** .NET Framework 4.8 is pre-installed on Windows 10 version 1903 and later. No separate runtime installation is required.

---

## Release Status

| Version | Status | Architecture | Key Changes |
| --- | --- | --- | --- |
| **`v2.3.6`** | ✅ **Latest Stable** | Native C# WPF · Single-file EXE | Full Fluent 2 compliance — Segoe Fluent Icons throughout, token-based colour system, no raw hex in UI chrome; version badge fix |
| **`v2.1.0`** | ✅ Stable | Native C# WPF · Single-file EXE | Radio & Focus Stream Player module, BFM 89.9 / Hitz / Era / Hot FM presets, lo-fi focus beats, custom stream manager, persistent status bar mini-player |
| **`v2.0.7`** | ✅ Stable | Native C# WPF · Single-file EXE | Dashboard Intelligence Suite, ToolTips, Largest Project widget, Stale Projects widget, Storage Distribution chart, Auto Job ID, 16s Box Breathing, NAS health monitor |
| **`v1.9.10`** | ✅ Stable | Legacy PowerShell bootstrapper | Creative Wellbeing module, DPAPI Mind Drops, Focus Timer, window icon fix |
| **`v1.9.2`** | ✅ Stable | Legacy PowerShell bootstrapper | Search & Copy, rendered README preview, conditional Brand Assets module |
| `v1.9.3` – `v1.9.9` | ⚠️ Pre-release | Legacy PowerShell bootstrapper | Intermediate development builds |
| `v2.0.0` – `v2.0.6` | ⚠️ Pre-release | Native C# WPF | C# WPF architectural refactoring builds |
| `v2.1.1` – `v2.3.5` | ⚠️ Pre-release | Native C# WPF | Incremental feature and UI refinement builds |

Download the latest release from the [Releases page](https://github.com/SuamiSihat/ss_cam/releases/latest).

---

## Installation

### Step 1 — Download

Obtain `SS-CAM-v2.3.6.exe` from the [Official Release Page](https://github.com/SuamiSihat/ss_cam/releases/latest).

### Step 2 — Launch

Double-click the downloaded executable. SS-CAM runs entirely in the user context — no administrator privileges are required.

> If Windows SmartScreen appears, select **More Info → Run Anyway**. This occurs because the executable is not yet widely distributed enough for Microsoft's reputation system.

### Step 3 — Configure

On first launch, the application will prompt you to:

1. Set your **Designer Name** and **Staff ID** in the User Profile.
2. Set your **Workspace Root** — the local or NAS path where project folders are created.
3. Optionally configure your avatar and department.

---

## First-Time Configuration

### Workspace Root

The workspace root is the parent directory where all project folders are stored. This is typically your mapped Synology NAS drive or a local `D:\Projects\` path.

Set this in **Settings → Workspace Configuration**.

### Job ID Sequencing

The application automatically scans your workspace to determine the next available Job ID (`0001`, `0002`, etc.) when you open the Project Creator. You can override this counter manually in **Settings → Job ID Override**.

---

## Creative Application Setup

### Affinity Suite (Designer · Publisher · Photo)

| Asset Type | Location | Import Method |
| --- | --- | --- |
| Asset Library | `Brand Assets\Libraries\SuamiSihat Branding.afassets` | Assets Panel → Menu → **Import Assets** |
| Colour Palette | `Brand Assets\Colour Palettes\ss_color_theme.afpalette` | Swatches Panel → Menu → **Import Palette → From File** |

### Adobe Creative Cloud (Photoshop · Illustrator · InDesign)

| Asset Type | Location | Import Method |
| --- | --- | --- |
| CC Library | `Brand Assets\Libraries\SuamiSihat™ Branding.cclibs` | Libraries Panel → Import |
| Swatch (Primary) | `Brand Assets\Colour Palettes\SS Health Primary.ase` | Swatches Panel → Open Swatch Library → Other Library |
| Swatch (Secondary) | `Brand Assets\Colour Palettes\SS Health Secondary.ase` | As above |
| Swatch (Grey Tone) | `Brand Assets\Colour Palettes\SS Health Grey Tone.ase` | As above |

> Restart Adobe applications after importing to ensure newly registered system fonts are enumerated.

### Web & Cloud (Canva · Figma)

Team accounts are provisioned via central directory credentials. Request access and MFA tokens from system administration.

---

## Project Folder Convention

All project folders follow the standardized naming scheme defined in [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md):

```
{Workspace Root}\
└── {YYYY}\                                ← Year folder
    └── {YYYYMM}_{MonthName}\              ← Month folder
        └── {YYYYMM}_{NNNN}{TYPE}_{BRAND}_{ProjectName}\   ← Project folder
            ├── Artwork Design\            Working source files (.afdesign, .psd, .ai)
            ├── Artwork Mockup\            Presentation mockups and client previews
            ├── Assets\                    Raw photos, icons, reference materials
            └── Production\               Exported outputs (PDF, PNG, SVG)
```

**Job ID suffix codes:**

| Code | Category |
| --- | --- |
| `D` | General / Graphic / Print |
| `S` | Social Media |
| `V` | Video |
| `P` | Brand Identity |

**Example:** `202608_0042S_SSC_Raya-Campaign` — August 2026, Job #42, Social Media, SS Clinic.

---

## Deployed Asset Directory

Brand assets are deployed to the following locations on the designer's workstation:

```
Documents\SuamiSihat Brand Assets\
├── Logos\
│   ├── 00_SuamiSihat\
│   ├── 01_ssHealth\
│   ├── 02_ssClinic\
│   ├── 03_ssWellness\
│   ├── 04_ssEcom\
│   └── 05_ssTech\
├── Libraries\
│   ├── SuamiSihat Branding.afassets
│   ├── ss_health_branding.afassets
│   └── SuamiSihat™ Branding.cclibs
├── Colour Palettes\
│   ├── ss_color_theme.afpalette
│   ├── SS Health Primary.ase
│   ├── SS Health Secondary.ase
│   └── SS Health Grey Tone.ase
├── Links\
│   ├── SuamiSihat Service Dashboard.url
│   ├── SuamiSihat Internal Assets.url
│   └── SuamiSihat Public Brand Assets.url
└── Reports\
    ├── SuamiSihat-Workstation-Report.md
    └── SuamiSihat-Font-Inventory.md
```

Typography files are installed to `%LOCALAPPDATA%\Microsoft\Windows\Fonts` and registered in the Windows Registry.

---

## Typography Suite

### Core Brand Typefaces

| # | Family | Classification & Usage |
| --- | --- | --- |
| 1 | **Poppins** | Primary display — headlines, marketing banners |
| 2 | **Calibri** | Secondary — documentation, body text |
| 3 | **Helvetica Neue** | Structural — user interfaces, technical layouts |
| 4 | **Montserrat** | Tertiary display — labels, supporting accents |

### Extended Suite

| Typeface | Purpose |
| --- | --- |
| FontAwesome Pro 5 | Vector icon typography |
| Barcode Suite | Code 128 and 2D barcode generation |
| Futura Std | Display and title graphics |
| Oswald | Compact headlines and condensed typography |
| Roboto | Screen-optimized digital interfaces |
| Trueno | Display accent typography |

---

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| **SmartScreen blocks launch** | Select **More Info → Run Anyway** |
| **Fonts missing in Affinity** | Restart Affinity applications after setup completes |
| **Fonts missing in Adobe apps** | Restart Adobe Creative Cloud and all Adobe applications |
| **Workspace not found on startup** | Re-enter your workspace root path in **Settings → Workspace Configuration** |
| **NAS shows offline** | Check VPN or LAN connection; click the status bar NAS indicator to retry |
| **Job ID not auto-filling** | Verify the workspace root path is accessible; check for subfolders following the naming convention |
| **Brand Assets module hidden** | The module appears only when the Brand Kit asset path is registered; re-configure the asset path in Settings |
| **Mind Drops inaccessible after OS reinstall** | DPAPI-encrypted data is tied to the Windows user account SID; data cannot be recovered after OS reinstall |

---

---

## Governance & Licensing

Assets and typography bundled within this package are restricted to **authorized internal SuamiSihat operations only**. For licensing compliance, usage policies, and access provisioning, consult the SuamiSihat technology administration team.

The application interface uses **Segoe Fluent Icons** (system font, Windows 11+) and the **WPF-UI** library (MIT licence). Commercial fonts in the installation payload remain subject to their respective commercial licences.

For developer and maintainer documentation, refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

Release history is maintained in [CHANGELOG.md](./CHANGELOG.md).
