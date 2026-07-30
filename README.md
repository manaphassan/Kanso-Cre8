# SuamiSihat Designer Assets Installer

A Windows installer for preparing a new SuamiSihat design workstation. It installs the approved desktop fonts and copies production logos, colour palettes, and native libraries for Affinity Designer, Adobe Photoshop, and Adobe Illustrator.

## Project structure

```text
SS-Brand-Assets/
├── installer/
│   ├── src/                 PowerShell setup engine and Windows wizard
│   ├── Setup.cmd            Run the unpackaged wizard
│   └── Build-Installer.*    Build the distributable EXE
├── payload/
│   ├── Fonts/               Installable desktop fonts and licences
│   └── Brand Assets/
│       ├── Logos/
│       ├── Libraries/
│       └── Colour Palettes/
└── dist/                    Generated EXE output; not committed
```

The payload intentionally excludes webfont bundles, icon-source repositories, archive metadata, thumbnail caches, old database/Office examples, duplicate Inter formats, and superseded cross-platform font scripts.

## Run from the repository

Double-click `installer\Setup.cmd`.

The wizard, titled **SuamiSihat Designer Assets Installer**, lets the user:

- review and accept the internal-use licence agreement;
- inspect locally collected Windows, CPU, GPU, memory, display, and available-storage information before the licence;
- compare the PC against Windows 10+ 64-bit and 16 GB RAM minimum requirements;
- compare performance hardware against the recommended SuamiSihat design-PC target;
- detect Affinity, Canva, Figma, Adobe Creative Cloud, Photoshop, and Illustrator;
- open the official vendor setup flow for missing software and rescan afterward;
- show the shared design-account email and direct staff to the team lead for the current password and OTP;
- install every bundled desktop font or only the four core brand families;
- skip font installation when only the resources are needed;
- choose where the brand assets are copied;
- optionally open the Affinity and Adobe library/palette files after copying;
- review success or error output;
- save local workstation and font-inventory reports in Markdown format;
- create Windows web shortcuts for the SuamiSihat Service Dashboard and Internal Assets;
- review readiness in a checklist with green checks and red action/skip marks.

Fonts are installed for the current Windows account, so administrator access is not required. Restart Affinity and Adobe applications after installation.

## Installer flow

1. Welcome and installation overview.
2. PC compatibility check with minimum and recommended design specifications.
3. Internal-use licence agreement.
4. Design-software detection, official setup links, and rescan.
5. Core or complete font selection.
6. Suggested brand-assets destination under `Documents\SuamiSihat Brand Assets`, with a folder browser for another path.
7. Review checklist.
8. Installation, reports, and completion.

Minimum workstation requirements are Windows 10 or later, 64-bit architecture,
and 16 GB RAM. The recommended design target is Windows 11, 32 GB or more RAM,
a modern six-core or better Intel Core i7/AMD Ryzen 7-class processor, a DirectX
12 GPU with at least 4 GB reported graphics memory, an SSD with 100 GB free, and
a 1920 x 1080 or higher IPS display. Recommended items guide purchasing and
performance expectations; they do not block the installer.

Affinity, Canva, Figma, and Adobe require their own account and licence acceptance. The installer does not silently accept third-party terms. When a platform is missing, it opens the official setup page so the user can complete the vendor-controlled installation, then return and select **Rescan**.

## Build the EXE

The build uses Windows PowerShell and the .NET Framework compiler included with Windows. No external packaging framework is required. Double-click:

```text
installer\Build-Installer.cmd
```

Or build a specific semantic version:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version 1.6.0
```

The self-contained installer is created as:

```text
dist\SuamiSihat-Designer-Assets-Installer-1.6.0.exe
```

The EXE embeds the complete payload as a compressed resource, extracts it to a unique temporary directory, launches the interactive setup wizard, and removes the temporary files afterward.

## Design application imports

- **Affinity Designer:** Import `.afassets` from the Assets panel and `.afpalette` from the Swatches panel.
- **Adobe Photoshop and Illustrator:** Open the `.cclibs` library and import the `.ase` files through the Swatches panel.

The files are copied under the selected destination, using the `Libraries` and `Colour Palettes` folders.

The installer also creates standard Windows Internet shortcuts for the
[SuamiSihat Service Dashboard](https://suamisihat.myds.me) and
[SuamiSihat Internal Assets](https://assets.suamisihat.com.my). Copies are stored
under `Favorites\SuamiSihat` and the selected brand-assets `Links` folder.

The shared account email is shown in the wizard. Passwords and OTPs are deliberately
not embedded in the repository or EXE; authorised staff obtain the current credentials
from the team lead.

The `Reports` folder contains:

- `SuamiSihat-Workstation-Report.md` with local PC information, detected design software, and installation results;
- `SuamiSihat-Font-Inventory.md` with the standardized source group, filename, and font format.

These reports are written locally and are not transmitted.

## Installer branding

The installer follows the official [SuamiSihat brand-assets guidance](https://suamisihat.com.my/brand-assets):

- SS Prussian Blue `#022057` for the primary header;
- SS Blue `#043388` for headings and primary actions;
- Azure `#21A1F7` and Malibu `#6DC6EC` for supporting accents;
- the approved dark-background logo in the header;
- the approved light-background logo on the welcome page.

The artwork is used without recolouring, distortion, effects, or changes to its proportions.

## Security and Optimization Best Practices

### Security Recommendations
- **Code Signing**: Sign the compiled setup EXE (`dist\SuamiSihat-Designer-Assets-Installer-1.6.0.exe`) using an enterprise EV/OV Code Signing Certificate (`signtool.exe`) before wider distribution to eliminate Windows SmartScreen "Unknown Publisher" warnings.
- **Zero Secrets in Repository**: Secrets, passwords, and 2FA/OTPs are strictly excluded from all `.ps1` scripts, C# source files, and embedded archives. Authorized personnel receive current credentials out-of-band.
- **Privilege & Execution Isolation**: The installer runs under current-user context by default (avoiding forced elevation) and uses `-ExecutionPolicy Bypass` strictly scoped to the temporary extracted wizard script.
- **Secure Temporary Extraction**: Temporary extraction takes place in `%TEMP%\SuamiSihatDesignerAssetsInstaller-<GUID>`, which is automatically purged upon wizard completion.
- **Licensing Compliance**: Verify enterprise licensing compliance for commercial font files (such as FontAwesome Pro and proprietary typefaces) before distributing installers outside internal teams.

### Optimization Best Practices
- **Payload Compression**: The build pipeline compresses fonts and asset libraries into `SuamiSihat.Payload.Zip` using optimal compression, producing a single portable ~48 MB executable.
- **Repository Cleanliness**: The `dist/` folder is ignored by `.gitignore` to prevent binary blob bloat in Git history. Raw webfont archives, thumbnail caches (`Thumbs.db`), and redundant cross-platform legacy scripts have been pruned.

## Git Workflow and Release

To stage, commit, and release version 1.6.0 to the remote Git repository:

```powershell
# 1. Stage all restructured assets and scripts
git add -A

# 2. Commit the release
git commit -m "feat(installer): release SuamiSihat Designer Assets Installer v1.6.0"

# 3. Create a version tag
git tag -a v1.6.0 -m "SuamiSihat Designer Assets Installer v1.6.0"

# 4. Push to remote GitHub repository
git push origin main --tags
```

