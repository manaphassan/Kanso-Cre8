# Kanso Cre8 — Master Ecosystem Specification & Brand Identity Guide

> **Product**: Kanso Cre8  
> **Author**: harusssani.manaphassan  
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
* **User Target**: Solo art directors, freelance graphic/UI designers, 3D artists, and content creators managing multiple clients simultaneously (e.g. **Acme Corp**, **Nexus Studio**, **Lumina Labs**).

### 1.3 Visual Identity & Logomark
* **The "K8" Vault Monogram**:
  * An isometric wireframe cube enclosing an interlocking letter **"K"** and the numeral **"8"** (representing the infinity loop of creative iteration and the 8-folder modular vault structure).
  * Rendered in a clean 1.5px continuous hairline stroke.
* **Iconography Language**:
  * Monoline geometric line icons (20px/24px grid, 1.5px stroke width, rounded caps and joins).
  * High-density, minimal glyphs matching the Linear / Geist studio aesthetic.

### 1.4 Color Architecture: The 60 / 30 / 10 Spatial Rule
*(See [BRAND_GUIDELINES.md](file:///d:/HaNa_Innovation/kansoCre8/docs/BRAND_GUIDELINES.md) for master reference)*

Kanso Cre8 balances visual surfaces using the classic architectural **60 / 30 / 10 Rule**:
* **60% Dominant Canvas Foundation**: Base background, negative space, and atmospheric void (`#09090B` Dark Obsidian / `#F8FAFC` Daylight). Implements the Zen principle of *Ma* (間) to prevent eye strain during all-day creative sprints.
* **30% Structural Scaffolding & Content**: Elevated cards (`#18181B`), 1px hairline borders (`#27272A`), panels, and body typography (`#F4F4F5`, `#71717A`). Establishes readable hierarchy without competing with user assets.
* **10% Focal Kinetic Spark**: Interactive triggers, live chronometer accrued badge, active client swatches, and primary CTAs (`#38BDF8` / `#043388` to `#21A1F7`). Guides creator action with zero visual clutter.

| Token Name | Light Mode | Dark Mode | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **`--kanso-canvas`** | `#F8FAFC` (Porcelain Slate) | `#09090B` (Deep Obsidian) | 60% Dominant application canvas |
| **`--kanso-surface`** | `#FFFFFF` (Pure White) | `#18181B` (Zinc Dark) | 30% Elevated cards, sidebars, modals |
| **`--kanso-surface-hover`**| `#F1F5F9` (Slate Tint) | `#27272A` (Zinc Hover) | Interactive card/button hover |
| **`--kanso-border`** | `#E2E8F0` (1px Hairline) | `#27272A` (1px Hairline) | Spatial dividers & card perimeters |
| **`--kanso-text-primary`** | `#0F172A` (Slate 900) | `#F4F4F5` (Zinc 100) | Headings, primary labels, values |
| **`--kanso-text-muted`** | `#64748B` (Slate 500) | `#71717A` (Zinc 500) | Metadata, timestamps, placeholders |
| **`--kanso-accent`** | `#0078D4` (Fluent Azure) | `#38BDF8` (Electric Sky) | 10% Primary CTA buttons, active pills |
| **`--kanso-success`** | `#10B981` (Emerald) | `#10B981` (Emerald) | Completed tasks, paid invoices |
| **`--kanso-warning`** | `#F59E0B` (Amber) | `#F59E0B` (Amber) | Client review queue, pending quotes |
| **`--kanso-danger`** | `#EF4444` (Crimson) | `#EF4444` (Crimson) | Overdue milestones, destructive acts |

### 1.5 Typography: The Handoff Rule & Single-Line Layer Mixing Law

> **THE HANDOFF RULE**: At **24pt (24px)**, the Display Layer ends and the UI Layer begins.  
> • **$\ge 24\text{pt}$ ($\ge 24\text{px}$)**: Strictly **Red Hat Display** (Display Layer).  
> • **$< 24\text{pt}$ ($< 24\text{px}$)**: Strictly **Nunito** (UI Layer).  
> • **Boundary is Non-Negotiable**.  
> • **CRITICAL LAW**: Mixing layers within a single line of type is strictly forbidden (the most common and visible typography mistake).

| Level | Token / Class | Size / Leading | Weight | Tracking | Font Family & Usage Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DISPLAY/XL** | `.type-display-xl` | 96px / 104px | ExtraBold (800) | -2% (-0.02em) | **Red Hat Display**: Hero copy, splash openers |
| **DISPLAY/LG** | `.type-display-lg` | 72px / 80px | Bold (700) | -2% (-0.02em) | **Red Hat Display**: Section opener headlines |
| **H1** | `.type-h1` | 56px / 64px | Bold (700) | -1% (-0.01em) | **Red Hat Display**: Major view titles, hero headers |
| **H2** | `.type-h2` | 40px / 48px | Bold (700) | -1% (-0.01em) | **Red Hat Display**: Major sub-heads, executive bento titles |
| **H3** | `.type-h3` | 28px / 36px | SemiBold (600) | 0% (Normal) | **Red Hat Display**: Modal headers, card titles |
| **── 24PT ──** | **── HANDOFF ──** | **── 24PX ──** | **── HORIZON ──** | **── BOUNDARY ──** | **── THE 24PT HANDOFF HORIZON ──** |
| **BODY/LG** | `.type-body-lg` | 20px / 30px | SemiBold (600) | 0% (Normal) | **Nunito**: Lead paragraph copy, briefs |
| **BODY** | `.type-body` | 16px / 24px | SemiBold (600) | 0% (Normal) | **Nunito**: Default body text, form inputs (prevents iOS zoom) |
| **BODY/SM** | `.type-body-sm` | 14px / 20px | SemiBold (600) | 0% (Normal) | **Nunito**: Secondary metadata, table cells |
| **CAPTION** | `.type-caption` | 12px / 16px | Bold (700) | +1% (+0.01em) | **Nunito**: UI metadata, timestamps, breadcrumbs |
| **LABEL** | `.type-label` | 10px / 14px | ExtraBold (800) | +5% (+0.05em) | **Nunito**: Pills, tags, micro-labels (UPPERCASE) |

* **Monospace Typeface**: `JetBrains Mono` / `Geist Mono` (for invoice numbers, YAML frontmatter, raw code blocks).

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
├── 📁 _Clients/                          # 🏢 Client Dossiers (Profiles, Rates & Brand Assets)
│   ├── 📁 ACME_AcmeCorp/                 # (Acme Corporation · $125/hr)
│   │   ├── 📄 client.md                 # YAML frontmatter: contacts, billing, palette, rates
│   │   └── 📁 Assets/                   # SVG logos, fonts, brand guidelines PDF
│   ├── 📁 NEX_NexusStudio/               # (Nexus Studio · $110/hr)
│   │   ├── 📄 client.md
│   │   └── 📁 Assets/
│   └── 📁 LUM_LuminaLabs/                # (Lumina Labs · $140/hr)
│       ├── 📄 client.md
│       └── 📁 Assets/
│
├── 📁 _Finance/                          # 🧾 Cashflow Studio (Quotes & Invoices)
│   ├── 📁 Quotes/
│   │   └── 📄 QUOTE-2026-001_AcmeCorp_BrandSystem.md
│   └── 📁 Invoices/
│       ├── 📄 INV-2026-001_AcmeCorp_Deposit.md
│       └── 📄 INV-2026-002_NexusStudio_LaunchDesign.md
│
├── 📁 _Projects/                         # 📁 Standardized Project Vaults
│   └── 📁 2026/                          # Project Vaults (Year / Month / Project)
│       └── 📁 202609_September/
│           └── 📁 202609_0001_ACME_MobileAppIllustration/
│               ├── 📁 01_BRIEF/          # Client briefs, references, moodboards
│               ├── 📁 02_SOURCE/         # .psd, .ai, .afdesign, Blender, Figma links
│               ├── 📁 03_COPY/           # COPY.md (scripts, social hooks, specs)
│               ├── 📁 04_WIP/            # Draft exports, test renders, review clips
│               ├── 📁 05_DELIVERABLES/   # High-res exports ready for client handover
│               └── 📄 README.md          # Project Master File (Status, Tasks, Milestones, Budget)
│
├── 📁 _Journal/                          # 📔 Creator's BuJo (Bullet Journal System)
│   ├── 📁 Daily/                         # Daily rapid logs (e.g. 2026-09-09.md)
│   ├── 📁 Monthly/                       # Monthly reviews & billable reflections (2026-09.md)
│   └── 📁 Yearly/                        # Annual vision & milestone reviews (2026.md)
│
├── 📁 _Notes/                            # 🧠 Atelier Notes & Knowledge Engine
│   ├── 📁 01_Fleeting/                   # Raw quick captures (e.g. 20260909_call_notes.md)
│   ├── 📁 02_Literature/                 # Design teardowns, book notes, competitor swipe files
│   ├── 📁 03_Permanent/                  # Atomic creative assets & formulas
│   │   ├── 📄 hook_curiosity_gap.md
│   │   ├── 📄 rule_60_30_10_color.md
│   │   └── 📄 b2b_saas_hero_formula.md
│   └── 📄 Scratchpad.md                  # 📝 Temporary quick notes buffer
│
└── 📁 _Team/                             # 💼 Atelier Settings & Studio Identity
    └── 📁 _Config/                      # Vault-wide configuration
        └── 📄 studio_profile.json       # Master Brand Dossier (Name, Reg No, Bank/SWIFT, DuitNow, Sig)
```

---

## 📋 3. Data Schemas & YAML Frontmatter

### 3.1 Studio & Freelance Brand Dossier Schema (`_Team/_Config/studio_profile.json`)
```json
{
  "studio_name": "Harus Atelier & Co.",
  "studio_tagline": "Tactile Design & Brand Architecture",
  "freelancer_name": "Harus Sani",
  "registration_no": "202603091122-A",
  "email": "harus@atelier.example",
  "phone": "+60 12-345 6789",
  "website": "https://atelier.example",
  "address": "Studio 12, Creative Loft, 50450 Kuala Lumpur",
  "logo_url": "data:image/svg+xml;utf8,...",
  "signature_text": "Harus Sani",
  "signature_url": "",
  "bank_name": "Malayan Banking Berhad (Maybank)",
  "account_no": "5140 1234 5678",
  "account_holder": "Harus Atelier Enterprise",
  "swift_code": "MBBEMYKL",
  "duitnow_id": "harus@atelier.example",
  "default_currency": "MYR",
  "default_hourly_rate": 150.0,
  "tax_identifier": "W10-2026-9988",
  "default_tax_rate": 0.0,
  "default_payment_terms_days": 14,
  "custom_notes_template": "Payment due within 14 days of invoice date via direct wire transfer or DuitNow QR."
}
```

### 3.2 Client Profile Schema (`_Clients/ACME_AcmeCorp/client.md`)
```yaml
---
id: "client_acme"
name: "Acme Corporation"
code: "ACME"
contact_person: "Alex Rivera"
email: "alex@acme.example"
phone: "+1 555-019-2834"
billing_address: "Suite 400, 100 Innovation Way, San Francisco, CA 94105"
currency: "USD"
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

# Acme Corporation Brand Guidelines & Client Notes
- Prefers high-contrast dark enterprise UI with electric blue accents.
- All final deliverables must be 4K PNG (transparent alpha) and print collateral at 300 DPI CMYK.
```

### 3.3 Project Master Schema (`.../202609_0001_ACME_MobileApp/README.md`)
```yaml
---
id: "202609_0001_ACME"
title: "Fleet Management App 3D Illustration"
client: "Acme Corp"
client_code: "ACME"
status: "in-progress"    # backlog | in-progress | review | revision | done
priority: "high"         # low | normal | high | urgent
created_at: 2026-09-09
due_date: 2026-09-22
budget: 3500.00
currency: "USD"
quote_ref: "QUOTE-2026-001"
invoice_ref: "INV-2026-001"
figma_url: "https://figma.com/file/..."
revisions_count: 0
knowledge_links:
  - "[[b2b_saas_hero_formula]]"
  - "[[rule_60_30_10_color]]"
---

# Project Brief & Milestone Checklist
- [x] Initial alignment meeting with Alex
- [ ] #task 3D chassis blockout in Blender 📅 2026-09-14 ⏫ high
- [ ] #task Render 4K lighting passes to 04_WIP/ 📅 2026-09-18
- [ ] Client review & final sign-off
```

### 3.4 Quote & Invoice Schema (`_Finance/Invoices/INV-2026-001_AcmeCorp_Deposit.md`)
```yaml
---
type: "invoice"          # quote | invoice
document_number: "INV-2026-001"
date: 2026-09-09
due_date: 2026-09-23
status: "sent"           # draft | sent | paid | overdue
client_code: "ACME"
client_name: "Acme Corporation"
client_contact: "Alex Rivera"
client_email: "alex@acme.example"
client_address: "Suite 400, 100 Innovation Way, San Francisco, CA 94105"
freelancer_name: "Harus Atelier & Co."
freelancer_reg_no: "202603091122-A"
freelancer_email: "harus@atelier.example"
freelancer_phone: "+60 12-345 6789"
freelancer_address: "Studio 12, Creative Loft, 50450 Kuala Lumpur"
payment_bank: "Malayan Banking Berhad (Maybank)"
payment_account: "5140 1234 5678"
payment_account_name: "Harus Atelier Enterprise"
payment_swift: "MBBEMYKL"
signature_text: "Harus Sani"
signature_url: ""
currency: "USD"
items:
  - description: "50% Deposit: Mobile App 3D Isometric Illustrations (3 Sets)"
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
notes: "Payment due within 14 days of invoice date via direct wire transfer or DuitNow QR."
linked_project_id: "202609_0001_ACME"
---
```

### 3.5 Atomic Knowledge Schema (`_Notes/03_Permanent/hook_curiosity_gap.md`)
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
  - "[[AcmeCorp]]"
  - "[[NexusStudio]]"
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
| **4. Asset Rule Extraction** | Highlight winning copy or layout in `COPY.md` and click `[Extract to Atomic Note]`. | Automatically creates a permanent note in `_Notes/03_Permanent/` for future client work. |
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
│ • ClientsView        (Client Profiles, Rate Cards & Brand Swatches)              │
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
- Pre-populate sample client profiles (**Acme Corp**, **Nexus Studio**, **Lumina Labs**) with interactive brand color swatches (1-click clipboard copy).
- Build the standardized 5-folder project scaffolder with automatic client prefixing (`[YYYYMM]_[PREFIX]_[ProjectTitle]`).
- Implement the Studio & Freelance Brand Dossier (`_Team/_Config/studio_profile.json` & `studioService.svelte.ts`) storing studio logo, business registration ID, wire remittance details (SWIFT, DuitNow), and authorized digital signature.
- Enable automatic 1-click quote-to-invoice conversion and profile auto-population for commercial documents.

### Phase 3: Zettelkasten Knowledge Engine & Inline Task Rollup
- Build `zettelService.ts` supporting WikiLink syntax (`[[...]]`), backlink crawling, and fuzzy autocomplete.
- Implement the 3-tier note classification (`01_Fleeting`, `02_Literature`, `03_Permanent`).
- Implement the vault-wide `- [ ] #task` regex crawler and roll up tasks directly into the Kanban pipeline.

### Phase 4: Quote & Invoice Studio
- Build `InvoiceStudioView.svelte` with dual-pane layout: YAML line-item editor on the left, pixel-perfect printable invoice on the right.
- Implement auto-calculation (Quantity × Unit Price = Subtotal + Tax = Total).
- Add 1-click HTML print / PDF export triggered via `window.print()`.
- Incorporate official Studio Brand Dossier stamping, business registration badge, wire remittance deck (SWIFT / DuitNow), and authorized digital signature colophon.

### Phase 5: Retro Cassette Focus Radio & Studio Sanctuary
- Port mechanical cassette player from SS-CAM Android with dual 6-spoke rotating gear wheels (33 RPM).
- Stream curated Lo-Fi, Vaporwave, and Ambient stations (Chillhop, Nightwave, SomaFM, Parisian Jazz, Zen Alpha).
- Embed persistent 40px Mini-Cassette Dock and 25-minute Pomodoro focus timer.
- Implement synchronized favorite presets rack with active station indicator and automated migration of legacy station IDs (`nightwave-plaza` ➔ `nightwave`, `somafm-groovesalad` ➔ `somafm`).

### Phase 6: Copywriting Studio & Deliverables Review
- Build `CopyStudioView.svelte` writing directly to `03_COPY/COPY.md` with live word, character, and read-time telemetry.
- Integrate the Atomic Hook Injector side drawer into the copy editor.
- Build `DeliverablesView.svelte` with 4K image lightbox review and 1-click client ZIP export packaging.

### Phase 7: Tauri v2 Cross-Platform Packaging & Cloud Sync
- Configure `tauri.conf.json` for Windows (`.msi` / `.exe`) and Linux (`.deb` / `.AppImage`).
- Configure Android manifest & permissions for mobile companion execution.
- Test real-time sync with Dropbox, Google Drive, and OneDrive folders.

### Phase 8: Billable Chronometer & Executive Studio Deck
- Build `HeaderTimerWidget.svelte` with real-time elapsed ticker (`HH:MM:SS`), hourly rate selector, and live accrued cash ticker (`+$...`).
- Implement 1-click "Append Session to Draft Invoice" pipeline upon stopping the timer.
- Deliver executive Studio Deck with Today's Tasks, Design Metrics Bento, and live Total Cashflow calculation.

### Phase 9: Commercial Engine, One-Time Perpetual Licensing & Feature Gating
- Implement `licenseStore.svelte.ts` with local Ed25519 cryptographic signature verification in the Tauri Rust backend.
- Enforce the "Sanctuary vs. Commerce" feature separation (Kanso Zen Free vs. Kanso Studio Pro $39–$49 one-time).
- Integrate Lemon Squeezy / Gumroad merchant-of-record webhook for automated license key distribution with zero cloud database dependencies.

---

## 🏛️ 7. Commercial Architecture & Offline Licensing Engine

### 7.1 The "Sanctuary vs. Commerce" Split
Kanso Cre8 rejects monthly SaaS subscription models. The product is structured into two intentional tiers:
1. **Kanso Zen (Free Edition)**: The personal creative sanctuary. Personal Zettelkasten notes, Bullet Journaling, scratchpad, copywriting studio, and the mechanical Retro Cassette Focus Radio are completely free forever.
2. **Kanso Studio Pro ($39–$49 One-Time Perpetual License)**: The freelance business engine. The moment a creator engages in commercial commerce — billing clients, tracking hourly earnings, generating invoices, storing client brand swatches, or packaging deliverables — they invest in a business license that pays for itself in their first billable session.

### 7.2 Zero Phone-Home Cryptographic Verification
* **No Database or Cloud Server**: In accordance with Kanso's core storage law, licensing introduces zero SQL, SQLite, or cloud database requirements.
* **Offline Verification**: License keys are generated via an asymmetric **Ed25519** cryptographic signing algorithm.
  - The developer signs the license payload (`email`, `tier`, `issued_date`) with a private key.
  - The Tauri v2 Rust backend (`src-tauri`) holds only the corresponding public verification key.
  - When the user enters their license key in `Studio Settings -> License`, verification executes locally in under 1ms with **zero network requests**.
  - License state is stored locally in `localStorage` or `_kanso_vault/license.key`.

