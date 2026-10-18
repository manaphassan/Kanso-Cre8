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

## Track A - Creative Flow & Atelier Refinements (Post-0.8.0)
- 2026-10-18 | src/app/server/routes/finance.js, src/app/client/src/lib/components/finance/ | Phase A1: Unified quote -> project -> invoice pipeline with deposit splits, automated vault folder scaffolding, and draft invoice generation.
- 2026-10-18 | src/app/client/src/lib/components/features/HeaderTimerWidget.svelte, UnbilledSessionsModal.svelte | Phase A2: Tactile unbilled time nudge pill, unbilled sessions inspector, and 1-click batch append to draft invoice.
- 2026-10-18 | src/app/server/services/JournalVaultService.js, src/app/client/src/lib/components/journal/WeeklyReview.svelte | Phase A3: Weekly review ritual in _Journal/Weekly/ with rapid-log task aggregation, metrics telemetry bento, and top-3 priorities planning.
- 2026-10-18 | src/app/server/services/VaultHealthService.js, src/app/client/src/lib/components/settings/VaultHealthInspector.svelte | Phase A4: Vault health & link integrity inspector checking broken WikiLinks, orphan atomic notes, frontmatter validity, cloud sync conflicts, and compartment telemetry.
- 2026-10-18 | src/app/client/src/lib/components/features/ZenMicroBar.svelte, App.svelte | Phase A5: Quiet Mode / Zen Atelier Mode (Ctrl+Shift+Z / Cmd+Shift+Z) with floating micro-bar, live billable chronometer, lo-fi radio strip, scratchpad trigger, and full-bleed distraction-free canvas.

## Track B - Proof Round Timeline & Handover Manifests (Post-0.8.0)
- 2026-10-18 | src/app/server/services/SnapshotService.js, src/app/server/routes/projects.js | Phase B1: Enhanced snapshot engine capturing _review.md approvals, deliverable counts in meta.json, and getSnapshotDetails API for non-destructive time travel.
- 2026-10-18 | src/app/client/src/lib/components/project/ProjectTimelineTab.svelte, CaptureSnapshotModal.svelte, SnapshotDetailModal.svelte | Phase B2: Interactive Proof Round Timeline tab in Project Detail with vertical node track, trigger badges, snapshot inspection modal, and 1-click restore.
- 2026-10-18 | src/app/server/services/ExportService.js, src/app/client/src/lib/components/features/HandoverPackageModal.svelte, HandoverManifestModal.svelte | Phase B3: Automated client handover package builder with live DELIVERY.md preview, SHA-256 cryptographic checksums verification table, HTML colophon summary sheet, and Project Inspector integration.
- 2026-10-18 | src/app/server/services/ExportService.js, src/app/server/routes/system.js, src/app/client/src/lib/components/settings/VaultHealthInspector.svelte | Phase B4: Atelier "Leave With Your Data" vault exporter streaming the 6 canonical compartments into an unencumbered ZIP archive with top-level VAULT_MANIFEST.md guaranteeing zero vendor lock-in.

## Track C - Demo Data & Structure Repair (Post-0.8.0)
- 2026-10-18 | src/app/server/services/DemoDataService.js, src/app/server/routes/vault.js, src/app/client/src/lib/components/settings/VaultDemoData.svelte | Phase C1: Optional demo data loader and purger with typed confirmation, keeping fresh vaults clean by default.
- 2026-10-18 | src/app/server/services/VaultPathService.js, src/app/client/src/lib/components/settings/VaultRepairBanner.svelte | Phase C2: Automated vault structure repair and status monitoring.

## Track D - Vault Safety & Lifecycle (Post-0.8.0)
- 2026-10-18 | src/app/server/services/VaultPathService.js, src/app/client/src/lib/components/vault/VaultStartupGate.svelte, VaultStartupActions.svelte | Phase D1: Startup vault status probe and relocation gate preventing silent folder creation on disconnected or absent storage.
- 2026-10-18 | src/app/server/services/VaultPathService.js, src/app/client/src/lib/components/settings/VaultResetDangerZone.svelte, VaultResetModal.svelte | Phase D2: Safe archive-first vault structure reset moving canonical compartments to _Archive/reset-<timestamp>/ with folder-name typed confirmation and preservation of custom user files.

