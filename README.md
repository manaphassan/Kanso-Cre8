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

Operating on a pure **Markdown-as-Database** foundation, all client profiles, project milestones, invoices, and atomic notes are stored directly on your disk as plain human-readable text and YAML frontmatter. Open them anytime in Obsidian, VS Code, or Typora without lock-in.

---

## ⚡ Cross-Platform Architecture (Tauri v2 + Svelte 5)

Kanso Cre8 is built on a single, ultra-lightweight codebase powered by **Tauri v2**, **Svelte 5**, and **Tailwind CSS**, consuming only ~35MB of RAM:

| Target Platform | Package / Runtime | Role in Workspace |
| :--- | :--- | :--- |
| 🪟 **Windows 11 / 10** | **Tauri v2 Native (.msi / .exe)** | **Primary Desktop Studio**: Edge WebView2 runtime, hardware-accelerated rendering, native system file dialogs, global hotkeys. |
| 🐧 **Linux Desktop** | **Tauri v2 Native (.deb / .AppImage)** | **Linux Creator Workstation**: WebKitGTK engine, GNOME/KDE theme compliance, native Wayland & X11 support. |
| 📱 **Android Mobile** | **Tauri v2 Mobile Companion (.apk)** | **Mobile Companion**: Review deliverable proofs on the go, 1-click client approvals, mobile task tracking. |
| 🌐 **Local Web Portal** | **Svelte 5 SPA (Optional)** | **Local Studio Hub**: Optional self-hosted web review portal for local network devices. |

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

## 🗄️ Standardized 5-Folder Creative Vault

Never search for missing fonts, lost PSDs, or scattered client briefs again:

```text
📁 KansoCre8-Vault/
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

## 🚀 Core Features for Freelance Designers

### 1. 🏢 Multi-Client Hub & Brand Palettes
* Pre-configured profiles for **Govicle**, **Jomparking**, and **SuamiSihat**, plus 1-click addition of new clients.
* Instant interactive brand color swatches (`HEX`, `RGB`, `CMYK`) with 1-click clipboard copy.
* Hourly rates, contact details, and client billing terms stored in clean YAML frontmatter.

### 2. 🧾 Dual-Pane Quote & Invoice Studio
* Write invoices in intuitive YAML line-items on the left; get a live, pixel-perfect printable invoice on the right.
* Automated calculation of subtotals, custom tax rates, and grand totals.
* 1-Click PDF export or print via system dialog.

### 3. 🧠 Atomic Notes & Zettelkasten Second Brain
* 3-tier knowledge categorization: **Fleeting Notes** (quick raw captures), **Literature Notes** (teardowns & references), and **Permanent Notes** (proven atomic design rules & hooks).
* Bi-directional `[[WikiLinks]]` with real-time backlink indexing.
* **Universal Task Rollup**: Any `- [ ] #task` written in meeting notes or fleeting files auto-populates the Kanban board.

### 4. ✍️ Copywriting Studio & Hook Tray
* Dedicated editor writing directly to `03_COPY/COPY.md`.
* Live telemetry: word count, character count, and estimated reading time.
* **Atomic Hook Injector**: Insert tested hooks from your permanent notes drawer with one keystroke, or extract winning copy back into atomic notes.

### 5. 🔍 4K Deliverables Lightbox & 1-Click ZIP Handover
* High-res media reviewer for proofs, PNGs, MP4s, and renders.
* Automated 1-click ZIP export packaging for clean client delivery.

### 6. 🎧 Focus Studio & Lo-Fi Radio
* Built-in low-latency lo-fi, chillhop, and ambient radio streams.
* Pomodoro focus timer and box breathing reset coach to stay in the zone.

---

## 🎨 Linear / Geist Design System

Kanso Cre8 is styled with a bespoke dark/light studio design system inspired by Linear and Vercel Geist:

```text
DARK MODE:  Canvas [#09090B] · Surface [#18181B] · Hairline [#27272A] · Accent [#38BDF8]
LIGHT MODE: Canvas [#F8FAFC] · Surface [#FFFFFF] · Hairline [#E2E8F0] · Accent [#0078D4]
```

* **Zero visual noise**: Pure matte canvas surfaces eliminate eye strain during long design sessions.
* **Spatial precision**: 1px subtle hairline borders define cards and inputs without heavy drop shadows.
* **Instant theme toggle**: Seamless switching between Dark Obsidian and Light Porcelain.

---

## ⚖️ License

Kanso Cre8 is licensed under the **PolyForm Noncommercial License 1.0.0**.

* **Permitted**: Personal use, freelance client work, educational study, independent research, and non-profit creative projects.
* **Prohibited**: Commercial resale of the software, closed-source SaaS distribution, or charging users for access.

See [LICENSE](./LICENSE) for the full legal terms.

---

## 👨‍💻 Author & Maintainer

Created with care by **[harusssani.manaphassan](https://github.com/manaphassan)**.

