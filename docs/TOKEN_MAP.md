# Token Map: Fluent 2 to Kanso Cre8 Studio Tokens

This document records the canonical mapping from legacy Microsoft Fluent 2 tokens and ad-hoc CSS variables to the unified Kanso Cre8 studio design tokens (`--kanso-*`) defined in `src/app/client/src/lib/styles/kanso-tokens.css`.

Following Phase 3 Task P3.2 of `docs/MASTER_PLAN.md`, both `fluent2-tokens.css` and `fluent2-base.css` are deleted, establishing `kanso-tokens.css` as the single source of truth for all styling tokens in Kanso Cre8.

---

## 1. Foundation & Structural Surfaces

| Legacy Fluent 2 Token | Kanso Canonical Token | Description / Purpose |
|---|---|---|
| `--bg-app` | `var(--kanso-canvas)` | Deep application canvas background (`#09090B` dark, `#F8FAFC` light) |
| `--bg-canvas` | `var(--kanso-canvas)` | Main workspace/canvas base layer |
| `--bg-header` | `var(--kanso-surface)` | Top header navigation bar surface (`#18181B` dark, `#FFFFFF` light) |
| `--bg-sidebar` | `var(--kanso-surface)` | Sidebar surface background |
| `--sidebar-border` | `var(--kanso-border)` | Hairline border for sidebar separation (`#27272A` dark, `#E2E8F0` light) |
| `--sidebar-text` | `var(--kanso-text-primary)` | Primary text on sidebar items |
| `--sidebar-text-muted` | `var(--kanso-text-muted)` | Muted secondary text and shortcuts on sidebar |
| `--sidebar-active-bg` | `var(--kanso-surface-hover)` | Active navigation item background highlight |
| `--sidebar-active-text` | `var(--kanso-accent)` | Active navigation text highlight (`#38BDF8` dark, `#0078D4` light) |
| `--sidebar-active-indicator` | `var(--kanso-accent)` | Active navigation bar / dot indicator |
| `--surface-card` | `var(--kanso-surface)` | Standard card, bento tile, and modal surface |
| `--surface-card-subtle` | `var(--kanso-surface-hover)` | Inset / secondary card surface |
| `--surface-card-elevated` | `var(--kanso-surface)` | Elevated surface (flat: 1px border; neu: dual shadow) |
| `--surface-card-border` | `var(--kanso-border)` | 1px hairline border separating cards and containers |
| `--surface-card-hover` | `var(--kanso-surface-hover)` | Card hover state highlight (`#27272A` dark, `#F1F5F9` light) |
| `--glass-bg` | `var(--kanso-surface)` | Translucent / frosted surfaces |
| `--glass-border` | `var(--kanso-border)` | Hairline container border |
| `--glass-blur` | `none` | Eliminated heavy GPU blur filters |

---

## 2. Typography & Text Hierarchy

| Legacy Fluent 2 Token | Kanso Canonical Token | Description / Purpose |
|---|---|---|
| `--text-primary` | `var(--kanso-text-primary)` | Primary headings and high-contrast body text (`#F4F4F5` / `#0F172A`) |
| `--text-secondary` | `var(--kanso-text-secondary)` | Secondary body copy and metadata (`#A1A1AA` / `#475569`) |
| `--text-tertiary` | `var(--kanso-text-muted)` | Tertiary labels, microcopy, and timestamps (`#71717A` / `#64748B`) |
| `--text-muted` | `var(--kanso-text-muted)` | Disabled or muted text elements |
| `--text-inverted` | `var(--kanso-canvas)` | Inverted text on high-contrast backgrounds |
| `--text-brand` | `var(--kanso-accent)` | Brand colored typography |
| `--header-text` | `var(--kanso-text-primary)` | Header text |
| `--font-family` | `var(--kanso-font-ui)` | Standard UI font family (`Nunito`, sans-serif) |
| `--font-ui` | `var(--kanso-font-ui)` | Standard UI font family |
| `--font-display` | `var(--kanso-font-display)` | Primary display headline font (`Red Hat Display`) |
| `--font-accent` | `var(--kanso-font-accent)` | Accent typography (`Nunito`) |
| `--font-mono` | `var(--kanso-font-mono)` | Monospace typography (`JetBrains Mono`, code/currency) |

---

## 3. Brand Accents & CTAs

| Legacy Fluent 2 Token | Kanso Canonical Token | Description / Purpose |
|---|---|---|
| `--brand-primary` | `var(--kanso-accent)` | Primary brand CTA color (`#38BDF8` dark, `#0078D4` light) |
| `--brand-secondary` | `var(--kanso-accent-hover)` | Primary CTA hover state (`#0EA5E9` dark, `#106EBE` light) |
| `--brand-accent` | `var(--kanso-accent)` | Secondary brand accent highlight |
| `--brand-tint` | `var(--kanso-accent-muted)` | Translucent accent tint for pills and selected badges |
| `--brand-gradient` | `none` | Clean minimalist solid tokens without distracting gradients |
| `--brand-glow` | `none` | Clean flat studio tokens; neumorphic glow in soft UI |

---

## 4. Semantic Status Indicators

| Legacy Fluent 2 Token | Kanso Canonical Token | Description / Purpose |
|---|---|---|
| `--color-success` | `var(--kanso-success)` | Emerald green success status (`#10B981`) |
| `--color-success-bg` | `var(--kanso-success-muted)` | Translucent success background badge |
| `--color-success-border` | `var(--kanso-success)` | Success border indicator |
| `--color-warning` | `var(--kanso-warning)` | Amber warning status (`#F59E0B`) |
| `--color-warning-bg` | `var(--kanso-warning-muted)` | Translucent warning background badge |
| `--color-warning-border` | `var(--kanso-warning)` | Warning border indicator |
| `--color-danger` | `var(--kanso-danger)` | Red danger / error status (`#EF4444`) |
| `--color-danger-bg` | `var(--kanso-danger-muted)` | Translucent error background badge |
| `--color-danger-border` | `var(--kanso-danger)` | Error border indicator |
| `--color-info` | `var(--kanso-accent)` | Informational accent badge |
| `--color-info-bg` | `var(--kanso-accent-muted)` | Informational background tint |
| `--color-info-border` | `var(--kanso-accent)` | Informational border |

---

## 5. Web Official Microsoft Fluent 2 Aliases

| Microsoft Web Token | Kanso Canonical Token |
|---|---|
| `--colorNeutralBackground1` | `var(--kanso-canvas)` |
| `--colorNeutralBackground2` | `var(--kanso-surface)` |
| `--colorNeutralBackground3` | `var(--kanso-surface-hover)` |
| `--colorNeutralForeground1` | `var(--kanso-text-primary)` |
| `--colorNeutralForeground2` | `var(--kanso-text-secondary)` |
| `--colorNeutralForegroundDisabled` | `var(--kanso-text-muted)` |
| `--colorBrandBackground` | `var(--kanso-accent)` |
| `--colorBrandBackgroundHover` | `var(--kanso-accent-hover)` |
| `--colorBrandBackgroundInverted` | `var(--kanso-accent-muted)` |
| `--colorPaletteGreenBackground3` | `var(--kanso-success)` |
| `--colorPaletteYellowBackground3` | `var(--kanso-warning)` |
| `--colorPaletteRedBackground3` | `var(--kanso-danger)` |

---

## 6. Geometry, Radius & Elevation

| Legacy Fluent 2 Token | Kanso Canonical Token | Description |
|---|---|---|
| `--radius-sm` | `var(--kanso-radius-sm)` | 6px subtle curve |
| `--radius-md` | `var(--kanso-radius-md)` | 10px standard button & card corner |
| `--radius-lg` | `var(--kanso-radius-lg)` | 14px container corner |
| `--radius-xl` | `var(--kanso-radius-lg)` | Mapped to 14px container corner |
| `--radius-pill` | `var(--kanso-radius-full)` | 9999px fully rounded pill |
| `--borderRadiusMedium` | `var(--kanso-radius-md)` | 10px standard radius |
| `--shadow-sm` | `none` (flat) / `var(--neu-shadow-raised-sm)` (neu) | Flat hairline border replaces blurry shadows |
| `--shadow-md` | `none` (flat) / `var(--neu-shadow-raised)` (neu) | Physical dual shadow in neumorphic modes |
| `--shadow-lg` | `none` (flat) / `var(--neu-shadow-raised-lg)` (neu) | Elevated physical extrusion in neumorphic modes |
| `--shadow-xl` | `none` (flat) / `var(--neu-shadow-raised-lg)` (neu) | Elevated physical extrusion in neumorphic modes |

---

## 7. Motion & Transitions

| Legacy Fluent 2 Token | Kanso Canonical Token | Description |
|---|---|---|
| `--transition-fast` | `var(--kanso-duration-fast) var(--kanso-ease)` | 150ms responsive hover transitions |
| `--transition-smooth` | `var(--kanso-duration-normal) var(--kanso-ease)` | 200ms standard modal and card transitions |
| `--transition-spring` | `var(--kanso-duration-slow) var(--kanso-ease)` | 300ms layout expansion transitions |
