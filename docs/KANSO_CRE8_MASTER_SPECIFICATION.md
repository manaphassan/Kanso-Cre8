# Kanso Cre8 — Master Ecosystem Specification & Brand Identity Guide

> **Product**: Kanso Cre8  
> **Japanese**: 簡素 (Kanso — Simplicity, Elimination of Clutter)  
> **Tagline**: The Mindful Creative Vault — Local-First Project, Client & Knowledge Engine for Freelance Designers  
> **License**: PolyForm Noncommercial License 1.0.0 (Free for Personal & Freelance Use)  
> **Architecture**: Tauri v2 + Svelte 5 + Tailwind CSS (Linear / Geist Minimalist Studio System) + Local Markdown Engine  
> **Target Platforms**: Windows 11/10 (x64), Linux (x64 / ARM64), Android Companion (APK)  

---

## 🏛️ 1. Brand Identity & Design System

### 1.1 Brand Philosophy & Etymology
* **Kanso (簡素)**: One of the 7 pillars of traditional Japanese Zen aesthetics (*Wabi-Sabi*). It denotes **simplicity, plainness, and the conscious elimination of clutter**. In design and engineering, Kanso means achieving elegance, calm, and speed not by adding features, but by eliminating friction until only the essential remains.
* **Cre8**: Dynamic shorthand for creative operations, visual execution, and velocity.
* **Brand Essence**: *A distraction-free sanctuary for the modern visual creator.* It rejects slow, bloated SaaS subscriptions and telemetry-heavy enterprise tools in favor of calm, offline-first digital craft.
* **Motto**: *"Zero bloat. Total data ownership. Pure creative flow."*

### 1.2 Brand Voice & Archetype
* **Archetype**: The Master Craftsman / Digital Architect (inspired by Dieter Rams, Linear, Raycast, and Obsidian).
* **Tone**: Calm, intentional, tactile, razor-sharp, respectful of focus.
* **User Target**: Solo art directors, freelance graphic/UI designers, 3D artists, and content creators managing multiple clients simultaneously (e.g. **Govicle**, **Jomparking**, **SuamiSihat**).

### 1.3 Visual Identity & Logomark
* **The "K8" Vault Monogram**:
  * An isometric wireframe cube enclosing an interlocking letter **"K"** and the numeral **"8"** (representing the infinity loop of creative iteration and the 8-folder modular vault structure).
  * Rendered in a clean 1.5px continuous hairline stroke.
* **Iconography Language**:
  * Monoline geometric line icons (20px/24px grid, 1.5px stroke width, rounded caps and joins).
  * High-density, minimal glyphs matching the Linear / Geist studio aesthetic.

### 1.4 Color Palette & Design Tokens (Linear / Geist Studio System)

```text
DARK MODE:  Canvas [#09090B] · Surface [#18181B] · Hairline [#27272A] · Accent [#38BDF8]
LIGHT MODE: Canvas [#F8FAFC] · Surface [#FFFFFF] · Hairline [#E2E8F0] · Accent [#0078D4]
```

| Token Name | Light Mode | Dark Mode | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **`--kanso-canvas`** | `#F8FAFC` (Porcelain Slate) | `#09090B` (Deep Obsidian) | Main application background canvas |
| **`--kanso-surface`** | `#FFFFFF` (Pure White) | `#18181B` (Zinc Dark) | Elevated cards, sidebars, modals |
| **`--kanso-surface-hover`**| `#F1F5F9` (Slate Tint) | `#27272A` (Zinc Hover) | Interactive card/button hover |
| **`--kanso-border`** | `#E2E8F0` (1px Hairline) | `#27272A` (1px Hairline) | Spatial dividers & card perimeters |
| **`--kanso-text-primary`** | `#0F172A` (Slate 900) | `#F4F4F5` (Zinc 100) | Headings, primary labels, values |
| **`--kanso-text-muted`** | `#64748B` (Slate 500) | `#71717A` (Zinc 500) | Metadata, timestamps, placeholders |
| **`--kanso-accent`** | `#0078D4` (Fluent Azure) | `#38BDF8` (Electric Sky) | Primary CTA buttons, active pills |
| **`--kanso-success`** | `#10B981` (Emerald) | `#10B981` (Emerald) | Completed tasks, paid invoices |
| **`--kanso-warning`** | `#F59E0B` (Amber) | `#F59E0B` (Amber) | Client review queue, pending quotes |
| **`--kanso-danger`** | `#EF4444` (Crimson) | `#EF4444` (Crimson) | Overdue milestones, destructive acts |

### 1.5 Typography Hierarchy
* **Primary Typeface**: `Geist Sans` / `Inter` / `Segoe UI Variable Text`.
* **Monospace Typeface**: `Geist Mono` / `JetBrains Mono` (for invoice numbers, monetary amounts, timestamps, and YAML frontmatter).
* **Typographic Scale**:
  * Page Title: `22px` · Weight: 700 · Tracking: `-0.02em`
  * Section Header: `15px` · Weight: 600
  * Body Text: `13px` · Weight: 400 · Line-Height: `1.5`
  * Meta / Monospace: `11px` · Weight: 500

---

## 🗄️ 2. Storage Engine: Pure Markdown-as-Database

### 2.1 Storage Philosophy
* **Zero External Database**: No SQL Server, no SQLite binary blobs, no cloud-locked database.
* **100% Data Sovereignty**: The entire vault is just standard folders and UTF-8 `.md` files on the user's disk.
* **Universal Cloud Save**: Works seamlessly out of the box with any file sync service:
  * **Dropbox** (`~/Dropbox/KansoCre8-Vault`)
  * **Google Drive** (`G:\My Drive\KansoCre8-Vault`)
  * **Microsoft OneDrive** (`~/OneDrive/KansoCre8-Vault`)
  * **Synology Drive** (`~/SynologyDrive/KansoCre8-Vault`)
  * **Nextcloud / WebDAV** or fast local NVMe SSD.
* **Interoperability**: You can open your vault anytime in Obsidian, VS Code, or Typora without losing structure or frontmatter.

### 2.2 Canonical Vault Structure

```text
📁 KansoCre8-Vault/                        # Sync Root (Dropbox, GDrive, OneDrive, or Local)
│
├── 📁 _Clients/                          # 🏢 Client Database (Profiles & Brand Assets)
│   ├── 📁 GOV_Govicle/
│   │   ├── 📄 client.md                 # YAML frontmatter: contacts, billing, palette, rates
│   │   └── 📁 Assets/                   # SVG logos, fonts, brand guidelines PDF
│   ├── 📁 JOM_Jomparking/
│   │   ├── 📄 client.md
│   │   └── 📁 Assets/
│   └── 📁 SSH_SuamiSihat/
│       ├── 📄 client.md
│       └── 📁 Assets/
│
├── 📁 _Finance/                          # 🧾 Financial Documents (Quotes & Invoices)
│   ├── 📁 Quotes/
│   │   └── 📄 QUOTE-2026-001_Govicle_FleetApp.md
│   └── 📁 Invoices/
│       ├── 📄 INV-2026-001_Govicle_Deposit.md
│       └── 📄 INV-2026-002_Jomparking_SocialLaunch.md
│
├── 📁 _Zettelkasten/                     # 🧠 Knowledge Engine & Second Brain
│   ├── 📁 01_Fleeting/                   # Raw quick captures (e.g. 20260909_call_notes.md)
│   ├── 📁 02_Literature/                 # Design teardowns, book notes, competitor swipe files
│   └── 📁 03_Permanent/                  # Atomic creative assets & formulas
│       ├── 📄 hook_curiosity_gap.md
│       ├── 📄 rule_60_30_10_color.md
│       └── 📄 b2b_saas_hero_formula.md
│
├── 📁 2026/                              # 📁 Project Vaults (Year / Month / Project)
│   └── 📁 202609_September/
│       └── 📁 202609_0001_GOV_FleetAppIllustration/
│           ├── 📁 01_BRIEF/              # Client briefs, references, moodboards
│           ├── 📁 02_SOURCE/             # .psd, .ai, .afdesign, Blender, Figma links
│           ├── 📁 03_COPY/               # COPY.md (scripts, social hooks, specs)
│           ├── 📁 04_WIP/                # Draft exports, test renders, review clips
│           ├── 📁 05_DELIVERABLES/       # High-res exports ready for client handover
│           └── 📄 README.md              # Project Master File (Status, Tasks, Milestones, Budget)
│
└── 📁 _Notes/                            # 📝 Scratchpad
    └── 📄 Scratchpad.md
```

---

## 📋 3. Data Schemas & YAML Frontmatter

### 3.1 Client Profile Schema (`_Clients/GOV_Govicle/client.md`)
```yaml
---
id: "client_govicle"
name: "Govicle Sdn Bhd"
code: "GOV"
contact_person: "Amirul Haziq"
email: "amirul@govicle.my"
phone: "+60 12-345 6789"
billing_address: "Level 15, Menara Govicle, Bangsar South, 59200 Kuala Lumpur"
currency: "MYR"
default_hourly_rate: 120.00
payment_terms_days: 14
palette:
  primary: "#0EA5E9"
  secondary: "#0284C7"
  dark: "#0F172A"
  accent: "#38BDF8"
tags: [b2b, enterprise, mobility]
active_projects: 2
total_invoiced: 4750.00
---

# Govicle Brand Guidelines & Client Notes
- Prefers high-contrast dark enterprise UI with electric blue accents.
- All final deliverables must be 4K PNG (transparent alpha) and print collateral at 300 DPI CMYK.
```

### 3.2 Project Master Schema (`.../202609_0001_GOV_FleetApp/README.md`)
```yaml
---
id: "202609_0001_GOV"
title: "Fleet Management App 3D Illustration"
client: "Govicle"
client_code: "GOV"
status: "in-progress"    # backlog | in-progress | review | revision | done
priority: "high"         # low | normal | high | urgent
created_at: 2026-09-09
due_date: 2026-09-22
budget: 3500.00
currency: "MYR"
quote_ref: "QUOTE-2026-001"
invoice_ref: "INV-2026-001"
figma_url: "https://figma.com/file/..."
revisions_count: 0
knowledge_links:
  - "[[b2b_saas_hero_formula]]"
  - "[[rule_60_30_10_color]]"
---

# Project Brief & Milestone Checklist
- [x] Initial alignment meeting with Amirul
- [ ] #task 3D chassis blockout in Blender 📅 2026-09-14 ⏫ high
- [ ] #task Render 4K lighting passes to 04_WIP/ 📅 2026-09-18
- [ ] Client review & final sign-off
```

### 3.3 Quote & Invoice Schema (`_Finance/Invoices/INV-2026-001_Govicle_Deposit.md`)
```yaml
---
type: "invoice"          # quote | invoice
document_number: "INV-2026-001"
date: 2026-09-09
due_date: 2026-09-23
status: "sent"           # draft | sent | paid | overdue
client_code: "GOV"
client_name: "Govicle Sdn Bhd"
client_contact: "Amirul Haziq"
client_email: "amirul@govicle.my"
client_address: "Level 15, Menara Govicle, Bangsar South, 59200 KL"
freelancer_name: "Harussani Design Studio"
freelancer_email: "harussani.design@gmail.com"
freelancer_phone: "+60 19-876 5432"
freelancer_address: "Kuala Lumpur, Malaysia"
payment_bank: "Maybank Islamic"
payment_account: "5140 1234 5678"
payment_account_name: "Harussani Creative"
currency: "MYR"
items:
  - description: "50% Deposit: Fleet Management 3D Isometric Illustrations (3 Sets)"
    quantity: 1
    unit_price: 1750.00
    amount: 1750.00
  - description: "Design System & Color Asset Packaging"
    quantity: 1
    unit_price: 500.00
    amount: 500.00
tax_rate_percent: 0
subtotal: 2250.00
tax_amount: 0.00
total: 2250.00
notes: "Payment due within 14 days of invoice date via direct bank transfer."
linked_project_id: "202609_0001_GOV"
---
```

### 3.4 Atomic Knowledge Schema (`_Zettelkasten/03_Permanent/hook_curiosity_gap.md`)
```yaml
---
id: "zettel_20260909_001"
title: "The Curiosity Gap Hook Formula"
type: "permanent"        # fleeting | literature | permanent
tags: [copywriting, viral-hooks, social-ads]
created: 2026-09-09
updated: 2026-09-09
related:
  - "[[b2b_saas_hero_formula]]"
clients_used:
  - "[[Govicle]]"
  - "[[Jomparking]]"
---

# The Curiosity Gap Hook Formula
State an unexpected, counter-intuitive result in line 1 without revealing the catalyst until line 3.
```

---

## 🔄 4. Zettelkasten + Project Management Integration Matrix

| Integration Touchpoint | Technical Mechanism | Workflow Impact |
| :--- | :--- | :--- |
| **1. Universal Task Rollup** | Regex crawler scans all `.md` files for `- [ ] #task [description] [📅 date]`. | Any to-do written during client calls or fleeting notes appears in the global Kanban board automatically. |
| **2. Project Knowledge Tray** | Frontmatter field `knowledge_links: ["[[...]]"]`. | Active projects display relevant atomic design rules side-by-side on screen while creating in Photoshop/Figma. |
| **3. Atomic Hook Injector** | In `03_COPY/COPY.md`, browse permanent notes drawer and click `[+ Insert Hook]`. | Tested copy structures and formulas are injected into ad scripts with one keystroke. |
| **4. Asset Rule Extraction** | Highlight winning copy or layout in `COPY.md` and click `[Extract to Atomic Note]`. | Automatically creates a permanent note in `_Zettelkasten/03_Permanent/` for future client work. |
| **5. Client Intelligence Graph** | Client profiles query all notes containing `[[ClientName]]`. | Instant summary of all past briefs, meeting minutes, color rules, and feedback per client. |

---

## 💻 5. Multi-Platform System Architecture (Tauri v2 + Svelte 5)

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Unified Svelte 5 + Tailwind Frontend (Single Codebase)         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • DashboardView      (Bento KPIs, Sprint Queue, Revenue Pipeline)                │
│ • ProjectsView       (Standardized 5-Folder Project Browser & Scaffolder)        │
│ • KanbanView         (4-Stage Task Pipeline + Note Task Rollup)                  │
│ • ClientsView        (Govicle, Jomparking, SuamiSihat Profiles & Swatches)       │
│ • InvoiceStudioView  (Dual-Pane Markdown YAML Editor + Printable HTML/PDF)       │
│ • CopyStudioView     (03_COPY/COPY.md Editor + Word Count + Atomic Hook Tray)    │
│ • ZettelView         (3-Tier Knowledge Second Brain + WikiLink Explorer)         │
│ • DeliverablesView   (4K Lightbox Review & 1-Click Handover ZIP Exporter)        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ (Tauri IPC APIs)
┌────────────────────────────────────────┴─────────────────────────────────────────┐
│                           Tauri v2 Native Rust Backend                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • Native File System I/O (@tauri-apps/plugin-fs)                                 │
│ • Native Folder Dialog Picker (@tauri-apps/plugin-dialog)                        │
│ • Shell / File Association (@tauri-apps/plugin-shell)                            │
│ • Cross-Platform Targets: Windows (.exe), Linux (.deb/.AppImage), Android (.apk)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 6. Phased Master Implementation Roadmap

### Phase 1: Brand System & Design Tokens Foundation
- Configure Tailwind CSS with the **Linear / Geist Minimalist Design Tokens** (Canvas `#09090B`, Surface `#18181B`, Hairline `#27272A`, Electric Sky `#38BDF8`).
- Implement the responsive 3-Zone application shell (44px TitleBar, 210px Collapsible Sidebar, Fluid Canvas).
- Verify light/dark theme switching with zero visual flash.

### Phase 2: Core Markdown Vault Engine & Client Hub
- Build `vaultService.ts` using `@tauri-apps/plugin-fs` to scan, read, and write local folders and YAML frontmatter.
- Pre-populate default client profiles (**Govicle**, **Jomparking**, **SuamiSihat**) with interactive brand color swatches (1-click clipboard copy).
- Build the standardized 5-folder project scaffolder with automatic client prefixing (`[YYYYMM]_[PREFIX]_[ProjectTitle]`).

### Phase 3: Zettelkasten Knowledge Engine & Inline Task Rollup
- Build `zettelService.ts` supporting WikiLink syntax (`[[...]]`), backlink crawling, and fuzzy autocomplete.
- Implement the 3-tier note classification (`01_Fleeting`, `02_Literature`, `03_Permanent`).
- Implement the vault-wide `- [ ] #task` regex crawler and roll up tasks directly into the Kanban pipeline.

### Phase 4: Quote & Invoice Studio
- Build `InvoiceStudioView.svelte` with dual-pane layout: YAML line-item editor on the left, pixel-perfect printable invoice on the right.
- Implement auto-calculation (Quantity × Unit Price = Subtotal + Tax = Total).
- Add 1-click HTML print / PDF export triggered via `window.print()`.

### Phase 5: Copywriting Studio & Deliverables Review
- Build `CopyStudioView.svelte` writing directly to `03_COPY/COPY.md` with live word, character, and read-time telemetry.
- Integrate the Atomic Hook Injector side drawer into the copy editor.
- Build `DeliverablesView.svelte` with 4K image lightbox review and 1-click client ZIP export packaging.

### Phase 6: Tauri v2 Cross-Platform Packaging
- Configure `tauri.conf.json` for Windows (`.msi` / `.exe`) and Linux (`.deb` / `.AppImage`).
- Configure Android manifest & permissions for mobile companion execution.
- Test real-time sync with Dropbox, Google Drive, and OneDrive folders.
