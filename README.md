# Kanso Cre8 (簡素) — The Mindful Creative Vault

> **Offline-First Creative Operations, Client Hub & Knowledge Engine for Freelance Designers**  
> *Zero bloat. Total data ownership. Pure creative flow.*

[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-38bdf8?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20Android-18181b?style=flat-square)](https://github.com/manaphassan/Kanso-Cre8)
[![Engine](https://img.shields.io/badge/engine-Tauri%20v2%20%2B%20Svelte%205-f97316?style=flat-square)](https://v2.tauri.app)
[![Design System](https://img.shields.io/badge/design-Linear%20%2F%20Geist%20Studio-09090b?style=flat-square)](https://github.com/manaphassan/Kanso-Cre8)
[![Storage](https://img.shields.io/badge/storage-Pure%20Markdown%20%2B%20YAML-10b981?style=flat-square)](https://github.com/manaphassan/Kanso-Cre8)

---

## 🌟 What is Kanso Cre8?

**Kanso Cre8** is an offline-first, local-first creative workstation built specifically for freelance visual designers, art directors, 3D illustrators, and content creators. 

Inspired by the Japanese Zen aesthetic of **Kanso (簡素)** — the conscious elimination of clutter and devotion to essential simplicity — Kanso Cre8 replaces heavy enterprise software and monthly SaaS subscriptions with a lightning-fast, calm, tactile desktop application that puts you in complete control of your creative business.

Operating on a pure **Markdown-as-Database** foundation, all client profiles, project milestones, invoices, and atomic notes are stored directly on your disk as plain human-readable text and YAML frontmatter. Open them anytime in Obsidian, VS Code, or Typora with zero vendor lock-in.

---

## 🏛️ Modular by Design Architecture

Kanso Cre8 is architected as a strictly modular, decoupled system across **four independent layers**:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. VAULT STORAGE LAYER (Zero-Database Markdown Engine)     │
│    _Clients/   _Finance/   _Projects/   _Journal/   _Notes/  │
├─────────────────────────────────────────────────────────────┤
│ 2. DOMAIN SERVICES LAYER (Single-Responsibility Business)   │
│    clientService  financeService  journalService  zettelService │
├─────────────────────────────────────────────────────────────┤
│ 3. UI VIEW & FEATURE LAYER (Pluggable Svelte 5 Views)        │
│    StudioDeck   ClientsView   JournalView   AtelierNotes    │
│    └─ Chronometer  └─ InvoiceStudio  └─ CassetteDeck        │
├─────────────────────────────────────────────────────────────┤
│ 4. ATOMIC DESIGN SYSTEM LAYER (Reusable Lego Primitives)    │
│    Button · Card · Dialog · Input · Toast · CSS Tokens      │
└─────────────────────────────────────────────────────────────┘
```

1. **Vault Storage Layer**: Every domain lives in its own isolated filesystem container. Projects, clients, invoices, and notes can be edited or deleted independently using external editors (Obsidian, VS Code, Finder/Explorer) without database migration errors.
2. **Domain Services Layer**: Focused TypeScript services with single responsibilities (`clientService.ts`, `financeService.ts`, `zettelService.ts`, `radioService.svelte.ts`) maintain clean domain boundaries.
3. **Pluggable Views Layer**: Self-contained Svelte 5 views mount seamlessly into the app shell. Features such as the Cassette Radio Deck or Invoice Studio plug in as autonomous modules.
4. **Atomic Design System Layer**: Standardized UI primitives built on Linear / Geist design tokens ensure consistent visual harmony across all screens.

---

## ⚡ Cross-Platform Architecture (Tauri v2 + Svelte 5)

Kanso Cre8 is powered by a lightweight unified codebase built on **Tauri v2**, **Svelte 5**, and **Tailwind CSS**, consuming only ~35MB of RAM:

| Target Platform | Package / Runtime | Role in Workspace |
| :--- | :--- | :--- |
| 🪟 **Windows 11 / 10** | **Tauri v2 Native (.msi / .exe)** | **Primary Desktop Studio**: Edge WebView2 runtime, hardware-accelerated rendering, native system file dialogs, global hotkeys (`Ctrl+Space`). |
| 🐧 **Linux Desktop** | **Tauri v2 Native (.deb / .AppImage)** | **Linux Creator Workstation**: WebKitGTK engine, GNOME/KDE theme compliance, native Wayland & X11 support. |
| 📱 **Android Mobile** | **Tauri v2 Mobile Companion (.apk)** | **Mobile Companion**: Review deliverable proofs on the go, 1-click client approvals, mobile task tracking. |
| 🌐 **Local Studio Hub** | **Svelte 5 SPA (Optional)** | **Local Studio Hub**: Optional self-hosted web review portal for local network devices. |

---

## ☁️ Universal Cloud Save & Sync

Kanso Cre8 has zero proprietary database servers. Simply point your vault root to any local or cloud-synchronized directory:

* **Dropbox**: `~/Dropbox/KansoCre8-Vault`
* **Google Drive**: `G:\My Drive\KansoCre8-Vault`
* **Microsoft OneDrive**: `~/OneDrive/KansoCre8-Vault`
* **Synology Drive / NAS**: `~/SynologyDrive/KansoCre8-Vault`
* **Nextcloud / WebDAV**: Private self-hosted cloud sync
* **Local High-Speed NVMe**: 100% offline, zero-network latency

---

## 🗄️ Standardized Creative Vault Hierarchy

Never search for missing fonts, lost PSDs, or scattered client briefs again:

```text
📁 KansoCre8-Vault/                        # Sync Root (Dropbox, GDrive, OneDrive, or Local)
│
├── 📁 _Clients/                          # 🏢 Client Dossiers & Brand Hub
│   ├── 📁 ACME_AcmeCorp/                 # (Acme Corporation · $125/hr)
│   ├── 📁 NEX_NexusStudio/               # (Nexus Studio · $110/hr)
│   └── 📁 LUM_LuminaLabs/                # (Lumina Labs · $140/hr)
│
├── 📁 _Finance/                          # 🧾 Cashflow & Invoice Studio (Quotes & Invoices)
│   ├── 📁 Quotes/                        # QUOTE-2026-xxx.md
│   └── 📁 Invoices/                      # INV-2026-xxx.md (Printable HTML/PDF)
│
├── 📁 _Projects/                         # 📁 Standardized Project Vaults
│   └── 📁 2026/                          # Standardized 5-Folder Vaults by Year & Month
│       └── 📁 202609_September/
│           └── 📁 202609_0001_ACME_MobileAppIllustration/
│               ├── 📁 01_BRIEF/          # Client briefs, references, moodboards
│               ├── 📁 02_SOURCE/         # .psd, .ai, .afdesign, Blender, Figma links
│               ├── 📁 03_COPY/           # COPY.md (scripts, hooks, specs)
│               ├── 📁 04_WIP/            # Draft exports, test renders, review clips
│               ├── 📁 05_DELIVERABLES/   # High-res exports ready for client handover
│               └── 📄 README.md          # Project Master File (YAML Frontmatter)
│
├── 📁 _Journal/                          # 📔 Creator's BuJo (Bullet Journal System)
│   ├── 📁 Daily/                         # YYYY-MM-DD.md (Rapid logging: tasks, events, notes)
│   ├── 📁 Monthly/                       # YYYY-MM.md (Monthly review, deliverables, billable hours)
│   └── 📁 Yearly/                        # YYYY.md (Annual vision, milestones, creative retrospective)
│
└── 📁 _Notes/                            # 🧠 Atelier Notes & Second Brain Engine
    ├── 📁 01_Fleeting/                   # Raw quick captures (Ctrl+Space during calls)
    ├── 📁 02_Literature/                 # Design references, book notes, teardowns
    ├── 📁 03_Permanent/                  # Atomic rules, layout systems, copy hooks
    └── 📄 Scratchpad.md                  # 📝 Temporary quick notes buffer
```

---

## 🚀 Core Studio Features

### 1. ⏱️ Billable Chronometer & Studio Pulse (Header Live Timer)
* Real-time tactile **Play / Stop** controls in the header with live elapsed ticker (`HH:MM:SS`).
* Dynamic hourly design rate input / client selector with instant earnings calculation (`+$...`).
* **Active Client Swatch Strip**: 1-click clipboard copy for active client brand colors while working in design apps.
* **1-Click Log to Invoice Pipeline**: Stop prompt offers to append completed session directly into `_Finance/Invoices/`.
* Persistent state engine maintains timer progress with millisecond accuracy across app reloads.

### 2. 🎛️ Executive Studio Deck (Dashboard)
* **Today's Tasks Deck**: Interactive daily task list synchronized directly with Bullet Journal Daily Notes (`_Journal/Daily/`).
* **Design Metrics Bento**: Focus hours logged today & this week, billable velocity, first-time-right %, average turnaround days, and active revision rounds.
* **Project Status at a Glance**: Visual card deck with client brand colors, stage progress bars, and deadline alerts.
* **Smart Creative Suggestions**: Contextual alerts for stale proof reviews, unbilled hours ready to invoice, and focus wellness breaks.
* **Total Income & Cashflow Summary**: Live aggregation of Paid Invoices + Pending Invoices + Today's Accrued Timer Earnings.

### 3. 📔 Bullet Journal (BuJo) Creative Logging
* **Daily Notes** (`_Journal/Daily/YYYY-MM-DD.md`): Rapid logging with design-native symbols (`• [ ]` Task, `• [x]` Done, `• [>]` Migrated, `o` Event, `-` Note, `*` Priority).
* **Monthly Review** (`_Journal/Monthly/YYYY-MM.md`): Deliverables recap, billable hours breakdown, and creative reflections.
* **Yearly Index** (`_Journal/Yearly/YYYY.md`): Annual financial goals, high-impact portfolio highlights, and strategic vision.

### 4. 🏢 Client Dossiers & Brand Hub
* Pre-configured profiles for sample clients (**Acme Corp**, **Nexus Studio**, **Lumina Labs**), with rates ($125, $110, $140), contact details, and payment terms.
* Instant interactive brand color swatches (`HEX`, `RGB`, `CMYK`) with 1-click clipboard copy.
* 1-Click **"Start Billable Timer"** launches the header chronometer pre-filled with the client's agreed rate and code.

### 5. 🧠 Atelier Notes & Knowledge Engine
* 3-tier knowledge categorization: **Fleeting Notes** (quick raw captures), **Literature Notes** (teardowns & references), and **Permanent Notes** (proven atomic design rules & hooks).
* Bi-directional `[[WikiLinks]]` with real-time backlink indexing.
* **Scratchpad Buffer** (`_Notes/Scratchpad.md`): Dedicated quick scratchpad for temporary notes and clipboard dumps.

### 6. 🧾 Dual-Pane Quote & Invoice Studio
* Write invoices in intuitive YAML line-items on the left; get a live, pixel-perfect printable invoice on the right.
* Automated arithmetic for subtotals, custom tax rates, and grand totals.
* 1-Click PDF export or print via system dialog (`window.print()`).

### 7. 📁 Standardized 5-Folder Project Scaffolder & Kanban Board
* 1-Click generator creating standardized project vaults (`01_BRIEF` to `05_DELIVERABLES`) under `_Projects/[YYYY]/`.
* Interactive 5-stage Kanban board (`Backlog` ➔ `In Progress` ➔ `Review Queue` ➔ `Revision Required` ➔ `Approved & Done`).
* Dragging cards or toggling stages directly updates the project's `README.md` frontmatter on disk.

### 8. 📻 Retro Cassette Focus Radio & Sanctuary
* **Tactile Mechanical Player**: Ported faithfully from the mechanical cassette player in SS-CAM Android.
* **Skeuomorphic Cassette Chassis**: 4 corner silver screws, trapezoidal head/roller, Side A label badge, station frequency, and clear tape window.
* **Dual Spinning Spools**: 6-spoke mechanical gear spool wheels rotating at 33 RPM via smooth CSS animation during audio playback.
* **Curated Focus Streams**: Chillhop Cafe, Nightwave Plaza, SomaFM Groove Salad, Parisian Jazz, Zen Alpha Focus.
* **Dual Placement**: Full studio view under `Focus Radio` + persistent **40px Mini-Cassette Dock** in the sidebar footer.
* **Zen Focus Mode**: Distraction-free sanctuary with soft ambient sound and minimal UI.

---

## 🎨 Linear / Geist Design System

Kanso Cre8 is styled with a bespoke dark/light studio design system inspired by Linear and Vercel Geist:

```text
DARK MODE (Default): Canvas [#09090B] · Surface [#18181B] · Hairline [#27272A] · Accent [#38BDF8]
LIGHT MODE:          Canvas [#F8FAFC] · Surface [#FFFFFF] · Hairline [#E2E8F0] · Accent [#0078D4]
```

* **Zero visual noise**: Pure matte canvas surfaces eliminate eye strain during long design sessions.
* **Spatial precision**: 1px subtle hairline borders define cards and inputs without heavy drop shadows.
* **Instant theme toggle**: Seamless switching between Dark Obsidian and Light Porcelain.

---

## 🗺️ Phased Implementation Roadmap

Development is organized into 7 sequential phases strictly ranked by priority:

| Phase | Module | Priority | Focus |
| :--- | :--- | :--- | :--- |
| **P1** | **Svelte 5 Shell & Markdown Vault Engine** | **CRITICAL** | Linear/Geist tokens, 3-zone shell, `vaultService.ts` local scanner, pure Markdown law. |
| **P2** | **Multi-Client Hub & YAML Invoicing** | **HIGH** | Client profiles (ACME, NEX, LUM), brand color swatches, dual-pane invoice editor & PDF print. |
| **P3** | **5-Folder Scaffolder & Kanban Board** | **HIGH** | Standardized project creator (`01_BRIEF` to `05_DELIVERABLES`), real-time Kanban sync. |
| **P4** | **Zettelkasten Engine & Task Rollup** | **MED-HIGH** | 3-tier note classification, `[[WikiLinks]]` backlink crawler, `- [ ] #task` auto-rollup. |
| **P5** | **Retro Cassette Focus Radio & Deck** | **MEDIUM** | Mechanical cassette player, rotating spools (33 RPM), live streams, Pomodoro timer, mini dock. |
| **P6** | **Copywriting Studio & 4K Lightbox** | **MED-LOW** | `COPY.md` telemetry, Atomic Hook Injector, 4K proof reviewer, 1-click ZIP export. |
| **P7** | **Multi-Platform Tauri v2 Packaging** | **DISTRIBUTION** | Windows (.msi/.exe), Linux (.deb/.AppImage), Android companion APK, multi-cloud sync audit. |

For the complete living specification, see [ROADMAP.md](./ROADMAP.md).

---

## 🛠️ Quickstart & Development

### Prerequisites
* **Node.js**: `v20.0+` (LTS recommended)
* **npm**: `v10.0+`
* **Rust**: `1.75+` (for Tauri desktop builds)

### Setup & Run

```bash
# Clone the repository
git clone https://github.com/manaphassan/Kanso-Cre8.git
cd Kanso-Cre8

# Navigate to the modern frontend
cd src/app

# Install dependencies
npm install

# Run frontend in development mode
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To verify architecture and brand governance:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1
```

---

## ⚖️ License

Kanso Cre8 is licensed under the **PolyForm Noncommercial License 1.0.0**.

* **Permitted**: Personal use, freelance client work, educational study, independent research, and non-profit creative projects.
* **Prohibited**: Commercial resale of the software, closed-source SaaS distribution, or charging users for access.

See [LICENSE](./LICENSE) for full legal terms.

---

## 👨‍💻 Author & Maintainer

Created with care by **[harusssani.manaphassan](https://github.com/manaphassan)**.
