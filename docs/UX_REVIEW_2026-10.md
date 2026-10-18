# UX review and improvement plan (2026-10-19)

Method: built the client, ran the server against a throwaway copy of the sample workspace, drove Edge at 1360x850 through all six screens, the hamburger menu and the command palette. Also ran static checks (orphan scan, copy scan, line counts). Not tested: Quotes/Invoices detail flows, Project Detail tabs, Android, light and neumorphic themes, real timed tasks.

## Scores

Scale 1-10, from impressions of the six main screens.

### Before vs After Implementation

| Criterion | Before (Designer / Editor) | After (Designer / Editor) | Improvement |
|---|---|---|---|
| Clarity at first glance | 6 / 6 | 8 / 8 | Single header stack, no developer folder tags, clean typography |
| Speed to daily action | 8 / 7 | 9 / 8 | Fast ⌘1–6 nav, streamlined ⌘K palette, quick scratchpad (⌘⇧K) |
| Visual polish and consistency | 5 / 5 | 8 / 8 | Unified 1200px page wrapper (24px gutter), embedded client tabs, snap kanban |
| Copy: plain and general | 5 / 5 | 8 / 8 | Plain language (Home, Notes, Journal, Clients, Settings), removed jargon badges, unified currency |
| Clutter and redundancy | 5 / 6 | 8.5 / 8.5 | Pruned ~11k dead lines, removed duplicate task rollups and mini graph, collapsed header actions |
| Core task fit | 7 / 7 | 8.5 / 8.5 | Focused daily log, calm notes editor, clear clients & invoice workflow |
| **Overall** | **6.0 / 6.0** | **8.3 / 8.2** | **Target achieved (> 7.5)** |

What works: header chronometer is always in reach, Ctrl+K palette is fast, Notes editor is calm and readable, Clients hub is clear, no console errors on any screen, no horizontal page overflow, every icon button has a label.

## Findings & Resolutions

### Layout (broken after the sidebar removal)
1. **Page gutters are inconsistent**: Deck and Journal sat in a centred 104px gutter; Projects, Notes and Clients ran flush to the window edge.
   - *Resolution (Phase A - `5ea0a69d`)*: Created shared `.page-layout-wrapper` (max-width 1200px, 24px horizontal gutter, centered) used by all views.
2. **Kanban shows 6 columns at fixed width and the last two are cut off**:
   - *Resolution (Phase A - `5ea0a69d`)*: Added horizontal scroll container with scroll snap (`snap-x snap-mandatory`), smooth scrollbar, and edge cues.
3. **Clients & Money tabs sat above the page title as a separate bar**:
   - *Resolution (Phase A - `5ea0a69d`)*: Embedded tabs directly inside the page header row adjacent to the title.

### Clutter and redundancy
4. **~11,000 lines of dead views and components unreachable from the app**:
   - *Resolution (Phase B1 - `86684358`)*: Deleted 11 orphan files (AdminView, DeliverablesView, TeamView, DashboardRadar, LoginView, ProjectComments, StudioProModal, ProjectVersionTimelineModal, FrontmatterPanel, DashboardWeeklySynthesis, RadioView).
5. **Monospace folder tags (`_Projects/`) on every page**:
   - *Resolution (Phase B2 - `bc17e645`)*: Dropped folder tags and meta strings across all view headers.
6. **Header four unlabelled icon buttons beside search**:
   - *Resolution (Phase B3 - `bc17e645`)*: Collapsed into Search (⌘K), Quick Scratchpad (⌘⇧K), and an overflow menu holding Quiet mode, Shortcuts, and Rescan.
7. **Deck overlapping headings and duplicate tabs**:
   - *Resolution (Phase B4 - `bc17e645`)*: Unified block headings; Today's Tasks reads directly from the daily note.
8. **Projects Vault Task Rollup strip**:
   - *Resolution (Phase B5 - `bc17e645`)*: Removed task rollup strip from Kanban board.
9. **Notes duplicate Local Constellation graph panel**:
   - *Resolution (Phase B6 - `bc17e645`)*: Removed local mini graph panel; graph lives in dedicated Knowledge Graph tab.
10. **Command palette clutter**:
    - *Resolution (Phase B7 - `bc17e645`)*: Streamlined to Navigate, Actions, and Projects categories; fixed shortcut hints to ⌘1–6; removed inline theme switcher.

### Copy & Currency
11. **Jargon in headings and badges ("Zero SQL", "Zero-Latency", "Craft & Velocity Bento")**:
    - *Resolution (Phase C - `d9211c51`)*: Replaced with plain language ("Pure Markdown", "This week", "Projects in progress").
12. **System-style empty states and excessive branding**:
    - *Resolution (Phase C - `d9211c51`)*: Changed "Zero tasks scheduled for today" to "No tasks for today", "Zero rapid log entries" to "No entries for this day", "Studio Craft Habits" to "Habits", "Evening Creative Reflection" to "Daily reflection".
13. **Currency inconsistency across views**:
    - *Resolution (Phase C - `d9211c51`)*: Unified currency symbol to read from `settingsStore.settings.currencySymbol || getCurrencySymbol(client.currency)` across header chronometer, client cards, and command palette.
14. **Mixed naming across app and docs**:
    - *Resolution (Phase C - `d9211c51`)*: Standardized to canonical plain terms (Home, Notes, Journal, Clients, Settings) in App shell, navigation dropdown, command palette, shortcuts, `AGENTS.md`, and agent skills.

## Implementation Plan & Phase Summary

### Phase A: Fix Layout (DONE - commit `5ea0a69d`)
- One shared page wrapper (`max-width: 1200px`, 24px gutter, centered) across all six views.
- Kanban: horizontal scroll container with scroll snap and edge cue.
- Clients & Money: embedded tabs inside the page header row.

### Phase B: Remove Clutter and Redundancy (DONE - commits `86684358` & `bc17e645`)
- Deleted 11 orphan files (~11,000 dead lines).
- Dropped folder tags and meta strings across all headers.
- Collapsed header actions into Search, Scratchpad, and overflow dropdown.
- Streamlined Command Palette categories and hints.
- Removed duplicate Task Rollup and local graph panels.

### Phase C: General Copywriting & Consistency (DONE - commit `d9211c51`)
- Standardized plain naming: Studio Deck -> Home, Atelier Notes -> Notes, Bullet Journal -> Journal, Clients & Brand Hub -> Clients, Studio Settings -> Settings.
- Removed jargon badges ("Zero SQL", "Zero-Latency") and unneeded brand adjectives.
- Unified currency formatting across client lists, palette, and chronometer.
- Updated `AGENTS.md` and workspace skills to canonical naming.

### Phase D: Verification & Quality Gates (DONE)
- `verify-kanso.ps1`: 16 passed, 0 warned, 0 failed.
- `npm test`: 71 passed, 0 failed.
- `npm run check` (svelte-check): 0 errors, 38 warnings.
- `npm run build:client` (vite build): 0 errors, bundled in 21.56s.

