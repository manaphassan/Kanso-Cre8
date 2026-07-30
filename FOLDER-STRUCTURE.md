# SuamiSihat Creative Folder Structure Standard 🗂️

**The official Atomic / Zettelkasten-inspired folder hierarchy for all SuamiSihat design projects.**

This standard ensures every creative asset is searchable, chronologically organized, and consistent across all team workstations and NAS storage (`SSNAS`).

---

## 📐 The Hierarchy Overview

```text
Creative Workspace/
└── Cre8_[Designer_Code]_[Name]/
    ├── SS-2025/
    └── SS-2026/                                ← Year Container
        ├── 202601_January/                     ← Month Container (YYYYMM_Month)
        ├── 202604_April/
        │   ├── 202604_D0070_Corporate_Kegel_Voucher/
        │   ├── 202604_D0071_Rejal_brand/
        │   └── 202604_D0072_ECOM_POSM/          ← Project Folder (YYYYMM_D####_BRAND_ProjectName)
        │       ├── Artwork Design/             ← Working files (.afdesign, .psd, .ai)
        │       ├── Artwork Mockup/             ← Presentation mockups & client previews
        │       ├── Assets/                     ← Raw photos, icons, reference materials
        │       └── Production/                ← Final export-ready outputs (PDF, PNG, SVG)
        └── 202607_July/
```

---

## 🏷️ Project Folder Naming Rule

Format:
`YYYYMM_D####_BRAND_ProjectName`

| Component | Format | Description | Example |
|---|---|---|---|
| **Date Code** | `YYYYMM` | Year (4 digits) + Month (2 digits) | `202604` |
| **Job ID** | `D####` | Sequential designer job number | `D0072` |
| **Sub-brand** | Code | Brand unit identifier (`HEALTH`, `CLINIC`, `WELLNESS`, `ECOM`, `TECH`, `SS`) | `ECOM` |
| **Project Name** | Short Title | Concise description separated by underscores | `POSM` |

### Full Examples
* `202604_D0072_ECOM_POSM`
* `202601_D0060_SS_Wellness_BD_Wellness_Centre`
* `202602_D0069_ECOM_Flash_Sale_Thursday`
* `202602_D0070_Corporate_Kegel_Voucher`

---

## 📂 Standard Sub-Folder Template (Per Project)

Inside every project folder, maintain these 4 standardized sub-folders:

| Sub-Folder | Purpose | File Types |
|---|---|---|
| `Artwork Design` | Working files, editable source graphics | `.afdesign`, `.afphoto`, `.psd`, `.ai`, `.indd` |
| `Artwork Mockup` | Presentation previews, 3D/realistic mockups for review | `.jpg`, `.png`, `.pdf` |
| `Assets` | Source materials used in the project | Raw photos, stock graphics, icons, fonts |
| `Production` | Final print-ready or deployment-ready exports | `.pdf` (print), `.png` (web), `.svg`, `.eps` |

---

## 💡 Quick Tips for Designers

1. **Never save files directly in the project root** — always sort into `Artwork Design`, `Artwork Mockup`, `Assets`, or `Production`.
2. **Sequential Job Numbers (`D####`)** — maintain incrementing numbers so projects stay sorted chronologically in File Explorer.
3. **Use Underscores (`_`)** for separation rather than spaces or complex special characters to ensure compatibility across Windows, Mac, and NAS drives.
