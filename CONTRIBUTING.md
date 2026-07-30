# Contributing & Developer Guide

This document covers technical information for developers and maintainers of the **SuamiSihat Designer Assets Installer**. For the end-user setup guide, see [README.md](./README.md).

---

## Repository structure

```
SS-Brand-Assets/
├── installer/
│   ├── src/                  PowerShell setup engine and GUI wizard
│   │   ├── Install-SuamiSihat-GUI.ps1
│   │   ├── Install-SuamiSihat.ps1
│   │   └── Installer.Common.ps1
│   ├── bootstrapper/
│   │   └── Program.cs        C# EXE entry point (extracts payload, launches wizard)
│   ├── assets/               Installer branding images
│   ├── EULA.txt
│   ├── Setup.cmd             Run the unpackaged wizard (development mode)
│   ├── Build-Installer.cmd   Double-click build shortcut
│   └── Build-Installer.ps1   Versioned build script
├── payload/
│   ├── Fonts/                Installable desktop fonts and licences
│   └── Brand Assets/
│       ├── Logos/
│       ├── Libraries/        .afassets and .cclibs files
│       └── Colour Palettes/  .afpalette and .ase files
├── docs/                     Installer UI preview screenshots
├── dist/                     Generated EXE output — not committed (see .gitignore)
└── .gitignore
```

---

## Running the wizard without building

For quick testing during development, double-click `installer\Setup.cmd`.

This launches the PowerShell GUI wizard directly from the repository without compiling an EXE.

---

## Building the installer EXE

The build uses the .NET Framework C# compiler (`csc.exe`) included with Windows. No external toolchain is required.

**Quick build** (uses default version `1.6.2`) — double-click `installer\Build-Installer.cmd`

**Versioned build:**

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1 -Version 1.6.2
```

**Output:**

```
dist\SuamiSihat-Designer-Assets-Installer-1.6.2.exe   (~48 MB)
```

### How the EXE works

1. `Build-Installer.ps1` compresses the full `payload/` folder and wizard scripts into a ZIP at `Optimal` compression level.
2. The C# bootstrapper (`Program.cs`) is compiled as a `winexe` target with the ZIP embedded as a managed resource (`SuamiSihat.Payload.Zip`).
3. At runtime, the EXE extracts to `%TEMP%\SuamiSihatDesignerAssetsInstaller-<GUID>`, launches `Install-SuamiSihat-GUI.ps1` via `powershell.exe -WindowStyle Hidden`, and purges the temporary directory in a `finally` block after the wizard exits.

### Smoke test

```powershell
.\dist\SuamiSihat-Designer-Assets-Installer-1.6.2.exe --smoke-test
```

Verifies extraction and wizard launch without showing the full UI.

---

## Git workflow and release

```powershell
# Stage all changes
git add -A

# Commit
git commit -m "feat(installer): release SuamiSihat Designer Assets Installer v1.6.2"

# Tag the release
git tag -a v1.6.2 -m "SuamiSihat Designer Assets Installer v1.6.2"

# Push branch and tag
git push origin SS-Master --tags
```

After pushing, draft the GitHub release at:
`https://github.com/SuamiSihat/SS-Brand-Assets/releases/new`

Attach `dist\SuamiSihat-Designer-Assets-Installer-<version>.exe` as the release asset.

---

## Security best practices

| Area | Guidance |
|---|---|
| **Code signing** | Sign the compiled EXE with the organisation's EV/OV certificate using `signtool.exe` before wider distribution — eliminates Windows SmartScreen "Unknown Publisher" warnings |
| **No embedded secrets** | Passwords, 2FA/OTPs, and API tokens must never appear in `.ps1` scripts, `Program.cs`, or the embedded ZIP payload |
| **Execution policy scope** | The C# launcher uses `-ExecutionPolicy Bypass` scoped only to the extracted wizard path — no system-wide policy changes |
| **Temporary files** | Payload extracts to `%TEMP%\SuamiSihatDesignerAssetsInstaller-<GUID>` and is purged in a `finally` block on exit |
| **Font licensing** | Verify enterprise multi-seat licensing for commercial typefaces (FontAwesome Pro, Helvetica Neue, etc.) before distributing beyond the internal team |
| **Binary exclusion** | `dist/` is listed in `.gitignore` — compiled EXEs are distributed via GitHub Releases, not committed to Git history |

---

## Installer branding specifications

The installer window follows the official [SuamiSihat brand-assets guidance](https://suamisihat.com.my/brand-assets):

| Element | Value |
|---|---|
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
