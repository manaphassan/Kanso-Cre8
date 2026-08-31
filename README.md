# SS-CAM — SuamiSihat™ Creative Assets Management

## Enterprise Creative Operations & Assets Management Platform

Standardized Project Vaults · ClickUp 3.0 Workspace · Copywriting Studio · Brand Asset Inspector · Synology NAS Native · Multi-Platform

[![Latest Release](https://img.shields.io/badge/release-v4.6.0--stable-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/tag/v4.6.0)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20%7C%20Linux%20%7C%20Android%20%7C%20Docker-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8%20%7C%20.NET%208.0%20%7C%20Compose-purple?style=flat-square)](https://dotnet.microsoft.com)
[![Web Stack](https://img.shields.io/badge/web-Svelte%205%20%2B%20Node.js%2020-ff3e00?style=flat-square)](https://svelte.dev)
[![Design System](https://img.shields.io/badge/design-Fluent%202%20%2F%2060%3A30%3A10-0078D4?style=flat-square)](https://fluent2.microsoft.design)
[![License](https://img.shields.io/badge/licence-Internal%20Use-orange?style=flat-square)](./installer/EULA.txt)

---

## 🚀 Overview

**SS-CAM** (SuamiSihat Creative Assets Management) is an enterprise creative operations and digital asset platform developed for **SuamiSihat™ Holding Sdn. Bhd.** It unifies creative workflows across native Windows/Linux workstations and centralized Synology NAS network storage.

SS-CAM eliminates project disorganization, scattered copywriting drafts, inconsistent brand palettes, and untracked deliverable approvals by providing a standardized filesystem vault hierarchy, a Markdown-as-database architecture, an in-app Copywriting Studio, multi-platform collaboration tools, automated 1-click handover ZIP packaging, and live designer capacity analytics.

---

## 📥 Multi-Platform Deployment Options

SS-CAM provides a comprehensive multi-client ecosystem to support diverse creative studio environments:

| Target Platform | Package / Variant | Deployment / Execution | Role in Ecosystem |
|---|---|---|---|
| 🪟 **Windows 10 / 11** | **Native WPF Single-File (`src/SS-CAM`)** | Portable executable: `.\dist\SS-CAM-v4.6.0.exe` | **Flagship Designer Client**: Offline-first, full Post Haste template generator, Direct Synology Drive I/O. |
| 🐧 **Linux Desktop (Fedora)** | **Native Avalonia UI (`src/SS-CAM.Linux`)** | Compile & run: `dotnet run --project src/SS-CAM.Linux -c Release` | **Fedora Workstation Client**: Native Skia desktop rendering, direct `~/SynologyDrive/` I/O. |
| 📱 **Android Native** | **Native Android APK (`src/SS-CAM.Android`)** | Install Android package (Kotlin + Compose) | **Mobile Review & Approvals**: 1-tap deliverable approvals, live ICY radio streaming, desk standby clock, push alerts, brand color picker. |
| 🌐 **Admin Web Portal** | **Docker Web Container (`src/SS-CAM.Web`)** | Deploy on Synology NAS / Linux Server: `cd src/SS-CAM.Web && docker compose up -d` | **Admin & Central Control Plane**: User provisioning, holding switcher (SSH/SSC/SSW/SSE/SST), audit logs, API hub. |

---

## 🌟 Core Features & Capabilities

### 1. Standardized 5-Folder Vault Hierarchy

All creative projects follow a canonical directory structure on Synology NAS (`Creative-Team/[YYYY]/[YYYYMM_Month]/[ProjectFolder]`), preventing file clutter and missing assets:

```text
📁 YYYYMM_NNNNX_BRAND_ProjectTitle/
├── 📁 01_BRIEF_ASSETS/        # Raw creative briefs, moodboards, reference imagery
├── 📁 02_SOURCE_FILES/        # Working Affinity Designer (.afdesign), Photoshop (.psd), Illustrator (.ai)
├── 📁 03_COPYWRITING/         # Dedicated COPY.md scripts, viral hook angles, and copy specs
├── 📁 04_WORK_IN_PROGRESS/    # Intermediate drafts, work-in-progress exports, and test renders
├── 📁 05_DELIVERABLES/        # Final approved mockups, high-res deliverables, and client exports
└── 📄 README.md               # YAML frontmatter metadata (status, priority, designer, revision)
```

### 2. ClickUp 3.0-Style 2-Column Task Workspace

* **Markdown Brief Canvas (68%)**: Full-featured GFM brief editor with live syntax highlighting, table rendering, callout alert blocks, and Mermaid diagrams.
* **Right Inspector Panel (32%)**: Collapsible inspector panel displaying job ID, designer routing, priority, campaign deadlines, holding subsidiary metadata, and deliverable review actions.
* **Deliverable Inspection & Review**: Lightbox modal with one-click `✓ Sign-Off` or `⚠️ Request Revision` actions that automatically increment revision rounds.

### 3. Dedicated Copywriting Studio & Live Telemetry

* **Direct NAS Persistence**: Automatically reads and writes to `03_COPYWRITING/COPY.md`.
* **Live Copy Analytics**: Computes real-time word count, character count, and estimated reading time.
* **Structured Hook Frameworks**: Pre-scaffolded templates for viral video hooks, product benefit scripts, and social ad copy.

### 4. Contextual Discussions & Notification Feed

* **NAS JSONL Discussion Engine**: Project-level comments stored in `_comments.jsonl` with support for `@mention` tags (e.g. `@hasan`, `@haikal`, `@harussani`).
* **Notification Drawer**: Global activity feed tracking mentions, approvals, revision requests, and project assignments.

### 5. Enterprise RBAC & Security Audit Logs

* **Role-Based Permissions**: Granular roles for `Admin`, `Director`, `Lead`, `Manager`, `Designer`, and `Copywriter`.
* **Permanent Audit Trail**: All critical operations (creations, deletions, sign-offs, role updates) are recorded to an immutable JSONL audit log (`_Team/_Audit/audit_log.jsonl`).
* **Safe Administrative Project Deletion**: Authorized administrative deletion with boundary checks, system folder protections (`_Team`, `#recycle`), and recursive NAS subfolder removal.

### 6. Minimal Brand Assets & Swatch Inspector

* **Live Swatch Telemetry**: Live interactive explorer for SuamiSihat holding palettes (`SSH`, `SSC`, `SSW`, `SSE`, `SST`) displaying **HEX**, **RGB**, **CMYK**, and **Pantone** breakdowns with 1-click clipboard copying.
* **Vector QR Code Studio**: Generate branded QR codes for URLs, Wi-Fi credentials, and vCards with high-resolution PNG export.

### 7. Creative Wellbeing & Biometric Rhythm

* **Real-Time 5-Axis Biometric Radar**: Live spider chart calculating creative flow, vitality, rest, focus, and pressure.
* **Biometric Flow Calibrator & 1-Click Rebalancers**: Tactile 1–5 baseline rating matrix and instant cognitive reset shortcuts.
* **30-Day Creative Focus Heatmap**: GitHub-style activity grid mapping daily deep work intensity and streaks.
* **Interactive Vector Hydration Tracker**: Real-time water intake tracking with animated wave physics and 8 glass cup tiles.
* **16-Second Box Breathing Coach**: Visual stress reset coach for high-intensity design sprints.
* **JAKIM Waktu Solat**: Real-time prayer timetable for 41 Malaysian zones with live countdowns and adhan notifications.
* **Focus Radio Player**: Low-latency stream player for Malaysian stations (BFM 89.9, Hitz, Era, Hot FM, Suria, THR Raaga) and lo-fi focus beats.

---

## 🎨 Design System & Visual Hierarchy

SS-CAM adheres to the **Microsoft Fluent 2** design language and the **SuamiSihat 60:30:10** color rule:

| Visual Ratio | Scope | Palette Tokens | Purpose |
|---|---|---|---|
| **60% Dominant** | Application Surfaces | Deep Prussian Blue (`#022057`) / Clean Slate (`#F8FAFC`) | Clean background canvas and visual balance |
| **30% Structure** | Structural Controls | SuamiSihat Azure (`#21A1F7`) & Royal Blue (`#043388`) | Navigation bars, cards, borders, text hierarchy |
| **10% Accent** | Action Energy | Warm Gold (`#BD9A73`) & Success Green (`#107C10`) | Primary CTAs, status badges, alert highlights |

### Available Desktop Themes

1. **SS Default**: Deep navy sidebar with clean white content canvas.
2. **Falconia**: Pure Fluent 2 Light mode with crisp typography and subtle card borders.
3. **Metamorphosis**: Dark glassmorphic theme with cyan glowing accents and frosted surfaces.

---

## 🏗️ Technical Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 SS-CAM ECOSYSTEM                                  │
├─────────────────────────┬─────────────────────────┬───────────────────────────────┤
│ 🖥️ WINDOWS WORKSTATION   │ 🐧 FEDORA WORKSTATION   │ 📱 ANDROID MOBILE COMPANION   │
│ • C# WPF (.NET 4.8)     │ • Avalonia UI (.NET 8)  │ • Kotlin + Jetpack Compose    │
│ • WPF-UI (Fluent 2)     │ • Native Skia Engine    │ • Coil / Hardware Bitmaps     │
│ • Direct Local SSD I/O  │ • Local ~/SynologyDrive │ • Instant Push Alerts & Diff  │
├─────────────────────────┴─────────────────────────┴───────────────────────────────┤
│                          🌐 SYNOLOGY NAS ADMIN WEB PORTAL                         │
│                          • Svelte 5 (Runes) + TypeScript                          │
│                          • Node.js 20 Express + WebSocket + REST/SSE API          │
│                          • Central Administration, Holdings Switcher & Audit Logs │
│                          • Live Review Lightbox & Split Visual Comparison         │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ 📂 SYNOLOGY NAS FILE SYSTEM (Markdown-as-Database Storage)                        │
│ • Canonical 5-Folder Hierarchy: \\SSNAS\Creative-Team\[YYYY]\[Month]\[Project]    │
│ • YAML Frontmatter Project Metadata (README.md)                                   │
│ • Markdown Copywriting Hooks (03_COPYWRITING/COPY.md)                             │
│ • Immutable Audit Logs & Team Profiles (_Team/_Audit/audit_log.jsonl)             │
│ • Cross-Platform Realtime Sync via Synology Drive & Chokidar File Watchers        │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 System Requirements

| Specification | Desktop Client Requirement | Web Portal Requirement |
|---|---|---|
| **Operating System** | Windows 10 (1903+) / Windows 11 / Linux (x64) | Synology DSM 7.x / Ubuntu 22.04+ / Docker |
| **Runtime** | .NET Framework 4.8 (Windows) / .NET 8.0 (Linux) | Node.js 20 LTS or Docker Engine |
| **Memory (RAM)** | 4 GB Minimum (8 GB+ Recommended) | 512 MB Container RAM |
| **Storage Footprint**| ~5.7 MB (Single-File Portable Exe) | ~120 MB Docker Image |
| **Network** | Synology Drive Client or SMB `\\SSNAS\Creative-Team` | Port 4000 (HTTPS via Reverse Proxy) |

---

## 📄 License & Governance

SS-CAM is an internal digital assets management platform created for **SuamiSihat™ Holding Sdn. Bhd.**

* **Organization**: SuamiSihat Digital & Creative Production Division
* **Documentation**: [GitHub Pages Landing Page](https://suamisihat.github.io/ss_cam/)
* **Repository**: [SuamiSihat/ss_cam](https://github.com/SuamiSihat/ss_cam)
* **License**: Internal Commercial Use Only — see [EULA](./installer/EULA.txt)
