---
name: sscam-qa
description: Automate and document safe QA for the SS-CAM WPF .NET Framework 4.8 desktop app. Use for QA runs, smoke tests, regression testing, build verification, defect triage, or requests to validate a feature, page, release, NAS/filesystem behaviour, Fluent 2 UI, accessibility, security, performance, or Windows behaviour.
---

# SS-CAM QA

Use this workflow to produce evidence, not an assumed result. Treat user files, NAS shares, and production workspaces as out of scope unless the user explicitly names them.

## 1. Scope the QA run

1. Inspect the changed feature, its callers, existing tests, and the relevant documents in `QA/`.
2. Select the smallest relevant coverage from the QA suite: `01-ARCHITECTURE.md` for layering, `02-FUNCTIONAL-TESTS.md` for workflows, `03-COMPONENT-AUDIT.md` through `07-WINDOWS-QA.md` for UI, and `08-SECURITY.md` plus `09-PERFORMANCE.md` for safety and responsiveness.
3. State the scope and test environment. Use `QA/TestWorkspace` or a newly-created temporary directory for filesystem tests. Never test against a real NAS workspace by default.

## 2. Run the automated baseline

From the repository root, run:

```powershell
.\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1
```

Use `-Build` after code changes or before a release candidate:

```powershell
.\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Build -Configuration Release
```

The runner invokes `QA/verify-sscam.ps1` and, when requested, MSBuild for `src/SS-CAM/SS-CAM.csproj`. It reports `PASS`, `FAIL`, `WARN`, or `BLOCKED`; it does not alter source files, QA records, or user data.

Stop and resolve a `FAIL` before declaring completion. Treat `WARN` as a documented risk and assess it against the changed feature.

## 3. Test the affected workflow

Build and launch the app where possible. Verify the real outcome, including the resulting filesystem state for create, copy, save, or status-change operations.

- Exercise default, empty, invalid, error, loading, and success states relevant to the change.
- For NAS/network work, test an unavailable or invalid path without blocking the UI; do not depend on a live share.
- For UI work, check keyboard access, visible focus, accessible name or tooltip for icon-only controls, disabled state, and Fluent 2 resource use.
- For asynchronous work, inspect for UI-thread blocking, cancellation or timeout behaviour, and repeated timer/polling leaks.
- Record `BLOCKED` if the environment cannot perform a necessary test. Do not convert code inspection into a passing runtime test.

## 4. Record and hand off evidence

Summarize the exact commands, environment, observed result, and test status using only `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, or `N/A`.

For a defect, add a concise entry to `QA/10-FIX-LOG.md` only after confirming the issue and its fix. Update the relevant QA document when its recorded status has genuinely changed. Do not change `FINAL-QA-REPORT.md` to `PASS` without the required evidence.

For release QA, run this skill first, then use `$sscam-release-manager` for versioning, packaging, and tagging.
