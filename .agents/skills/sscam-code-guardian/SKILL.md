---
name: sscam-code-guardian
description: >
  Validates SS-CAM source before any edit or commit. Enforces UTF-8 BOM,
  checks Fluent 2 compliance, hardcoded paths, silent catches, and UI
  thread blocking. Trigger: any src/SS-CAM change, "verify", "pre-commit".
---

# SS-CAM Code Guardian

## When to Activate

Run this skill BEFORE:
1. Making any change to src/SS-CAM
2. Building a release exe
3. Committing to git
4. Telling the user a fix is complete

## Protocol

### 1. Run Verification

```powershell
.\QA\verify-sscam.ps1
```

Exit 1 = FAIL. Fix all FAIL items before proceeding.
To auto-fix encoding: `.\QA\verify-sscam.ps1 -Fix`

### 2. Encoding Rules (CRITICAL)

- Files with chars above U+007F MUST have UTF-8 BOM
- XAML attribute strings above U+00FF: use XML entities (&#xNNNN;)
- C# comments: use ASCII (-> not arrow, -- not em-dash)

### 3. Fluent 2 Rules

- Interactive: <ui:Button> not <Button>
- Colors: {DynamicResource FluentXxx} not hardcoded hex in Views
- NavigationView stays as root shell
- Clickable non-buttons: Cursor="Hand" + ToolTip
- Non-interactive PaneFooter: Focusable="False"

### 4. Safety Rules

- No hardcoded paths (D:\, C:\Users)
- No empty catch {} without comment
- No .Result or .Wait() on UI thread
- No new HttpClient() per call

## Script Reference

`QA/verify-sscam.ps1` | `.agents/skills/sscam-code-guardian/scripts/verify-sscam.ps1`