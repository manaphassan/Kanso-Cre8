---
name: sscam-fluentui-web
description: >
  Comprehensive guide and design system reference for Microsoft Fluent UI Web (Fluent 2) in SS-CAM Web Portal (SS-CAM.Web).
  Covers repo breakdown of github.com/microsoft/fluentui, Fluent 2 web design tokens, Web Components, typography scale, elevation/shadows, component standards, and accessibility.
  Trigger: "fluentui web", "fluent ui web", "fluent 2 web", "fluentui", "web design system".
---

# Microsoft Fluent UI Web (Fluent 2) Skill for SS-CAM

This skill defines the official implementation standards for **Microsoft Fluent UI Web (Fluent 2)** in the **SS-CAM Web Portal** (`src/SS-CAM.Web`), referencing the official [`github.com/microsoft/fluentui`](https://github.com/microsoft/fluentui) repository.

---

## 1. Core Principles

1. **Tokenized CSS Properties**: Always map official Microsoft Fluent 2 token custom properties (`--colorNeutralBackground1`, `--colorBrandBackground`, `--colorNeutralForeground1`, `--shadow4`, `--shadow16`, `--borderRadiusMedium`) alongside brand aliases.
2. **Framework Alignment**: Design tokens and component specifications strictly conform to Fluent UI Web v9 / Fluent 2 Web standards.
3. **Responsive Glassmorphism & Elevation**: Support light (`Falconia`) and dark (`Metamorphosis`, `Catppuccin`) modes with subtle backdrop blurs (`--glass-blur`) and crisp border strokes.
4. **Accessible Micro-Interactions**: Hover-lift transitions, active filter pill highlights, and toast notifications must maintain high visual contrast and keyboard accessibility.

---

## 2. Reference Guidelines

For complete design system token tables, shadow ramps, typography specifications, and component standards, see:
- [`fluentui-web-guideline.md`](file:///e:/Dev/Projects/SS-Brand-Assets/.agents/skills/sscam-fluentui-web/references/fluentui-web-guideline.md)
- [`HERO-BANNER-BACKGROUND.md`](file:///e:/Dev/Projects/SS-Brand-Assets/docs/HERO-BANNER-BACKGROUND.md) (Canonical default background component for all Hero Banners)

---

## 3. Verification Protocol

After modifying any Web Portal HTML, CSS, or JS files:

1. **Run Source Guardian Audit**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\QA\verify-sscam.ps1 -Fix
   ```
2. **Run Desktop & Portal QA Build**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Build -Configuration Release
   ```
