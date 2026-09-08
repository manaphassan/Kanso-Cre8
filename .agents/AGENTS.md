# KANSO CRE8 AGENT RULES

## Project

**Kanso Cre8 (簡素)** is the Mindful Creative Vault — an offline-first, local-first creative operations, client hub, and knowledge engine for freelance designers.

**Platform**:
- Windows 11/10 (x64)
- Linux (x64 / ARM64)
- Android Companion (APK)

**Technology Stack**:
- Tauri v2 (Rust desktop runtime)
- Svelte 5 (Runes: `$state`, `$derived`, `$props`, `$effect`)
- Tailwind CSS + Linear / Geist Minimalist Studio Tokens
- Pure Markdown-as-Database Storage Engine (Zero SQL, SQLite, or Prisma)
- Web Audio API (Retro Cassette Focus Radio & Studio Deck)

---

# CORE PRINCIPLE: KANSO (簡素)

Treat Kanso Cre8 as a zen sanctuary for working freelance creators.

Prioritize:
1. Simplicity over cleverness (eliminate clutter and visual noise)
2. Total data ownership (100% human-readable UTF-8 `.md` files)
3. Zero database binary locks (openable anytime in Obsidian or VS Code)
4. Speed and tactile responsiveness (< 16ms interactions, ~35MB RAM)
5. Linear / Geist design token adherence (`var(--kanso-*)`)
6. Client privacy and security

---

# CLIENT PRIVACY LAW

**STRICTLY FORBIDDEN**: Never expose or commit real client names to public git commits, mock datasets, tests, or documentation.

Always use canonical sample profiles:
1. **Acme Corp** (`ACME`) — Acme Corporation
2. **Nexus Studio** (`NEX`) — Nexus Studio
3. **Lumina Labs** (`LUM`) — Lumina Labs

---

# PURE MARKDOWN STORAGE LAW

* **ZERO DATABASE SERVERS**: Absolutely NO SQL Server, SQLite binary files, Prisma ORM, MongoDB, or external cloud databases.
* **100% Plain Filesystem**: All data lives as plain directories and UTF-8 `.md` files with YAML frontmatter.
* **Universal Cloud Sync**: Must work transparently inside Dropbox, Google Drive, OneDrive, Synology Drive, or fast local NVMe.
* **Canonical 8-Folder Vault Layout**:
  - `_Clients/`
  - `_Finance/` (`Quotes/` and `Invoices/`)
  - `_Zettelkasten/` (`01_Fleeting/`, `02_Literature/`, `03_Permanent/`)
  - `[YYYY]/` (Standardized 5-folder project vaults)
  - `_Notes/` (Scratchpad)

---

# UI/UX RULES: LINEAR / GEIST STUDIO SYSTEM

Use the Linear / Geist Studio design tokens as the sole design system reference.

### Color Tokens
Never use hardcoded hex colors in components. Always use:
- Canvas background: `var(--kanso-canvas)` (`#09090B` dark / `#F8FAFC` light)
- Surface / Cards: `var(--kanso-surface)` (`#18181B` dark / `#FFFFFF` light)
- Hover surface: `var(--kanso-surface-hover)` (`#27272A` dark / `#F1F5F9` light)
- Hairline borders: `var(--kanso-border)` (`#27272A` 1px / `#E2E8F0` 1px)
- Primary text: `var(--kanso-text-primary)` (`#F4F4F5` / `#0F172A`)
- Muted text: `var(--kanso-text-muted)` (`#71717A` / `#64748B`)
- Accent CTA: `var(--kanso-accent)` (`#38BDF8` / `#0078D4`)
- Status colors: `var(--kanso-success)`, `var(--kanso-warning)`, `var(--kanso-danger)`

### Hairline Borders Over Heavy Shadows
Elevate surfaces using `1px solid var(--kanso-border)` instead of heavy blurry drop shadows.

---

# CANONICAL RETRO CASSETTE RADIO

The Retro Cassette Focus Radio is ported faithfully from the mechanical cassette player in SS-CAM Android:
- 4 corner silver screws, trapezoidal head/roller, Side A label badge, clear tape window.
- Dual 6-spoke gear spool wheels rotating at 33 RPM via smooth CSS animations during playback.
- Curated focus streams (Chillhop Cafe, Nightwave Plaza, SomaFM Groove Salad, Parisian Jazz, Zen Alpha Focus).
- Persistent 40px Mini-Cassette Dock in the sidebar footer.
- 25-minute Pomodoro focus timer.

---

# GOVERNANCE VERIFICATION

Before committing changes, always run the brand and architecture auditor:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1
```

All 10 checks must pass with `0 warned / 0 failed`.

---

# WORKSPACE AGENT SKILLS

- `kanso-guardian`: Primary brand identity, architecture, and roadmap steward for Kanso Cre8. Enforces Linear/Geist studio tokens, pure Markdown-as-Database storage, Zettelkasten knowledge integration, multi-client management (Acme Corp, Nexus Studio, Lumina Labs), quote/invoice studio, and phased roadmap milestones.