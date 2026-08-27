# SS-CAM QA Suite
**Application:** SuamiSihat Creative Assets Management (SS-CAM)
**Version under review:** v4.4.3
**QA Lead:** Brand / Creative & Brand Team
**Date initiated:** 2026-08-27

---

## Purpose
This folder contains the complete quality assurance record for SS-CAM — a WPF .NET 4.x desktop application built for the SuamiSihat creative team. It covers architecture, functional correctness, component integrity, accessibility, security, performance, and Windows platform behaviour.

---

## Document Index

| # | File | Scope |
|---|---|---|
| — | `README.md` ← you are here | Index & process |
| 01 | `01-ARCHITECTURE.md` | Codebase structure, layer separation, dependency map |
| 02 | `02-FUNCTIONAL-TESTS.md` | Page-by-page feature test cases with pass/fail |
| 03 | `03-COMPONENT-AUDIT.md` | WPF controls, custom styles, resource dictionary audit |
| 04 | `04-TERMINOLOGY.md` | Naming conventions, Malay/English consistency, icons |
| 05 | `05-DUPLICATION.md` | Repeated code, copy-paste patterns, refactor candidates |
| 06 | `06-ACCESSIBILITY.md` | Keyboard navigation, contrast ratios, screen reader support |
| 07 | `07-WINDOWS-QA.md` | DPI scaling, multi-monitor, taskbar, Windows 11 compatibility |
| 08 | `08-SECURITY.md` | Local data storage, network calls, credentials, file paths |
| 09 | `09-PERFORMANCE.md` | Startup time, memory, UI thread blocking, timer accuracy |
| 10 | `10-FIX-LOG.md` | Defects found during QA and their resolution status |
| — | `FINAL-QA-REPORT.md` | Executive summary, sign-off, known issues |

---

## QA Process

```
Build v3.0.0 dist
      │
      ▼
01 Architecture review  ──→  02 Functional tests (manual)
      │                              │
      ▼                              ▼
03 Component audit      ──→  04 Terminology check
      │                              │
      ▼                              ▼
05 Duplication scan     ──→  06 Accessibility check
      │                              │
      ▼                              ▼
07 Windows platform QA  ──→  08 Security review
      │                              │
      ▼                              ▼
09 Performance profiling ─→  10 Fix log (iterate)
      │
      ▼
FINAL-QA-REPORT.md  →  Sign-off  →  Tag release
```

---

## Status Legend used across all documents

| Symbol | Meaning |
|---|---|
| ✅ | Pass |
| ❌ | Fail — blocker |
| ⚠️ | Warning — non-blocking |
| 🔵 | Info / observation |
| ⏳ | Not yet tested |
| 🔧 | Fixed |

---

## Build under test

```
Executable : src\SS-CAM\bin\Release\SS-CAM.exe / dist\SS-CAM-v3.6.1.exe
Size       : ~5.24 MB (Costura single-file, all DLLs embedded)
Framework  : .NET Framework 4.8 (CLR 4.0.30319)
UI Library : WPF-UI / Fluent 2 (Wpf.Ui v3.0.4)
Commit     : SS-Master branch
```
