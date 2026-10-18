# Kanso Cre8 (簡素)

> The Mindful Creative Vault — Local-first creative operations, client hub, and knowledge engine for freelance designers.  
> Zero bloat. Total data ownership. Pure creative flow.

[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-38bdf8?style=flat-square)](./LICENSE)
[![Engine](https://img.shields.io/badge/engine-Tauri%20v2%20%2B%20Svelte%205-f97316?style=flat-square)](https://v2.tauri.app)
[![Design System](https://img.shields.io/badge/design-Linear%20%2F%20Geist%20Tokens-09090b?style=flat-square)](./docs/DESIGN.md)
[![Storage](https://img.shields.io/badge/storage-Pure%20Markdown%20%2B%20YAML-10b981?style=flat-square)](./docs/SCHEMA.md)

---

## What is Kanso Cre8?

Kanso Cre8 is an offline-first, local-first creative operations workstation built specifically for freelance visual designers, art directors, and creative operators.

Inspired by the Zen aesthetic of **Kanso (簡素)** — the deliberate elimination of clutter and commitment to essential simplicity — Kanso Cre8 replaces noisy SaaS subscriptions with a lightning-fast, tactile desktop application that gives you 100% data ownership.

Operating on a pure **Markdown-as-Database** storage model, all client dossiers, project milestones, invoices, and notes live directly on your filesystem as standard UTF-8 Markdown and YAML frontmatter. Open them anytime in Obsidian, VS Code, or standard file managers with zero database locks.

---

## Core Capabilities

- **Home**: Overview dashboard with Today's Tasks, weekly metrics (velocity, effective rate, first-time-right %), projects in progress, and total cashflow aggregation.
- **Billable Chronometer**: Header live timer with design hourly rate selector, real-time accrued earnings ticker, active client swatch with 1-click HEX copy, and 1-click session logging to draft invoices.
- **Projects & Kanban**: 5-stage visual Kanban and table views with standardized 5-folder project vaults (`01_BRIEF` to `05_DELIVERABLES`).
- **Journal**: Daily rapid logging (`_Journal/Daily/`), monthly review (`_Journal/Monthly/`), and yearly annual vision (`_Journal/Yearly/`).
- **Notes**: 3-tier knowledge base (`01_Fleeting/`, `02_Literature/`, `03_Permanent/`) with bidirectional WikiLinks, backlink crawler, and instant Scratchpad buffer.
- **Clients & Invoices**: Integrated hub for client profiles (`_Clients/`), design rate cards, proposals, and printable invoices (`_Finance/`) stamped with master studio branding and wire remittance instructions.
- **Retro Cassette Focus Radio**: Faithful skeuomorphic mechanical cassette player with dual rotating spools (33 RPM), curated ambient streams, and a 25-minute Pomodoro focus timer.

---

## Canonical Vault Layout

```text
KansoCre8-Vault/
|-- _Clients/           # Multi-client dossiers & brand assets (ACME, NEX, LUM)
|-- _Finance/           # Quotes/ and Invoices/ with YAML frontmatter
|-- _Projects/          # [YYYY]/ standardized 5-folder project vaults
|-- _Journal/           # Daily/, Monthly/, Yearly/ bullet journal entries
|-- _Notes/             # 01_Fleeting/, 02_Literature/, 03_Permanent/, Scratchpad.md
`-- _Team/
    `-- _Config/        # studio_profile.json (Master Atelier Brand Dossier)
```

See [docs/SCHEMA.md](./docs/SCHEMA.md) for full frontmatter schemas and storage contracts.

---

## Development Setup

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- Rust 1.75+ (for native Tauri desktop compilation)

### Quick Start

```bash
# Navigate to the application root
cd src/app

# Install dependencies
npm install

# Run the frontend in development mode
npm run dev:client

# Run the full automated test suite (71 test suites)
npm test

# Run Svelte and TypeScript type checking
npm run check

# Build the production client bundle
npm run build:client
```

### Architecture & Governance Verification

Verify brand, privacy, token, and architectural adherence across the entire repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1
```

All 16 governance checks must pass with `0 warned / 0 failed`.

---

## Documentation

- [AGENTS.md](./AGENTS.md) — Core project rules and architectural law.
- [docs/DESIGN.md](./docs/DESIGN.md) — Design tokens, typography hierarchy, UI rules, and icon system.
- [docs/SCHEMA.md](./docs/SCHEMA.md) — Vault folder structure and frontmatter validation contracts.
- [docs/MASTER_PLAN.md](./docs/MASTER_PLAN.md) — Phased refactoring roadmap and milestone specifications.
- [docs/UX_REVIEW_2026-10.md](./docs/UX_REVIEW_2026-10.md) — UX review, decluttering, plain language refactor, and quality audit.
- [CHANGELOG.md](./CHANGELOG.md) — Clean release version history.

---

## License

Kanso Cre8 is licensed under the **PolyForm Noncommercial License 1.0.0**. See [LICENSE](./LICENSE) for legal terms.
