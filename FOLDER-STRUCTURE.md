# SuamiSihat Creative Directory Hierarchy Specification

Official centralized folder structure and naming convention standard for SuamiSihat creative design projects, brand assets, and copywriting studios.

This standard establishes a searchable, chronologically indexed directory hierarchy across local workstations and network storage (`SSNAS`).

### Synology Drive Client Sync Specification
Local workstations connect to SSNAS via **Synology Drive Client** using continuous two-way synchronization:
- **Synology NAS Server Share**: `/Creative-Team` (or `/volume2/Creative-Team`)
- **Local Workstation Sync Drive**: `E:\SynologyDrive\Creative-Team` (configured as `WorkspaceRoot` in SS-CAM)
- **Windows Network Share (Direct UNC)**: `\\SSNAS\Creative-Team`

For detailed step-by-step setup, see [SSNAS Setup Guide](./docs/SSNAS-SETUP.md).

---

## 🏛️ Centralized Directory Hierarchy Specification

The official studio standard organizes all projects by **Year** and **Month**, maintaining a single source of truth across all designers and departments:

```text
Creative-Team/                             ← WorkspaceRoot (E:\SynologyDrive\Creative-Team or \\SSNAS\Creative-Team)
│
├── _Team/                                  ← Studio-wide shared governance, configs & logs
│   ├── audit-log.jsonl                     ← Immutable security & activity trail
│   ├── team-notes.json                     ← Team Board announcements & bulletin
│   ├── companies.json                      ← Subsidiary master registry (SSH, SSC, SSW, SSE, SST)
│   └── staff-roster.json                   ← Authenticated personnel credentials
│
└── [YYYY]/                                 ← Centralized Year Root (e.g. 2026)
    ├── [YYYYMM_Month]/                     ← Chronological Month Container (e.g. 202608_August)
    │   │
    │   ├── [YYYYMM]_[JobID]_[Brand]_[Title]/ ← Canonical Project Directory (e.g. 202608_0085D_SS_Rejal_Packaging)
    │   │   ├── README.md                   ← Creative brief & YAML frontmatter metadata
    │   │   ├── _comments.jsonl             ← In-project contextual discussion thread
    │   │   ├── 01_BRIEF_ASSETS/            ← Raw client references, moodboards, logos, fonts
    │   │   ├── 02_SOURCE_FILES/            ← Working source files (.psd, .ai, .aep, .blend, .af)
    │   │   ├── 03_COPYWRITING/             ← Dedicated COPY.md (scripts, hooks, headlines)
    │   │   ├── 04_WORK_IN_PROGRESS/        ← Draft previews, WIP renders, review mockups
    │   │   └── 05_DELIVERABLES/            ← Final approved client master files (PDF, PNG, MP4)
    │   │
    │   └── 202608_0086S_SSE_Merdeka_Promo/
    │
    └── 202607_July/
```

---

## 🏷️ Project Directory Naming Convention

Format:
`YYYYMM_####X_BRAND_ProjectName`

| Component | Format | Description | Example |
|---|---|---|---|
| **Date Code** | `YYYYMM` | Four-digit year + two-digit month | `202608` |
| **Job ID** | `####X` | Four-digit sequence followed by discipline preset code (`D`, `S`, `V`, `P`, `E`, `W`) | `0085D` |
| **Sub-brand** | Identifier | Official business code (`SS`, `SSH`, `SSC`, `SSW`, `SSE`, `SST`) | `SSE` |
| **Project Name** | Title | Concise description separated by underscores | `Rejal_Packaging` |

### Discipline Suffix Codes:
- **`D`**: Graphic & Print Design
- **`S`**: Social Media Content & Campaigns
- **`V`**: Video Production & Motion Graphics
- **`P`**: Brand Identity & Corporate Guidelines
- **`E`**: E-Commerce & Marketplace Assets
- **`W`**: Web Design & UI/UX

---

## 📁 Standard 5 Sub-Directory Requirements

Each canonical project directory contains 5 standardized numbered subfolders:

| Sub-Directory | Required | Functional Purpose | File Types |
|---|---|---|---|
| `README.md` | ✅ Yes | Creative brief, checklist, and YAML frontmatter status | `.md` |
| `01_BRIEF_ASSETS` | ✅ Yes | Brief documents, client moodboards, vector logos, raw reference photos | `.pdf`, `.png`, `.jpg`, `.otf`, `.ttf` |
| `02_SOURCE_FILES` | ✅ Yes | Native working files and editable master artwork | `.psd`, `.ai`, `.afdesign`, `.blend`, `.prproj` |
| `03_COPYWRITING` | ✅ Yes | Dedicated copy document (`COPY.md`) with video scripts and ad copy | `.md`, `.txt` |
| `04_WORK_IN_PROGRESS` | ✅ Yes | Intermediate preview exports, WIP renderings, and review mockups | `.png`, `.jpg`, `.mp4` |
| `05_DELIVERABLES` | ✅ Yes | Final sign-off master exports ready for print or web deployment | `.pdf` (300 DPI), `.png`, `.svg`, `.mp4` |
| `Client_Revisions` | ⬜ Optional | Client feedback files and revision request documents | `.pdf`, `.docx`, `.jpg` |
| `RAW_Media` | ⬜ Optional | Raw uncompressed video/photo footage from camera shoots | `.dng`, `.raw`, `.arw`, `.braw` |

---

## 📄 README.md Frontmatter Specification

Every project `README.md` includes an Obsidian-compatible YAML frontmatter header powering both the desktop **Task Manager** and the **Web Portal**:

```yaml
---
status: in-progress
designer: 0001D
designerName: Ahmad Faiz
brand: SSE
client: SuamiSihat Ecommerce Sdn. Bhd.
deadline: 2026-09-30
priority: high
tags: [packaging, print, 3d-render]
revision: 1
---

# 202608_0085D_SS_Rejal_Premium_Packaging

> [!NOTE]
> Campaign specifications and print guidelines for Rejal packaging run.

- [ ] Task 1: Complete die-cut dieline
- [ ] Task 2: 3D render mockups
- [ ] Task 3: Art Director sign-off
```

---

## ✍️ 03_COPYWRITING / COPY.md Specification

The dedicated copywriting studio document is saved inside `03_COPYWRITING/COPY.md` and contains full Markdown support for video script tables and social copy angles:

```markdown
# Copywriting & Script Studio — Rejal Premium Packaging

## 1. TikTok & Reels Video Scripts
| Scene / Hook | Visual Action | Voiceover Hook | On-Screen Text |
| :--- | :--- | :--- | :--- |
| **01 (0-3s)** | Product unboxing hero | "Rahsia tenaga lelaki aktif..." | STAMINA MAKSIMUM |

## 2. Meta Ad Copy Angles
- **Angle A (Problem / Solution)**: Letih selepas seharian di pejabat?
- **Angle B (Social Proof)**: Pilihan lebih 50,000 pengguna di Malaysia.
```

---

## 🔄 Legacy Backward Compatibility

The SS-CAM scanner automatically recognizes legacy paths and alias folders:
- Legacy root: `Creative-Team/[Staff_ID]/SS-[YYYY]/...`
- Legacy folder aliases: `Artwork Design` → `02_SOURCE_FILES`, `Production` → `05_DELIVERABLES`, `Artwork Mockup` → `04_WORK_IN_PROGRESS`.
- Legacy projects are indexed alongside centralized projects without data loss.
