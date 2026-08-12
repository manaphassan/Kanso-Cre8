# 04 — Terminology Consistency Review
**SS-CAM v3.1.0** | Last updated: 2026-08-12

---

## 1. Core Concepts

### Projects vs. Jobs
- **Project**: Represents the overall entity or creative deliverable.
- **Project ID**: The unique identifier for a project (e.g., `0001D`, `ProjectIdInput`).
  - *Finding:* Previously inconsistent (mixed use of "Job"), but as of v2.6.0, all UI and C# models have been standardized to use **Project** and **Project ID**.

### Users vs. Designers
- `UserProfileService` handles the data backend, but the UI is strictly designed for **Designers** (and Editors).
- *Finding:* Previously inconsistent, but the UI has now been updated to use **Designer Profile** instead of "User Profile" to reflect the actual target audience.

### Workstation vs. System
- `WorkstationHealthPage`
- `SystemSpecs` model.
- *Finding:* Acceptable overlap, but "Workstation" feels more premium for the UI.

### Theme Naming
- `SSDefault` -> UI calls it "SS Default"
- `Falconia` -> UI calls it "Falconia"
- `Metamorphosis` -> UI calls it "Metamorphosis (Glass)"

## 2. Multilingual / Localization (English vs. Malay)
SS-CAM is primarily an **English** application, with specific modules in **Malay**.

**English Modules:**
- Dashboard
- Project Creator
- Task Manager
- Settings, Wellbeing, Radio, Brand Assets

**Malay Modules:**
- **Waktu Solat** (Prayer Times): UI uses terms like "Subuh", "Syuruk", "Selesai", "Waktu Ini", "Akan Datang".
- *Finding:* Deliberate and acceptable context-switching. Islamic features use localized terms naturally.

## 3. UI/UX Terminology Observations

- **Typography Hierarchy**: The application lacks a cohesive typographical scale. Some pages use "Heading 1" style for module titles, while others just use bold text. 
- **Action Verbs**: Action verbs on buttons are mostly consistent ("Generate", "Save", "Refresh"), but "Refresh" in Task Manager actually performs a "Scan" of the NAS.

## 4. Terminology Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| T01 | "Job" vs "Project" are used interchangeably. | ⚠️ Medium | 🔧 Fixed (Standardized to Project) |
| T02 | "Settings" vs "Profile": SettingsPage handles both app configuration and designer profile. | 🔵 Info | 🔧 Fixed (Standardized to Designer Profile) |
| T03 | "Refresh" vs "Scan": Task Manager uses a "Refresh" button that triggers a NAS "WorkspaceScanner". | ⚠️ Low | Open |
| T04 | "WIP" vs "In Progress": Dashboard uses "ACTIVE WIP", while Task Manager uses "In Progress" for the same state. | ⚠️ Low | Open |
