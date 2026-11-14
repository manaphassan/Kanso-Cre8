# KANSO CRE8 - MASTER PLAN (v0.8.0 -> v0.9.0 "Local Release")

Audience: the executing agent. Owner: product/art direction.
Goal: one native desktop app for Windows, macOS and Linux. No server, no Android. All data saved locally as plain files. AI built in with the user's own API key. Portable from a USB drive. Settings exportable from one OS to another.
Rule zero: this plan removes the server and the Android stub, and adds only what a phase explicitly lists.
Previous plan (v0.7.0 -> v0.8.0, D1 to D8): `docs/archive/MASTER_PLAN_v0.8.0.md`.

---

## 0. EXECUTION CONTRACT (read first, applies to every phase)

1. Work one phase at a time. One task = one commit. Never start phase N+1 before the phase N gate passes and the owner replies "phase N approved".
2. Before each task: state the task ID, the files you will touch, and the acceptance check. Touch nothing else.
3. After each task run the gate:
   - `powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1` (0 warned / 0 failed)
   - from `src/app`: `npm run check`, `npm run build:client`, `npm test`
   - from Phase 1 on, from `src/app/src-tauri`: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`
4. No new features and no new dependencies beyond section 2.9. If something looks wrong but is not in the plan, write it to `docs/PLAN_NOTES.md` and continue.
5. STOP and ask the owner when: a task needs a decision marked PENDING in section 4, a delete touches user vault data, a history rewrite is required, or a gate fails twice.
6. Never print, copy or commit secrets, API keys, bank details, real client or studio identity. Use Acme Corp / Nexus Studio / Lumina Labs only.
7. ASCII only in code, docs and commit messages. No emoji.
8. Svelte 5 runes only. Colors only via `var(--kanso-*)`. Icons only via the single Icon component.
9. Commit format: `type(scope): summary`.
10. Windows is the reference platform: every task is verified on Windows first. macOS and Linux must still compile and pass CI on every commit from Phase 1 on.

---

## 1. WHY THIS PLAN (audit of v0.8.0, 2026-11-14)

| # | Finding | Evidence |
|---|---|---|
| F1 | The desktop app never starts its backend | `src-tauri/src/main.rs` only probes port 4000 or picks a free port; no `externalBin`, no spawn. `PLAN_NOTES.md` marks P5.4 done, but it is not. Release installers ship without a server. |
| F2 | About 16 client calls hit routes that do not exist | Share links, client review, 4 AI actions, vault ingest, project decision, global deliverables. `routes/share.js` calls `ShareService` methods that do not exist. |
| F3 | Android build is a stub | `MainActivity.java` loads `dist/index.html` with no backend; no Gradle project; the CI step copies a missing APK with `|| true`. |
| F4 | Local API treats every caller as admin | `middleware/auth.js`: missing or invalid token -> default admin user; CORS accepts any `localhost:*` origin; default passwords; plaintext password store. |
| F5 | 9 npm vulnerabilities (1 critical, 4 high) | `express` -> `proxy-addr`, `qs`; `archiver` -> `readdir-glob`. |
| F6 | Licence is cosmetic and forgeable | `requirePro()` returns `true`; any `KANSO-PRO-...-VERIFIED` key passes; signing secret is in source; client upper-cases keys before base64 decode, so genuine keys fail. |
| F7 | Bundle carries a full Node runtime | `build-windows.ps1` copies `node.exe` (about 80 MB) and an esbuild server bundle that nothing launches. |

Removing the server resolves F1, F2, F4, F5 and F7 by construction. Deleting Android resolves F3. F6 is Phase 6.

Not addressed here (log only, do not fix in this plan): 30 files over the 400-line cap in `docs/.lines-allowlist.txt`, 12 leftover emoji in source, 38 `svelte-check` warnings, duplicated keys in `studio_profile.json` (except where P2.1 must read them).

---

## 2. TARGET DESIGN

### 2.1 Runtime architecture (no server)
```
Svelte views and components            (unchanged, 33 files use ApiClient)
        |
ApiClient                              (same 96 method signatures; transport changes)
        |
TypeScript domain services             client/src/lib/domain/*.ts   (ported from server/services)
        |
VaultFs interface                      client/src/lib/vault/
   |                        |
TauriVaultFs (app)       MemoryVaultFs (tests)
   |
Rust commands                          src-tauri/src/{paths,vault,watch,archive,secrets,ai,settings,license}.rs
   |
Vault folder (.md, .json)   Machine dir (app.json)   OS keychain (secrets)
```
Rules:
- No process listens on a port. No `express`, no `http.createServer`, no `listen(`.
- Business logic (finance math, journal parsing, frontmatter, task rollup) lives in TypeScript.
- Rust does only what must be native or fast: path safety, bulk scan, atomic write, watch, zip, hash, secrets, outbound HTTP for AI and radio metadata, licence verification, settings export crypto.
- Every Rust command that takes a path takes it relative to the open vault root and rejects anything that resolves outside it.

### 2.2 Platforms
| Platform | Rust target | Artifacts | Role |
|---|---|---|---|
| Windows 10/11 x64 | `x86_64-pc-windows-msvc` | NSIS setup `.exe`, `.msi`, portable `.zip` (exe + `portable.ini` + README) | Reference platform. Built, tested and shipped first. Needs WebView2 (present on Windows 11; NSIS bootstrapper installs it if missing). |
| macOS (Tauri v2 minimum, 10.15+) | `universal-apple-darwin` (arm64 + x64) | `.dmg`, `.app` | Built in CI from Phase 1. Full QA in Phase 6. Opening without warnings needs Developer ID signing and notarization (D19). No portable mode (see 2.3). |
| Linux x64 (Ubuntu 22.04 baseline) | `x86_64-unknown-linux-gnu` | `.AppImage` (portable-capable), `.deb` | Built in CI from Phase 1. Full QA in Phase 6. Needs `webkit2gtk-4.1`. |

Removed: Android (D11).

### 2.3 Storage tiers and app modes
| Tier | Holds | Synced |
|---|---|---|
| Vault `<vault>/` | content `.md`, `_Team/_Config/{studio_profile,preferences,license}.json` | yes, never a secret |
| Machine `app.json` | active vault path, recent vaults, device label, AI provider and model (no key), window state, running timer `startedAt` | never |
| Secrets (OS keychain) | AI API key | never |
| Session (webview localStorage) | `kanso.session` only: last route, unsent drafts | never |

| Mode | Trigger | Machine dir | Webview data dir | Vault path stored as |
|---|---|---|---|---|
| Installed | default | Windows `%APPDATA%\KansoCre8`; macOS `~/Library/Application Support/KansoCre8`; Linux `$XDG_CONFIG_HOME/kansocre8` | OS default | absolute |
| Portable (Windows, Linux AppImage) | file `portable.ini` next to the exe (Linux: next to `$APPIMAGE`) | `<app dir>/Data/` | `<app dir>/Data/webview/` | relative to `<app dir>` when on the same drive, so drive letter changes do not break it |

Rules:
- macOS has no portable mode: Gatekeeper App Translocation runs downloaded apps from a random read-only path. A vault on a USB drive still works in installed mode.
- Portable mode is refused when `<app dir>` is inside a cloud sync folder (Dropbox, Google Drive, OneDrive, Synology Drive). Syncing webview data corrupts it. Show one line and fall back to installed mode. The vault may live in a cloud folder; the app and its `Data/` may not.
- Secrets never go to `Data/` by default. In portable mode the key is entered once per computer, or carried inside an encrypted settings export (D18).
- Linux without a Secret Service (minimal desktops): fall back to `app.json` with `0600` permissions and show a one-line warning in Settings > AI.

### 2.4 Rust command surface
| Module | Commands |
|---|---|
| `paths.rs` | `app_mode()` -> installed or portable, machine dir, cloud-folder warning |
| `vault.rs` | `vault_open(path)`, `vault_root()`, `vault_scan()` (tree + mtime + size + text of `.md`/`.json` under 1 MB, one call), `read_text`, `write_text_atomic`, `ensure_dirs`, `move_to_archive`, `copy_into_vault(src, dest)`, `list_dir` |
| `watch.rs` | `watch_vault()` emits `vault:changed { paths }`; ignores own temp files; polling fallback for network and virtual drives |
| `archive.rs` | `export_zip(paths, dest)`, `sha256_file(path)` |
| `machine.rs` | `machine_get(key)`, `machine_set(key, value)` (atomic, user-only permissions) |
| `secrets.rs` | `ai_set_key(provider, key)`, `ai_clear_key(provider)`, `ai_status()` -> `{ provider, model, configured }` |
| `ai.rs` | `ai_test()`, `ai_complete({ provider, model, system, prompt, max_tokens })` |
| `net.rs` | `radio_now_playing(station)` with a host allow-list (`api.laut.fm`, `api.plaza.one`, `somafm.com`) |
| `settings.rs` | `settings_export(options, dest)`, `settings_inspect(path)`, `settings_import(path, choices, passphrase?)` |
| `license.rs` | `license_status()`, `license_activate(key)`, `license_deactivate()` (Phase 6) |

Previews: enable the Tauri asset protocol and allow only the open vault directory at runtime; the UI uses `convertFileSrc` for images and video (range requests work).

### 2.5 Cross-platform file rules (vault must open identically on all 3 OS)
- Paths in data and over IPC: relative to the vault root, forward slashes.
- Filenames the app creates: ASCII (per `kanso-vault-schema`), and never `< > : " / \ | ? *`, control characters, trailing dot or space, Windows reserved names (`CON PRN AUX NUL COM1-9 LPT1-9`), or a name that differs only by case from a sibling.
- User files (deliverables) may have Unicode names: compare in NFC (macOS can return NFD).
- Text: UTF-8 without BOM, write LF, accept CRLF on read.
- Atomic write: temp file in the same folder, flush, rename. On Windows retry the rename with backoff up to about 1 s on sharing violations (antivirus, sync clients).
- Test paths longer than 260 characters on Windows (deep project trees inside OneDrive).
- Never hold a file handle open between writes.

### 2.6 AI (built in, bring your own key)
- Settings > AI: one password field for the key, Test, Clear, model select. Nothing else to configure.
- The key is stored by Rust in the OS keychain and never sent to the webview. `ai_status` returns `configured: true|false` only.
- All requests go out from Rust (`reqwest`, rustls). The webview CSP gains no external `connect-src`.
- Provider at v0.9: Gemini (existing integration). The `provider` field is reserved so others can be added later without UI changes.
- The four assistant actions (hooks, script, image prompts, formatted prompt) are TypeScript prompt templates that call `ai_complete`.
- First use shows one line: "Only the text you send is shared with the AI provider." Offline: AI buttons are disabled with one line of explanation.
- Errors are plain sentences: invalid key, quota reached, no connection.

### 2.7 Settings export and import (cross-platform)
Purpose: move a setup from Windows to macOS or Linux (or to a new computer) without copying OS-specific files. Vault content already travels with the vault folder; this file carries everything else.

File: `kanso-settings-YYYY-MM-DD.json`, plain readable JSON, documented in `docs/SCHEMA.md`.

| Key | Content | Default |
|---|---|---|
| `format` | `"kanso-settings"` | always |
| `format_version` | integer, starts at `1` | always |
| `app_version` | for example `"0.9.0"` | always |
| `exported_at` | ISO 8601 UTC | always |
| `source_platform` | `windows`, `macos` or `linux` | always |
| `sections.preferences` | copy of `_Team/_Config/preferences.json` | on |
| `sections.studio_profile` | copy of `_Team/_Config/studio_profile.json` (contains bank details: the UI says so) | on |
| `sections.app` | AI provider and model, recent vault folder names (not paths), device label, shortcut overrides, onboarding flags | on |
| `sections.license` | licence state from `license.json` | off |
| `secrets` | `null`, or an encrypted block `{ cipher: "aes-256-gcm", kdf: "argon2id", salt, nonce, data }` holding the AI key | off, opt-in with a passphrase of 12+ characters (D18) |

Never exported: absolute paths, window geometry, running timer `startedAt`, webview data, sync-conflict state.

Import flow: pick file -> validate `format` and `format_version` (reject a newer major version, migrate older ones) -> show a per-section preview of what changes -> Replace or Skip per section -> passphrase if `secrets` is present -> write through the config layer (atomic) and the keychain -> if no vault is open, ask the user to choose the vault folder on this computer. Import never touches `.md` content.

### 2.8 Product scope changes
Delete: Android companion (D11); share links and client review (`ShareService`, `routes/share.js`, `ShareLinkModal`, `ClientReviewView`, ApiClient share and public-review methods) (D12); login, roster, users, team, RBAC and passwords (D1, finished in Phase 4); webhooks; audit log (D2); server-sent events (replaced by `vault:changed`); the Node sidecar idea (D7, superseded by D9).
Keep: everything else in the six-item navigation, plus the AI assistant (D13).

### 2.9 Dependencies
Add (Rust, only these): `keyring`, `notify`, `notify-debouncer-full`, `walkdir`, `zip`, `sha2`, `reqwest` (rustls, json), `serde`/`serde_json` (present), `aes-gcm` and `argon2` (only if D18 = YES), `ed25519-dalek` (Phase 6, only if D3 keeps a paid tier), `tauri-plugin-updater` (Phase 6, only if D20 = YES).
Add (npm, dev): the test runner chosen in D17.
Remove (npm, Phase 4): `express`, `cors`, `compression`, `jsonwebtoken`, `bcryptjs`, `multer`, `dotenv`, `chokidar`, `archiver`, `concurrently`. Keep `js-yaml` (moves to client use).
Remove (Tauri): `tauri-plugin-fs` and the `fs:default` capability once all file access goes through the commands in 2.4.

---

## 3. PHASES

### PHASE 0 - Scope cut and governance
Gate: `git ls-files src/android` is empty; `grep -rn "share/generate\|public/review\|ShareService" src/app` is empty; guardian, build and tests green.

- P0.1 Delete Android: `src/android/`, `scripts/build-android.ps1`, the `package:android` script, the Android job in `.github/workflows/release-builds.yml`, Android branches in `scripts/build-platforms.ps1`.
- P0.2 Delete share links and client review (D12): `server/services/ShareService.js`, `server/routes/share.js` and its mount in `routes/index.js`, `ShareLinkModal.svelte`, `ClientReviewView.svelte`, the review route in `App.svelte`, ApiClient methods `generateShareLink`, `getProjectShareLinks`, `revokeShareLink`, `getPublicReview`, `submitPublicDecision`, `submitPublicComment`, every button that opens them, and the ShareService tests.
- P0.3 Governance docs: update `AGENTS.md` (platforms: Windows, macOS, Linux; no server; no Android; storage tiers from 2.3), `kanso-guardian` SKILL.md (framework, roadmap, platforms), `kanso-vault-schema` (2.3 tiers, keychain, portable mode, settings export pointer), `kanso-scope-lock` (inputs: this plan, decision answers in section 4), `README.md` and `docs/index.html` (platform list). Move `docs/ANTIGRAVITY_INSTRUCTION.md` to `docs/archive/`.
- P0.4 Interim safety until Phase 4 deletes the server: run `npm audit fix` (non-breaking only, no `--force`), commit the lockfile change.
- P0.5 Correct `docs/PLAN_NOTES.md`: mark v0.8 P5.4 as not done (F1) with a pointer to this plan.

### PHASE 1 - Rust foundation and three-OS CI
Gate: `cargo test` and `cargo clippy -D warnings` pass on Windows, macOS and Linux in CI; the app still runs end to end through the old Node server (nothing switched yet).

- P1.1 CI: add a `rust` job to `ci.yml` on `windows-latest`, `macos-latest`, `ubuntu-22.04` running fmt, clippy and test. `release-builds.yml`: matrix Windows (NSIS, MSI, portable zip), macOS (`--target universal-apple-darwin`, dmg), Linux (AppImage, deb). Unsigned until D19.
- P1.2 `paths.rs`: resolve app mode (2.3), machine dir per OS, portable `Data/` dir, cloud-folder detection (Dropbox `info.json`, OneDrive env vars, Google Drive `My Drive` and `~/Library/CloudStorage`, `SynologyDrive`). Create the main window in Rust (remove it from `tauri.conf.json`) so portable mode can set the webview data directory. Keep the existing machine paths so current `app.json` files are found.
- P1.3 Vault path guard in `vault.rs`: hold the canonical root; every command joins, canonicalizes and checks it stays under the root. Unit tests: `..`, absolute paths, symlink escape, drive letters and UNC on Windows, case-insensitive matches on macOS.
- P1.4 File commands from 2.4 (`vault.rs`, `archive.rs`, `machine.rs`) with the rules in 2.5. Unit tests for atomic write, reserved names, case collision, CRLF read, long paths.
- P1.5 `watch.rs` with debounced `vault:changed` events and polling fallback.
- P1.6 Asset protocol enabled; scope set at runtime to the open vault only.
- P1.7 Capabilities: add a `kanso` permission set for the new commands; keep `dialog` and `global-shortcut`.
- P1.8 `client/src/lib/vault/`: `VaultFs` interface, `TauriVaultFs`, `MemoryVaultFs`, and the test runner from D17 wired into `npm test` next to the existing server tests.

### PHASE 2 - Port domain services behind ApiClient
Rule: ApiClient method signatures do not change, so views are untouched. One domain per task: port `server/services/<X>.js` to `client/src/lib/domain/<x>.ts` (async, uses `VaultFs`), port its tests, switch its ApiClient methods to the local implementation, delete the now-dead server route and service in the same commit.
Gate per task: domain works in `tauri dev` with its server route deleted. Phase gate: the app is fully usable with the Node server not running.

- P2.1 Config: vault config JSON through one `config.ts`, machine settings through `machine_get/set`. Read legacy duplicate keys in `studio_profile.json` once and write only the canonical keys from `kanso-vault-schema`.
- P2.2 Notes: atomic notes, scratchpad, WikiLinks, backlinks, `#task` rollup and toggle, graph topology.
- P2.3 Journal: daily, weekly review, monthly, yearly, habits, rollover.
- P2.4 Clients: `_Clients/*/client.md` only.
- P2.5 Projects: list, scaffold (5-folder vault), snapshots, deliverables listing, `_review.md` comments and approvals, ingest through `copy_into_vault` (fixes the broken `/projects/:id/ingest`), decision (fixes `/projects/:id/decision`).
- P2.6 Finance: quotes, invoices, numbering, quote-to-invoice, studio stamping. HTML export via save dialog plus `write_text_atomic`; print via `window.print()`.
- P2.7 Timer: `startedAt` in the machine tier, elapsed computed from it, append session to the draft invoice on stop.
- P2.8 Export: handover ZIP and full-vault export through `export_zip`; manifest checksums through `sha256_file`.
- P2.9 Vault health and sync conflicts: link integrity, orphans, frontmatter checks, repair, archive-first reset, demo data. Add conflict patterns for OneDrive (`name-COMPUTERNAME.ext`) and Google Drive (`name (1).ext`) after confirming them against real sync clients; record the evidence in `PLAN_NOTES.md`.
- P2.10 Radio now-playing through `radio_now_playing`.
- P2.11 Replace the 3 `EventSource` call sites with a `vault:changed` listener.
- P2.12 Replace the 6 hard-coded `/api/...` URLs (lightbox download, handover zip, studio profile fetch, vault export, invoice HTML export) with local actions.

Not ported (deleted with the server in Phase 4): auth, login, roster, users, team, RBAC, webhooks, audit log, `GeminiService` (replaced in Phase 3), `LicenseService` (replaced in Phase 6).

### PHASE 3 - AI built in (bring your own key)
Gate: the key never appears in webview memory, IPC payloads or any file in the vault (check devtools and `grep` the vault); AI unit tests pass on all 3 OS with mocked HTTP.

- P3.1 `secrets.rs` with `keyring`: Windows Credential Manager, macOS Keychain, Linux Secret Service; Linux fallback per 2.3.
- P3.2 `ai.rs`: `ai_test`, `ai_complete` (Gemini), 60 s timeout, error mapping to plain sentences.
- P3.3 `client/src/lib/domain/ai.ts`: the 4 prompt templates; switch ApiClient AI methods to it (fixes the 4 broken AI endpoints).
- P3.4 Settings > AI per 2.6: key field, Test, Clear, model select, first-use notice, offline state.
- P3.5 One-time migration: move `aiApiKey` from `app.json` into the keychain, then remove it from the file.

### PHASE 4 - Remove the Node server
Gate: `git ls-files src/app/server` is empty; `npm ls express` finds nothing; `npm audit --omit=dev` shows 0 high or critical; the installers start and work on a clean Windows VM with no Node installed (macOS and Linux: CI build succeeds).

- P4.1 Delete `src/app/server/`. Server tests are already ported or deleted.
- P4.2 Remove the npm dependencies in 2.9. `package.json` scripts: drop `start`, `dev:server`; `dev` becomes `tauri dev`; `main` field removed.
- P4.3 `main.rs`: remove `BackendState`, `get_backend_port`, `get_backend_url`, port probing. `api.ts`: remove base URL resolution and the fetch transport.
- P4.4 CSP: `default-src 'self'; connect-src ipc: http://ipc.localhost; img-src 'self' asset: http://asset.localhost data: blob:; media-src 'self' asset: http://asset.localhost blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:`. Bundle Geist Sans and Geist Mono locally and drop Google Fonts.
- P4.5 Build scripts: `build-windows.ps1` and `build-linux.ps1` become thin wrappers over `tauri build` (no `node.exe`, no esbuild bundle). The Windows portable zip is the exe plus `portable.ini` plus a short README. `build-platforms.ps1` stays the single local entry point. Delete `scripts/run-smoketest.ps1` (it drives the server API) or rewrite it as a launch check of the built app.
- P4.6 Guardian: replace the `server/routes <= 300 lines` check with `src-tauri/src/*.rs <= 400` and `client/src/lib/domain/*.ts <= 400`; add a check that no `express`, `http.createServer` or `.listen(` exists under `src/app`; add a check that `portable.ini` is never committed.

### PHASE 5 - Portable mode and settings export
Gate: a settings file exported on Windows imports on macOS and Linux (CI round-trip test in Rust); the portable zip runs from a USB drive on two Windows PCs with different drive letters and keeps the same vault, theme and studio profile.

- P5.1 Portable UX: Settings > Vault shows the mode ("Installed" or "Portable: E:\KansoCre8"); vault path stored relative per 2.3; on a removable drive, a one-line reminder to eject before unplugging when the app closes.
- P5.2 Document the settings file format (2.7) in `docs/SCHEMA.md`.
- P5.3 Export: Settings > Vault > "Export settings": section checkboxes, optional "Include AI key (encrypted)" with passphrase (only if D18 = YES), save dialog. Built by `settings_export` in Rust; secrets are read from the keychain and encrypted inside Rust.
- P5.4 Import: Settings > Vault > "Import settings" with the flow in 2.7 (`settings_inspect` for the preview, `settings_import` to apply). Also reachable from the command palette.
- P5.5 Tests: export/import round trip, wrong passphrase, tampered file, newer `format_version`, missing sections, Windows paths in a file imported on macOS.
- P5.6 Device presence: `_Team/_Config/.kanso-open.json` `{ device_label, opened_at, heartbeat_at }` updated every 60 s; banner "Vault is also open on <device>" when another device's heartbeat is under 2 minutes old. A warning, never a lock.

### PHASE 6 - Release v0.9.0 on three platforms
Gate: clean-VM checklist passes on Windows, macOS and Linux: install, first run, create vault, client, project, quote, invoice, print, timer, AI test, settings export and import, vault in a Dropbox or Google Drive folder, portable USB run (Windows and Linux).

- P6.1 Licence (only if D3 keeps a paid tier): `license.rs` verifies Ed25519-signed keys with an embedded public key; delete the alpha master key, the `VERIFIED` suffix bypass and the client-side verifier; `requirePro()` reads `license_status`. The private key never enters the repo.
- P6.2 Signing (D19): Windows signing in `release-builds.yml`; macOS Developer ID signing and notarization; Linux unsigned.
- P6.3 Updates (D20): `tauri-plugin-updater` for installed builds with a signed manifest, opt-in on first run. Portable builds only show a "new version available" link.
- P6.4 Version 0.9.0 from one source (`package.json`, read by `tauri.conf.json` and Cargo at build time); `CHANGELOG.md` entry.
- P6.5 QA on macOS and Linux: keychain prompts, case-insensitive APFS, NFD filenames, AppImage portable mode, `webkit2gtk` rendering of the 4 themes and the cassette animation.

---

## 4. DECISIONS (answers recorded here are authoritative from D9 on)

Carried from v0.8.0:
| ID | Decision | Answer |
|---|---|---|
| D1 | Solo-first: no login, roster, team | YES (leftovers deleted in Phase 4) |
| D2 | Audit log | DROP |
| D3 | Paid tier and licence | PENDING (product and legal call; blocks P6.1 only) |
| D4 | Drop Gantt and Calendar | YES |
| D5 | Rewrite git history and rotate the Android keystore | PARTLY DONE 2026-10-18 (keystore and `node_modules` purged). Still in `main` and recent tags: about 51 legacy `SS-CAM-*.exe` builds and `nuget.exe` (368 MB pack, legacy brand names). A second purge needs the owner's explicit go; never assume |
| D6 | Drop the Tailwind claim | YES |
| D7 | Node sidecar now, Rust later | SUPERSEDED by D9 |
| D8 | Tauri is the only Windows shell | YES |

New (owner, 2026-11-14):
| ID | Decision | Answer |
|---|---|---|
| D9 | Runtime: no server; TypeScript domain logic plus Rust commands | YES |
| D10 | Platforms: Windows is the reference and ships first; macOS and Linux built in CI from Phase 1 and released in v0.9.0 | YES |
| D11 | Android companion | DELETE |
| D12 | Share links and client review | DELETE |
| D13 | AI built in; user only pastes an API key; Gemini first; calls from Rust | YES |
| D14 | Portable mode on Windows and Linux AppImage; macOS installed only | YES |
| D15 | Cross-platform settings export and import | YES |
| D16 | Secrets in the OS keychain (replaces the v0.8 rule "AI key in app.json") | PENDING (recommended YES; blocks Phase 3) |
| D17 | TypeScript test runner: `vitest` (new dev dependency) or `node:test` with type stripping (no dependency) | YES `vitest` 3.2.7 (owner "proceed" on the recommendation, 2026-11-14) |
| D18 | Allow the AI key inside the settings export, encrypted with a passphrase (adds `aes-gcm`, `argon2`) | PENDING (recommended YES, opt-in; blocks the secrets part of P5.3) |
| D19 | Code signing: Windows (for example Azure Trusted Signing) and Apple Developer ID with notarization (about USD 99 per year) | PENDING (blocks P6.2) |
| D20 | Update check through `tauri-plugin-updater`, opt-in on first run | PENDING (recommended YES; blocks P6.3) |

---

## 5. AFTER v0.9.0 (not part of this execution)

1. Review pack export: a static HTML page plus images in a ZIP the designer emails to a client (replaces share links without a server).
2. More AI providers (OpenAI, Anthropic) behind the reserved `provider` field.
3. Optional app PIN lock.
4. Linux ARM64 and Windows ARM64 builds.
5. Move hot TypeScript paths to Rust only where profiling shows a need.
6. Split the 30 grandfathered files over 400 lines.

---

## 6. SKILLS AND DOCS TO UPDATE (done in P0.3 unless stated)

| File | Change |
|---|---|
| `AGENTS.md` | Platform list, no server, no Android, storage tiers, portable mode, AI rule |
| `kanso-guardian` SKILL.md | Framework (Tauri + Svelte + Rust commands), roadmap, platforms |
| `kanso-guardian` verify script | New checks in P4.6 |
| `kanso-vault-schema` | Tiers and modes from 2.3, keychain, file rules from 2.5, settings export pointer |
| `kanso-scope-lock` | Inputs point to this plan; decision answers live in section 4 |
| `docs/SCHEMA.md` | Settings export format (P5.2) |
| `README.md`, `docs/index.html` | Platforms, download artifacts, portable instructions (P6.4) |

---

## 7. PROMPT FOR THE EXECUTING AGENT

```
You are executing docs/MASTER_PLAN.md (v0.8.0 -> v0.9.0) for Kanso Cre8.
Load skills: kanso-scope-lock, kanso-vault-schema, kanso-ui-minimal, kanso-guardian.
Start with PHASE 0 only. For each task: announce the task ID, list the files you will
touch, make the change, run the gate in section 0, commit once. Do not begin the next
phase until I reply "phase N approved". Stop and ask on any PENDING decision in section 4,
any delete inside a user vault, and before any git history rewrite. No emoji, no hex
colors, no dependencies outside section 2.9, no features outside the plan. Verify on
Windows first; macOS and Linux must stay green in CI. Log anything else to
docs/PLAN_NOTES.md.
```

---

## 8. EFFORT AND ORDER

| Phase | Size | Risk | Notes |
|---|---|---|---|
| 0 | S | Low | Mostly deletion and docs |
| 1 | M | Medium | New Rust code; three-OS CI catches platform issues early |
| 2 | L | Medium | 381 synchronous fs calls become async; port tests with each domain |
| 3 | S | Low | Needs D16 |
| 4 | S | Low | Deletion once Phase 2 is complete |
| 5 | M | Medium | Needs D18 for the encrypted secrets option |
| 6 | M | Medium | Needs D3, D19, D20; macOS notarization is the long pole |
