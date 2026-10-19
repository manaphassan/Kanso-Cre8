# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-10-19

### Added
- Multi-check governance auditor (`verify-kanso.ps1`) with 16 automated architectural, security, brand, and modularity checks.
- Unified Master Design System documentation in `docs/DESIGN.md` consolidating design tokens, typography, icon map, and accessibility rules.
- Consolidated multi-platform packaging pipeline (`scripts/build-platforms.ps1`) producing release distributions for Windows Desktop (Tauri v2), Linux standalone, and Android companion APK.
- Unified quote -> project -> invoice pipeline with deposit splits, automated vault folder scaffolding, and draft invoice generation.
- Weekly review ritual in `_Journal/Weekly/` with rapid-log task aggregation, metrics telemetry bento, and top-3 priorities planning.
- Vault health & link integrity inspector checking broken WikiLinks, orphan notes, frontmatter validity, cloud sync conflicts, and compartment telemetry.
- Quiet Mode / Zen Atelier Mode (`Ctrl+Shift+Z` / `Cmd+Shift+Z`) with floating micro-bar and full-bleed distraction-free canvas.
- Proof Round Timeline tab in Project Detail with non-destructive snapshot restore.
- Client Handover Package builder with cryptographic SHA-256 verification and `DELIVERY.md` manifest.
- "Leave With Your Data" vault exporter streaming all 6 canonical compartments into an unencumbered ZIP archive.

### Changed
- Refactored page layout into a unified 1200px container with 24px gutters across all six views.
- Upgraded Project Kanban with horizontal scroll snap (`snap-x snap-mandatory`), smooth scrollbars, and edge cues.
- Embedded client and finance tabs directly into the page header row beside the title.
- Standardized canonical plain language across views and documentation (`Home`, `Projects`, `Journal`, `Notes`, `Clients`, `Settings`).
- Streamlined header actions into Search (`⌘K`), Quick Scratchpad (`⌘⇧K`), and an overflow actions menu.
- Unified currency symbols from Settings across header chronometer, client cards, and command palette.
- Purged 11 orphan views and modal components (~11,000 lines of dead code).
- Replaced all Unicode emojis across the UI with semantic monoline SVG icons adhering to `var(--kanso-*)` design tokens.

### Security & Governance
- Hardened vault storage engine with strict path traversal validation, symlink defense, and scoped payload limits.
- Automated pre-commit scanning for real client names, sensitive secrets, binary commits, and unauthorized design tokens.
- All 16 Kanso Guardian governance checks verified (`16 passed / 0 warned / 0 failed`).
- Automated test suite expanded to 71 passing test suites (`71 passed / 0 failed`).

## [0.7.0] - 2026-09-16

### Added
- Kanban fast-travel buttons and drag-and-drop card reordering in ProjectKanbanView.
- Card-level billable chronometer integration synced with timerStore.
- Client brand swatch indicators with one-click hex copying.
- High revision alert indicator for cards with three or more revision rounds.
- Multi-format asset converter with WebP, PNG, and JPEG export options in BatchResizerModal.
- Proofing watermark engine with confidential and studio seal presets.
- Deliverables digital asset manager multi-select toolbar with batch actions in DeliverablesView.

## [0.6.0] - 2026-09-16

### Added
- Creative discipline scope presets for UI/UX, Brand Identity, 3D Motion, Photography, and Copywriting.
- Scope template modal with estimated hours and dynamic rate calculation.
- Tactile official status stamps (PAID, APPROVED, DRAFT, SEAL) with frontmatter persistence.
- Client brand swatch bar in invoice studio with dynamic accent coloring.
- Standalone offline HTML invoice exporter with self-contained styles.
- Print optimization with standardized A4 layout and page-break rules.

## [0.5.0] - 2026-09-16

### Added
- Commercial licensing engine with offline cryptographic key verification.
- License management panel in Settings with activation and key inspection.
- Multi-currency fiscal engine supporting MYR, USD, EUR, GBP, SGD, AUD, CAD, JPY, and CHF.
- Fiscal tax presets and tax identification fields for compliant invoice generation.
- Three printable layout themes: Geist Minimalist, Swiss Modernist, and Classic Letterpress.

## [0.3.0] - 2026-09-16

### Added
- Force-directed knowledge graph visualizer for atomic notes in NotesView.
- Local constellation subgraph panel for inspecting one-hop note connections.
- Three-mode knowledge navigation between notes canvas, scratchpad, and graph.
- Creative craft habit tracker with rolling seven-day cadence matrix in JournalView.
- Cloud sync conflict detector and side-by-side resolution tool in Settings.

## [0.2.2] - 2026-09-15

### Added
- Neumorphic Clay and Neumorphic Obsidian soft UI surface themes.
- Physics-based elevation tokens for dual-shadow extrusion and debossed inputs.
- Theme switching chips in Settings and Command Palette.
- Portable Windows desktop packaging with self-contained runtime.

## [0.2.1] - 2026-09-14

### Added
- Clean zero-data vault mount initialization without mock data leakage.
- Dynamic physical vault scanning across projects, invoices, and notes.
- Minimalist empty states for dashboard project glance and daily rapid log.
- High-DPI application icon assets across standard resolutions.

### Changed
- Finance service and journal service updated to purge stale cache on vault switch.

## [0.2.0] - 2026-09-14

### Added
- Sanctuary and commerce edition tier split with offline license validation.
- Bi-directional backlink indexer and backlinks panel in NotesView.
- Dynamic design metrics bento calculating hours, velocity, effective rate, and turnaround.
- Contextual studio smart suggestions for unbilled sessions and approaching deadlines.
- Real-time income and cashflow aggregation across paid and pending invoices.

## [0.1.0] - 2026-09-11

### Added
- Studio and freelance brand master dossier for identity, contacts, and wire instructions.
- Auto-population of master identity and settlement coordinates across invoices and quotes.
- Synchronized favorite radio presets rack with canonical station mapping.

### Fixed
- Unique composite key generation for invoice line items to prevent duplicate key errors.
- Lossless YAML date handling to avoid unexpected date object coercion.

## [0.0.1-alpha] - 2026-09-09

### Added
- Initial alpha release of Kanso Cre8 offline-first creative operations workspace.
- Pure Markdown-as-Database storage engine with zero database server dependencies.
- Standardized vault layout with clients, finance, journal, projects, and notes.
- Linear and Geist minimalist design token architecture with hairline borders.
- Retro cassette focus radio with mechanical transport controls and Pomodoro timer.
- PolyForm Noncommercial 1.0.0 license configuration.
