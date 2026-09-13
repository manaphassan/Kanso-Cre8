# Kanso Cre8 Living Roadmap — Phased Milestones (Priority-Ranked)

> **Product**: Kanso Cre8 (簡素)  
> **Tagline**: The Mindful Creative Vault — Local-First Project, Client & Knowledge Engine for Freelance Designers  
> **Author**: `harusssani.manaphassan`  
> **License**: PolyForm Noncommercial License 1.0.0  
> **Primary Stack**: Tauri v2 + Svelte 5 + Tailwind CSS + Pure Markdown-as-Database  
> **Local Workspace**: `D:\HaNa_Innovation\kansoCre8` (Tracking: `https://github.com/manaphassan/Kanso-Cre8.git`)

---

## 🎯 Prioritization Strategy

To build a rock-solid, production-grade application for working freelance creators without feature bloat, engineering is structured into **9 sequential phases** strictly ordered from **Highest Priority (Foundational Core)** to **Commercial Packaging & Distribution**:

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
        ↓
[Priority 8: Billable Chronometer & Executive Studio Deck]
        ↓
[Priority 9: Commercial Engine, One-Time Perpetual Licensing & Feature Gating]
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
1. **Studio & Freelance Brand Dossier (`SettingsView.svelte` & `studioService.svelte.ts`)**:
   - Master studio branding stored in `_Team/_Config/studio_profile.json` (Studio Name, Tagline, Registration No, Logo/Monogram, Email, Phone, Address, Bank Name, Monospace Account No, Account Holder, SWIFT/BIC Code, DuitNow ID, Default Hourly Rate, Currency, Payment Terms).
   - Authorized Digital Signature configuration (signature text, visual signature preview, and colophon stamping).
   - Real-time auto-population of master studio details when generating or converting commercial documents.
2. **Client & Brand Assets Hub (`ClientsView.svelte` & `clientService.ts`)**:
   - Sanitized sample client dossiers: **Acme Corp** (`ACME`), **Nexus Studio** (`NEX`), and **Lumina Labs** (`LUM`).
   - 1-Click creation of new custom clients in `_Clients/[PREFIX]_[ClientName]/client.md`.
   - Interactive brand color palette tiles (`HEX`, `RGB`, `CMYK`) with 1-click clipboard copy.
   - Rate cards (hourly billing rates, payment terms, contact details) stored in clean YAML frontmatter.
3. **Dual-Pane Quote & Invoice Studio (`InvoiceStudioView.svelte` & `financeService.ts`)**:
   - Left Pane: Clean YAML/Markdown line-item editor with resilient composite key rendering preventing Svelte 5 duplicate key collisions.
   - Right Pane: Pixel-perfect, live-rendered invoice matching boutique design agency stationery with official studio logo, business registration badge, wire remittance deck (SWIFT / DuitNow), and authorized digital signature colophon.
   - 1-Click Quote-to-Invoice conversion pipeline creating draft invoices with one click.
   - Real-time arithmetic: `Quantity × Unit Price = Subtotal + Custom Tax = Grand Total`.
   - 1-Click native PDF export and system print dialog via `window.print()`.
   - Invoices saved automatically to `_Finance/Invoices/INV-YYYY-XXX.md` and Quotes to `_Finance/Quotes/QUOTE-YYYY-XXX.md`.

### Acceptance Criteria
* Clicking any color tile copies the exact code to the clipboard with visual toast confirmation.
* Modifying YAML invoice line items recalculates totals instantaneously.
* Invoices and quotes auto-populate freelancer and banking details from master studio profile.
* Invoices print to PDF with correct agency margins, invoice ID, wire remittance details, and digital signature colophon.

---

## 🚦 Priority 3: Standardized 5-Folder Project Scaffolder & Kanban Board
* **Priority Level**: **HIGH**
* **Status**: Completed (Production Ready)
* **Impact**: Core creative project execution — organizing creative assets and keeping sprint deadlines on track.

### Key Deliverables
1. **Standardized 5-Folder Project Vault Scaffolder**:
   - 1-Click generator creating standardized project vaults under `_Projects/[YYYY]/[YYYYMM]_[PREFIX]_[ProjectTitle]/`:
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

## 🚦 Priority 4: Bullet Journal (BuJo) & Atelier Notes Engine
* **Priority Level**: **MEDIUM-HIGH**
* **Status**: Active Evolution (v0.0.1-alpha)
* **Impact**: Long-term creative leverage — daily rapid task logging, monthly reflections, and atomic knowledge management.

### Key Deliverables
1. **Bullet Journal System (`_Journal/` & `JournalView.svelte`)**:
   - `_Journal/Daily/YYYY-MM-DD.md`: Daily rapid logs with design-native BuJo symbols (`• [ ]` Task, `• [x]` Done, `• [>]` Migrated, `o` Event, `-` Note, `*` Priority).
   - `_Journal/Monthly/YYYY-MM.md`: Monthly review of deliverables, focus hours, billable totals, and creative reflections.
   - `_Journal/Yearly/YYYY.md`: Annual retrospective, strategic vision, and portfolio evolution.
2. **Atelier Notes Knowledge Engine (`_Notes/` & `ZettelView.svelte`)**:
   - `_Notes/01_Fleeting/`: Quick unedited thoughts and call minutes (`Ctrl+Space` quick capture).
   - `_Notes/02_Literature/`: Book notes, competitor teardowns, swipe file references.
   - `_Notes/03_Permanent/`: Synthesized atomic design rules, color formulas, and proven viral hooks.
   - `_Notes/Scratchpad.md`: Dedicated buffer for temporary quick notes, clipboard dumps, and instant scratchpad ideas.
3. **Bi-Directional WikiLink Indexer**:
   - Syntax: `[[Note Title]]` or `[[ClientName]]`.
   - Automatic crawling of all `.md` files to build an in-memory graph of outgoing links and incoming backlinks without binary databases.
4. **Universal Task Rollup Engine**:
   - Regex crawler: `- \[( |x)\] #task (.+?)(?: 📅 (\d{4}-\d{2}-\d{2}))?`.
   - Scans Daily Notes, briefs, and atomic notes vault-wide, automatically surfacing active tasks on the Studio Deck Today's Tasks deck.

### Acceptance Criteria
* Clicking a `[[WikiLink]]` opens the target note immediately.
* Adding `- [ ] #task Review packaging print bleed` in a daily note or fleeting note creates an actionable card on the Studio Deck.

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
3. **Dual Placement & Favorite Presets Rack**:
   - Full Studio View under `Focus Radio`.
   - Synchronized Favorite Presets Rack displaying only valid registered stations (`validFavoriteStations.length`) with live playing indicator and 1-click star toggle.
   - Dynamic legacy station ID migration (`nightwave-plaza` ➔ `nightwave`, `somafm-groovesalad` ➔ `somafm`).
   - Persistent **40px Mini-Cassette Dock** in the sidebar footer with mini rotating spools that keeps playing audio in the background while designing.
   - Integrated 25-minute Pomodoro focus timer and box breathing reset coach.

### Acceptance Criteria
* Audio streams buffer and play without freezing the UI thread.
* Spools start rotating when audio begins playing and stop smoothly on pause.
* Navigating between pages does not interrupt playback.
* Favorite stations count accurately reflects active valid presets, and legacy IDs migrate seamlessly.

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
---

## 🚦 Priority 8: Billable Chronometer & Executive Studio Deck
* **Priority Level**: **HIGH (Current Sprint)**
* **Status**: In Active Development (v0.0.1-alpha)
* **Impact**: Tactile daily creative cashflow — header live timer, automated rate calculation, and studio health cockpit.

### Key Deliverables
1. **Header Billable Chronometer (`HeaderTimerWidget.svelte` & `timerStore.svelte.ts`)**:
   - Tactile Play & Stop controls with live elapsed ticker (`HH:MM:SS`).
   - Hourly design rate input / client selector (`$/hr`) with real-time earnings calculation (`+$...`).
   - Active client swatch strip with 1-click HEX copy.
   - 1-Click "Log to Invoice" pipeline on Stop prompt to write itemized hours directly to `_Finance/Invoices/`.
   - Accurate state persistence across app reloads/restarts without losing seconds.
2. **Executive Studio Deck (`DashboardView.svelte`)**:
   - **Today's Tasks**: Daily task deck synced with BuJo Daily Notes with instant check-off.
   - **Design Metrics Bento**: Focus hours logged today/week, billable velocity, first-time-right %, average turnaround velocity, revision rounds.
   - **Project Status at a Glance**: Visual card deck with client color, progress bar, stage badge, deadline countdown.
   - **Smart Suggestions**: Contextual alerts for unreviewed proofs, unbilled hours, approaching deadlines, and focus wellness.
   - **Total Income**: Live aggregation of Paid Invoices + Pending Invoices + Today's Accrued Timer Earnings.
3. **Settings Persistence Engine (`settingsStore.svelte.ts`)**:
   - Persists default rate, currency, view preferences, theme, and timer auto-log settings to `localStorage`.

## 🚦 Priority 8: Header Billable Chronometer & Executive Studio Deck
* **Priority Level**: **ATELIER OPERATIONS**
* **Status**: Completed (Production Ready)
* **Impact**: Direct revenue attribution — transforms Kanso from a passive note-taker into an active billing instrument for working designers.

### Key Deliverables
1. **Header Billable Chronometer (`HeaderTimerWidget.svelte`, `timerStore.svelte.ts`)**:
   - Live elapsed ticker (`HH:MM:SS`), play/pause/stop tactile buttons, and hourly design rate input ($/hr).
   - Real-time earnings calculation (`+$XX.XX`) updated every 1000ms.
   - Millisecond-accurate timestamp persistence across app reloads and system sleep.
   - Active client swatch pill with 1-click HEX/RGB copy to clipboard.
   - 1-Click "Append to Draft Invoice" pipeline upon stopping.
2. **Executive Studio Deck Bento (`DashboardView.svelte`)**:
   - Total Income & Cashflow tracker: Paid invoices + Pending invoices + Live accrued earnings.
   - Craft Metrics Bento: Focus hours today/week, effective design rate, first-time-right %, turnaround speed, and revision rounds.
   - Contextual Smart Suggestions: Unreviewed proofs, unbilled sessions, approaching deadlines, and focus wellness alerts.

### Acceptance Criteria
* Clicking Play starts the timer and updates live earnings every second.
* Closing and reopening the app restores the running timer with 100% elapsed time accuracy.
* Stopping the timer prompts to append session to draft invoice and logs entry.

---

## 🚦 Priority 9: Commercial Engine, One-Time Perpetual Licensing & Feature Gating
* **Priority Level**: **COMMERCIAL ENGINE & LICENSING**
* **Status**: Completed (Production Ready)
* **Impact**: Sustainable independence — one-time payment monetization ($39 perpetual) that respects user privacy and data ownership with zero database/auth servers.

### 1. The Core Philosophy: "Sanctuary vs. Commerce" Split
* **Free Tier (Kanso Zen)**: The personal creative sanctuary. Deep work, personal journaling, atomic note-taking, and focus music are 100% free forever. Acts as the zero-friction viral adoption loop.
* **Paid Tier (Kanso Studio Pro — $39–$49 One-Time Perpetual)**: The commercial operations engine. The moment a designer uses Kanso to manage paying clients, calculate billable hours, generate invoices, or package deliverables, they invest in a business license that pays for itself in their very first project.

### 2. Feature Separation Matrix

| Module / Feature | Kanso Zen (Free Edition) | Kanso Studio Pro (One-Time Purchase) |
| :--- | :--- | :--- |
| **Vault Storage** | Pure Markdown, 100% offline, local disk | Pure Markdown, 100% offline, local disk |
| **Focus Radio** | Full retro cassette player, all 5 audio streams, Pomodoro | Full retro cassette player + mini dock |
| **Bullet Journal** | Daily rapid logs, monthly reviews, yearly index | Full BuJo + automatic task rollup to client projects |
| **Atelier Notes** | Unlimited Fleeting, Literature, Permanent notes, WikiLinks | Unlimited notes + Atomic Hook Injector |
| **Copywriting Studio** | Full Markdown editor, word counts, telemetry | Full editor + client copy handoff |
| **Project Manager** | Up to **2 active personal projects** (basic folders) | **Unlimited projects** + 1-click 5-folder scaffolding (`01_BRIEF`–`05_DELIVERABLES`) |
| **Clients & Brand Hub** | 1 sample client dossier (view-only demo) | **Unlimited client dossiers**, brand color swatches (1-click HEX/RGB/CMYK copy), rate cards |
| **Quotes & Invoices** | View demo invoice template only | **Full Invoice Studio**: YAML editor, auto tax arithmetic, boutique agency PDF export |
| **Billable Chronometer** | Focus stopwatch / Pomodoro mode | **Hourly design rate selector**, live accrued earnings ticker (`+$...`), 1-click **"Append to Invoice"** |
| **Deliverables Lightbox** | Basic image viewer | **4K proof viewer**, visual diff slider, annotation canvas, **1-click ZIP handover packaging** |
| **Studio Deck** | Today's tasks + personal focus hours | **Executive Bento**: Billable velocity, first-time-right %, **Total Cashflow (Paid + Pending + Live timer)** |

### 3. Key Deliverables
1. **Zero-Database Offline Licensing Engine (`licenseStore.svelte.ts`)**:
   - Stores license state in local storage / vault configuration file (`_kanso_vault/license.key`).
   - Validates license keys locally without requiring an internet connection or phone-home tracking.
   - Cryptographic verification via Tauri v2 Rust backend (`ed25519` public key signature verification).
2. **Tactile Non-Intrusive UI Gating**:
   - Subtle hairline `[PRO]` badges on commercial navigation items (`invoices`, `clients`, `deliverables`).
   - Interactive preview mode for `Quotes & Invoices` (free users can test the YAML arithmetic on sample data before upgrading).
   - Clean, respectful upgrade dialog when attempting to create a 2nd client or 3rd project: *"Ready to bill clients? Unlock Kanso Studio Pro. One-time $39. Own it forever."*
   - Header Chronometer toggles smoothly: free focus stopwatch vs pro billable rate counter.
3. **Merchant of Record Integration (Lemon Squeezy / Gumroad)**:
   - Automated checkout handling global VAT, local sales tax, and currency conversion.
   - Webhook generates cryptographically signed offline license key delivered directly via email.

### Acceptance Criteria
* Free users can use all note-taking, journaling, and cassette focus radio features indefinitely without nags.
* Entering a valid offline license key unlocks all Pro features instantly without requiring an internet connection or server restart.
* Zero external database, user account server, or telemetry dependencies added to the repository.

---

## ⚖️ Non-Negotiable Architecture Constraints

| Constraint | Rule | Reason |
| :--- | :--- | :--- |
| **No Database Server** | Zero SQL, SQLite, Prisma, or MongoDB | 100% data sovereignty and cloud-sync interoperability |
| **Design Tokens Only** | No raw hex codes in Svelte components | Ensures flawless light/dark mode and brand consistency |
| **Sanitized Clients** | Acme Corp, Nexus Studio, Lumina Labs only | Strict client privacy in public codebases |
| **Zero Legacy Code** | Zero .NET 4.8, Avalonia, or Docker files | Keeps repository pristine, ultra-lean, and purely Svelte 5 / Tauri v2 |

---

*Last Updated: 2026-09-11. Maintained by [harusssani.manaphassan](https://github.com/manaphassan).*
