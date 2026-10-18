# Kanso Cre8 Design System & Architecture Specification

> The Mindful Creative Vault — Design Tokens, Typography, and UI Rules

---

## 1. Executive Design Philosophy: Kanso (Simplicity)

Kanso Cre8 is designed as a calm digital sanctuary for freelance visual creators, art directors, and creative operators. It deliberately rejects noisy animations, gamification banners, arbitrary drop shadows, and corporate SaaS clutter.

The interface is grounded in three Japanese aesthetic principles:
1. **Kanso (Simplicity)**: Eliminate non-essential visual elements. Every pixel, token, and line must serve operational clarity.
2. **Ma (Negative Space)**: Spatial breathing room is a functional structural medium allowing creative work and typography to stand out.
3. **Shibui (Subtle Craft)**: Visual hierarchy is achieved through 1px hairline borders (`var(--kanso-border)`) and disciplined typography rather than heavy blurry drop shadows.

---

## 2. Linear and Geist Studio Design Tokens

Kanso Cre8 uses a unified design token system defined exclusively in `src/app/client/src/lib/styles/kanso-tokens.css`.

### Core Color Palette

| Token | Dark Mode (Default) | Light Mode | Purpose |
|---|---|---|---|
| `--kanso-canvas` | `#09090B` | `#F8FAFC` | Root app background |
| `--kanso-surface` | `#18181B` | `#FFFFFF` | Cards, panels, sidebars |
| `--kanso-surface-hover` | `#27272A` | `#F1F5F9` | Interactive hover states |
| `--kanso-border` | `#27272A` | `#E2E8F0` | 1px hairline borders |
| `--kanso-text-primary` | `#F4F4F5` | `#0F172A` | Headings, primary text |
| `--kanso-text-secondary` | `#A1A1AA` | `#475569` | Secondary descriptions |
| `--kanso-text-muted` | `#71717A` | `#64748B` | Timestamps, microcopy |
| `--kanso-accent` | `#38BDF8` | `#0078D4` | Primary CTA buttons, active pills |
| `--kanso-accent-hover` | `#0EA5E9` | `#106EBE` | CTA hover state |
| `--kanso-accent-muted` | `rgba(56, 189, 248, 0.15)` | `rgba(0, 120, 212, 0.12)` | Subtle highlight backgrounds |
| `--kanso-success` | `#10B981` | `#10B981` | Paid invoices, approved proofs |
| `--kanso-warning` | `#F59E0B` | `#F59E0B` | Pending reviews, draft quotes |
| `--kanso-danger` | `#EF4444` | `#EF4444` | Overdue milestones, delete actions |

### Studio Atmospheres (Themes)

1. **Dark Obsidian (Default)**: Deep obsidian canvas (`#09090B`), zinc surfaces (`#18181B`), electric sky accent (`#38BDF8`).
2. **Stone Paper (Light)**: Porcelain canvas (`#F8FAFC`), crisp white cards (`#FFFFFF`), azure accent (`#0078D4`).
3. **Neumorphic Clay**: Soft clay canvas (`#E0E5EC`) with physical dual-shadow extrusion (`var(--neu-shadow-raised)`), debossed concave wells (`var(--neu-shadow-inset)`), high-contrast slate text (`#1E293B`), and royal blue CTAs (`#3B82F6`).
4. **Neumorphic Obsidian**: Deep charcoal canvas (`#1E2026`) with ambient extruded shadows and electric sky CTAs (`#38BDF8`).

---

## 3. Typographic System & The 24pt Horizon

The typographic system follows a strict boundary between display and UI layers:

- **Display Layer (>= 24pt)**: Red Hat Display (`font-weight: 700-800`, tracking: `-0.02em` to `-0.01em`). Used exclusively for major page titles, hero headers, and case study openings.
- **UI Layer (< 24pt)**: Nunito (`font-weight: 600-800`, tracking: `normal`). Used for navigation labels, table rows, form inputs, metadata, and buttons.
- **Monospace Layer**: JetBrains Mono / Geist Mono. Used for invoice IDs, currency totals, dates, and frontmatter.

### Typographic Rules
- Never mix Display and UI font families within a single line or heading.
- Maximum of 2 font weights per screen.
- Minimum 14px for readable secondary text; minimum 16px on inputs to prevent mobile auto-zoom.

---

## 4. UI Rules & Component Budget

1. **Navigation Structure (Strict 6-Item Architecture)**:
   - Deck (Dashboard)
   - Projects (Kanban and Table views; Review and Copy are tabs in Project Workspace)
   - Journal (Bullet Journal Daily, Monthly, Yearly logs)
   - Notes (Atelier Knowledge Engine with Scratchpad)
   - Clients & Money (Tabs: Clients, Quotes, Invoices)
   - Settings (Tabs: Studio, Preferences, Vault, About)
2. **Component File Cap**: Maximum 400 lines per Svelte component. Split large components by feature.
3. **Color Adherence**: Never use arbitrary hex colors in `.svelte` files. Only `var(--kanso-*)` tokens are allowed. Canonical exceptions are listed in `docs/.hex-allowlist.txt` (retro cassette artwork, canvas drawing tools, client palette defaults).
4. **Copywriting Standards**:
   - Sentence case for all headings and button labels.
   - Action buttons must start with a verb (e.g., "Create project", "Save changes", "Send invoice").
   - Zero exclamation marks across all UI copy.
   - Empty states must be concise single-line explanations with one action button.
5. **Accessibility**:
   - Visible focus ring from `var(--kanso-accent)`.
   - 4.5:1 text contrast ratio across all 4 themes.
   - Every icon-only button must have an `aria-label`.
   - Zero Svelte a11y compiler warnings.

---

## 5. Canonical Icon System & Mapping

All iconography is rendered through a single component: `src/app/client/src/lib/components/ui/Icon.svelte`.
Icons use monoline SVG geometry (1.5px continuous stroke weight, 24px grid, `currentColor`).

### Emoji-to-Icon Mapping Table

| Concept | Icon Name |
|---|---|
| Folder, directory | `folder` |
| Calendar, dates | `calendar` |
| Fast action, instant | `bolt` |
| Target, objective | `target` |
| Palette, theme | `palette` |
| Package, deliverable | `package` |
| Warning, alert | `alert` |
| Idea, insight | `lightbulb` |
| Delete, remove | `trash` |
| File, document, memo | `file` |
| Check, completed | `check` |
| Close, cancel | `close` |
| Notification | `bell` |
| Chat, comment | `message` |
| Search, find | `search` |
| Analytics, chart | `chart` |
| Settings, gear | `settings` |
| Client, enterprise | `building` |
| Team, users | `users` |
| Lock, security | `lock` |
| Money, finance, wallet | `wallet` |
| Active, priority | `flame` |
| Favorite, star | `star` |
| Audio, music | `music` |
| Directional navigation | `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down` |

---

## 6. Retro Cassette Mechanical Player

The Retro Cassette Focus Radio is a faithful recreation of a vintage mechanical cassette deck:
- Four corner screws, trapezoidal head/roller, Side A badge, clear tape window.
- Dual 6-spoke gear spool wheels rotating at 33 RPM during audio playback.
- Curated focus streams (Chillhop, Nightwave Plaza, SomaFM Groove Salad, Parisian Jazz, Zen Alpha Focus).
- Persistent 40px Mini-Cassette Dock in the sidebar footer.
- 25-minute Pomodoro focus timer with mechanical sound effects.

---

## 7. Fluent 2 to Kanso Token Mapping

| Legacy Fluent Token | Canonical Kanso Token |
|---|---|
| `--bg-app`, `--bg-canvas` | `var(--kanso-canvas)` |
| `--bg-header`, `--bg-sidebar`, `--surface-card` | `var(--kanso-surface)` |
| `--sidebar-active-bg`, `--surface-card-hover` | `var(--kanso-surface-hover)` |
| `--sidebar-border`, `--surface-card-border` | `var(--kanso-border)` |
| `--sidebar-active-text`, `--brand-primary` | `var(--kanso-accent)` |
| `--brand-secondary` | `var(--kanso-accent-hover)` |
| `--brand-tint` | `var(--kanso-accent-muted)` |
| `--text-primary`, `--header-text` | `var(--kanso-text-primary)` |
| `--text-secondary` | `var(--kanso-text-secondary)` |
| `--text-tertiary`, `--text-muted` | `var(--kanso-text-muted)` |
| `--font-ui`, `--font-family` | `var(--kanso-font-ui)` |
| `--font-display` | `var(--kanso-font-display)` |
| `--font-mono` | `var(--kanso-font-mono)` |
