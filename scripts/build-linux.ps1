# ==============================================================================
# Kanso Cre8 - Linux build (run on Linux with PowerShell 7, or use CI)
# Runs `tauri build` (which builds the client first) and collects:
#   dist/linux/*.AppImage, *.deb
#   dist/linux/kanso-cre8-v<ver>-linux-x64-portable.tar.gz
#       the AppImage + portable.ini + README.txt
# Build needs: libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
#              libssl-dev libdbus-1-dev pkg-config patchelf
# ==============================================================================

$ErrorActionPreference = "Stop"

if (-not $IsLinux) {
    throw "build-linux.ps1 must run on Linux (Tauri does not cross-compile). Use the Release workflow on GitHub instead."
}

$repoRoot = (Get-Item "$PSScriptRoot/..").FullName
$appDir = Join-Path $repoRoot "src/app"
$appVersion = (Get-Content (Join-Path $appDir "package.json") -Raw | ConvertFrom-Json).version
$bundleDir = Join-Path $appDir "src-tauri/target/release/bundle"
$distDir = Join-Path $repoRoot "dist/linux"
$portableName = "kanso-cre8-v$appVersion-linux-x64-portable"
$portableDir = Join-Path $distDir $portableName

Write-Host "`n== Kanso Cre8 $appVersion - Linux build ==" -ForegroundColor Cyan

Write-Host "`n[1/3] tauri build" -ForegroundColor Yellow
Push-Location $appDir
try {
    & npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host "`n[2/3] Packages" -ForegroundColor Yellow
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$appImage = Get-ChildItem -Path (Join-Path $bundleDir "appimage/*.AppImage") -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $appImage) { throw "No AppImage found under $bundleDir/appimage" }
foreach ($file in @($appImage) + @(Get-ChildItem -Path (Join-Path $bundleDir "deb/*.deb") -ErrorAction SilentlyContinue)) {
    Copy-Item -Force $file.FullName $distDir
    Write-Host "  [OK] $($file.Name)" -ForegroundColor Green
}

Write-Host "`n[3/3] Portable archive" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null
$portableApp = Join-Path $portableDir "KansoCre8.AppImage"
Copy-Item -Force $appImage.FullName $portableApp
& chmod +x $portableApp
Set-Content -Path (Join-Path $portableDir "portable.ini") -Value @"
; Kanso Cre8 portable mode.
; While this file sits next to KansoCre8.AppImage, settings and browser data
; are kept in the Data folder beside it instead of in your home folder.
"@
Set-Content -Path (Join-Path $portableDir "README.txt") -Value @"
Kanso Cre8 $appVersion - portable edition for Linux x64

1. Copy this folder anywhere, for example to a USB drive.
2. Run ./KansoCre8.AppImage and choose your vault folder.

Settings and browser data are kept in the Data folder next to the
AppImage. The AI key is stored in the system keyring when one is running.
Do not put this app folder inside a cloud sync folder: portable mode is
refused there. Delete portable.ini to use the normal settings instead.
"@
$tarball = Join-Path $distDir "$portableName.tar.gz"
& tar -czf $tarball -C $distDir $portableName
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
Remove-Item -Recurse -Force $portableDir
Write-Host "  [OK] $portableName.tar.gz" -ForegroundColor Green

Write-Host "`n== Done: $distDir ==" -ForegroundColor Green
Get-ChildItem $distDir | ForEach-Object { Write-Host ("  {0,-55} {1,8:N1} MB" -f $_.Name, ($_.Length / 1MB)) }
