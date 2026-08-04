# SuamiSihat Creative Assets Management

Automated workstation setup utility, font installer, brand asset distributor, and standardized creative project folder generator for SuamiSihat design environments.

---

## Technical Overview

SuamiSihat Creative Assets Management (SS-CAM) provides a unified setup wizard to prepare Windows workstations for creative design work. The utility deploys official typography, brand assets, application libraries, and color palettes, while registering an integrated project creation management tool.

### Core Application Capabilities

| Feature Area | Specifications & Functions |
| --- | --- |
| **Dashboard** | Workspace metrics, project-type and sub-brand charts, six-month activity, storage totals, and designer-to-project workflow overview |
| **Project Creator** | Standardized folder generator with Year Selector, full Sub-Brand labels, suffix-format Job IDs (`0001D`, `0001S`), Clipboard integration, and Recent Projects quick-launcher |
| **Template Injection** | Automated deployment of master guidelines and starter canvas templates with built-in and custom file extensions |
| **Search & Copy** | Project-folder name search with designer filtering, rendered or raw `README.md` preview, project file browser, and controlled asset copying into active work orders |
| **Custom Folder Support** | Optional `Client Revisions` and `RAW Media` directories |
| **Settings & Utility** | Workstation maintenance tools, font repair capabilities, custom workspace configuration, and job counter overrides |
| **Typography Suite** | Core typefaces (Poppins, Calibri, Helvetica Neue, Montserrat) and extended utility typefaces |
| **Brand Assets** | Conditional in-app module for installed colour palettes, design libraries, logos, official links, and rendered Markdown installation reports |
| **Color Palettes** | Swatch definitions provided in `.afpalette` (Affinity) and `.ase` (Adobe Creative Cloud) formats |
| **Design Libraries** | Pre-packaged asset libraries in `.afassets` (Affinity) and `.cclibs` (Adobe Creative Cloud) formats |
| **System Shortcuts** | Pre-configured browser shortcuts to the SuamiSihat Service Dashboard, Internal Assets, and Public Brand Assets portals |

### Application Modules

| Module | Purpose |
| --- | --- |
| **Dashboard** | Review workspace totals, storage use, recent activity, project types, sub-brands, and designer metrics |
| **Project Management** | Create standardized project folders, briefs, master canvases, and optional production subfolders |
| **Search & Copy** | Search by project-folder name, filter by designer, switch `README.md` between rendered Preview and Raw Markdown, and copy selected files into a work order |
| **Brand Assets** | Opens installed palettes, libraries, logos, links, and reports; shown only when Brand Kit installation is detected |
| **User Profile** | Manage designer identity, workspace defaults, recent-project history, Job ID counter, repair, update, and uninstall actions |

---

## Workstation Requirements

Review the workstation hardware requirements prior to deployment. Recommended specifications reflect standard SuamiSihat production environment configurations.

| Component | Minimum Specification | Recommended Specification |
| --- | --- | --- |
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

Obtain the latest compiled installer (`SS-CAM-v1.9.3.exe`) from the [Official Release Repository](https://github.com/SuamiSihat/ss_cam/releases/latest).

### Step 2: Execute Deployment Utility

Launch the downloaded installer executable. The deployment process operates in the user context and does not require elevated administrator privileges.

If Windows SmartScreen prompts appear during internal deployment, select **More Info** followed by **Run Anyway**.

### Step 3: Setup Wizard Sequence

The responsive WPF setup wizard adapts dynamically across four steps:

| Step | Function | Details |
| --- | --- | --- |
| **1** | **Components** | Choose Express or Custom installation, select **Brand Kit** and/or **Creative Project Management**, or uninstall an existing CPM installation |
| **2** | **Configuration** | Review PC/software readiness and configure only the selected components; Express installation skips this step |
| **3** | **Licence** | Read the full agreement and scroll to the end before acceptance is enabled |
| **4** | **Installation** | View installation/uninstallation status, component report, and the direct **Open App** launcher |

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
│   ├── SuamiSihat Internal Assets.url
│   └── SuamiSihat Public Brand Assets.url
└── Reports\
    ├── SuamiSihat-Workstation-Report.md
    └── SuamiSihat-Font-Inventory.md
```

Typography files are installed directly to `%LOCALAPPDATA%\Microsoft\Windows\Fonts` and registered in the Windows Registry for seamless application access.

---

## Typographic Specifications

### Core Brand Typefaces

| Index | Family | Usage & Classification |
| --- | --- | --- |
| 1 | **Poppins** | Primary display typeface — headlines, marketing banners |
| 2 | **Calibri** | Secondary typeface — documentation, body text |
| 3 | **Helvetica Neue** | Secondary & structural typeface — user interfaces, technical layouts |
| 4 | **Montserrat** | Tertiary display typeface — supporting accents, labels |

### Extended Typographic Suite

| Typeface | Functional Purpose |
| --- | --- |
| FontAwesome Pro 5 | Vector icon typography |
| Barcode Suite | Code 128 and 2D barcode generation |
| Futura Std | Display & title graphics |
| Oswald | Compact headlines & condensed typography |
| Roboto | Screen-optimized digital interfaces |
| Trueno | Display accent typography |

---

## Troubleshooting Reference

| Symptom | Resolution Procedure |
| --- | --- |
| **SmartScreen Notice** | Select **More Info** followed by **Run Anyway** |
| **Fonts Missing in Affinity** | Restart Affinity suite following setup completion |
| **Fonts Missing in Adobe Apps** | Restart Adobe Creative Cloud applications |
| **Unrecognized Software** | Click **Rescan** in Step 2, **System Check & Configuration** |
| **Custom Destination Requirements** | Change the Brand Kit or Creative Project Management path in Step 2, **Configuration** |
| **Bypass Font Deployment** | Select **Do not install fonts** under Step 2, **Brand Kit options** |
| **Brand Assets module hidden** | Run Custom installation or Repair with **Brand Kit** selected; the module appears when Brand Kit registration or installed asset folders are detected |

---

## System Audit & Workstation Reports

The deployment utility generates two Markdown audit documents stored in the `Reports` directory:

1. `SuamiSihat-Workstation-Report.md`: Hardware specifications, software detection records, and execution logs.
2. `SuamiSihat-Font-Inventory.md`: Comprehensive inventory of deployed typefaces, file formats, and font family metadata.

Both reports open as formatted Markdown inside the Brand Assets module.

---

## Standardized Project Directory Structure

Creative projects must adhere to the organizational standard defined in [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md).

```text
SS-2026\
└── 202607_July\
    └── 202607_0073D_SS_Brand-Assets-Installer\
        ├── Artwork Design\      ← Working source files (.afdesign, .psd, .ai)
        ├── Artwork Mockup\      ← Presentation mockups & client previews
        ├── Assets\              ← Raw photos, icons, reference materials
        └── Production\         ← Exported outputs (PDF, PNG, SVG)
```

---

## Governance & Compliance

Assets and typography bundled within this package are restricted to authorized internal operations. For licensing compliance and usage policies, consult system administration.

The application interface uses Font Awesome Free vector icons under the Font Awesome Free licence. Attribution is retained in the WPF source. Commercial fonts in the installation payload remain subject to their respective licences.

For developer build and maintenance documentation, refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

Release history is maintained in [CHANGELOG.md](./CHANGELOG.md).
