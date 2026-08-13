# SSNAS — Synology Drive Client Setup & Integration Guide

**SuamiSihat™ Creative Assets Management (SS-CAM)**  
Official workstation setup guide for connecting local Windows workstations to SuamiSihat NAS (`SSNAS`).

---

## 1. Overview

SSNAS is the central network-attached storage system for the SuamiSihat design team. Through **Synology Drive Client**, designers maintain a continuous two-way local folder synchronization between the NAS server share (`/Creative-Team`) and their local workstation drive (`E:\SynologyDrive\Creative-Team`).

SS-CAM integrates natively with this synchronized folder hierarchy for:
- Standardized project folder creation (`YYYYMM_####X_BRAND_ProjectName`)
- Team-wide shared category presets (`_Team\_Config\category_presets.json`)
- Multi-user configuration isolation (`_Team\_Config\profile_{username}.json`)
- Offline resilience and background health monitoring

---

## 2. Prerequisites

Before configuring Synology Drive Client:
1. **Windows 10 / 11 Workstation** connected to the SuamiSihat local network or VPN.
2. **Synology Drive Client** desktop app installed.
3. Dedicated storage drive or partition formatted with NTFS (recommended drive letter: `E:\`).
4. NAS user credentials with Read/Write access to the `/Creative-Team` share on SSNAS.

---

## 3. Synology Drive Client Configuration

Follow these steps to establish the official folder sync task:

### Step 1: Create New Sync Task
1. Launch **Synology Drive Client** on your workstation.
2. Select **Sync Task** and click **Create**.
3. Authenticate with your SSNAS server address and credentials.

### Step 2: Select Server and Local Folders
In the **"Select the folders that you want to sync between your Synology NAS and computer"** screen:

| Component | Target Path | Notes |
|-----------|-------------|-------|
| **Synology NAS** | `/Creative-Team` | Click **Edit** and select the root `/Creative-Team` share on SSNAS |
| **Your computer** | `E:\SynologyDrive\Creative-Team` | Click **Edit** and map to local path `E:\SynologyDrive\Creative-Team` |

> [!IMPORTANT]
> **Canonical Folder Mapping**:
> Always maintain the exact folder name `Creative-Team` on both NAS and local computer to ensure relative path compatibility across all designer workstations.

### Step 3: Advanced Sync Settings
Click **Advanced** in the bottom-left corner of the wizard to verify:
- **Sync Mode**: Two-way synchronization (Default).
- **File Filter**: Ensure active working file types (`.afdesign`, `.psd`, `.ai`, `.pdf`, `.json`, `.md`) are allowed.
- **On-Demand Sync**: Disabled (recommended for active design workstations to ensure complete local offline availability).

Click **Done** to complete setup and start initial synchronization.

---

## 4. Workstation Directory Structure

Once synchronized, the `E:\SynologyDrive\Creative-Team` directory will mirror the SSNAS structure:

```text
E:\SynologyDrive\Creative-Team/            ← SSNAS Synchronized Root
│
├── _Team/                                 ← Shared Team Collaboration
│   ├── team-notes.json                    ← Shared Team Board notes
│   ├── Notes/                             ← Shared Quick Notes
│   └── _Config/                           ← SS-CAM Auto-Sync Directory
│       ├── category_presets.json          ← Team-wide shared project presets
│       ├── profile_{username}.json        ← User-isolated designer profile
│       ├── theme_config_{username}.json   ← User-isolated theme preferences
│       └── notes_{username}.json          ← User-isolated quick notes
│
└── [Staff_ID]/                            ← Personal Designer Root (e.g. 0001D, 0002S)
    └── SS-2026/                           ← Year Container
        └── 202608_August/                 ← Month Container (YYYYMM_Month)
            └── 202608_0072D_SS_Project/   ← Project Directory
```

---

## 5. SS-CAM Settings Integration

To connect SS-CAM to your Synology Drive workspace:

1. Launch **SS-CAM**.
2. Navigate to **Settings & Profile** from the sidebar navigation.
3. Under **Workspace Root**, enter or browse to:
   ```text
   E:\SynologyDrive\Creative-Team
   ```
4. Under **Synology NAS Path**, configure the mapped network path or DDNS address:
   ```text
   \\SSNAS\Creative-Team
   ```
5. Click **Save Settings**.

---

## 6. Multi-User Isolation & Presets Auto-Sync

SS-CAM's `NasConfigSyncService` automatically detects the synchronized `_Team\_Config` folder inside `E:\SynologyDrive\Creative-Team`:

- **Shared Presets**: `category_presets.json` is shared team-wide so all designers automatically receive updated project category subfolder templates.
- **User Isolation**: Personal settings are stored with the local Windows username suffix (e.g. `profile_john.json`), preventing file locking conflicts across multiple workstations syncing the same drive.

---

## 7. Troubleshooting & FAQ

| Symptom | Cause | Solution |
|---------|-------|----------|
| **Sync Status Red Exclamation** | File open in lock mode by vector app | Close Affinity Designer / Photoshop or let app auto-retry sync upon save |
| **SS-CAM Status Shows Offline** | Network connection to NAS address lost | Verify local network or VPN; click the status bar dot in SS-CAM to re-probe |
| **Path Too Long Errors** | Windows MAX_PATH (260 char) limit | Store projects under standard `YYYYMM_####X_BRAND_Name` structures; avoid deeply nested sub-subfolders |
| **Config Conflict Files** | Simultaneous edit of non-isolated JSON | `NasConfigSyncService` isolates user configs with `_{username}` to eliminate conflicts |

---

## 8. Related Documentation

- [FOLDER-STRUCTURE.md](../FOLDER-STRUCTURE.md) — Directory hierarchy specification
- [README.md](../README.md) — SS-CAM Workstation Suite documentation
- [01-ARCHITECTURE.md](../QA/01-ARCHITECTURE.md) — SS-CAM architecture & data persistence review
