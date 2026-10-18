# KANSO CRE8 - MASTER PLAN (v0.7.0 -> v0.8.0 "Quiet Release")

Audience: Antigravity (executing agent). Owner: product/art direction.
Goal: healthier code, one data model, minimal UI, zero emoji, zero drift.
Rule zero: this plan removes and consolidates. It adds nothing except what a phase explicitly lists.

---

## 0. EXECUTION CONTRACT (read first, applies to every phase)

1. Work one phase at a time. One task = one commit. Never start phase N+1 before the phase N gate passes.
2. Before each task: state the task ID, the files you will touch, and the acceptance check. Touch nothing else.
3. After each task run the gate:
   - `powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1` (must be 0 warned / 0 failed)
   - `npm run build:client` and `npm test` from `src/app`
4. No new features, no new dependencies, no renames outside the task list. If something looks wrong but is not in the plan, write it to `docs/PLAN_NOTES.md` and continue.
5. STOP and ask the owner when: a task needs a decision marked `DECISION`, a delete touches user vault data, a history rewrite is required, or a test fails twice.
6. Never print, copy or commit secrets, bank details, real client or studio identity. Use Acme Corp / Nexus Studio / Lumina Labs only.
7. Ascii only in code, docs and commit messages. No emoji. If you meet mojibake, fix it, never copy it.
8. Svelte 5 runes only. Colors only via `var(--kanso-*)`. Icons only via the single Icon component.
9. Commit format: `type(scope): summary` + the Co-Authored-By line required by the session.

---

## 1. AUDIT FINDINGS (evidence from the repo)

### 1.1 Critical (security / privacy) - fix in Phase 0
| # | Finding | Evidence |
|---|---|---|
| C1 | `node_modules` is tracked in git | 1012 tracked files under `src/app/node_modules`; `.git` is 454 MB |
| C2 | Android signing keystore is committed | `src/android/kanso-companion.keystore` |
| C3 | Plaintext passwords committed | `sample-workspace/_Team/_Config/user_passwords.json` (5 accounts, plain text) |
| C4 | License key committed | `_Team/_Config/license.key` |
| C5 | Binary + build output tracked | `src/windows-launcher/KansoCre8.exe`, `src/app/client/dist/*`, `src/app/launcher.log` (all contradict `.gitignore`) |
| C6 | Real-looking owner identity in sample data | `studio_profile.json` (studio, person, email, phone, bank account), `staff_directory.json`, `audit-log.jsonl` - violates Client Privacy Law |
| C7 | Server is open on the network with a default secret | `HOST=0.0.0.0`, `cors()` wide open, `JWT_SECRET` falls back to a hardcoded string in `server/config.js` |
| C8 | Machine-local config sits in the repo tree | `server/workspace_config.json` holds an absolute `D:\` path; `server/ai-config.json` holds the AI API key (ignored but exists, stored as plain JSON) |
| C9 | Tauri CSP allows everything | `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:` |

### 1.2 Architecture and data
- Three config homes with no rule: `server/*.json` (machine), `sample-workspace/_Team/_Config/*` (vault), browser `localStorage` (122 call sites, 11 keys).
- Legacy key prefix `ss_cam_*` (token, theme, view, avatar, remember-me) still used next to `kanso_*`.
- Tauri `main.rs` only opens a window. The real backend is a Node/Express server on port 4000 (133 routes, `api.js` 2630 lines) that the desktop build assumes is already running. Verify and make this explicit (see 4.2).
- Multi-user team system (login, roster, users, staff directory 1 MB, plaintext passwords, webhooks, share tokens) in an app whose brief is a solo freelancer vault.
- Deprecated features still alive: Creative Orders (`OrderService.js`, 8 `/orders` routes) and Migration Wizard (`MigrationService.js`, `/migration/*`), both marked "permanently removed" in AGENTS.md.
- Duplicate route `GET /status` registered twice (`api.js` lines 41 and 1342). `/team`, `/team/roster`, `/users` overlap.
- Sample vault has duplicate project folders `03_COPY` and `03_COPYWRITING` in all 3 projects, and duplicate invoice files (`INV-2026-001_ACME.md` vs `INV-2026-001_AcmeCorp_Deposit.md`, two `QUOTE-2026-001_*`).
- Old naming still in code: "Zettel" 192 refs (route `zettel`, `ZettelView`, `zettelService`) although AGENTS.md says the root was replaced by `_Notes`.

### 1.3 Code health
- God files: SettingsView 3457 lines, CassetteDeck 3267, AdminView 3224, ProjectDetailView 2356, DashboardView 2137, DeliverablesView 1961, ZettelView 1793, TeamView 1742, JournalView 1630, InvoiceStudioView 1593. Target max 400 lines per component.
- Backend: `api.js` 2630 lines (all routes in one file), `WorkspaceService` 1403, `run-tests.js` 2861 (one file).
- Duplicated helpers copied across components: `closeModal` x8, `handleKeydown` x8, `loadStaffList` x3 (Kanban/Table/Detail), `openLightbox` x3.
- Hardcoded colors: 2448 hex literals in `.svelte/.ts` (worst: DashboardView 154, CommandPalette 116, JournalView 111, CassetteDeck 92). Violates the token law.
- Two design systems shipped: `fluent2-base.css` (460) + `fluent2-tokens.css` (642) next to `kanso-tokens.css` (594) + `tailwind-compat.css` (256). Components are named `Fluent*` (9 files) but the law is Linear/Geist. Tailwind is claimed in AGENTS.md but is not a dependency (only a hand-written compat sheet).
- Unused or heavy deps worth checking: `jsdom` (dev), `mermaid` (large, should be lazy), `multer@1`, `archiver`.
- Project view modes: Kanban, Table, Gantt, Calendar (+ list) = too many.

### 1.4 Emoji and mojibake
- Source (client + server): about 560 emoji/pictograph occurrences. Top: folder 33, calendar 21, lightning 13, target 13, palette 9, package 9, warning 9, bulb 8, trash 6.
- Docs: README 57, FOLDER-STRUCTURE 63, MASTER_SPECIFICATION 53, SKILL.md (guardian) 39, ROADMAP 19.
- Mojibake: 140 lines, all in `CHANGELOG.md` (broken em dashes, bullets, kanji, emoji). CHANGELOG is 1352 lines / 110 KB and still lists legacy product names and a former client brand set (SS Health, SSNAS, SS-CAM) which breaks the privacy law.
- Legacy brand leakage in code: `SS-CAM|ss_cam|SSNAS|SS Health` found in 123 lines across 20+ files (api.ts, appState, LoginView, AdminView, TeamView, ProjectsView, OrderService, ApprovalService, docs).

### 1.5 Documentation drift
- `AGENTS.md` and `.agents/AGENTS.md` are identical copies. Keep one.
- Five overlapping docs: README, ROADMAP, FOLDER-STRUCTURE, KANSO_CRE8_MASTER_SPECIFICATION, ARCHITECTURE_MODULARITY. No single source of truth.
- `codebase-cleanup` skill is 766 lines and generic; it invites scope creep.

---

## 2. TARGET DESIGN

### 2.1 Three storage tiers (one rule each)
| Tier | Where | Holds | Synced? |
|---|---|---|---|
| Vault (user content) | `<vault>/` plain `.md` + frontmatter, plus small JSON in `_Team/_Config/` | projects, clients, finance, journal, notes, studio profile, UI preferences | Yes (cloud-safe, no secrets) |
| Machine (this device only) | OS app-data: `%APPDATA%/KansoCre8/app.json` (Linux `~/.config/kansocre8/`) | active vault path, recent vaults, AI API key, local server port, generated server secret, window state | Never |
| Session (volatile) | one `kanso.session` key in localStorage | auth token if auth survives, last route, unsent drafts | Never |

Rules: no secret ever enters the vault or the repo. No config file lives under `src/app/server/`. The browser never stores durable user data.

### 2.2 Vault config consolidation (`_Team/_Config/`)
Replace 6 loose files with 3:
- `studio_profile.json` - keep (canonical, matches AGENTS.md). Normalize keys to the names AGENTS.md lists (`registration_no`, `signature_text`, `signature_url`, `logo_url`).
- `preferences.json` - theme (was `theme.txt`), default project view, density, radio favorites, pomodoro length, hourly rate, currency.
- `license.json` - license state (was `license.key`); remove from repo samples.
Delete from vault model: `user_passwords.json`, `staff_directory.json`, `companies.json` (clients already live in `_Clients/<CODE>_<Name>/client.md`, make that the only source), `team-notes.json`, `comments/*.jsonl` (move to `comments:` in project `README.md` frontmatter or a `_comments.md` in the project folder).
Audit log: keep `audit-log.jsonl` only if it stays human-readable and rotates monthly; otherwise drop (see DECISION D2).

### 2.3 Clients and projects
- One client = one folder `_Clients/<CODE>_<Name>/client.md` (color, contact, terms). The Studio Deck, header swatch strip and invoices read from here only.
- Project folder stays the 5-folder vault: `01_BRIEF`, `02_REFERENCE`, `03_COPY`, `04_WIP`, `05_DELIVERABLES`. Remove `03_COPYWRITING` everywhere (code, samples, docs).
- Finance filenames: `INV-YYYY-NNN_<CODE>.md`, `QUOTE-YYYY-NNN_<CODE>.md`. One file per document, no `_Deposit` or `_BrandSystem` suffixes (put the description in frontmatter `title:`).

### 2.4 Product scope (solo-first)
Keep: Studio Deck, Projects (with Review as a tab), Journal, Notes, Clients and Money, Focus Radio, Settings.
Remove: login screen and user roster, Admin view, Team view, staff directory, webhooks, Creative Orders, Migration Wizard, license nag modal (see DECISION D1, D3).

### 2.5 Navigation (9 items -> 6)
```
Deck        (dashboard)
Projects    (list + kanban + table; Review queue and Copy become tabs inside a project)
Journal
Notes       (renamed from Zettel; Scratchpad inside)
Clients & Money   (Clients, Quotes, Invoices as 3 tabs)
Settings    (Studio profile, Preferences, Vault, About - 4 tabs)
```
Radio is not a page: it is the 40px Mini-Cassette Dock in the footer of the floating navigation dropdown (hamburger in the header; the app has no sidebar) that expands into the full cassette as a drawer. Keyboard: Ctrl+1..6 map to the 6 items. Command palette (Ctrl+K) stays as the only "power" entry point.

### 2.6 Minimalism rules (the component budget)
- One primary action per screen. Everything else is a ghost button or lives in the command palette.
- Max 4 bento tiles above the fold on the Deck. Smart Suggestions collapse to one line unless there is an alert.
- Project view modes: Kanban and Table only. Delete Gantt and Calendar (DECISION D4).
- No decorative gradients, no emoji, no more than 2 font weights per screen, hairline borders only (flat) or the neumorphic token set (neumorphic modes). Remove all inline `style="color:#..."`.
- Empty states: one line of text + one icon + one button.
- Settings: no page longer than one scroll on a 1280x800 window.

### 2.7 Icon system
- Rename `ui/FluentIcons.svelte` -> `ui/Icon.svelte` (`<Icon name="folder" size={16} />`, `currentColor`, 1.5px stroke, 24px grid). Already has ~20 users; extend the name list, never add a second icon source.
- Emoji -> icon map (use exactly this):
  folder/open folder -> `folder`; calendar -> `calendar`; lightning -> `bolt`; target -> `target`; palette -> `palette`; package -> `package`; warning -> `alert`; bulb -> `lightbulb`; trash -> `trash`; memo/page/clipboard -> `file`; check/checkmark -> `check`; cross -> `close`; bell -> `bell`; speech -> `message`; magnifier -> `search`; chart -> `chart`; gear -> `settings`; building -> `building`; people -> `users`; lock/shield -> `lock`; money -> `wallet`; fire -> `flame`; star -> `star`; music -> `music`; arrows -> `arrow-*`; green/red dot -> `<span class="dot dot-success|dot-danger">`.
- Allowed text glyphs: BuJo symbols required by the spec (bullet, `[ ]`, `[x]`, `[>]`, `o`, `-`, `*`) only inside the Journal rapid log. Keyboard hints may use `Ctrl`, `Shift`, `Enter` as text, not arrow glyphs.
- Docs: replace emoji with plain headings; no icons in markdown.

---

## 3. PHASES

### PHASE 0 - Stop the bleeding (security and repo hygiene)
Gate: `git ls-files | grep -E 'node_modules|\.exe$|keystore|license\.key|user_passwords|launcher\.log|/dist/'` returns nothing; app still builds.

- P0.1 `git rm -r --cached` for: `src/app/node_modules`, `src/app/client/dist`, `src/windows-launcher/KansoCre8.exe`, `src/app/launcher.log`, `src/android/kanso-companion.keystore`, `_Team/_Config/license.key`, `_Team/_Config/user_passwords.json`. Do not delete working copies except the keystore (ask first).
- P0.2 Fix `.gitignore` so it actually matches (add `src/app/launcher.log`, `*.keystore`, `*.jks`, `license.key`, `user_passwords.json`, `app.json`, `.env*`). Add `.gitattributes` binary rules only for real assets.
- P0.3 DECISION D5: rotate the Android keystore (treat the committed one as burned) and purge history of the items in P0.1 with `git filter-repo`. History is 454 MB. Do NOT rewrite history without the owner's explicit go.
- P0.4 Replace identity in `studio_profile.json`, `staff_directory.json`, `audit-log.jsonl`, docs, tests: studio "Acme Corp" style placeholders, `example.com` emails, `+1-555-0100` phone, fake bank values clearly marked `0000-0000-0000`. Add a deny-list check to the auditor (see P6.1).
- P0.5 `server/config.js`: bind `127.0.0.1` by default, `HOST` only via env; generate a random secret on first run and store it in the Machine tier; refuse to start in production if the secret is missing; restrict CORS to `http://localhost:5173`, `http://localhost:4000`, `tauri://localhost`, `http://tauri.localhost`.
- P0.6 Tighten Tauri CSP: `default-src 'self'; connect-src 'self' http://localhost:4000 ipc: http://ipc.localhost; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; media-src 'self' blob: https:` (radio streams need `https:` in `media-src` only). Remove `unsafe-eval` (test mermaid and fix if it breaks).
- P0.7 Move `workspace_config.json` and `ai-config.json` out of `server/` into the Machine tier path (see 2.1). Add a one-time migration that reads the old file if present, writes the new one, deletes the old.
- P0.8 Encrypt nothing fancy: AI key stored in Machine tier file with user-only permissions. Never return the key to the client (return `configured: true`).

### PHASE 1 - Remove dead and duplicate code
Gate: build and tests pass; `grep -ri "ss_cam\|SS-CAM\|SSNAS\|OrderService\|MigrationService"` over `src` returns nothing.

- P1.1 Delete `OrderService.js`, `MigrationService.js`, their routes (`/orders*`, `/migration/*`), tests, and client calls.
- P1.2 Delete the duplicate `GET /status` (keep one, line 41), and merge `/team`, `/team/roster`, `/users` once D1 is decided.
- P1.3 localStorage migration shim (run once, then delete the shim in v0.9): read `ss_cam_*`, write to `kanso.session` / `preferences.json`, remove the old keys. Final key set: `kanso.session` only.
- P1.4 Rename legacy words: `zettel` -> `notes` (route, `ZettelView` -> `NotesView`, `zettelService` -> `notesService`, `types/zettel.ts` -> `types/notes.ts`, `NotesVaultService` already correct). Keep an alias route `#zettel -> #notes` for one release.
- P1.5 Remove `03_COPYWRITING` from `CopywritingService`, scaffolding, samples; keep `03_COPY`.
- P1.6 Delete duplicate sample finance files; keep one quote and one invoice per sample client, canonical names.
- P1.7 Delete `.agents/AGENTS.md` (identical copy). Keep root `AGENTS.md`.
- P1.8 Extract shared helpers (create `client/src/lib/utils/`): `useModal` (close on Escape and backdrop), `useStaffList` (will vanish if D1 = solo), `useLightbox`. Replace the 8/8/3/3 copies. Do not change behavior.
- P1.9 Dependency prune: remove packages not imported (`npx depcheck` first, show the list, then remove); lazy-load `mermaid` via dynamic import; bump `multer` to 2.x.

### PHASE 2 - Data and config reorganization
Gate: open the sample vault in VS Code/Obsidian, everything readable; fresh vault boots; old vault migrates automatically.

- P2.1 Create `server/services/ConfigService.js`: the only module that reads/writes config. API: `machine.get/set`, `vault.get/set('studio'|'preferences'|'license')`. All other services call it. Remove direct `fs` reads of config elsewhere.
- P2.2 Implement the file set in 2.2. Write a `migrateVault()` that is idempotent, logs what it moved, and never deletes user `.md` files (it may delete only the retired JSON files after copying).
- P2.3 Clients: make `_Clients/*/client.md` the only client source. Remove `CompanyService` JSON, update `/companies` -> `/clients`, update Deck swatches, header chronometer, invoices.
- P2.4 Frontmatter contract: one schema file `docs/SCHEMA.md` listing every frontmatter key per document type (project, client, quote, invoice, journal day, note). Add a validator `FrontmatterService.validate(type, data)` used on write. Unknown keys are preserved, never dropped.
- P2.5 Comments and approvals: store inside the project folder as `_review.md` (readable, syncs with the project). Drop the global `_Team/comments/`.
- P2.6 Timer state: persist in the vault as `_Team/_Config/timer.json` is NOT allowed (machine-local, changes every second). Persist in Machine tier with ms timestamp `startedAt`; compute elapsed from it so restarts stay accurate. On stop, append session to the draft invoice file.
- P2.7 Sync-safety: write via temp file + rename (atomic), debounce writes 300 ms, detect `*conflicted copy*` files (feature exists as `/system/sync-conflicts`; keep, simplify to one banner in Settings > Vault).

### PHASE 3 - One design system
Gate: no `fluent2-*.css`, no `Fluent*` names, 0 hex in components, build passes, screenshot diff reviewed by the owner for dark, light, neumorphic, neumorphic-dark.

- P3.1 Audit tokens: ensure `kanso-tokens.css` defines every token listed in AGENTS.md plus spacing, radius, type scale, motion (`--kanso-space-1..8`, `--kanso-radius-sm|md|lg`, `--kanso-font-*`, `--kanso-ease`). Add the 4 theme blocks. This is the only token file.
- P3.2 Map every token the app uses from `fluent2-tokens.css` to a `--kanso-*` equivalent (write the map to `docs/TOKEN_MAP.md`), replace usages, delete both fluent2 files.
- P3.3 Hex purge, in this order: DashboardView, CommandPalette, JournalView, CassetteDeck, DeliverableAnnotationCanvas, AdminView (deleted by D1), CopyStudio, Kanban, Settings, HeaderTimer, Deliverables, InvoiceStudio, then the rest. Allowed exceptions: client brand colors read from client data, canvas drawing colors read from CSS variables at runtime, cassette artwork. Everything else becomes a token.
- P3.4 Rename `ui/Fluent*.svelte` -> `ui/Button|Card|Input|Select|Dialog|Badge|Pill|Toast|Icon.svelte`. Update imports. Keep API identical.
- P3.5 Decide Tailwind: DECISION D6. Default = drop the claim; keep `tailwind-compat.css` shrunk to the utilities actually used (`npx` unused-class scan), and fix AGENTS.md to say "token CSS + small utility sheet".
- P3.6 Emoji purge (client, server messages, docs): use the map in 2.7. Order: SettingsView, JournalView, CassetteDeck, DashboardRadar, MarkdownEditor, Kanban, StudioProModal, InvoiceStudio, ProjectDetail, then server strings (GeminiService, FrontmatterService, ApprovalService, ExportService, CopywritingService, JournalVaultService, tests), then docs.
- P3.7 Fix `CHANGELOG.md` mojibake by rewriting the file: keep one short entry per released version (v0.7.0 down to first alpha) in clean ASCII, drop legacy product history and former client names. Target under 250 lines. Keep a keep-a-changelog header.

### PHASE 4 - Minimalist UI and simpler UX
Gate: app has 6 nav items; every page passes the 2.6 rules; owner signs off screenshots.

- P4.1 New shell (revised: no sidebar): header hamburger opens a floating dropdown with the 6 items + dock; top bar = hamburger, breadcrumb, Ctrl+K hint, billable chronometer. The same dropdown serves desktop and Android; no rail or bottom dock.
- P4.2 Merge pages: Review Queue and Copy Studio become tabs in Project Detail. Clients + Quotes + Invoices become tabs under "Clients & Money". Radio page becomes the dock drawer.
- P4.3 Split god files by feature, no logic change (move, don't rewrite). Targets: SettingsView -> `settings/{Studio,Preferences,Vault,About}.svelte`; DashboardView -> one file per bento tile; ProjectDetailView -> tab components; JournalView -> `journal/{DailyLog,Habits,Monthly,Yearly}.svelte`; CassetteDeck -> `radio/{Deck,Presets,Timer}.svelte` (keep the faithful mechanical look: screws, spools at 33 RPM, tape window). Hard cap 400 lines per file.
- P4.4 Studio Deck: keep the five required blocks (Today, Metrics bento, Project glance, Smart suggestions, Income and cashflow) at this priority; collapse Smart Suggestions to a one-line strip, bento to 4 tiles (hours, effective rate, first-time-right, velocity), revision rounds moves into project detail.
- P4.5 Header chronometer: keep Play/Stop, HH:MM:SS, rate input, `+$` earnings, swatch strip with 1-click HEX copy, Append Session on stop. Collapse rate + earnings into one compact control; swatches show only the active client.
- P4.6 Projects: Kanban and Table only; filters collapse into one "Filter" popover; delete Gantt and Calendar components after D4. Default view remembered in `preferences.json`.
- P4.7 Remove Pro badges and gating clutter from nav (D3). If a paid tier stays, show it only in Settings > About.
- P4.8 Copy pass using the `design:ux-copy` rules: sentence case, verbs on buttons, no exclamation marks, empty states as one line.
- P4.9 Accessibility: visible focus ring from `--kanso-accent`, 4.5:1 contrast in all 4 themes, every icon-only button has `aria-label`, Svelte a11y warnings = 0.

### PHASE 5 - Backend and runtime health
Gate: `npm test` green across split test files; desktop build starts its own backend.

- P5.1 Split `routes/api.js` into `routes/{auth,projects,deliverables,finance,journal,notes,clients,system,ai,share}.js` mounted in `routes/index.js`. Move only; keep paths identical. Max 300 lines per route file.
- P5.2 Split `WorkspaceService` (1403) into `ProjectService`, `VaultPathService`, `ScaffoldService`. Same rule: move, don't rewrite.
- P5.3 Split `server/test/run-tests.js` into one file per service under `server/test/`, keep the runner. Add tests for `ConfigService`, `migrateVault`, atomic write, and the secret/host defaults.
- P5.4 DECISION D7 runtime model. Recommended: keep the Node server, but ship it as a Tauri sidecar (`externalBin`, started in `main.rs` on a random free port, port passed to the client by a Tauri command, killed on exit). Remove the hardcoded `http://localhost:4000` in `api.ts`. Long term (v0.9+): move file operations into Rust commands and drop Express.
- P5.5 CI: add `svelte-check` and the verify script to `ci.yml`; fail on warnings. Keep the three workflows but remove duplicated steps between `tauri-build.yml` and `release-builds.yml`.
- P5.6 Scripts: `scripts/` has 7 PowerShell files with overlapping build logic. Keep `build-platforms.ps1` as the single entry; make the others thin or delete (`generate-icons.ps1` vs `GenerateKansoIcons.cs`, `process-calligraphy.ps1` are one-time asset tools: move to `scripts/tools/`).
- P5.7 Windows launcher (`Program.cs`, WPF + WebView2) vs Tauri: two Windows shells. DECISION D8: pick Tauri as the only shell and delete `src/windows-launcher` (recommended), or declare the launcher the portable build and document why.

### PHASE 6 - Governance and docs
Gate: verify script green with the new checks; docs reduced.

- P6.1 Extend `verify-kanso.ps1` (keep the 10 existing checks, add 6): no emoji in `src`/`docs`; no `#hex` in `.svelte` outside the allow-list file; no tracked secret patterns/binaries; no `ss_cam|SS-CAM|SSNAS|zettel` (except alias list); no file over 400 lines in `client/src` and 300 in `server/routes`; real-name deny-list (`docs/.deny-list.txt`, kept private, only hashes or generic patterns committed).
- P6.2 Docs: keep `README.md` (short), `AGENTS.md`, `CHANGELOG.md`, `docs/SCHEMA.md`, `docs/DESIGN.md` (tokens + icon map + UI rules, merged from BRAND_GUIDELINES and ARCHITECTURE_MODULARITY), `docs/MASTER_PLAN.md` (this, archived after v0.8.0). Fold ROADMAP and FOLDER-STRUCTURE and MASTER_SPECIFICATION into those; delete the rest. Correct AGENTS.md: Tailwind claim (D6), Zettelkasten wording, platform list.
- P6.3 Version bump to 0.8.0 in `package.json`, `tauri.conf.json`, `server/config.js`, `Program.cs` (if kept), splash and Settings > About, from one source (`package.json`, read by the rest at build time).

---

## 4. DECISIONS NEEDED FROM THE OWNER (Antigravity must stop on these)

| ID | Question | Recommendation |
|---|---|---|
| D1 | Solo-first? Remove login, roster, Admin and Team views and staff directory | Yes. Keep an optional app lock (PIN) only |
| D2 | Keep audit log? | Keep as monthly `_Team/audit/YYYY-MM.md` or drop; recommend drop |
| D3 | Pro tier and license modal | Remove from navigation; license is also in tension with PolyForm Noncommercial. Needs a legal/product call |
| D4 | Drop Gantt and Calendar project views | Yes |
| D5 | Rewrite git history and rotate keystore | Yes, after a backup of the repo |
| D6 | Tailwind: adopt or drop the claim | Drop the claim, keep tokens |
| D7 | Runtime: Node sidecar now, Rust later | Yes |
| D8 | Windows shell: Tauri only | Yes |

---

## 5. IMPROVEMENTS WORTH DOING AFTER v0.8.0 (not part of this execution)

1. Weekly review ritual: one screen that pulls shipped work, hours, unbilled time and next week's top 3 from the Journal.
2. Unbilled-time nudge in the header when a stopped session was not appended.
3. Quote -> project -> invoice in one flow (convert already exists; make it the default path).
4. Per-project "proof round" timeline using the existing snapshot service.
5. Vault health panel: broken links, orphan notes, conflicted copies, missing frontmatter keys.
6. Plain-text export of everything (a "leave with your data" button) to reinforce the ownership promise.
7. Rust-native file layer and removal of Express to approach the ~35 MB RAM target.
8. Android companion: read-only Deck + timer + scratchpad over local network or shared cloud folder.
9. Quiet mode: hide everything except current task, timer and cassette dock.
10. Keyboard-first onboarding: 5 shortcuts shown once.

---

## 6. SKILLS TO ADD OR TRIM (to prevent drift)

| Skill | Action | Purpose |
|---|---|---|
| `kanso-scope-lock` | NEW (about 80 lines) | Enforces section 0: one task per commit, file allow-list per task, stop-and-ask list (decisions, vault deletes, history rewrite, 2 failed tests), no new features or dependencies, writes out-of-scope findings to `docs/PLAN_NOTES.md` |
| `kanso-vault-schema` | NEW | Source of truth for the 3 storage tiers, `_Team/_Config` file set, folder and filename conventions, frontmatter keys, migration rules, "never write secrets to the vault" |
| `kanso-ui-minimal` | NEW | The 6-item IA, component budget (2.6), token map, emoji-to-icon map (2.7), copy rules, a11y minimums, 400-line cap |
| `kanso-guardian` | UPDATE | Add the 6 new checks (P6.1), remove emoji from its own SKILL.md (39 lines), rename Zettelkasten wording, point to the 3 new skills |
| `codebase-cleanup` | TRIM | Cut from 766 lines to about 150: keep hygiene and security checklists, remove "organize/rename freely" language that conflicts with the scope lock; add "only when invoked by a phase task" |

Optional helpers already available in this environment: `design-skills:design-systems` (token audit), `design:accessibility-review` (P4.9), `design:ux-copy` (P4.8), `simplify` (after each phase), `security-review` (after Phase 0 and 5).

Skill authoring rule: each skill states Inputs, Allowed paths, Forbidden actions, Done-when, and a one-line "if unsure, stop and ask".

---

## 7. PROMPT TO GIVE ANTIGRAVITY

```
You are executing docs/MASTER_PLAN.md for Kanso Cre8.
Load skills: kanso-scope-lock, kanso-vault-schema, kanso-ui-minimal, kanso-guardian.
Start with PHASE 0 only. For each task: announce the task ID, list files you will touch,
make the change, run the gate in section 0, commit once. Do not begin the next phase
until I reply "phase N approved". Stop and ask on any DECISION item (D1..D8), any
delete inside a user vault, and before any git history rewrite. No emoji, no hex colors,
no new dependencies, no features outside the plan. Log anything else you notice to
docs/PLAN_NOTES.md.
```

---

## 8. EFFORT AND ORDER

| Phase | Size | Risk | Notes |
|---|---|---|---|
| 0 | S | Low | Do today; D5 needs backup |
| 1 | M | Low | Mostly deletion |
| 2 | M | Medium | Migration code needs tests first |
| 3 | L | Medium | Hex purge is mechanical, review visually per theme |
| 4 | L | Medium | Move, do not rewrite; owner reviews screenshots |
| 5 | M | Medium | Sidecar is the only real new code |
| 6 | S | Low | Ship v0.8.0 |
