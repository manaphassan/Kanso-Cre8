# Kanso Cre8 Plan Execution Notes

## Phase 0 - Security and Repo Hygiene
- 2026-10-17 | git / android keystore | Task P0.3 held pending Decision D5 and user confirmation of verified local repository backup.

## Phase 2 - Data and Config Reorganization
- 2026-10-17 | src/app/server/services/ConfigService.js | Vault migration normalizes legacy config files to studio_profile.json, preferences.json, and license.json with .migrated.bak backups stored outside the vault in the machine tier.
- 2026-10-17 | src/app/server/services/FrontmatterService.js | Write safety enforced via atomic temp-file write + rename, 300ms debounce buffer, and schema validation strictly preserving custom user keys.

## Phase 3 - One Design System
- 2026-10-18 | src/app/client/src/lib/styles/kanso-tokens.css | Canonical studio tokens defined for canvas, surface, border, text, accent, spacing, typography, radii, and transitions across 4 themes (dark, light, neumorphic, neumorphic-dark).
- 2026-10-18 | docs/TOKEN_MAP.md | All legacy Fluent 2 design tokens mapped to --kanso-* tokens. Retired fluent2-tokens.css and fluent2-components.css.
- 2026-10-18 | src/app/client/src/lib/components/ui/ | Renamed all Fluent UI primitives (FluentButton, FluentCard, etc.) to canonical UI components (Button, Card, Input, Select, Dialog, Badge, Pill, Toast, Icon) and exposed them via ui/index.ts.
- 2026-10-18 | src/app/client/src/lib/styles/tailwind-compat.css | Pruned unused utilities to keep only active utility classes in the project.
- 2026-10-18 | src/app/client/src/lib/components/ui/Icon.svelte | Extended Icon component with SVG glyphs and purged literal emojis across all client views, server responses, and documentation.
## Phase 4 - Minimalist UI and Simpler UX
- 2026-10-18 | src/app/client/src/App.svelte | P4.1: New 6-item sidebar shell (Studio Deck, Projects, Review, Journal, Atelier Notes, Clients & Money), 40px Mini-Cassette Dock, topbar breadcrumb + timer, responsive rail collapse under 960px.
- 2026-10-18 | src/app/client/src/lib/views/ClientsMoneyView.svelte, RadioDrawer.svelte | P4.2: Merged Review/Copy into Project Detail tabs, Clients + Quotes + Invoices into unified ClientsMoneyView hub, and Focus Radio into dock drawer.
- 2026-10-18 | src/app/client/src/lib/components/ | P4.3: Split all view god files (SettingsView, DashboardView, ProjectDetailView, JournalView, CassetteDeck) under 400 lines into focused sub-components.
- 2026-10-18 | src/app/client/src/lib/components/dashboard/ | P4.4: Streamlined Studio Deck to 5 canonical blocks (Today's Tasks, 4-tile Metrics Bento, Project Status at a Glance, 1-line Smart Suggestions strip, Total Income & Cashflow); moved revision rounds to Project Inspector.
- 2026-10-18 | src/app/client/src/lib/components/features/HeaderTimerWidget.svelte, StopSessionModal.svelte | P4.5: Header chronometer compact layout (collapsed rate + earnings pill, active client swatches with 1-click HEX copy, extracted StopSessionModal under 400 lines).
- 2026-10-18 | src/app/client/src/lib/views/ProjectsView.svelte, ProjectFilterBar.svelte | P4.6: Projects limited to Kanban and Table only, filters collapsed to popover, deleted Gantt/Calendar per Decision D4, default view persisted in preferences.json.
- 2026-10-18 | src/app/client/src/lib/stores/licenseStore.svelte.ts, App.svelte | P4.7: Removed Pro badges and gating clutter from navigation and views; license management restricted strictly to Settings > About.
- 2026-10-18 | src/app/client/src/ | P4.8: Copy pass completed (sentence case everywhere, buttons start with active verbs, zero exclamation marks in UI copy, 1-line empty states without illustrations).
- 2026-10-18 | src/app/client/src/lib/styles/kanso-tokens.css, components | P4.9: Accessibility pass completed (global focus-visible rings using --kanso-accent, form control associations, aria-labels on every icon button, 0 Svelte a11y compiler warnings).

## Phase 5 - Backend and Runtime Health
- 2026-10-18 | src/app/server/routes/ | P5.1: Split monolithic api.js into 10 modular sub-routes under 300 lines (auth, projects, deliverables, finance, journal, notes, clients, system, ai, share) mounted in routes/index.js.
- 2026-10-18 | src/app/server/services/ | P5.2: Split WorkspaceService into ProjectService, VaultPathService, and ScaffoldService with backward-compatible facade.
- 2026-10-18 | src/app/server/test/ | P5.3: Split run-tests.js into per-service modular test suites with new tests for ConfigService, migrateVault, atomic writes, and secure defaults (62 passing tests).
- 2026-10-18 | src/app/server/, src/app/src-tauri/, src/app/client/ | P5.4: Dynamic backend port discovery via PORT=0 and Tauri sidecar commands (get_backend_port, get_backend_url); eliminated hardcoded port 4000.
- 2026-10-18 | .github/workflows/, src/app/ | P5.5: Added svelte-check (0 errors) and verify-kanso to ci.yml; unified release workflows in release-builds.yml and removed duplicate tauri-build.yml.
- 2026-10-18 | scripts/ | P5.6: Consolidated platform build scripts into build-platforms.ps1 as single entry; moved one-off asset tools to scripts/tools/.
- 2026-10-18 | src/windows-launcher/, scripts/ | P5.7: Consolidated Windows shell exclusively on Tauri v2 (Decision D8) and removed legacy WPF/WebView2 launcher and companion DLLs.

## Phase 6 - Governance and Docs
- 2026-10-18 | .agents/skills/kanso-guardian/scripts/verify-kanso.ps1 | P6.1: Extended auditor with 6 automated checks (emoji hygiene, hex color allowlist, secret/binary hygiene, legacy brand/token sanitization, modular line limits, real-name denylist). All 16 checks passing (16 passed / 0 warned / 0 failed).
- 2026-10-18 | docs/DESIGN.md, README.md, AGENTS.md | P6.2: Authored unified Master Design Guide (DESIGN.md), streamlined README.md, updated AGENTS.md to 16-check standard, and purged redundant legacy documentation files.
- 2026-10-18 | package.json, tauri.conf.json, Cargo.toml, scripts/, CHANGELOG.md | P6.3: Version bump to 0.8.0 across application manifests, native configs, build scripts, splash screens, and changelog.
