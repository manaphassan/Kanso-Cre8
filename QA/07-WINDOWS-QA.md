# 07 — Windows Platform QA

Last updated: 2026-08-12 | Version: v3.1.0

---

## Tested Configurations

| OS | DPI | Theme | Result |
|----|-----|-------|--------|
| Windows 11 23H2 | 100% | Dark | PASS |
| Windows 11 23H2 | 125% | Light | PARTIAL — some icon sizes shift |
| Windows 10 22H2 | 100% | Dark | PASS |

## DPI Awareness

Application declares PerMonitorV2 awareness via app.manifest (WPF-UI default).
High-DPI scaling tested at 125% — navigation icons shift 1–2 px.

## Startup Checks

- [x] Single-file exe launches from Downloads, Desktop, USB
- [x] No installer / extraction step required
- [x] Registers to Start Menu on first launch
- [x] Copies self to %LocalAppData%\Programs\SuamiSihat\

## Filesystem Permissions

- [x] Write to %AppData%\SuamiSihat\ (profile, theme, notes)
- [x] Write to workspace root (project folder creation)
- [x] Read-only mode gracefully handled when NAS offline

## Encoding

- [x] All source files UTF-8 BOM (fixed v2.6.0)
- [x] No mojibake in release binary (verified v2.6.0)
- [x] System locale-independent string rendering

## Status: PARTIAL (DPI scaling at 125% needs polish)