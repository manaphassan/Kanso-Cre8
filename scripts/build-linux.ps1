# ==============================================================================
# Kanso Cre8 — Linux Desktop Standalone Build Pipeline
# Packages portable Linux distribution bundle with POSIX launcher & .desktop spec
# Outputs: dist/linux/kanso-cre8-v0.7.0-linux-x64.tar.gz
# ==============================================================================

param(
    [switch]$SkipClientBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$packageJsonPath = Join-Path $repoRoot "src\app\package.json"
$appVersion = "0.7.0"
if (Test-Path $packageJsonPath) {
    try {
        $pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if ($pkg.version) { $appVersion = $pkg.version }
    } catch {}
}

$distDir = Join-Path $repoRoot "dist\linux"
$bundleDir = Join-Path $distDir "kanso-cre8-v$appVersion-linux-x64"
$clientDist = Join-Path $repoRoot "src\app\client\dist"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - LINUX STANDALONE PACKAGING PIPELINE          " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Client Web Build
if (-not $SkipClientBuild -or -not (Test-Path "$clientDist\index.html")) {
    Write-Host "`n[1/5] Building Production Svelte 5 Client Assets..." -ForegroundColor Yellow
    Push-Location (Join-Path $repoRoot "src\app")
    try {
        & npm run build:client
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/5] Using existing production client assets from $clientDist" -ForegroundColor Yellow
}

# 2. Bundle Self-Contained Server with esbuild
Write-Host "`n[2/5] Bundling Self-Contained Backend Server (esbuild)..." -ForegroundColor Yellow
$serverBundleOut = Join-Path $bundleDir "app\server.bundle.cjs"
New-Item -ItemType Directory -Path (Split-Path $serverBundleOut) -Force | Out-Null
Push-Location (Join-Path $repoRoot "src\app")
try {
    & npx esbuild server/index.js --bundle --platform=node --target=node18 --outfile=$serverBundleOut --external:fsevents
    if ($LASTEXITCODE -ne 0) { throw "Backend bundling with esbuild failed" }
} finally {
    Pop-Location
}
Write-Host "  [OK] Server bundled into: $serverBundleOut" -ForegroundColor Green

# 3. Assemble Linux Distribution
Write-Host "`n[3/5] Assembling Portable Linux Distribution Bundle..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$bundleDir\app\client\dist" -Force | Out-Null

# Copy Client Web Dist
Copy-Item -Recurse -Force "$clientDist\*" "$bundleDir\app\client\dist\"

# Copy Sample Workspace for out-of-the-box offline vault
$sampleWs = Join-Path $repoRoot "src\app\sample-workspace"
if (Test-Path $sampleWs) {
    Copy-Item -Recurse -Force $sampleWs "$bundleDir\app\sample-workspace"
    Write-Host "  [OK] Bundled sample workspace into: $bundleDir\app\sample-workspace" -ForegroundColor Green
}

# Copy package.json
Copy-Item -Force (Join-Path $repoRoot "src\app\package.json") "$bundleDir\app\package.json"

# Copy Icon
Copy-Item -Force (Join-Path $repoRoot "src\app\src-tauri\icons\128x128@2x.png") "$bundleDir\app\icon.png"

# Generate POSIX Shell Launcher (LF Line Endings)
$shLauncher = @'
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

echo "============================================================"
echo "  KANSO CRE8 (簡素) — Linux Desktop Workstation             "
echo "============================================================"

if ! command -v node &> /dev/null; then
    echo "Error: Node.js (v18+) is required to run Kanso Cre8."
    echo "Install via your package manager: sudo apt install nodejs / sudo dnf install nodejs"
    exit 1
fi

export NODE_ENV=production
export PORT=4000

node "$APP_DIR/server.bundle.cjs" &
SERVER_PID=$!

trap "kill $SERVER_PID 2>/dev/null || true" EXIT

for i in {1..30}; do
    if curl -s "http://localhost:4000/api/system/theme" >/dev/null 2>&1; then
        break
    fi
    sleep 0.2
done

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:4000"
elif command -v google-chrome &> /dev/null; then
    google-chrome --app="http://localhost:4000" --window-size=1280,800 &
elif command -v chromium &> /dev/null; then
    chromium --app="http://localhost:4000" --window-size=1280,800 &
elif command -v firefox &> /dev/null; then
    firefox "http://localhost:4000" &
fi

wait $SERVER_PID
'@ -replace "`r`n", "`n"

$shPath = Join-Path $bundleDir "kanso-cre8.sh"
[IO.File]::WriteAllText($shPath, $shLauncher, (New-Object System.Text.UTF8Encoding($false)))

# Generate .desktop spec file
$desktopSpec = @'
[Desktop Entry]
Name=Kanso Cre8
Comment=The Mindful Creative Vault — Local-First Project, Client & Knowledge Engine
Exec=/bin/bash "%k/kanso-cre8.sh"
Icon=%k/app/icon.png
Terminal=false
Type=Application
Categories=Graphics;Office;Productivity;
StartupWMClass=kanso-cre8
'@ -replace "`r`n", "`n"

$desktopPath = Join-Path $bundleDir "kanso-cre8.desktop"
[IO.File]::WriteAllText($desktopPath, $desktopSpec, (New-Object System.Text.UTF8Encoding($false)))

# Generate README.txt
$readmeContent = @"
# Kanso Cre8 (簡素) — Linux Desktop Edition (v$appVersion)

Mindful Creative Vault — Local-First Project, Client & Knowledge Workstation.

## Launching
1. Open terminal in this folder.
2. Grant execution permission:
   chmod +x kanso-cre8.sh
3. Run:
   ./kanso-cre8.sh

## Desktop Integration (.desktop file)
To integrate with your desktop application menu:
   cp kanso-cre8.desktop ~/.local/share/applications/
"@ -replace "`r`n", "`n"

$readmePath = Join-Path $bundleDir "README.txt"
[IO.File]::WriteAllText($readmePath, $readmeContent, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "  [OK] Assembled Linux files into: $bundleDir" -ForegroundColor Green

# 4. Create .tar.gz Distribution Archive
Write-Host "`n[4/5] Packaging Portable tar.gz Archive..." -ForegroundColor Yellow
$tarFile = Join-Path $distDir "kanso-cre8-v$appVersion-linux-x64.tar.gz"
if (Test-Path $tarFile) { Remove-Item -Force $tarFile }

# Use tar executable built into Windows 10/11
& tar.exe -czf $tarFile -C $distDir "kanso-cre8-v$appVersion-linux-x64"
if ($LASTEXITCODE -ne 0) { throw "tar packaging failed" }
Write-Host "  [OK] Created tar.gz archive: $tarFile" -ForegroundColor Green

# 5. Summary
$tarInfo = Get-Item $tarFile
$tarMb = [math]::Round($tarInfo.Length / 1MB, 2)

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESS: LINUX DESKTOP PACKAGE READY!               " -ForegroundColor Green
Write-Host "  Standalone Folder: $bundleDir                             " -ForegroundColor Green
Write-Host "  Distribution Tar:  $tarFile ($tarMb MB)                   " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
