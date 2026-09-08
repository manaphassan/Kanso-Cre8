---
name: kanso-guardian
description: >
  Official governance and architecture steward skill for Kanso Cre8.
  Enforces the Kanso Zen brand identity, Linear/Geist studio design tokens,
  pure Markdown-as-Database storage engine, Zettelkasten knowledge integration,
  multi-client management (Govicle, Jomparking, SuamiSihat), quote/invoice studio,
  Tauri v2 + Svelte 5 structure, and phased roadmap milestones.
  Trigger: "kanso", "brand guideline", "kanso cre8", "design tokens", "zettelkasten",
  "vault structure", "client hub", "invoice studio", "kanso roadmap", "kanso architecture",
  "kanso verify".
---

# Kanso Cre8 — Brand Guideline, Architecture & Governance Skill

This skill governs all development, UI design, filesystem storage, and feature evolution for **Kanso Cre8** (簡素).
Any agent, assistant, or contributor working on this repository **MUST** adhere to the standards outlined in this document.

---

## 🏛️ 1. Brand Identity & Creative Philosophy

### 1.1 The Meaning of Kanso (簡素)
* **Kanso (簡素)** is one of the 7 pillars of traditional Japanese Zen aesthetics (*Wabi-Sabi*).
* It signifies **simplicity, plainness, and the deliberate elimination of clutter**.
* **Core Principle**: Beauty and speed emerge not from adding decorative chrome, but from eliminating friction until only the essential creative work remains.
* **Tagline**: *The Mindful Creative Vault — Local-First Project, Client & Knowledge Engine for Freelance Designers.*
* **Motto**: *"Zero bloat. Total data ownership. Pure creative flow."*

### 1.2 Personality & Tone of Voice
* **Archetype**: The Master Craftsman / Digital Architect.
* **Voice**: Calm, intentional, tactile, razor-sharp, respectful of user focus.
* **Rules**:
  - Never introduce gamified distraction, unwanted banners, or corporate marketing jargon.
  - Keep interfaces quiet, tactile, and responsive under 16ms.
  - Celebrate craft: visual proofs, typography, and clean lines.

### 1.3 The "K8" Monogram & Iconography
* **The "K8" Monogram**: Isometric wireframe cube enclosing an interlocking letter **"K"** and the numeral **"8"** (representing the infinity loop of creative iteration and the 8-folder modular vault structure).
* **Stroke Standard**: Uniform 1.5px continuous stroke weight, rounded joins, zero drop shadows.
* **Iconography**: Monoline geometric SVG icons (20px/24px grid, 1.5px stroke).

---

## 🎨 2. Linear / Geist Minimalist Studio Design System

### 2.1 Color Palette & Dynamic CSS Tokens
Kanso Cre8 replaces Microsoft Fluent 2 with a bespoke studio palette inspired by Linear and Vercel Geist:

```text
DARK MODE (Default): Canvas [#09090B] · Surface [#18181B] · Hairline [#27272A] · Accent [#38BDF8]
LIGHT MODE:          Canvas [#F8FAFC] · Surface [#FFFFFF] · Hairline [#E2E8F0] · Accent [#0078D4]
```

| CSS Token | Dark Mode (Default) | Light Mode | Purpose |
| :--- | :--- | :--- | :--- |
| **`--kanso-canvas`** | `#09090B` (Deep Obsidian) | `#F8FAFC` (Porcelain Slate) | Root app canvas / viewport background |
| **`--kanso-surface`** | `#18181B` (Zinc Dark) | `#FFFFFF` (Pure White) | Elevated cards, sidebars, modal surfaces |
| **`--kanso-surface-hover`**| `#27272A` (Zinc Hover) | `#F1F5F9` (Slate Tint) | Interactive hover states |
| **`--kanso-border`** | `#27272A` (1px Hairline) | `#E2E8F0` (1px Hairline) | 1px borders, separators, subtle outlines |
| **`--kanso-text-primary`** | `#F4F4F5` (Zinc 100) | `#0F172A` (Slate 900) | Headings, labels, primary readable text |
| **`--kanso-text-muted`** | `#71717A` (Zinc 500) | `#64748B` (Slate 500) | Secondary metadata, dates, placeholders |
| **`--kanso-accent`** | `#38BDF8` (Electric Sky) | `#0078D4` (Fluent Azure) | Primary CTA buttons, active pills, links |
| **`--kanso-success`** | `#10B981` (Emerald) | `#10B981` (Emerald) | Paid invoices, completed tasks, approved proofs |
| **`--kanso-warning`** | `#F59E0B` (Amber) | `#F59E0B` (Amber) | Pending review, client quotes, revisions |
| **`--kanso-danger`** | `#EF4444` (Crimson) | `#EF4444` (Crimson) | Overdue milestones, destructive confirmations |

### 2.2 Strict UI/UX Rules
1. **Zero Arbitrary Colors**: Never use random hardcoded HEX codes in templates. All surfaces and text MUST use `var(--kanso-*)` tokens.
2. **Hairline Borders Over Heavy Shadows**: Elevate surfaces using `1px solid var(--kanso-border)` instead of blurry drop shadows.
3. **Typography**:
   - Primary: `Geist Sans`, `Inter`, `-apple-system`, `sans-serif`.
   - Monospace: `Geist Mono`, `JetBrains Mono` (for invoice IDs, currency, dates, frontmatter).
   - Page Title: `22px` font size, `font-weight: 700`, letter tracking `-0.02em`.
   - Section Header: `15px` font size, `font-weight: 600`.
   - Body Text: `13px` font size, line height `1.5`.

---

## 🗄️ 3. Storage Engine: Pure Markdown-as-Database

### 3.1 Fundamental Storage Law
* **NO DATABASE SERVER**: Absolutely NO SQL Server, SQLite binary files, Prisma ORM, MongoDB, or external cloud databases.
* **100% Data Sovereignty**: All data lives as plain directories and UTF-8 `.md` files on the user's disk.
* **Cloud Sync Agnostic**: Must work transparently when the vault is placed inside:
  - **Dropbox** (`~/Dropbox/KansoCre8-Vault`)
  - **Google Drive** (`G:\My Drive\KansoCre8-Vault`)
  - **Microsoft OneDrive** (`~/OneDrive/KansoCre8-Vault`)
  - **Synology Drive** (`~/SynologyDrive/KansoCre8-Vault`)
  - **Nextcloud / WebDAV** or fast local NVMe SSD.
* **Obsidian / VS Code Interoperability**: Every file created by Kanso Cre8 must open cleanly in Obsidian or VS Code without breaking syntax.

### 3.2 Canonical Vault Structure

```text
📁 KansoCre8-Vault/                        # Sync Root (Dropbox, GDrive, OneDrive, or Local)
│
├── 📁 _Clients/                          # 🏢 Multi-Client Profiles & Brand Assets
│   ├── 📁 GOV_Govicle/                   # (Govicle Sdn Bhd)
│   ├── 📁 JOM_Jomparking/                # (Jomparking Solutions)
│   └── 📁 SSH_SuamiSihat/                # (SuamiSihat Brand Vault)
│
├── 📁 _Finance/                          # 🧾 Markdown & YAML Quotes & Invoices
│   ├── 📁 Quotes/                        # QUOTE-2026-xxx.md
│   └── 📁 Invoices/                      # INV-2026-xxx.md (Printable HTML/PDF)
│
├── 📁 _Zettelkasten/                     # 🧠 Second Brain Knowledge Engine
│   ├── 📁 01_Fleeting/                   # Raw quick captures (Ctrl+Space during calls)
│   ├── 📁 02_Literature/                 # Design references, book notes, teardowns
│   └── 📁 03_Permanent/                  # Atomic rules, layout systems, copy hooks
│
├── 📁 2026/                              # 📁 Standardized 5-Folder Project Vaults
│   └── 📁 202609_September/
│       └── 📁 202609_0001_GOV_FleetAppIllustration/
│           ├── 📁 01_BRIEF/              # Client briefs, references, moodboards
│           ├── 📁 02_SOURCE/             # .psd, .ai, .afdesign, Blender, Figma links
│           ├── 📁 03_COPY/               # COPY.md (scripts, hooks, specs)
│           ├── 📁 04_WIP/                # Draft exports, test renders, review clips
│           ├── 📁 05_DELIVERABLES/       # High-res exports ready for client handover
│           └── 📄 README.md              # Project Master File (YAML Frontmatter)
│
└── 📁 _Notes/                            # 📝 Quick Scratchpad
    └── 📄 Scratchpad.md
```

---

## 🧠 4. Zettelkasten Knowledge Engine & Task Rollup

### 4.1 3-Tier Note Classification
1. **`01_Fleeting`**: Ephemeral, unedited quick thoughts captured during client meetings or sudden inspiration (`Ctrl+Space`).
2. **`02_Literature`**: Summaries of books, competitor teardowns, swipe file references, and external tutorials.
3. **`03_Permanent`**: Standalone, synthesized atomic ideas, reusable design formulas, and proven viral hooks.

### 4.2 Bi-directional Linking & Task Rollup
* **WikiLink Syntax**: Internal links use `[[note_title]]` or `[[ClientName]]`.
* **Universal Task Rollup**:
  - Regex pattern: `- \[( |x)\] #task (.+?)(?: 📅 (\d{4}-\d{2}-\d{2}))?(?: ⏫ (low|normal|high|urgent))?`
  - Any task written inside meeting notes or project briefs auto-populates the master Kanban board.
  - Toggling a task on the Kanban updates the physical Markdown file on disk in real time.

---

## 🏢 5. Multi-Client Hub & Invoice Studio

### 5.1 Mandatory Client Profiles
The app must always ship with or automatically recognize default profiles for:
1. **Govicle Sdn Bhd** (`GOV`)
2. **Jomparking Solutions** (`JOM`)
3. **SuamiSihat Creative Vault** (`SSH`)

### 5.2 Brand Swatches & Invoicing
* Client profiles store brand color palettes with 1-click clipboard copy (`HEX`, `RGB`, `CMYK`).
* Invoices are stored in `_Finance/Invoices/INV-YYYY-XXX.md` with YAML frontmatter specifying client code, line items, hourly rate, and bank details.
* The Invoice Studio provides a split pane: YAML text editor on the left, live printable invoice on the right (triggerable via `window.print()`).

---

## 🏗️ 6. Framework & Repository Structure

### 6.1 Unified Cross-Platform Framework
* **Target Stack**: **Tauri v2 + Svelte 5 + Tailwind CSS**
* **Frontend Location**: `src/app/`
* **Desktop & Mobile Packaging**: `src-tauri/`
* **Single Codebase**: Serves Windows (`.msi` / `.exe`), Linux (`.deb` / `.AppImage`), and Android (`.apk`).
* **Archive Storage**: All legacy .NET 4.8 / Avalonia code MUST remain quarantined in `archive/legacy-dotnet/`. Do not pollute `src/` with legacy C# files.

---

## 🗺️ 7. Phased Implementation Roadmap

* **Phase 1: Brand System & Design Tokens Foundation**
  - Linear/Geist dark/light tokens in CSS.
  - 3-Zone responsive shell (44px TitleBar, 210px Collapsible Sidebar, Fluid Canvas).
* **Phase 2: Core Markdown Vault Engine & Client Hub**
  - Local vault scanner and YAML parser.
  - Client Hub with Govicle, Jomparking, SuamiSihat.
  - Standardized 5-folder project scaffolder.
* **Phase 3: Zettelkasten Knowledge Engine & Inline Task Rollup**
  - WikiLink indexer & backlink crawler.
  - 3-Tier note categorization.
  - `- [ ] #task` crawler syncing directly to Kanban.
* **Phase 4: Quote & Invoice Studio**
  - Dual-pane Markdown YAML editor + printable HTML/PDF.
  - Auto-calculation of subtotals and taxes.
* **Phase 5: Copywriting Studio & Deliverables Review**
  - `03_COPY/COPY.md` live telemetry (words, chars, read-time).
  - Atomic Hook Injector drawer.
  - 4K Lightbox deliverable review & 1-click ZIP export.
* **Phase 6: Multi-Platform Tauri v2 Packaging**
  - Tauri v2 builds for Windows, Linux, and Android Companion.
  - Multi-cloud sync verification (Dropbox, GDrive, OneDrive).

---

## ⚖️ 8. License Governance

* **License**: **PolyForm Noncommercial License 1.0.0** (`LICENSE`).
* **Policy**: Strictly free for personal use, freelance client work, and non-commercial creators. Commercial resale, white-labeling, or closed-source SaaS distribution is strictly prohibited.
