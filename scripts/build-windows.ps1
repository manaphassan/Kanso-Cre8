# ==============================================================================
# Kanso Cre8 - Windows build
# Runs `tauri build` (which builds the client first) and collects:
#   dist/windows/*-setup.exe, *.msi           installers
#   dist/windows/kanso-cre8-v<ver>-windows-x64-portable.zip
#       KansoCre8.exe + portable.ini + README.txt (runs from a USB drive)
# ==============================================================================

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$appDir = Join-Path $repoRoot "src\app"
$appVersion = (Get-Content (Join-Path $appDir "package.json") -Raw | ConvertFrom-Json).version
$releaseDir = Join-Path $appDir "src-tauri\target\release"
$distDir = Join-Path $repoRoot "dist\windows"
$portableName = "kanso-cre8-v$appVersion-windows-x64-portable"
$portableDir = Join-Path $distDir $portableName

Write-Host "`n== Kanso Cre8 $appVersion - Windows build ==" -ForegroundColor Cyan

# A running copy locks the exe.
Get-Process kanso-cre8, KansoCre8 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`n[1/3] tauri build" -ForegroundColor Yellow
Push-Location $appDir
try {
    & npm run tauri:build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

$exe = Join-Path $releaseDir "kanso-cre8.exe"
if (-not (Test-Path $exe)) { throw "Release binary not found: $exe" }

Write-Host "`n[2/3] Installers" -ForegroundColor Yellow
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
foreach ($pattern in @("bundle\nsis\*.exe", "bundle\msi\*.msi")) {
    Get-ChildItem -Path (Join-Path $releaseDir $pattern) -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -Force $_.FullName $distDir
        Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`n[3/3] Portable zip" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null
Copy-Item -Force $exe (Join-Path $portableDir "KansoCre8.exe")
Set-Content -Encoding ascii -Path (Join-Path $portableDir "portable.ini") -Value @"
; Kanso Cre8 portable mode.
; While this file sits next to KansoCre8.exe, settings and browser data are
; kept in the Data folder beside it instead of on this computer.
"@
Set-Content -Encoding ascii -Path (Join-Path $portableDir "README.txt") -Value @"
Kanso Cre8 $appVersion - portable edition for Windows 10 and 11 (x64)

1. Copy this folder anywhere, for example to a USB drive.
2. Double-click KansoCre8.exe and choose your vault folder.

Your vault stays where you put it (it may live in Dropbox, Google Drive,
OneDrive or Synology Drive). Settings and browser data are kept in the
Data folder next to KansoCre8.exe, so the app leaves nothing behind on
the computer. Do not put this app folder itself inside a cloud sync
folder: portable mode is refused there.

Delete portable.ini to use the normal per-user settings instead.
"@
$zip = Join-Path $distDir "$portableName.zip"
Compress-Archive -Path "$portableDir\*" -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -Recurse -Force $portableDir
Write-Host "  [OK] $portableName.zip" -ForegroundColor Green

Write-Host "`n== Done: $distDir ==" -ForegroundColor Green
Get-ChildItem $distDir | ForEach-Object { Write-Host ("  {0,-55} {1,8:N1} MB" -f $_.Name, ($_.Length / 1MB)) }
