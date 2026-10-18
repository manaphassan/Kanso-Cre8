---
name: kanso-ui-minimal
description: >
  UI and UX rules for Kanso Cre8: six-item navigation, component budget, token-only color,
  single icon system with the emoji-to-icon map, copy rules, accessibility minimums and the
  400-line component cap. Trigger: any change to views, components, styles, icons, copy,
  layout, themes, or when removing emoji, hex colors or mojibake.
---

# Kanso UI Minimal

## Principle

Kanso (simplicity). Remove before adding. One primary action per screen. Calm, tactile, fast (under 16 ms interactions).

## Navigation (six items, no more)

1. Deck (dashboard)
2. Projects (Kanban and Table; Review and Copy are tabs inside a project)
3. Journal
4. Notes (Scratchpad inside)
5. Clients & Money (tabs: Clients, Quotes, Invoices)
6. Settings (tabs: Studio, Preferences, Vault, About)

### Shell: Raycast-inspired, NO sidebar

- Never add a sidebar, nav rail, or icon rail, at any width. Content is full-width under the 48px header.
- Navigation is a hamburger button at the left of the header that opens a floating dropdown (`.nav-dropdown`, ~280px, surface + 1px border, z-index 600). It holds the brand, the six items with Ctrl+1..6 hints, and the Mini-Cassette Dock.
- Close on item pick, outside click, or Esc. Open state is `appState.viewSwitcherOpen`. Hamburger needs `aria-label`, `aria-haspopup="menu"`, `aria-expanded`.
- Radio is the 40px Mini-Cassette Dock in that dropdown footer; it opens the full cassette as a drawer. Ctrl+K command palette is the only power entry.
- The dock adapts via container query (under 230px it hides badge and title) so transport controls never clip.

## Component budget

- Studio Deck keeps 5 blocks in this order: Today's Tasks, Design Metrics Bento (max 4 tiles: hours, effective rate, first-time-right, velocity), Project Status at a Glance, Smart Suggestions (one line unless there is an alert), Total Income and Cashflow.
- Header chronometer: Play and Stop, `HH:MM:SS`, one compact rate control with `+$` earnings, active client swatch with 1-click HEX copy, Append Session on stop.
- Project views: Kanban and Table only. Filters live in one popover.
- Empty state: one line, one icon, one button.
- Max 2 font weights per screen. No decorative gradients. No pro or upsell badges in navigation.
- A Svelte component file is at most 400 lines. Split by feature, move code, do not rewrite behavior.

## Color and surface

- Only `var(--kanso-*)`: canvas, surface, surface-hover, border, text-primary, text-muted, accent, success, warning, danger, plus spacing, radius, type, motion tokens from `kanso-tokens.css` (the only token file).
- Zero hex in `.svelte`, `.ts` or inline styles. Allowed data exceptions: client color read from `client.md`, canvas drawing colors resolved from CSS variables at runtime, cassette artwork.
- Flat themes: `1px solid var(--kanso-border)`, no heavy shadow. Neumorphic themes: `var(--neu-shadow-raised)` and `var(--neu-shadow-inset)`.
- Four themes must work: light, dark, neumorphic, neumorphic-dark.

## Icons

One component: `ui/Icon.svelte`, usage `<Icon name="folder" size={16} />`, `currentColor`, 1.5px stroke, 24px grid. Never add a second icon source, icon font, or inline emoji.

Emoji-to-icon map (use exactly):

| Emoji | Icon name |
|---|---|
| folder, open folder | `folder` |
| calendar | `calendar` |
| lightning | `bolt` |
| target | `target` |
| palette | `palette` |
| package | `package` |
| warning | `alert` |
| bulb | `lightbulb` |
| trash | `trash` |
| memo, page, clipboard | `file` |
| check mark | `check` |
| cross | `close` |
| bell | `bell` |
| speech bubble | `message` |
| magnifier | `search` |
| chart | `chart` |
| gear | `settings` |
| building | `building` |
| people | `users` |
| lock, shield | `lock` |
| money bag | `wallet` |
| fire | `flame` |
| star | `star` |
| music note | `music` |
| arrows | `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down` |
| green or red dot | `<span class="dot dot-success">` or `dot-danger` |

If a needed icon is missing, add one path to `Icon.svelte` in the same style and note it in the commit. Allowed text glyphs: Bullet Journal symbols inside the Journal rapid log only. Keyboard hints are text (`Ctrl`, `Shift`, `Enter`). Docs and commit messages contain no emoji.

## Mojibake

Detect: `Ã`, `â€`, `ðŸ`, `�`, `ç°¡`. Fix by rewriting the text in clean ASCII (or the intended character if it is the product kanji in a single brand string). Never copy a corrupted string forward. Save files as UTF-8 without BOM except where a tool requires it.

## Copy

Sentence case. Buttons start with a verb. No exclamation marks, no filler. Errors say what happened and what to do. Empty states are one line.

## Accessibility minimums

Visible focus ring from `--kanso-accent`. 4.5:1 text contrast in all four themes. Every icon-only button has `aria-label`. Full keyboard path for every flow. Svelte a11y warnings equal zero. Respect `prefers-reduced-motion` (cassette spools stop).

## Retro Cassette (keep faithful)

4 corner screws, trapezoid head and roller, Side A label, tape window, dual 6-spoke spools at 33 RPM while playing, favorites rack with active indicator, 25-minute Pomodoro. Restyle with tokens, do not redesign the mechanics.

## Done-when

Six nav items, no file over 400 lines, no hex, no emoji, no mojibake, one Icon component, four themes pass visual review, the guardian script is green.
