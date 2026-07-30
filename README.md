# SuamiSihat Creative Assets Management

Automated workstation setup utility, font installer, brand asset distributor, and standardized creative project folder generator for SuamiSihat design environments.

---

## Technical Overview

SuamiSihat Creative Assets Management (SS-CAM) provides a unified setup wizard to prepare Windows workstations for creative design work. The utility deploys official typography, brand assets, application libraries, and color palettes, while registering an integrated project creation management tool.

### Core Application Capabilities

| Feature Area | Specifications & Functions |
|---|---|
| **Project Creator** | Standardized folder generator with Year Selector, Sub-Brand selection, Auto-Incrementing Job ID tracking, Clipboard integration, and Recent Projects quick-launcher |
| **Template Injection** | Automated deployment of master guidelines and starter canvas templates (`.psd`, `.afdesign`) |
| **Custom Folder Support** | Configurable directory structures (`Client Revisions`, `RAW Audio & 3D`) |
| **Settings & Utility** | Workstation maintenance tools, font repair capabilities, custom workspace configuration, and job counter overrides |
| **Typography Suite** | Core typefaces (Poppins, Calibri, Helvetica Neue, Montserrat) and extended utility typefaces |
| **Brand Assets** | Sub-brand vector logos (SuamiSihat, SS Health, SS Clinic, SS Wellness, SS Ecom, SS Tech) in SVG and PNG formats |
| **Color Palettes** | Swatch definitions provided in `.afpalette` (Affinity) and `.ase` (Adobe Creative Cloud) formats |
| **Design Libraries** | Pre-packaged asset libraries in `.afassets` (Affinity) and `.cclibs` (Adobe Creative Cloud) formats |
| **System Shortcuts** | Pre-configured browser shortcuts to the SuamiSihat Service Dashboard and Internal Assets portals |

---

## Workstation Requirements

Review the workstation hardware requirements prior to deployment. Recommended specifications reflect standard SuamiSihat production environment configurations.

| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Operating System** | Windows 10 (64-bit) | Windows 11 (64-bit) |
| **System Memory (RAM)** | 16 GB | 32 GB or greater |
| **Processor** | 64-bit multi-core CPU | Intel Core i7 / AMD Ryzen 7 (6+ cores) |
| **Graphics Hardware** | DirectX 11 compatible adapter | DirectX 12 GPU with 4 GB VRAM |
| **Storage** | 5 GB available space | NVMe SSD with 100 GB available space |
| **Display** | 1280 × 720 resolution | 1920 × 1080 IPS display or higher |

*Note: Minimum specifications allow software installation, but recommended hardware is advised for optimal performance with high-resolution assets.*

---

## Installation & Deployment Guide

### Step 1: Download Release Package

Obtain the latest compiled installer (`SS-CAM-v1.6.2.exe`) from the [Official Release Repository](https://github.com/SuamiSihat/SS-Designer-Assets/releases/latest).

### Step 2: Execute Deployment Utility

Launch the downloaded installer executable. The deployment process operates in the user context and does not require elevated administrator privileges.

If Windows SmartScreen prompts appear during internal deployment, select **More Info** followed by **Run Anyway**.

### Step 3: Setup Wizard Sequence

The wizard adapts dynamically based on component selection:

| Step | Function | Details |
|---|---|---|
| **1** | **Launch Screen** | Select target components (**Brand Kit** and/or **Creative Project Management**) |
| **2** | **PC Compatibility** | Evaluates workstation hardware against minimum and recommended baselines |
| **3** | **Software Readiness** | Detects installed software (Affinity, Adobe Creative Cloud, Canva, Figma) |
| **4** | **Licence Agreement** | Displays internal end-user licence agreement (*new installations only*) |
| **5** | **Font Deployment** | Select typeface suites or execute **Skip Fonts** |
| **6** | **Asset Location** | Specifies destination folder (default: `Documents\SuamiSihat Brand Assets`) |
| **7** | **Application Overview** | Reviews Creative Project Management deployment settings |
| **8** | **Review & Install** | Provides final summary prior to execution |
| **9** | **Progress** | Live extraction and shortcut registration |
| **10** | **Completion** | Generates system reports; provides direct **Open App** launcher |

---

## Application Configuration Instructions

Following installer completion, configure design applications by importing asset libraries and color swatches.

### Affinity Suite (Designer, Publisher, Photo)

1. **Asset Library Import**:
   - Open **Assets Panel** → Menu → **Import Assets**
   - Target `SuamiSihat Branding.afassets` from the deployed Brand Assets directory.

2. **Color Palette Import**:
   - Open **Swatches Panel** → Menu → **Import Palette → From File**
   - Select `ss_color_theme.afpalette`.

### Adobe Creative Cloud (Photoshop, Illustrator, InDesign)

1. **Creative Cloud Library**:
   - Open **Libraries Panel** → Import `SuamiSihat™ Branding.cclibs`.

2. **Swatch Library Import**:
   - Open **Swatches Panel** → **Open Swatch Library → Other Library**
   - Import target `.ase` files from the `Colour Palettes` directory:
     - `SS Health Primary.ase`
     - `SS Health Secondary.ase`
     - `SS Health Grey Tone.ase`

3. **Restart Application**:
   - Restart Adobe software to ensure newly registered system fonts are enumerated.

### Web & Cloud Applications (Canva, Figma)

Team accounts are authorized via central directory credentials displayed on the software setup screen. Request account access and multi-factor authentication tokens from system administration.

---

## Deployed Directory Structure

```text
Documents\SuamiSihat Brand Assets\
├── Logos\
│   ├── 00_SuamiSihat\
│   ├── 01_ssHealth\
│   ├── 02_ssClinic\
│   ├── 03_ssWellness\
│   ├── 04_ssEcom\
│   └── 05_ssTech\
├── Libraries\
│   ├── SuamiSihat Branding.afassets
│   ├── ss_health_branding.afassets
│   └── SuamiSihat™ Branding.cclibs
├── Colour Palettes\
│   ├── ss_color_theme.afpalette
│   ├── SS Health Primary.ase
│   ├── SS Health Secondary.ase
│   └── SS Health Grey Tone.ase
├── Links\
│   ├── SuamiSihat Service Dashboard.url
│   └── SuamiSihat Internal Assets.url
└── Reports\
    ├── SuamiSihat-Workstation-Report.md
    └── SuamiSihat-Font-Inventory.md
```

Typography files are installed directly to `%LOCALAPPDATA%\Microsoft\Windows\Fonts` and registered in the Windows Registry for seamless application access.

---

## Typographic Specifications

### Core Brand Typefaces

| Index | Family | Usage & Classification |
|---|---|---|
| 1 | **Poppins** | Primary display typeface — headlines, marketing banners |
| 2 | **Calibri** | Secondary typeface — documentation, body text |
| 3 | **Helvetica Neue** | Secondary & structural typeface — user interfaces, technical layouts |
| 4 | **Montserrat** | Tertiary display typeface — supporting accents, labels |

### Extended Typographic Suite

| Typeface | Functional Purpose |
|---|---|
| FontAwesome Pro 5 | Vector icon typography |
| Barcode Suite | Code 128 and 2D barcode generation |
| Futura Std | Display & title graphics |
| Oswald | Compact headlines & condensed typography |
| Roboto | Screen-optimized digital interfaces |
| Trueno | Display accent typography |

---

## Troubleshooting Reference

| Symptom | Resolution Procedure |
|---|---|
| **SmartScreen Notice** | Select **More Info** followed by **Run Anyway** |
| **Fonts Missing in Affinity** | Restart Affinity suite following setup completion |
| **Fonts Missing in Adobe Apps** | Restart Adobe Creative Cloud applications |
| **Unrecognized Software** | Click **Rescan** on the Software Readiness wizard page |
| **Custom Destination Requirements** | Modify output path on Step 6 of the setup wizard |
| **Bypass Font Deployment** | Select **Skip Fonts** on Step 5 of the setup wizard |

---

## System Audit & Workstation Reports

The deployment utility generates two Markdown audit documents stored in the `Reports` directory:

1. `SuamiSihat-Workstation-Report.md`: Hardware specifications, software detection records, and execution logs.
2. `SuamiSihat-Font-Inventory.md`: Comprehensive inventory of deployed typefaces, file formats, and font family metadata.

---

## Standardized Project Directory Structure

Creative projects must adhere to the organizational standard defined in [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md).

```text
SS-2026\
└── 202607_July\
    └── 20260730_D0073_SS_Brand-Assets-Installer\
        ├── Artwork Design\      ← Working source files (.afdesign, .psd, .ai)
        ├── Artwork Mockup\      ← Presentation mockups & client previews
        ├── Assets\              ← Raw photos, icons, reference materials
        └── Production\         ← Exported outputs (PDF, PNG, SVG)
```

---

## Governance & Compliance

Assets and typography bundled within this package are restricted to authorized internal operations. For licensing compliance and usage policies, consult system administration.

For developer build and maintenance documentation, refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

