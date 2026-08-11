# 06 Accessibility QA — SS-CAM

Last updated: 2026-08-11 | Version: v2.6.0

---

## Keyboard Navigation

| Control | Tab Stops | Enter/Space | Escape |
|---------|-----------|-------------|--------|
| NavigationView items | YES | Navigate to page | — |
| ui:Button (primary/secondary) | YES | Activates | — |
| TextBox / SearchBox | YES | — | Clears focus |
| Dropdown (ComboBox) | YES | Opens | Closes |
| PaneFooter rows (NAS, Timer, Theme) | NO (Focusable=False) | N/A | N/A |

## Icon-Only Controls

All icon-only interactive elements MUST have a ToolTip or AutomationProperties.Name.

| Control | Has ToolTip | Status |
|---------|-------------|--------|
| NAS status dot | YES (click to recheck) | PASS |
| Focus timer row | YES | PASS |
| Theme cycle row | YES | PASS |
| Radio play/pause button | YES | PASS |
| Update banner dismiss X | NO | WARN — add ToolTip |

## Cursor Feedback

All clickable non-button elements must carry Cursor="Hand".

- [x] PaneFooter rows
- [x] Profile card
- [x] Version badge
- [x] Dashboard workspace path

## Screen Reader

Not formally tested (v2.6.0). AutomationProperties.Name coverage to be
audited in a future sprint using Accessibility Insights for Windows.

## Status: PARTIAL