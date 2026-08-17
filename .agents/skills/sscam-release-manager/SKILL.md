---
name: sscam-release-manager
description: >
  Automates the SS-CAM release pipeline. Trigger: release vX.Y.Z,
  save build as vX.Y.Z, bump version, tag release, publish.
---

# SS-CAM Release Manager

## Trigger Phrases

"release vX.Y.Z", "save build as vX.Y.Z", "bump version", "tag release"

## Release Checklist

### Step 1 - Pre-flight

```powershell
.\QA\verify-sscam.ps1
```

STOP if exit code 1. Fix all issues first.

### Step 2 - Bump Version (3 code locations)

| File | What to change |
|------|----------------|
| src/SS-CAM/Properties/AssemblyInfo.cs | AssemblyVersion + AssemblyFileVersion |
| src/SS-CAM/MainWindow.xaml | Window Title attribute |
| CHANGELOG.md | Add ## [X.Y.Z] section at top |

Version format: MAJOR.MINOR.PATCH

### Step 3 - Build Release

```powershell
& "C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe" `
  "src\SS-CAM\SS-CAM.csproj" /p:Configuration=Release /t:Rebuild /v:minimal
```

STOP if build fails.

### Step 4 - Copy Exe

```powershell
Copy-Item "src\SS-CAM\bin\Release\SS-CAM.exe" "SS-CAM-vX.Y.Z.exe" -Force
Copy-Item "src\SS-CAM\bin\Release\SS-CAM.exe" "dist\SS-CAM-vX.Y.Z.exe" -Force
```

### Step 5 - Update Documentation & QA Suite

- README.md: update version badge + What's New section
- ROADMAP.md: move version to Released Milestones, bump in-progress target
- QA/FINAL-QA-REPORT.md: update status, date, and remediation items
- QA/README.md: update version under review and build under test
- QA/10-FIX-LOG.md: add release entry

### Step 6 - Git Commit + Tag

```powershell
git add -A
git commit -m "release: vX.Y.Z -- [brief summary]"
git tag vX.Y.Z
```

### Step 7 - Verify

Launch SS-CAM-vX.Y.Z.exe and confirm:
- Title bar shows correct version
- Dashboard version badge is correct
- No mojibake visible on any page
- All pages navigate without crash

### Step 8 - Publish to GitHub (REQUIRED)

After Step 7 passes, run the release publisher to update the GitHub page,
documentation, wiki, and perform security/quality health attestation:

```powershell
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
.\QA\verify-sscam.ps1 -Fix
powershell -ExecutionPolicy Bypass -File `
  ".agents\skills\sscam-release-publisher\scripts\Publish-SSCamRelease.ps1" `
  -Version "X.Y.Z"
```

Use the sscam-release-publisher skill for the full publication pipeline:
- Documentation alignment (14 files)
- GitHub Release creation (sets Latest on repository page)
- Wiki update (Home.md + Release-History.md)
- Security and code quality health attestation

## Versioning Rules

| Change type | Bump |
|-------------|------|
| Bug fix only | PATCH (2.6.0 -> 2.6.1) |
| New feature or module | MINOR (2.6.x -> 2.7.0) |
| Breaking architecture | MAJOR (2.x -> 3.0.0) |
