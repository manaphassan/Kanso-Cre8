# Code Quality Checks Reference
# Reference for sscam-release-publisher Step 1 health check.
# Last updated: 2026-08-12

## Automated Quality Gates

These gates are enforced by QA/verify-sscam.ps1 and must all be PASS.

### Fluent 2 Compliance

- All user-facing buttons: `<ui:Button Appearance="Primary|Secondary|Danger">`
- All text in page content: `<ui:TextBlock>`
- All elevated surface containers: `<ui:Card>`
- No hardcoded hex colors on surfaces or text in page content areas
- Page title FontSize = 24 (no exceptions)

### Dynamic Color Tokens (required for theme switching)

| Purpose | Correct Token |
|---|---|
| Page background | `{DynamicResource ApplicationPageBackgroundThemeBrush}` |
| Card surface | `{DynamicResource CardBackgroundFillColorDefaultBrush}` |
| Card border | `{DynamicResource CardStrokeColorDefaultBrush}` |
| Text input background | `{DynamicResource TextControlBackground}` |
| Primary text | `{DynamicResource TextFillColorPrimaryBrush}` |
| Secondary text | `{DynamicResource TextFillColorSecondaryBrush}` |
| Brand primary | `{DynamicResource FluentBrand80}` |
| Success | `{DynamicResource SystemFillColorSuccessBrush}` |
| Warning | `{DynamicResource SystemFillColorCautionBrush}` |
| Critical | `{DynamicResource SystemFillColorCriticalBrush}` |

### Code Patterns

| Pattern | Requirement |
|---|---|
| Async operations | Use async/await; never block with .Result or .Wait |
| Exception handling | All catch blocks log with Debug.WriteLine at minimum |
| HttpClient | Single static readonly instance per service |
| Filesystem writes | Validate path, existence, permissions before write |
| NAS operations | Handle offline, timeout, permission errors gracefully |
| Polling timers | Verify no duplicate timers across Loaded/Unloaded cycles |

## Manual Code Quality Review

For each release, verify:

1. No new native WPF controls introduced in page content areas without justification
2. No new hardcoded hex colors introduced outside documented exceptions
3. No new .Result or .Wait calls introduced on the UI thread
4. No new empty catch blocks introduced
5. New features handle Loading, Error, Empty, and Offline states appropriately
