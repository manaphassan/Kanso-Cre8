# ANTIGRAVITY INSTRUCTION - FIX ALL FLAWS (Kanso Cre8 v0.7.0 -> v0.8.0)

Read in this order, then execute:
1. `AGENTS.md`
2. `docs/MASTER_PLAN.md` (the full task list, P0.1 to P6.3)
3. Skills: `kanso-scope-lock`, `kanso-vault-schema`, `kanso-ui-minimal`, `kanso-guardian`

## Mission

Make the repository healthy, secure, minimal and easy to maintain without changing what the product is: a local-first Markdown vault for solo freelance designers. Remove duplicates and clutter, one design system, one storage model, zero emoji, zero mojibake, icons only.

## Owner answers to decisions (edit before running)

Defaults below are the recommended answers. The owner must confirm by changing `PENDING` to `YES` or `NO`. Any item still `PENDING` means stop at the task that needs it.

| ID | Decision | Answer |
|---|---|---|
| D1 | Solo-first: remove login, roster, Admin view, Team view, staff directory | YES |
| D2 | Audit log | DROP |
| D3 | Remove Pro tier and license modal from navigation | PENDING (needs product/legal call) |
| D4 | Drop Gantt and Calendar project views | YES |
| D5 | Rewrite git history and rotate Android keystore | PENDING (never assume; also needs a backup first) |
| D6 | Drop the Tailwind claim, keep tokens plus small utility sheet | YES |
| D7 | Keep Node as a Tauri sidecar now, Rust later | YES |
| D8 | Tauri is the only Windows shell (delete `src/windows-launcher`) | YES |

## Run order

Phases run strictly in order. After each phase print a 10-line report (tasks done, gate output, open notes) and wait for the owner to reply `phase N approved`.

| Phase | Theme | Needs answers |
|---|---|---|
| 0 | Security and repo hygiene | D5 (only for history rewrite and keystore) |
| 1 | Remove dead and duplicate code | D1 for team merges |
| 2 | Data and config reorganization | D1, D2 |
| 3 | One design system, emoji and mojibake purge | D6 |
| 4 | Minimal UI and simpler UX | D1, D3, D4 |
| 5 | Backend and runtime health | D7, D8 |
| 6 | Governance, docs, version 0.8.0 | none |

Tasks that do not depend on a pending decision may proceed. Tasks that do depend on one are skipped and logged to `docs/PLAN_NOTES.md` with the reason.

## Flaw checklist (every item maps to a plan task; all must be closed)

Security and hygiene (P0)
- [ ] node_modules, dist, exe, keystore, license key, passwords, launcher log untracked
- [ ] `.gitignore` actually effective
- [ ] sample data contains only Acme Corp, Nexus Studio, Lumina Labs identities
- [ ] server binds 127.0.0.1, CORS restricted, random per-install secret, no hardcoded fallback
- [ ] Tauri CSP tightened, no unsafe-eval
- [ ] machine config and AI key moved out of `src/app/server/`, never returned to the client

Dead and duplicate code (P1)
- [ ] Orders and Migration services, routes, tests, client calls removed
- [ ] duplicate `GET /status` removed, team/users routes merged
- [ ] `ss_cam_*` keys migrated, `SS-CAM`, `SSNAS` and former brand names gone
- [ ] `zettel` renamed to `notes` with a one-release alias
- [ ] `03_COPYWRITING` removed, duplicate sample invoices and quotes removed
- [ ] `.agents/AGENTS.md` duplicate removed
- [ ] shared helpers extracted (modal, staff list, lightbox), unused dependencies pruned, mermaid lazy-loaded

Data and config (P2)
- [ ] `ConfigService` is the only config reader and writer
- [ ] three storage tiers implemented, `migrateVault()` idempotent and tested
- [ ] `_Team/_Config` reduced to `studio_profile.json`, `preferences.json`, `license.json`
- [ ] clients only in `_Clients/*/client.md`
- [ ] `docs/SCHEMA.md` and frontmatter validation in place
- [ ] comments and approvals stored per project, timer persisted with ms accuracy, atomic writes

Design system and cleanliness (P3)
- [ ] `fluent2-*.css` deleted, `Fluent*` components renamed, one token file
- [ ] hex colors in components: 0 (excluding listed data exceptions)
- [ ] emoji in source, server strings and docs: 0, icons via `Icon.svelte`
- [ ] `CHANGELOG.md` rewritten clean (about 250 lines), mojibake: 0

Minimal UI (P4)
- [ ] six navigation items, Review and Copy as project tabs, Clients and Money tabs, radio as dock drawer
- [ ] Deck trimmed to 4 bento tiles plus one-line suggestions
- [ ] Settings in 4 tabs, no component over 400 lines
- [ ] Kanban and Table only, Pro badges out of nav
- [ ] a11y pass: focus ring, contrast, aria-labels, zero Svelte warnings

Backend and runtime (P5)
- [ ] `api.js` split into route modules, `WorkspaceService` split, tests split per service
- [ ] sidecar backend started by Tauri on a free port, no hardcoded port in `api.ts`
- [ ] CI runs svelte-check and the guardian script, build scripts consolidated

Governance (P6)
- [ ] guardian script has the 6 new checks and is 0 warned / 0 failed
- [ ] docs reduced to README, AGENTS, CHANGELOG, SCHEMA, DESIGN, MASTER_PLAN
- [ ] version 0.8.0 from one source

## Hard rules (repeat of the scope lock)

- One task per commit. Announce task and files first. Run the gate after each task.
- No new features, dependencies or tokens outside the plan. Log extras to `docs/PLAN_NOTES.md`.
- No emoji, no hex colors, no mojibake, no secrets, no real identities.
- Stop and ask for: pending decisions, deletes inside a real user vault, history rewrite or key rotation, a gate failing twice.
- Never use `--no-verify`, never weaken a test, never edit generated output by hand.

## Start command

Start with PHASE 0, tasks P0.1, P0.2, P0.4, P0.5, P0.6, P0.7, P0.8. Hold P0.3 until D5 is answered YES and a backup exists. When Phase 0 is done, report and wait.
