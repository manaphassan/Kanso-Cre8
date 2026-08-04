# Contributing & Developer Guide

This document covers technical information for developers and maintainers of the **SuamiSihat Designer Assets Installer**. For the end-user setup guide, see [README.md](./README.md).

---

## Repository structure

```text
SS-Brand-Assets/
â”œâ”€â”€ installer/
â”‚   â”œâ”€â”€ src/                  PowerShell setup engine and GUI wizard
â”‚   â”‚   â”œâ”€â”€ Install-SuamiSihat-WPF.ps1  Active WPF application and setup wizard
â”‚   â”‚   â”œâ”€â”€ Install-SuamiSihat-GUI.ps1  Legacy WinForms rollback implementation
â”‚   â”‚   â”œâ”€â”€ Install-SuamiSihat.ps1
â”‚   â”‚   â””â”€â”€ Installer.Common.ps1
â”‚   â”œâ”€â”€ bootstrapper/
â”‚   â”‚   â””â”€â”€ Program.cs        C# EXE entry point (extracts payload, launches wizard)
â”‚   â”œâ”€â”€ assets/               Installer branding images
â”‚   â”œâ”€â”€ EULA.txt
â”‚   â”œâ”€â”€ Setup.cmd             Run the unpackaged wizard (development mode)
â”‚   â”œâ”€â”€ Build-Installer.cmd   Double-click build shortcut
â”‚   â””â”€â”€ Build-Installer.ps1   Versioned build script
â”œâ”€â”€ payload/
â”‚   â”œâ”€â”€ Fonts/                Installable desktop fonts and licences
â”‚   â””â”€â”€ Brand Assets/
â”‚       â”œâ”€â”€ Logos/
â”‚       â”œâ”€â”€ Libraries/        .afassets and .cclibs files
â”‚       â””â”€â”€ Colour Palettes/  .afpalette and .ase files
â”œâ”€â”€ docs/                     Installer UI preview screenshots
â”œâ”€â”€ dist/                     Generated EXE output â€” not committed (see .gitignore)
â””â”€â”€ .gitignore
```

---

## Running the wizard without building

For quick testing during development, double-click `installer\Setup.cmd`.

This launches the PowerShell GUI wizard directly from the repository without compiling an EXE.

---

## Building the installer EXE

The build uses the .NET Framework C# compiler (`csc.exe`) included with Windows. No external toolchain is required.

**Quick build** (uses default version `1.9.7`) â€” double-click `installer\Build-Installer.cmd`

**Versioned build:**

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version 1.9.7
```

**Output:**

```text
dist\SS-CAM-v1.9.7.exe   (~48 MB)
```

### How the EXE works

1. `Build-Installer.ps1` compresses the full `payload/` folder and wizard scripts into a ZIP at `Optimal` compression level.
2. The C# bootstrapper (`Program.cs`) is compiled as a `winexe` target with the ZIP embedded as a managed resource (`SuamiSihat.Payload.Zip`).
3. At runtime, the EXE extracts to `%TEMP%\SuamiSihatDesignerAssetsInstaller-<GUID>`, launches `Install-SuamiSihat-WPF.ps1` via `powershell.exe -WindowStyle Hidden`, and purges the temporary directory in a `finally` block after the wizard exits.

### Smoke test

```powershell
.\dist\SS-CAM-v1.9.7.exe --smoke-test
```

Verifies extraction and wizard launch without showing the full UI.

---

## Git workflow and release

```powershell
# Stage all changes
git add -A

# Commit
git commit -m "feat(release): publish SS-CAM v1.9.7"

# Tag the release
git tag -a v1.9.7 -m "SuamiSihat Creative Assets Management v1.9.7"

# Push branch and tag
git push origin SS-Master --tags
```

After pushing, draft the GitHub release at:
`https://github.com/SuamiSihat/ss_cam/releases/new`

Attach `dist\SS-CAM-v<version>.exe` as the release asset.

Release notes must summarize user-visible changes, compatibility behavior, verification performed, and the executable SHA-256 checksum. Update [CHANGELOG.md](./CHANGELOG.md), [README.md](./README.md), [FOLDER-STRUCTURE.md](./FOLDER-STRUCTURE.md), and `installer\EULA.txt` before tagging.

---

## Security best practices

| Area | Guidance |
| --- | --- |
| **Code signing** | Sign the compiled EXE with the organisation's EV/OV certificate using `signtool.exe` before wider distribution â€” eliminates Windows SmartScreen "Unknown Publisher" warnings |
| **No embedded secrets** | Passwords, 2FA/OTPs, and API tokens must never appear in `.ps1` scripts, `Program.cs`, or the embedded ZIP payload |
| **Execution policy scope** | The C# launcher uses `-ExecutionPolicy Bypass` scoped only to the extracted wizard path â€” no system-wide policy changes |
| **Temporary files** | Payload extracts to `%TEMP%\SuamiSihatDesignerAssetsInstaller-<GUID>` and is purged in a `finally` block on exit |
| **Font licensing** | Verify enterprise multi-seat licensing for commercial typefaces (FontAwesome Pro, Helvetica Neue, etc.) before distributing beyond the internal team |
| **Binary exclusion** | `dist/` is listed in `.gitignore` â€” compiled EXEs are distributed via GitHub Releases, not committed to Git history |

---

## Installer branding specifications

The installer window follows the official [SuamiSihat brand-assets guidance](https://suamisihat.com.my/brand-assets):

| Element | Value |
| --- | --- |
| Primary header background | SS Prussian Blue `#022057` |
| Headings & primary actions | SS Blue `#043388` |
| Supporting accent (1) | Azure `#21A1F7` |
| Supporting accent (2) | Malibu `#6DC6EC` |
| Header logo | Dark-background variant |
| Welcome page logo | Light-background variant |

Logos are used without recolouring, distortion, effects, or proportion changes.

---

## Adding new fonts or assets to the payload

1. Place font files under `payload\Fonts\` in the appropriate numbered sub-folder.
2. Place design library files under `payload\Brand Assets\Libraries\`.
3. Place colour palette files under `payload\Brand Assets\Colour Palettes\`.
4. Rebuild the EXE using `Build-Installer.ps1` with an incremented version number.
5. Update the font table in [README.md](./README.md) if new typefaces are added.




