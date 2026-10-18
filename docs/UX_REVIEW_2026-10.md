# UX review and improvement plan (2026-10-19)

Method: built the client, ran the server against a throwaway copy of the sample workspace, drove Edge at 1360x850 through all six screens, the hamburger menu and the command palette. Also ran static checks (orphan scan, copy scan, line counts). Not tested: Quotes/Invoices detail flows, Project Detail tabs, Android, light and neumorphic themes, real timed tasks.

## Scores

Scale 1-10, from first-use impressions of the six main screens. Not a substitute for timed sessions with real users.

| Criterion | Freelance designer | Editor (reviews and edits copy and proofs) |
|---|---|---|
| Clarity at first glance | 6 | 6 |
| Speed to the daily action (log time / write / review) | 8 | 7 |
| Visual polish and consistency | 5 | 5 |
| Copy: plain and general | 5 | 5 |
| Clutter and redundancy | 5 | 6 |
| Core task fit (clients, quotes, invoices / notes, proofs) | 7 | 7 |
| **Overall** | **6.0** | **6.0** |

What works: header chronometer is always in reach, Ctrl+K palette is fast, Notes editor is calm and readable, Clients hub is clear, no console errors on any screen, no horizontal page overflow, every icon button has a label.

## Findings

### Layout (broken after the sidebar removal)
1. Page gutters are inconsistent. Deck and Journal sit in a centred 104px gutter; Projects, Notes and Clients run flush to the window edge with text touching the left border.
2. Kanban shows 6 columns at fixed width and the last two are cut off with no clear scroll cue.
3. Clients & Money tabs (Clients, Quotes, Invoices) sit above the page title as a separate bar, so the page has two headers.

### Clutter and redundancy
4. About 11,000 lines of dead views and components are not reachable from the app: AdminView (3225), DeliverablesView (1958), TeamView (1738), DashboardRadar (1261), LoginView (806), ProjectComments (799), StudioProModal (560), ProjectVersionTimelineModal (406), FrontmatterPanel (323), DashboardWeeklySynthesis (172), RadioView (126). They violate the 400-line cap and the Clean Deprecation Rule.
5. Every page repeats a header stack: monospace folder tag (`_Projects/`), a meta string, a title and a subtitle sentence. The folder tag is developer detail.
6. Header holds four unlabelled-purpose icon buttons (scratchpad, sparkle, lightbulb, refresh) beside search. Sparkle is Quiet mode, lightbulb is shortcuts, refresh is rescan. Rescan is redundant with live file watching.
7. Deck has two overlapping headings per block (small caps label plus a title), a Journal/Notes tab pair inside Today's Tasks, and a "uncompleted tasks" banner that competes with the task list.
8. Projects shows a Vault Task Rollup strip above the board, duplicating Notes tasks and the Deck.
9. Notes shows a Local Constellation graph panel under every note, plus a separate Knowledge Graph tab.
10. Command palette lists theme switching, swatches and nav in one list, and its placeholder says Ctrl+1-9 while only 6 shortcuts exist.

### Copy
11. Jargon in headings and badges: "Zero SQL", "Zero-Latency Web Audio", "Mechanical Hi-Fi Focus Deck", "Atelier Environment", "Craft & Velocity Bento", "Design Telemetry", "Executive Overview", "Active Campaigns". 54 all-caps badges across components.
12. "Zero tasks scheduled for today" and "Zero rapid log entries" read as system messages; "Mindful", "Evening Creative Reflection" and "Studio Craft Habits" are branding, not function.
13. Money is inconsistent for the same client: header shows RM150/h, Clients card shows MYR 180/hr, palette shows $150/h, £140/hr and S$160/hr.
14. Mixed naming: Atelier Notes vs Notes, Studio Deck vs Deck, Clients & Brand Hub vs Clients & Money, BuJo vs Bullet Journal.

## Plan

Principles: remove before adding, one title per page, plain words, one currency per vault, tokens only.

### Phase A: fix layout (DONE 2026-10-19)
- A1. One shared page wrapper (max-width 1200px, 24px gutter, centred) used by all six views. Remove per-view padding.
- A2. Kanban: horizontal scroll container with scroll-snap and a visible edge fade; collapse empty columns to a slim rail.
- A3. Clients & Money: move tabs inside the page header row, beside the title.

### Phase B: remove clutter and redundancy
- B1. Delete the 11 orphan files listed in finding 4 (separate commit, after confirming no imports).
- B2. Page header becomes title plus at most one short subtitle. Drop the folder tag and meta string everywhere.
- B3. Header actions: keep Search, Scratchpad, one overflow menu holding Quiet mode, Shortcuts, Rescan. Remove sparkle, lightbulb and refresh as top-level buttons.
- B4. Deck: one heading per block; Today's Tasks reads from the daily note only (drop the Journal/Notes tab pair); fold the migration banner into one line above the list.
- B5. Projects: remove the Task Rollup strip (tasks live in Journal and Deck).
- B6. Notes: show the local graph only in the Knowledge Graph tab; keep a single "Linked notes" list under the note.
- B7. Command palette: Navigate, Actions, Projects only; move themes to Settings; fix the shortcut hint to 1-6.

### Phase C: general copywriting
Rename once, everywhere (UI, docs, palette, breadcrumbs):

| Now | Proposed |
|---|---|
| Studio Deck / Executive Overview | Home |
| Craft & Velocity Bento / Design Telemetry | This week |
| Active Campaigns / Project Status at a Glance | Projects in progress |
| Atelier Notes | Notes |
| Bullet Journal | Journal |
| Clients & Brand Hub | Clients |
| Studio Settings / Atelier Environment | Settings |
| Zero tasks scheduled for today | No tasks for today |
| Evening Creative Reflection | Daily reflection |
| Studio Craft Habits | Habits |
| Zero SQL / Zero-Latency / Hi-Fi (badges) | Remove |

Rules: sentence case, no all-caps badges except status chips, no brand adjectives (mindful, zen, atelier) in UI, verbs on buttons.
Money: one vault currency from Settings; header, Clients, palette and invoices all read from it. Demo data uses the sample clients with the same rate everywhere.

### Phase D: verify
- Re-run the screenshot pass at 1360x850 and 900x700, light theme included.
- Re-score with the same rubric. Targets: layout consistency 8, copy 8, clutter 8, overall 7.5+.
- Gates per task: verify-kanso 16/0/0, svelte-check 0 errors, server tests 71 pass.

## Decision needed
Renaming "Studio Deck" to "Home" and "Atelier Notes" to "Notes" touches AGENTS.md, the skills and the command palette. Confirm before Phase C.
