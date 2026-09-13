# Kanso Cre8 (簡素) — Master Brand & Typography Guidelines
### *The Mindful Creative Vault — Design System & Engineering Handoff Manual*

> **Version**: 2.0.0  
> **Author**: Art Direction & Creative Operations Guild  
> **Philosophy**: 簡素 (*Kanso* — Simplicity, Elimination of Clutter, Mindful Craft)  
> **Stack**: Tauri v2 · Svelte 5 (Runes) · Tailwind CSS / Fluent 2 Studio Tokens · Pure Markdown Storage  

---

## ⛩️ 1. Executive Design Philosophy: The Spirit of Kanso

Kanso Cre8 is designed as a zen digital atelier for freelance designers, art directors, and creative operators. It rejects the sensory overload, noisy micro-interactions, and visual clutter typical of corporate SaaS tools.

The brand and interface are built upon three traditional Japanese aesthetic pillars:

1. **Kanso (簡素 — Simplicity)**: Every pixel, token, and typeface must justify its existence. If an element does not accelerate creative focus or provide critical operational clarity, it is eliminated.
2. **Ma (間 — Negative Space & Spatial Silence)**: White space (or deep obsidian void) is not empty; it is the dominant structural medium that allows creative work to breathe and shine.
3. **Shibui (渋い — Subtle, Unobtrusive Mastery)**: Visual components do not compete for attention. Elevation is achieved through 1px hairline borders (`var(--kanso-border)`), never muddy drop shadows. Colors are disciplined and purposeful.

---

## 📐 2. The Handoff Rule: The 24pt Horizon

The cornerstone of the Kanso Cre8 typographic architecture is **The Handoff Rule**. 

```
                               ▲
               DISPLAY LAYER   │   Red Hat Display (≥ 24pt)
               Hero & Openers  │   Weights: 600, 700, 800 | Tracking: -2% to 0%
───────────────────────────────┼─────────────────────────────────────────────
       THE 24PT HORIZON        │   NON-NEGOTIABLE DESIGN BOUNDARY (24px / 24pt)
───────────────────────────────┼─────────────────────────────────────────────
               UI LAYER        │   Nunito (< 24pt)
               App UI & Body   │   Weights: 600, 700, 800 | Tracking: 0% to +5%
                               ▼
```

### The Boundary Specification
- **At 24pt (24px), the Display Layer ends and the UI Layer begins.**
- **Above or at 24pt ($\ge 24\text{pt}$ / $\ge 24\text{px}$)**: Strictly **Red Hat Display**.
- **Below 24pt ($< 24\text{pt}$ / $< 24\text{px}$)**: Strictly **Nunito**.
- **This boundary is absolute and non-negotiable across all viewports, components, and media.**

### Typographic Rationale
* **Why Red Hat Display for $\ge 24\text{pt}$?**:
  Red Hat Display is a geometric display neo-grotesque engineered for high-impact visual presence. Its optical openness, tight aperture balance, and crisp geometric terminals convey confidence, modern art direction, and architectural precision. However, below 24pt its tight apertures and display geometry degrade legibility in dense lists, form fields, and financial tables.
* **Why Nunito for $< 24\text{pt}$?**:
  Nunito is a humanist sans-serif with subtle rounded terminals and expanded counter-spaces. At body and micro sizes (10pt–20pt), it provides effortless reading speed, high micro-contrast, and eliminates visual fatigue during 10-hour sprint days. Above 24pt, its rounded terminals become overly soft and playful, diluting the sharp professional rigor required for studio brand presentations.

---

## 🚫 3. The Single-Line Layer Mixing Law (The #1 Typography Mistake)

> [!WARNING]
> **CRITICAL ANTI-PATTERN**: **Mixing layers within a single line of type is the most common typography mistake — and the most visible one.**

### Why Mixing Layers Fails Visually
1. **X-Height Disparity**: Red Hat Display and Nunito have different x-height proportions. Placing both fonts on the same line creates a broken, jittery optical horizon that makes text appear misaligned even when mathematically centered.
2. **Terminal Incoherence**: Red Hat Display features crisp, sharp corners; Nunito features rounded, organic terminals. Merging them in one headline or phrase creates an amateurish, fragmented aesthetic.
3. **Cap-Height & Baseline Wobble**: Different font bounding boxes cause subpixel baseline drift across browsers and operating systems, creating noticeable vibration during scanning.

### The Immutable Law
* **Rule**: Every continuous typographical element (a single heading, a breadcrumb item, a badge, a button, a table cell, or an inline sentence) must belong **100% to the Display Layer OR 100% to the UI Layer**.
* **Forbidden**: Never nest `<span style="font-family: 'Nunito'">` inside a Red Hat Display headline.
* **Forbidden**: Never apply Red Hat Display to an inline currency symbol (e.g. `RM`) while the price numbers are set in Nunito, or vice-versa.
* **Forbidden**: Never split a sentence across font families on the same baseline.

#### Visual Examples: Correct vs. Incorrect

| Type Expression | Quality | Rule Assessment |
| :--- | :--- | :--- |
| `<h1>Three taps to invoice.</h1>` (All Red Hat Display 56pt) | ✅ **CORRECT** | Pure Display Layer. Consistent x-height and sharp terminals. |
| `<h1>Three taps <span class="font-ui">to invoice</span></h1>` | ❌ **VIOLATION** | **Severe Mistake**: Mixed layers within a single line. Clashing terminals. |
| `<span class="badge">PROOFS READY</span>` (All Nunito 10pt) | ✅ **CORRECT** | Pure UI Layer. Clean rounded caps, high micro-legibility. |
| `<div class="card-title">RM 2,375.00</div>` (All Nunito 20pt) | ✅ **CORRECT** | Pure UI Layer. Consistent numeric tabular alignment. |
| `<h3>Project 001 <span class="badge">REVIEW</span></h3>` | ✅ **CORRECT** | Distinct typographic blocks: `<h3>` is 28pt (Red Hat), badge is a separate child block (10pt Nunito). Not inline mixed text. |

---

## 📊 4. Master Typographic Scale & Metric Reference

![Display Layer Spec](C:\Users\harus\.gemini\antigravity\brain\f5a29839-381a-4e32-b26c-5c6d8bc9ce8a\brand_display_layer_spec.png)
![UI Layer Spec](C:\Users\harus\.gemini\antigravity\brain\f5a29839-381a-4e32-b26c-5c6d8bc9ce8a\brand_ui_layer_spec.png)

### Complete Specification Table

| Level | Token / Class | Size / Line-Height | Weight | Tracking | Primary Usage Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DISPLAY LAYER** | *Red Hat Display* | *≥ 24pt* | *≥ 600* | *Tight* | **Exclusively Display & Structural Headlines** |
| `DISPLAY/XL` | `.type-display-xl` | **96px / 104px** | **ExtraBold (800)** | `-2% (-0.02em)` | Hero impact copy, large outdoor spreads, splash openers |
| `DISPLAY/LG` | `.type-display-lg` | **72px / 80px** | **Bold (700)** | `-2% (-0.02em)` | Section opener headlines, portfolio cover titles |
| `H1` | `.type-h1` | **56px / 64px** | **Bold (700)** | `-1% (-0.01em)` | Major view titles, primary case study headings |
| `H2` | `.type-h2` | **40px / 48px** | **Bold (700)** | `-1% (-0.01em)` | Major sub-heads, executive bento titles |
| `H3` | `.type-h3` | **28px / 36px** | **SemiBold (600)** | `0% (Normal)` | Modal headers, card titles, section division openers |
| ═════════════ | ═══════════════ | ══════════════════ | ═══════════ | ═══════════ | **─── THE 24PT HANDOFF HORIZON (NON-NEGOTIABLE) ───** |
| **UI LAYER** | *Nunito* | *< 24pt* | *600–800* | *Normal–Wide* | **Exclusively App UI, Body Copy, Inputs, Tables** |
| `BODY/LG` | `.type-body-lg` | **20px / 30px** | **SemiBold (600)** | `0% (Normal)` | Lead paragraph copy, view introduction briefs, manifesto body |
| `BODY` | `.type-body` | **16px / 24px** | **SemiBold (600)** | `0% (Normal)` | Default body text, form input minimum (prevents iOS auto-zoom) |
| `BODY/SM` | `.type-body-sm` | **14px / 20px** | **SemiBold (600)** | `0% (Normal)` | Secondary metadata, supporting copy, table cells, comments |
| `CAPTION` | `.type-caption` | **12px / 16px** | **Bold (700)** | `+1% (+0.01em)` | UI metadata, timestamps, helper hints, breadcrumb crumbs |
| `LABEL` | `.type-label` | **10px / 14px** | **ExtraBold (800)** | `+5% (+0.05em)` | Pills, status tags, micro-labels, uppercase badges |

---

## 🎨 5. Color Architecture: The 60 / 30 / 10 Rule

Kanso Cre8 governs color harmony using the classic architectural **60 / 30 / 10 Rule**. This prevents visual noise and preserves the serene, distraction-free atmosphere of the studio.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   60% DOMINANT CANVAS                                                       │
│   Background, Negative Space, Atmospheric Canvas Void                      │
│   Obsidian [#09090B] / Daylight [#F8FAFC]                                  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                                                             │           │
│   │   30% STRUCTURAL SCAFFOLDING                                │           │
│   │   Cards, Sidebars, Hairline Borders, Secondary Typography   │           │
│   │   Surface [#18181B] · Border [#27272A] · Text [#F4F4F5]     │           │
│   │                                                             │           │
│   │   ┌───────────────────┐                                     │           │
│   │   │  10% ACCENT SPARK │                                     │           │
│   │   │  CTAs, Timer,     │                                     │           │
│   │   │  Live Swatches    │                                     │           │
│   │   │  [#38BDF8]        │                                     │           │
│   │   └───────────────────┘                                     │           │
│   └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Three Spatial Tiers

#### 1. The 60% Tier: Dominant Canvas Foundation
- **Visual Share**: Approximately 60% of the viewport.
- **Tokens**:
  - Dark Obsidian: `var(--kanso-canvas)` $\rightarrow$ `#09090B` (or `#0C0D10` Kai-Zen)
  - Daylight Studio: `var(--kanso-canvas)` $\rightarrow$ `#F8FAFC`
- **Application**: The root viewport, window margins, deep canvas background, and the empty space separating cards.
- **Aesthetic Role**: Provides *Ma* (間). Establishes ocular calm, eliminates glare, and reduces eye strain during 12-hour design sprints.

#### 2. The 30% Tier: Structural Scaffolding & Content
- **Visual Share**: Approximately 30% of the viewport.
- **Tokens**:
  - Surfaces: `var(--kanso-surface)` $\rightarrow$ `#18181B` (Dark) / `#FFFFFF` (Light)
  - Hover States: `var(--kanso-surface-hover)` $\rightarrow$ `#27272A` (Dark) / `#F1F5F9` (Light)
  - Hairline Borders: `var(--kanso-border)` $\rightarrow$ `1px solid #27272A` (Dark) / `1px solid #E2E8F0` (Light)
  - Primary Content: `var(--kanso-text-primary)` $\rightarrow$ `#F4F4F5` / `#0F172A`
  - Muted Metadata: `var(--kanso-text-muted)` $\rightarrow$ `#71717A` / `#64748B`
- **Application**: Bento metric cards, sidebar docks, navigation headers, modal dialogs, data table rows, task lists.
- **Aesthetic Role**: Provides architecture, containment, and legibility without competing with the user's creative assets.

#### 3. The 10% Tier: Focal Kinetic Spark & Intentional Accents
- **Visual Share**: Exactly 10% of the viewport. Never exceed 12%.
- **Tokens**:
  - Primary Brand Accent: `var(--kanso-accent)` $\rightarrow$ `#38BDF8` (Sky) or `#043388` / `#21A1F7` (Kai-Zen)
  - Active Chronometer Pulse: Live glowing green badge (`+RM 0.00`)
  - Status Indicators: Emerald (`#10B981` Paid/Done), Amber (`#F59E0B` In Review), Crimson (`#EF4444` Urgent)
  - Active Client Swatch Strip: 1-click active client color beacon
- **Application**: Primary CTA buttons ("New Project", "Save Changes", "Approve Deliverable"), play/stop toggle on the header chronometer, live cassette spool rotation, active navigation indicator.
- **Aesthetic Role**: Guides the designer's gaze instantly to the single most critical action or status indicator on the screen.

---

## 🛠️ 6. Component Implementation Guide

### 6.1 Header Bar & Billable Chronometer
- **Logo Wordmark**: `font-family: var(--font-display); font-weight: 800; font-size: 14px;` (Pure brand mark).
- **Chronometer Counter**: `font-family: var(--font-ui); font-size: 14px; font-variant-numeric: tabular-nums;`
- **Live Earning Pill**: `font-family: var(--font-ui); font-size: 11px; font-weight: 800;` (Nunito).
- **Color Balance**: Header is 30% structural surface; Play/Record trigger and Live Earning Pill represent the 10% kinetic accent.

### 6.2 Studio Deck (Executive Dashboard Bento)
- **Deck Title ("Studio Deck")**: `.deck-title` $\rightarrow$ 24px, Red Hat Display, Bold (Display Layer).
- **Section Headers ("Today's Tasks", "Design Craft Metrics")**: 16px–18px, Nunito, Bold (UI Layer).
- **Financial Metric ("RM 2,375.00")**: 20px–22px, Nunito, ExtraBold (UI Layer, Tabular figures).
- **Task Items & BuJo Bullets**: 13.5px, Nunito, Regular & SemiBold (UI Layer).

### 6.3 Retro Cassette Focus Radio
- **Chassis Surface**: 30% structural zinc/obsidian shell with metallic corner screws.
- **Spool Wheel Hubs**: Precision dual 6-spoke gear spindles rotating at 33 RPM via CSS keyframes.
- **Frequency Badge ("98.4 FM")**: 10% accent punch in warm amber or electric sky.
- **Stream Name ("Chillhop Cafe")**: 12px, Nunito, SemiBold (UI Layer).

### 6.4 Form Inputs & Buttons
- **Standard Input**: Minimum font size **16px** (Nunito SemiBold) to strictly prevent mobile/tablet auto-zoom on iOS/Android WebKit.
- **Action Buttons**: Nunito ExtraBold, `var(--kanso-accent)` fill, hairline border, 0px blurry shadow.

### 6.5 Studio Brand Dossier & Commercial Stationery
- **Atelier Monogram & Logo**: Studio logo rendered cleanly with max-height 38px–48px, or fallback 2-letter uppercase monogram (`.studio-monogram`) styled in Nunito ExtraBold on a subtle tinted square.
- **Official Registration Badge**: Uppercase monospace or Nunito Bold caption badge displaying legal business registration identity (e.g. `REG NO: 202603091122-A`), tracking `+0.05em`.
- **Wire Remittance Deck**: Clean tabular block with Bank Name, high-contrast monospace Account Number, Account Holder, SWIFT/BIC Code, and DuitNow / QR identifier.
- **Authorized Digital Signature & Colophon**:
  - Signature rendered with cursive script typography or vector SVG signature asset over a 1px solid hairline line (`var(--kanso-border)`).
  - Signer title and issuance timestamp in Nunito Caption (`12px`, muted).
  - Minimalist uppercase colophon badge (`10px`, tracking `+0.05em`) verifying atelier document integrity (*"GENERATED VIA KANSO CRE8 ATELIER DESK"*).

---

## 🔒 7. Client Privacy & Sample Profiles

Kanso Cre8 strictly enforces client data privacy across all public documentation, mock datasets, tests, and screenshots. Real client names are strictly forbidden.

Always utilize the canonical triumvirate:
1. **Acme Corp** (`ACME`) — Acme Corporation · Tech / B2B · Accent: `#043388`
2. **Nexus Studio** (`NEX`) — Nexus Studio · Game Art & Motion · Accent: `#10B981`
3. **Lumina Labs** (`LUM`) — Lumina Labs · Bio-Tech & R&D · Accent: `#F59E0B`

---

## 🧪 8. Governance & Automated Linting

To ensure the Handoff Rule and 60/30/10 Color Rule are never violated, all code commits must pass automated verification.

### Run Brand & Architecture Guardian
```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1
```
*Requirement*: All 10 checks must report `PASS` with `0 warned / 0 failed`.

### Run Unit Test Suite
```powershell
npm test
```
*Requirement*: 45/45 automated unit tests must pass.

### Handoff Rule Linting Check (Chrome CDP)
Run the headless Chrome verification runner:
```powershell
node scratch/verify_typography.js
```
*Requirement*:
- Computed `font-family` on all elements $\ge 24\text{pt}$ must resolve to `"Red Hat Display"`.
- Computed `font-family` on all elements $< 24\text{pt}$ must resolve to `"Nunito"`.
- Zero inline mixing within the same typographical DOM element.
