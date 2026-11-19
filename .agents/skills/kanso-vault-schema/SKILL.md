---
name: kanso-vault-schema
description: >
  Source of truth for how Kanso Cre8 stores, names and migrates data and config:
  the storage tiers, app modes (installed, portable), the vault folder and filename rules,
  the _Team/_Config file set, frontmatter contracts, atomic writes, cross-platform file rules,
  settings export and migration safety. Trigger: any change to storage,
  config, vault layout, frontmatter, filenames, localStorage, workspace paths, or secrets.
---

# Kanso Vault Schema

## Law

Zero database. Plain UTF-8 `.md` (YAML frontmatter) and small `.json` only. Openable in VS Code or Obsidian at any time. Safe inside Dropbox, Google Drive, OneDrive, Synology Drive.

## Storage tiers (the only tiers)

| Tier | Location | Holds | Synced |
|---|---|---|---|
| Vault | `<vault>/` | content, studio profile, preferences, license state | yes, must contain no secret |
| Machine | Installed: Windows `%APPDATA%/KansoCre8/app.json`; macOS `~/Library/Application Support/KansoCre8/app.json`; Linux `$XDG_CONFIG_HOME/kansocre8/app.json` (default `~/.config`). Portable: `<app dir>/Data/app.json` | active vault path, recent vaults, device label, AI provider and model, window state, running timer `startedAt`; until MASTER_PLAN Phase 4 also server port and generated server secret | never |
| Secrets | Target: OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service). Pending decision D16; until then the AI key stays in the Machine file | AI API key | never |
| Session | localStorage key `kanso.session` only (portable mode: webview data lives in `<app dir>/Data/webview/`) | last route, unsent drafts | never |

## App modes

- Installed (default): Machine dir per OS as above, webview data in the OS default location, vault path stored absolute.
- Portable (Windows, Linux AppImage): triggered by `portable.ini` next to the executable. Machine and webview data live in `<app dir>/Data/`. The vault path is stored relative to `<app dir>` when it is on the same drive, so drive letter changes do not break it.
- Portable mode is refused when `<app dir>` is inside a cloud sync folder; fall back to installed mode. The vault may be in a cloud folder; the app and `Data/` may not.
- macOS has no portable mode (App Translocation). A vault on a USB drive still works in installed mode.
- Secrets are never written to `Data/` unless the user opts in to the encrypted option (pending decision D18).

Hard rules:
- No secret in the vault. No secret in the repo. No config file in the app source tree.
- The browser never stores durable user data. Legacy keys `ss_cam_*` and `kanso_theme` are migrated once, then removed.
- API responses never return secrets (return `configured: true`).
- Machine file is written with user-only permissions.

## Vault layout (canonical)

```
_Clients/<CODE>_<Name>/client.md
_Finance/Quotes/QUOTE-YYYY-NNN_<CODE>.md
_Finance/Invoices/INV-YYYY-NNN_<CODE>.md
_Projects/<YYYY>/<YYYYMM>_<NNNN><T>_<CODE>_<Title>/
    README.md            (frontmatter = project record)
    _review.md           (comments and approvals)
    01_BRIEF  02_REFERENCE  03_COPY  04_WIP  05_DELIVERABLES
_Journal/Daily/YYYY-MM-DD.md  Monthly/YYYY-MM.md  Yearly/YYYY.md
_Notes/01_Fleeting  02_Literature  03_Permanent  Scratchpad.md
_Team/_Config/studio_profile.json  preferences.json  license.json
```

Forbidden: `03_COPYWRITING`, `_Zettelkasten`, `_Orders`, `companies.json`, `staff_directory.json`, `user_passwords.json`, `theme.txt`, `license.key`, global `_Team/comments/`.

Filename rules: ASCII, no spaces in system folders, client code is 2 to 5 uppercase letters, one file per quote or invoice (description goes in frontmatter `title:`).

## `_Team/_Config` files

- `studio_profile.json`: studio name, tagline, freelancer name, `registration_no`, email, phone, address, `logo_url`, `signature_text`, `signature_url`, bank name, account number, account holder, `swift_bic`, `duitnow_id`, default terms, currency. Auto-stamped onto new quotes and invoices.
- `preferences.json`: `theme` (light, dark, neumorphic, neumorphic-dark), `default_project_view` (kanban or table), `density`, `hourly_rate`, `currency`, `radio_favorites`, `pomodoro_minutes`.
- `license.json`: license state only, no private keys.

All vault config reads and writes go through `client/src/lib/domain/config.ts`; machine settings go through the `machine_get` / `machine_set` Rust commands, and the AI key only through `secrets.rs`. No other module touches config files directly.

## Frontmatter contract

- Every document type has a key list in `docs/SCHEMA.md`. Writes are validated by `validateFrontmatter(type, data)` in `client/src/lib/domain/frontmatter.ts`.
- Unknown keys are preserved on write, never dropped.
- Dates are ISO `YYYY-MM-DD` (timestamps are ISO 8601 UTC). Money is a number plus a `currency` key, never a formatted string.
- Client color is stored once in `client.md` (`color:` as hex data). That is the only place a hex value is allowed as data.

## Write safety

- Write to a temp file in the same folder, then rename (atomic).
- Debounce writes 300 ms. Never hold a lock or open handle between writes.
- Detect `conflicted copy` files and surface one banner in Settings > Vault.
- Timer: store `startedAt` (epoch ms) in the Machine tier, compute elapsed from it. On stop, append the session to the draft invoice.

## Migration rules

- `migrateVault()` is idempotent and logs every move.
- It may copy then delete only retired config JSON. It never deletes or rewrites user `.md` content.
- Back up the retired file as `<name>.migrated.bak` outside the vault (Machine tier folder) before deleting.
- Migration of an old localStorage key: read, write to new home, remove old key, run once.
- Any step that would touch a real user vault (not `sample-workspace`) requires owner confirmation.

## Privacy

Sample data uses only Acme Corp (`ACME`), Nexus Studio (`NEX`), Lumina Labs (`LUM`). Emails use `example.com`, phones `+1-555-0100`, bank values `0000-0000-0000`. No real person, studio, client or bank detail anywhere in git.

## Done-when

Fresh vault boots; an old vault migrates automatically; the vault opens cleanly in VS Code and Obsidian; `git grep` finds no secret, no `ss_cam`, no forbidden file name.
