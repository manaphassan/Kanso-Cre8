<div align="center">

# SS-CAM — SuamiSihat™ Creative Assets Management

### *Enterprise Creative Operations & Assets Management Platform*

Standardized Project Vaults · ClickUp 3.0 Workspace · Copywriting Studio · Brand Asset Inspector · Synology NAS Native · Multi-Platform

[![Latest Release](https://img.shields.io/badge/release-v4.4.3--stable-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/tag/v4.4.3)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20%7C%20Linux%20%7C%20Docker-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8%20%7C%20.NET%208.0-purple?style=flat-square)](https://dotnet.microsoft.com)
[![Web Stack](https://img.shields.io/badge/web-Svelte%205%20%2B%20Node.js%2020-ff3e00?style=flat-square)](https://svelte.dev)
[![Design System](https://img.shields.io/badge/design-Fluent%202%20%2F%2060%3A30%3A10-0078D4?style=flat-square)](https://fluent2.microsoft.design)
[![License](https://img.shields.io/badge/licence-Internal%20Use-orange?style=flat-square)](./installer/EULA.txt)

</div>

---

## 🚀 Overview

**SS-CAM** (SuamiSihat Creative Assets Management) is an enterprise creative operations and digital asset platform developed for **SuamiSihat™ Holding Sdn. Bhd.** It unifies creative workflows across native Windows/Linux workstations and centralized Synology NAS network storage.

SS-CAM eliminates project disorganization, scattered copywriting drafts, inconsistent brand palettes, and untracked deliverable approvals by providing a standardized filesystem vault hierarchy, a Markdown-as-database architecture, an in-app Copywriting Studio, multi-platform collaboration tools, automated 1-click handover ZIP packaging, and live designer capacity analytics.

---

## 📥 Multi-Platform Deployment Options

SS-CAM provides 4 deployment targets to support diverse creative studio environments:

| Target Platform | Package / Variant | Deployment Command | Release Asset / Path |
|---|---|---|---|
| 🪟 **Windows 10 / 11** | **Native WPF Single-File** | No install required. Run portable executable: <br> `.\SS-CAM-v4.4.3.exe` | [Download SS-CAM-v4.4.3.exe](https://github.com/SuamiSihat/ss_cam/releases/download/v4.4.3/SS-CAM-v4.4.3.exe) |
| 🐧 **Linux (Fedora, Ubuntu, Debian, Pop!_OS)** | **One-Line Terminal Installer** | Automatic build, install to `/opt/ss-cam`, and application menu integration: <br> `curl -fsSL https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/installer/install-linux.sh \| sudo bash` | [install-linux.sh](https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/installer/install-linux.sh) |
| 🐧 **Linux Desktop (.NET)** | **Cross-Platform Source** | Compile and execute Avalonia desktop client: <br> `dotnet run --project src/SS-CAM.Linux -c Release` | Source in `src/SS-CAM.Linux` |
| 🌐 **Web Management Portal** | **Docker Web Container** | Deploy on Synology NAS / Linux Server: <br> `cd src/SS-CAM.Web && docker compose up -d` | Live at `https://creative.suamisihat.myds.me` |

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

### 7. Creative Wellbeing & Daily Rhythm
* **16-Second Box Breathing Coach**: Visual stress reset coach for high-intensity design sprints.
* **DPAPI Mind Drops**: Private reflection journal encrypted with Windows Data Protection API.
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
├────────────────────────────────────────┬──────────────────────────────────────────┤
│ 🖥️ WINDOWS & LINUX DESKTOP APPS        │ 🌐 SYNOLOGY NAS WEB PORTAL               │
│ • C# WPF (.NET Framework 4.8)          │ • Svelte 5 (Runes) + TypeScript          │
│ • Avalonia UI (.NET 8.0 Linux)         │ • Node.js 20 Express + WebSocket         │
│ • WPF-UI (Fluent 2 Controls)           │ • Vite 6 Production Bundle               │
│ • DPAPI Local Hardware Encryption      │ • Docker Compose Multi-Container         │
└────────────────────────────────────────┴──────────────────────────────────────────┘
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
| **Storage Footprint**| ~5.2 MB (Single-File Portable Exe) | ~120 MB Docker Image |
| **Network** | Synology Drive Client or SMB `\\SSNAS\Creative-Team` | Port 4000 (HTTPS via Reverse Proxy) |

---

## 📄 License & Governance

SS-CAM is an internal digital assets management platform created for **SuamiSihat™ Holding Sdn. Bhd.**

* **Organization**: SuamiSihat Digital & Creative Production Division
* **Documentation**: [GitHub Pages Landing Page](https://suamisihat.github.io/ss_cam/)
* **Repository**: [SuamiSihat/ss_cam](https://github.com/SuamiSihat/ss_cam)
* **License**: Internal Commercial Use Only — see [EULA](./installer/EULA.txt)
