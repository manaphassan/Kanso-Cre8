# Kanso Cre8 Living Roadmap — Phased Milestones (Priority-Ranked)

> **Product**: Kanso Cre8 (簡素)  
> **Tagline**: The Mindful Creative Vault — Local-First Project, Client & Knowledge Engine for Freelance Designers  
> **Author**: `harusssani.manaphassan`  
> **License**: PolyForm Noncommercial License 1.0.0  
> **Primary Stack**: Tauri v2 + Svelte 5 + Tailwind CSS + Pure Markdown-as-Database  
> **Local Workspace**: `D:\HaNa_Innovation\kansoCre8` (Tracking: `https://github.com/manaphassan/Kanso-Cre8.git`)

---

## 🎯 Prioritization Strategy

To build a rock-solid, production-grade application for working freelance creators without feature bloat, engineering is structured into **7 sequential phases** strictly ordered from **Highest Priority (Foundational Core)** to **Lowest Priority (Packaging & Distribution)**:

```text
[Priority 1: Core Vault & Studio Shell] 
        ↓
[Priority 2: Client Hub & YAML Invoicing] 
        ↓
[Priority 3: 5-Folder Project Scaffolder & Kanban] 
        ↓
[Priority 4: Zettelkasten Second Brain & Task Rollup] 
        ↓
[Priority 5: Retro Cassette Focus Radio (from SS-CAM Android)] 
        ↓
[Priority 6: Copywriting Studio & 4K Deliverables Lightbox] 
        ↓
[Priority 7: Multi-Platform Tauri v2 Packaging & Multi-Cloud Sync]
```

---

## 🚦 Priority 1: Svelte 5 Minimalist Shell & Pure Markdown Vault Engine
* **Priority Level**: **CRITICAL / HIGHEST**
* **Status**: Completed (Production Ready)
* **Impact**: Absolute foundation — everything depends on local filesystem I/O, cloud folder detection, and design tokens.

### Key Deliverables
1. **Linear / Geist Studio Design System**:
   - Establish CSS variables for Dark Mode (`#09090B`, `#18181B`, `#27272A`, `#38BDF8`) and Light Mode (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`, `#0078D4`).
   - Strict 1px hairline border standard (`var(--kanso-border)`) with zero arbitrary drop shadows.
2. **3-Zone Studio Shell (`App.svelte`)**:
   - 44px Minimalist TitleBar with vault path status, breadcrumbs, search shortcut (`Ctrl+K`), and quick audio indicator.
   - 210px Collapsible Sidebar with 4 ergonomic sections:
     - `Creative Workspace` (Dashboard, Projects & Tasks, Review Queue, Focus Radio)
     - `Knowledge & Second Brain` (Atomic Notes, Copywriting Studio)
     - `Client & Business Ops` (Clients & Brands, Quotes & Invoices, Creative Requests)
     - `System & Storage` (Settings & Vault)
   - Fluid content canvas with `< 16ms` interaction speed.
3. **Pure Markdown Storage Engine (`vaultService.ts`)**:
   - **Absolute Law**: Zero SQL, SQLite binary files, Prisma ORM, or cloud databases. 100% human-readable UTF-8 `.md` and YAML frontmatter.
   - Automatic detection of vault sync directories (Dropbox, Google Drive, OneDrive, Synology Drive, local NVMe).
   - Real-time filesystem watcher for instant UI refresh when files are edited externally in Obsidian or VS Code.

### Acceptance Criteria
* `verify-kanso.ps1` passes with `10 passed / 0 warned / 0 failed`.
* Theme toggle switches instantly between Dark Obsidian and Light Porcelain.
* Loading a local vault enumerates files without errors or binary database creation.

---

## 🚦 Priority 2: Multi-Client Hub & YAML Quote/Invoice Studio
* **Priority Level**: **HIGH**
* **Status**: Completed (Production Ready)
* **Impact**: Core freelance business value — managing client relationships, brand guidelines, and getting paid.

### Key Deliverables
1. **Client & Brand Assets Hub (`ClientsView.svelte` & `clientService.ts`)**:
   - Sanitized sample client dossiers: **Acme Corp** (`ACME`), **Nexus Studio** (`NEX`), and **Lumina Labs** (`LUM`).
   - 1-Click creation of new custom clients in `_Clients/[PREFIX]_[ClientName]/client.md`.
   - Interactive brand color palette tiles (`HEX`, `RGB`, `CMYK`) with 1-click clipboard copy.
   - Rate cards (hourly billing rates, payment terms, contact details) stored in clean YAML frontmatter.
2. **Dual-Pane Quote & Invoice Studio (`InvoiceStudioView.svelte` & `financeService.ts`)**:
   - Left Pane: Clean YAML/Markdown line-item editor.
   - Right Pane: Pixel-perfect, live-rendered invoice matching boutique design agency stationery.
   - Real-time arithmetic: `Quantity × Unit Price = Subtotal + Custom Tax = Grand Total`.
   - 1-Click native PDF export and system print dialog via `window.print()`.
   - Invoices saved automatically to `_Finance/Invoices/INV-YYYY-XXX.md`.

### Acceptance Criteria
* Clicking any color tile copies the exact code to the clipboard with visual toast confirmation.
* Modifying YAML invoice line items recalculates totals instantaneously.
* Invoices print to PDF with correct agency margins, invoice ID, and banking details.

---

## 🚦 Priority 3: Standardized 5-Folder Project Scaffolder & Kanban Board
* **Priority Level**: **HIGH**
* **Status**: Completed (Production Ready)
* **Impact**: Core creative project execution — organizing creative assets and keeping sprint deadlines on track.

### Key Deliverables
1. **Standardized 5-Folder Project Vault Scaffolder**:
   - 1-Click generator creating standardized project vaults under `[YYYY]/[YYYYMM]_[PREFIX]_[ProjectTitle]/`:
     - `01_BRIEF/` (Client briefs, references, vector logos, moodboards)
     - `02_SOURCE/` (PSD, AI, Affinity, Blender, Figma links)
     - `03_COPY/` (Scripts, social hooks, COPY.md)
     - `04_WIP/` (Draft renders, client review previews)
     - `05_DELIVERABLES/` (Final high-res exports ready for client handover)
     - `README.md` (Project master file with YAML frontmatter tracking status, budget, and deadline)
2. **Interactive 5-Stage Kanban Board (`KanbanView.svelte`)**:
   - Stages: `Backlog` ➔ `In Progress` ➔ `Review Queue` ➔ `Revision Required` ➔ `Approved & Done`.
   - Drag-and-drop or 1-click stage transitions that update the project's `README.md` frontmatter on disk.
   - Priority chips (`low`, `normal`, `high`, `urgent`) and deadline countdown tags.

### Acceptance Criteria
* Project generation creates all 5 folders and a valid `README.md` on disk within 50ms.
* Moving a project card on the Kanban board updates the `status:` field in the target `README.md` file in real time.

---

## 🚦 Priority 4: Zettelkasten Knowledge Second Brain & Universal Task Rollup
* **Priority Level**: **MEDIUM-HIGH**
* **Status**: Completed (Production Ready)
* **Impact**: Long-term creative leverage — synthesizing ideas, research, and project tasks into an interconnected graph.

### Key Deliverables
1. **3-Tier Note Classification Engine (`ZettelView.svelte` & `zettelService.ts`)**:
   - `_Zettelkasten/01_Fleeting/`: Quick unedited thoughts and call minutes (`Ctrl+Space` quick capture).
   - `_Zettelkasten/02_Literature/`: Book notes, competitor teardowns, swipe file references.
   - `_Zettelkasten/03_Permanent/`: Synthesized atomic design rules, color formulas, and proven viral hooks.
2. **Bi-Directional WikiLink Indexer**:
   - Syntax: `[[Note Title]]` or `[[ClientName]]`.
   - Automatic crawling of all `.md` files to build an in-memory graph of outgoing links and incoming backlinks without binary databases.
3. **Universal Task Rollup Engine**:
   - Regex crawler: `- \[( |x)\] #task (.+?)(?: 📅 (\d{4}-\d{2}-\d{2}))?`.
   - Scans meeting notes and briefs vault-wide, automatically surfacing active tasks on the Kanban board.
   - Toggling a checkbox in the Kanban board edits the physical Markdown file on disk in real time.

### Acceptance Criteria
* Clicking a `[[WikiLink]]` opens the target note immediately.
* Adding `- [ ] #task Review packaging print bleed` in a fleeting note creates an actionable card on the Kanban board.

---

## 🚦 Priority 5: Retro Cassette Focus Radio & Studio Deck
* **Priority Level**: **MEDIUM**
* **Status**: Completed (Production Ready)
* **Impact**: Tactile creator flow state — integrating the beloved mechanical cassette player from SS-CAM Android.

### Key Deliverables
1. **Physical Cassette Tape Card (`CassetteTapeCard.svelte`)**:
   - Faithful web port of the Android Jetpack Compose cassette chassis.
   - 4 corner silver screws, trapezoidal head/roller, Side A label badge, station frequency, and clear tape window.
   - Dual 6-spoke gear spool wheels (`CassetteSpoolWheel.svelte`) that physically rotate via smooth CSS animation (`33 RPM`) during audio playback.
2. **Tactile Mechanical Control Deck (`CassetteDeck.svelte`)**:
   - Tactile transport controls: Play/Pause, Next/Prev tape, Eject, and Volume slider.
   - Live ICY stream metadata marquee ticker (scrolling artist & track title).
   - Curated streaming presets:
     - ☕ **Chillhop Cafe** (Lofi beats & study vibes)
     - 🌆 **Nightwave Plaza** (Vaporwave / Synthwave)
     - 🌿 **SomaFM Groove Salad** (Downtempo ambient)
     - 🎷 **Parisian Jazz Cafe** (Acoustic jazz & bossa nova)
     - 🧘 **Zen Alpha Focus** (Deep work binaural drone)
3. **Dual Placement**:
   - Full Studio View under `Focus Radio`.
   - Persistent **40px Mini-Cassette Dock** in the sidebar footer with mini rotating spools that keeps playing audio in the background while designing.
   - Integrated 25-minute Pomodoro focus timer and box breathing reset coach.

### Acceptance Criteria
* Audio streams buffer and play without freezing the UI thread.
* Spools start rotating when audio begins playing and stop smoothly on pause.
* Navigating between pages does not interrupt playback.

---

## 🚦 Priority 6: Copywriting Studio & 4K Deliverables Lightbox
* **Priority Level**: **MEDIUM-LOW**
* **Status**: Completed (Production Ready)
* **Impact**: Polish and handover — copywriting assistance and client deliverable inspection.

### Key Deliverables
1. **Copywriting Studio (`CopyStudioView.svelte`)**:
   - Focused Markdown editor writing directly to `03_COPY/COPY.md`.
   - Live telemetry: word count, character count, and estimated reading time.
   - **Atomic Hook Injector Drawer**: 1-click insertion of hooks from `_Zettelkasten/03_Permanent/`, and 1-click "Extract to Atomic Note" for winning copy.
2. **Deliverables Review Lightbox (`DeliverablesView.svelte`)**:
   - 4K proof viewer for high-res PNG, JPG, WebP, MP4, and PDF dielines in `05_DELIVERABLES/`.
   - Zoom/pan inspection for checking print bleeds and export quality.
   - Automated 1-click ZIP export packaging for clean client delivery.

### Acceptance Criteria
* Live telemetry updates instantly as user types.
* Lightbox opens 4K images at native resolution with smooth pan/zoom.
* 1-Click ZIP export packages all deliverables cleanly with a summary text manifest.

---

## 🚦 Priority 7: Multi-Platform Tauri v2 Packaging & Multi-Cloud Sync
* **Priority Level**: **DISTRIBUTION (Final Step)**
* **Status**: Completed (Production Ready)
* **Impact**: Packaging, cross-platform compilation, and multi-device parity.

### Key Deliverables
1. **Tauri v2 Native Rust Backend (`src-tauri/`)**:
   - App identifier `com.kansocre8.desktop`.
   - Native file system plugin (`@tauri-apps/plugin-fs`) for direct local disk access.
   - Native file/folder picker (`@tauri-apps/plugin-dialog`).
   - Global shortcuts (`@tauri-apps/plugin-global-shortcut`) for `Ctrl+Space` quick capture.
2. **Cross-Platform Compilation**:
   - Windows 11/10: Native 64-bit installer (`.msi` and portable `.exe`).
   - Linux: Native package (`.deb` and standalone `.AppImage`).
   - Android Mobile Companion: Tauri v2 Android APK targeting mobile review & task tracking.
3. **Cloud Daemon Verification**:
   - Verify conflict-free two-way file synchronization across Dropbox, Google Drive, OneDrive, and Synology Drive.

### Acceptance Criteria
* Windows and Linux executables build cleanly and run under ~35MB RAM.
* Global shortcut `Ctrl+Space` brings up quick capture modal from anywhere in the OS.

---

## ⚖️ Non-Negotiable Architecture Constraints

| Constraint | Rule | Reason |
| :--- | :--- | :--- |
| **No Database Server** | Zero SQL, SQLite, Prisma, or MongoDB | 100% data sovereignty and cloud-sync interoperability |
| **Design Tokens Only** | No raw hex codes in Svelte components | Ensures flawless light/dark mode and brand consistency |
| **Sanitized Clients** | Acme Corp, Nexus Studio, Lumina Labs only | Strict client privacy in public codebases |
| **Quarantine Legacy** | All .NET 4.8 / Avalonia code in `archive/legacy-dotnet/` | Keeps modern Svelte 5 / Tauri codebase clean and lightweight |

---

*Last Updated: 2026-09-09. Maintained by [harusssani.manaphassan](https://github.com/manaphassan).*
