# Kanso Cre8 — Personal Creative Vault & Project Manager

## Offline-First Creative Operations & Client Manager for Freelance Designers

**Standardized Project Vaults · Multi-Cloud Sync · Copywriting Studio · Client & Brand Hub · Kanban Task Flow · Multi-Platform**

[![License](https://img.shields.io/badge/licence-PolyForm%20Noncommercial%201.0.0-blue?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20%7C%20Linux%20%7C%20Android-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)
[![Framework](https://img.shields.io/badge/.NET%20Framework-4.8%20%7C%20.NET%208.0%20%7C%20Compose-purple?style=flat-square)](https://dotnet.microsoft.com)
[![Design System](https://img.shields.io/badge/design-Microsoft%20Fluent%202-0078D4?style=flat-square)](https://fluent2.microsoft.design)

---

## 🌟 What is Kanso Cre8?

**Kanso Cre8** is an offline-first, local-first creative operations and project management workspace created specifically for freelance designers, solo art directors, video editors, and digital creators. Inspired by the Japanese aesthetic philosophy of *Kanso* (簡素 — simplicity and eliminating unnecessary clutter), Kanso Cre8 brings calm and discipline to creative workflows without requiring complex database servers or proprietary cloud lock-in.

It operates on a pure **Markdown-as-Database** architecture: all project metadata, task statuses, client briefs, and copywriting notes are stored directly inside standard file system folders and YAML frontmatter.

---

## ☁️ Universal Cloud Save & Storage

Kanso Cre8 works with any storage backend of your choice:

* **Dropbox**: Syncs automatically via your local Dropbox folder.
* **Google Drive**: Works seamlessly with Google Drive for Desktop (`G:\My Drive`).
* **Microsoft OneDrive**: Native Windows & macOS sync folder integration.
* **Synology Drive / NAS**: Direct integration with local NAS or Synology Drive sync daemon.
* **Nextcloud / ownCloud**: Self-hosted private cloud via local WebDAV / client mount.
* **Local NVMe / SSD**: Blazing fast, 100% offline, zero-network dependency.

---

## 📥 Multi-Platform Ecosystem

| Target Platform | Package / Variant | Role in Ecosystem |
|---|---|---|
| 🪟 **Windows 10 / 11** | **Native WPF Desktop (`src/SS-CAM`)** | **Flagship Designer Workstation**: Fluent 2 dark/light mode, template generator, preflight quality auditor, Canva cloud bridge, copywriting studio, audio feedback. |
| 🐧 **Linux Desktop** | **Native Avalonia UI (`src/SS-CAM.Linux`)** | **Native Linux Client**: Ubuntu/Fedora/Debian/Arch support, Skia graphics engine, GNOME/KDE desktop integration. |
| 📱 **Android Native** | **Native Android App (`src/SS-CAM.Android`)** | **Mobile Studio Companion**: Review deliverables on the go, sign-off proofs, track client tasks, desk standby mode. |
| 🌐 **Web Portal (Optional)** | **Svelte 5 + Node.js (`src/SS-CAM.Web`)** | **Self-Hosted Web Hub**: Run in Docker on your local server or VPS for browser-based remote review. |

---

## 📁 Standardized 5-Folder Creative Vault

All creative projects follow a clean 5-folder structure, preventing lost assets and scattered drafts:

```text
📁 [YYYY] / [YYYYMM]_[PREFIX]_[ProjectTitle] /
├── 📁 01_BRIEF_ASSETS/        # Client briefs, moodboards, reference imagery, logo vector assets
├── 📁 02_SOURCE_FILES/        # PSD, Illustrator (.ai), Affinity Designer (.afdesign), Blender, Canva links
├── 📁 03_COPYWRITING/         # Dedicated COPY.md scripts, viral hook angles, and ad copy specs
├── 📁 04_WORK_IN_PROGRESS/    # Drafts, work-in-progress exports, and intermediate renders
├── 📁 05_DELIVERABLES/        # Final approved high-res exports, packaging files, and client mockups
└── 📄 README.md               # YAML frontmatter metadata (status, client, priority, deadline, revision)
```

---

## 🚀 Core Features for Freelance Designers

### 1. Client & Brand Hub
* Manage all your freelance clients in one place (client names, project code prefixes, contact info, hourly billing rates).
* Live interactive color swatches (HEX, RGB, CMYK, Pantone) with 1-click clipboard copy.

### 2. Kanban Task Flow & Big Calendar
* 5-stage creative lifecycle: `Backlog` ➔ `In Progress` ➔ `Review Queue` ➔ `Revision Required` ➔ `Done & Approved`.
* Visual calendar view mapping client deadlines, project milestones, and delivery dates.

### 3. Copywriting Studio
* In-app Markdown editor writing directly to `03_COPYWRITING/COPY.md`.
* Live character count, word count, and reading time telemetry.
* Pre-built frameworks for social ad hooks, landing page scripts, and video captions.

### 4. Deliverable Inspector & 1-Click Handover
* High-resolution image & video lightbox for instant review.
* Automated 1-click ZIP export packaging for client delivery.

### 5. Creative Focus & Lo-Fi Radio
* Integrated low-latency radio player with chillhop, lo-fi beats, synthwave, and jazz streams.
* Built-in Pomodoro focus timer and box breathing reset coach.

---

## ⚖️ License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

* **Permitted**: Personal creative management, freelance project tracking, hobbyist work, educational study, and research.
* **Prohibited**: Commercial resale of the software, SaaS redistribution, or charging users for access.

See [LICENSE](./LICENSE) for full legal terms.
