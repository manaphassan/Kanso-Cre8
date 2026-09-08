# Contributing to Kanso Cre8 (簡素)

Thank you for your interest in contributing to **Kanso Cre8** — the mindful creative vault, client hub, and knowledge engine for freelance designers.

Our mission is to build a calm, lightning-fast, tactile creative workstation that eliminates bloat, preserves user focus, and guarantees 100% data sovereignty.

---

## 🏛️ Core Principles & Zen Ethos

Before writing any code or proposing changes, understand the guiding philosophy of Kanso Cre8:

1. **Simplicity Over Cleverness (簡素)**: Eliminate unnecessary chrome, modals, notifications, and animations. If a feature does not directly serve creative focus or client workflow, it does not belong.
2. **Pure Markdown-as-Database**:
   - **Zero SQL / SQLite**: We will NEVER introduce SQLite binaries, SQL servers, Prisma ORM, or cloud databases.
   - **100% Filesystem Sovereignty**: All data lives as plain directories and UTF-8 `.md` files with YAML frontmatter.
   - **Obsidian / VS Code Interoperability**: Every file created by Kanso Cre8 must open cleanly in external editors without broken syntax.
3. **Strict Client Privacy Law**:
   - **NEVER** use real client names in public git commits, mock datasets, tests, or documentation.
   - Always use canonical sample profiles: **Acme Corp** (`ACME`), **Nexus Studio** (`NEX`), and **Lumina Labs** (`LUM`).
4. **4-Layer Modular Architecture**:
   - Keep boundaries strict: Vault Storage ➔ Domain Services ➔ Pluggable Views ➔ Atomic UI Primitives.

---

## 🏗️ Technical Stack

Kanso Cre8 is built on a modern, ultra-lightweight desktop stack:

* **Desktop Core**: [Tauri v2](https://v2.tauri.app) (Rust runtime, native file system, global shortcuts)
* **Frontend Framework**: [Svelte 5](https://svelte.dev) (Runes: `$state`, `$derived`, `$props`, `$effect`)
* **Styling**: [Tailwind CSS](https://tailwindcss.com) + Linear / Geist Studio design tokens
* **Build System**: [Vite](https://vitejs.dev)
* **Audio Engine**: Native HTML5 Web Audio API (for Focus Radio & Cassette Deck)

---

## 📁 Repository Structure

```text
Kanso-Cre8/
├── src/
│   ├── app/                              # Primary modern frontend & desktop app
│   │   ├── client/                       # Svelte 5 + Tailwind client application
│   │   │   ├── src/
│   │   │   │   ├── lib/
│   │   │   │   │   ├── components/       # UI primitives, markdown viewers, feature modals
│   │   │   │   │   │   ├── features/     # Feature components (Kanban, Lightbox, Resizer)
│   │   │   │   │   │   ├── markdown/     # Markdown editor and previewer
│   │   │   │   │   │   ├── radio/        # Retro Cassette Deck & Spool components
│   │   │   │   │   │   └── ui/           # Atomic UI primitives (Button, Card, Dialog)
│   │   │   │   │   ├── services/         # Domain services (client, finance, zettel, radio)
│   │   │   │   │   ├── stores/           # Svelte 5 reactive stores (appState, projectStore)
│   │   │   │   │   ├── styles/           # Linear/Geist design tokens (kanso-tokens.css)
│   │   │   │   │   ├── types/            # Strict TypeScript domain interfaces
│   │   │   │   │   └── views/            # Pluggable route views (Clients, Invoices, Zettel)
│   │   │   │   └── App.svelte            # 3-Zone studio shell & route dispatcher
│   │   │   └── package.json              # Frontend dependencies
│   │   └── package.json                  # Workspace package scripts
│   └── src-tauri/                        # Tauri v2 native desktop runner
├── docs/                                 # Architectural specifications & brand guides
├── .agents/skills/                       # AI workspace skills & automated guardians
│   └── kanso-guardian/                   # Architecture & brand governance auditor
├── archive/                              # Quarantined legacy .NET 4.8 / Avalonia assets
├── README.md                             # Project overview
├── CONTRIBUTING.md                       # This guide
├── FOLDER-STRUCTURE.md                   # Creative vault hierarchy specification
├── ROADMAP.md                            # Living prioritized roadmap
└── LICENSE                               # PolyForm Noncommercial License 1.0.0
```

---

## 🛠️ Development Setup

### Prerequisites
1. **Node.js**: `v20.0+` (LTS recommended)
2. **npm**: `v10.0+`
3. **Rust & Cargo**: `1.75+` (only needed if building native Tauri desktop binaries)
4. **Git**: Any modern version

### Installation Steps

```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/Kanso-Cre8.git
cd Kanso-Cre8

# 2. Navigate to the app directory
cd src/app

# 3. Install dependencies
npm install

# 4. Launch development server
npm run dev:client
```

The Vite dev server will start at `http://localhost:5173`.

---

## 🎨 Design System & Token Guidelines

All user interfaces must conform to the **Linear / Geist Minimalist Studio System**:

### Color Tokens
**Never use raw arbitrary hex literals in components.** Always reference CSS custom properties:

```css
/* Dark Mode (Default) */
--kanso-canvas:        #09090B;   /* Root background */
--kanso-surface:       #18181B;   /* Cards, panels, sidebars */
--kanso-surface-hover: #27272A;   /* Hover states */
--kanso-border:        #27272A;   /* 1px subtle hairline borders */
--kanso-text-primary:  #F4F4F5;   /* High-contrast readable text */
--kanso-text-muted:    #71717A;   /* Secondary labels & timestamps */
--kanso-accent:        #38BDF8;   /* Electric Sky primary CTA */
--kanso-success:       #10B981;   /* Completed tasks & paid invoices */
--kanso-warning:       #F59E0B;   /* Review queue & pending quotes */
--kanso-danger:        #EF4444;   /* Overdue milestones & alerts */
```

### UI Rules
* **Borders over Shadows**: Elevate surfaces using `1px solid var(--kanso-border)`. Do not use heavy, blurry drop shadows.
* **Typography**:
  - Primary text: `Geist Sans`, `Inter`, `system-ui`.
  - Monospace: `Geist Mono`, `JetBrains Mono` (for invoice IDs, dates, YAML frontmatter).
  - Page titles: `22px`, font-weight 700, letter-spacing `-0.02em`.
* **Icons**: Clean monoline SVG geometry (1.5px continuous stroke weight, rounded joins).

---

## 🧪 Verification & Quality Control

Before committing changes, run the automated governance script to verify brand, license, and architectural compliance:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1
```

The auditor checks:
1. PolyForm Noncommercial 1.0.0 license integrity.
2. Zero legacy enterprise references in `README.md`.
3. Pure Markdown storage law (zero database packages in `package.json`).
4. Linear / Geist token definitions.
5. Client, finance, and Zettelkasten domain engine integrity.

---

## 🌿 Git & Pull Request Workflow

1. **Branch Naming**:
   - `feat/feature-name` (e.g. `feat/cassette-click-sound`)
   - `fix/bug-description` (e.g. `fix/invoice-tax-rounding`)
   - `docs/doc-update` (e.g. `docs/vault-spec-clarification`)
2. **Commit Messages**: Follow Conventional Commits:
   - `feat: add 25-minute Pomodoro chime to cassette deck`
   - `fix: resolve backlink regex parsing on nested wikilinks`
   - `docs: update client hub specification with Lumina Labs profile`
3. **Submitting a PR**:
   - Ensure `verify-kanso.ps1` passes with `0 warned / 0 failed`.
   - Verify that no real client names exist in your code or documentation.
   - Describe what changed and include screenshots for UI updates.

---

## ⚖️ Licensing & Attribution

Kanso Cre8 is licensed under the **PolyForm Noncommercial License 1.0.0**. By contributing, you agree that your contributions will be licensed under this license.

Author & Maintainer: **[harusssani.manaphassan](https://github.com/manaphassan)**
