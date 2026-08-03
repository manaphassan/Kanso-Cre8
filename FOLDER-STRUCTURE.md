# SuamiSihat Creative Directory Hierarchy Specification

Official folder structure and naming convention standard for SuamiSihat creative design projects.

This standard establishes a searchable, chronologically indexed directory hierarchy across local workstations and network storage (`SSNAS`).

---

## Directory Hierarchy Specification

```text
Creative Workspace/
└── [Staff_ID]/
    ├── SS-2025/
    └── SS-2026/                                ← Year Container
        ├── 202601_January/                     ← Month Container (YYYYMM_Month)
        ├── 202604_April/
        │   ├── 202604_0070D_SS_Kegel_Voucher/
        │   ├── 202604_0071D_SS_Rejal_Brand/
        │   └── 202604_0072D_SSE_POSM/           ← Project Folder (YYYYMM_####X_BRAND_ProjectName)
        │       ├── Artwork Design/             ← Source files (.afdesign, .psd, .ai)
        │       ├── Artwork Mockup/             ← Presentation mockups & client previews
        │       ├── Assets/                     ← Raw photos, icons, reference materials
        │       └── Production/                ← Print & web exports (PDF, PNG, SVG)
        └── 202607_July/
```

---

## Project Directory Naming Convention

Format:
`YYYYMM_####X_BRAND_ProjectName`

| Component | Format | Description | Example |
|---|---|---|---|
| **Date Code** | `YYYYMM` | Four-digit year + two-digit month | `202604` |
| **Job ID** | `####X` | Four-or-more digit sequence followed by the preset code: `D` Graphic/Print, `S` Social, `V` Video, `P` Brand Identity | `0072D` |
| **Sub-brand** | Identifier | Official business code (`SS`, `SSH`, `SSC`, `SSW`, `SSE`, `SST`) | `SSE` |
| **Project Name** | Title | Concise description separated by underscores | `POSM` |

### Standardized Examples
* `202604_0072D_SSE_POSM`
* `202601_0060D_SSW_Wellness_Centre`
* `202602_0069S_SSE_Flash_Sale_Thursday`
* `202602_0070D_SS_Corporate_Kegel_Voucher`

---

## Standard Sub-Directory Requirements

Each project directory must contain the following four standardized sub-directories:

| Sub-Directory | Functional Purpose | File Types |
|---|---|---|
| `Artwork Design` | Working files, editable source vector and raster graphics | `.afdesign`, `.afphoto`, `.psd`, `.ai`, `.indd` |
| `Artwork Mockup` | Presentation previews, 3D renderings, and client review files | `.jpg`, `.png`, `.pdf` |
| `Assets` | Source assets, reference materials, icons, and stock graphics | Raw photos, vector icons, project fonts |
| `Production` | Exported final assets ready for print or web deployment | `.pdf` (print), `.png` (web), `.svg`, `.eps` |

---

## Production Guidelines

1. **Root File Exclusion**: Files must not be saved directly in the project root; all assets must be categorized into `Artwork Design`, `Artwork Mockup`, `Assets`, or `Production`.
2. **Sequential Job Numbers (`####X`)**: Maintain sequential numbering and place the preset code after the number to preserve chronological sorting across file systems.
3. **Delimiter Standard**: Use underscores (`_`) instead of spaces or special characters to maintain cross-platform compatibility across Windows, macOS, and NAS storage.

