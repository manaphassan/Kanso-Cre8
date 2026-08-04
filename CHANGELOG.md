# Changelog

All notable SS-CAM changes are documented here.

## [1.9.2] - 2026-08-03

### Added

- Rendered `README.md` preview in Search & Copy, with Preview and Raw Markdown modes.
- Conditional Brand Assets module with large cards for Colour Palettes, Asset Libraries, and Logos.
- In-app rendered Markdown views for workstation and font-inventory reports.
- Public Brand Assets link and updated Internal Assets endpoint.
- Font Awesome Free vector icons and SuamiSihat favicon integration for the window, taskbar, and report dialogs.
- Custom master-canvas extension entry and designer-based project-folder filtering.

### Changed

- Job IDs now place their work-type code after the sequential number, for example `0001D` and `0001S`.
- Legacy prefix-format IDs such as `D0001` remain readable and migrate to the suffix format in application state.
- Sub-brand selectors now display the full registered business names while project folders retain concise codes.
- Project Management separates project/template inputs from generated location and subfolder structure.
- Search operates on project-folder names and loads the selected project's `README.md` and file list.

### Installer

- Brand Kit installation registers its asset path for conditional module discovery.
- Express and Custom installation retain the four-step component, configuration, licence, and report flow.
- Brand Kit options are skipped when Brand Kit is not selected.
- Uninstall controls remain hidden when no Creative Project Management installation is detected.

### Verification

- PowerShell parsing and WPF construction tests passed.
- Legacy and suffix Job ID scanning tests passed.
- README Preview/Raw toggle and Markdown rendering tests passed.
- Self-contained v1.9.2 executable smoke test passed.
- Release executable signed with SuamiSihat certificate (SHA1: `9A73B71BEE3AFEDA9E4CCECA2466FB5FFE0255AC`), timestamped via DigiCert on 2026-08-04.
- Signed executable SHA-256: `99B929F06D4A41CF33FFC1A3111955FB8A57B98C1B2D1AB738F495B62B20A21C`.

## [1.9.1] - 2026-08-03

- Introduced folder-name Search & Copy with designer filtering, README loading, and project file selection.
- Added local/NAS Job ID pooling and pending offline synchronization.
- Improved dashboard widgets, charts, installer component flow, repair, and uninstall behavior.

## [1.9.0] - 2026-08-03

- Introduced the responsive WPF application and installer interface.
- Added Dashboard, Project Management, Search & Copy, and User Profile modules.
