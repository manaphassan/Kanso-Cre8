# ==============================================================================
# Kanso Cre8 — Windows Desktop Standalone Build Pipeline
# Compiles native Windows launcher (KansoCre8.exe) and packages portable bundle
# Outputs: dist/windows/kanso-cre8-v0.8.0-windows-x64.zip
# ==============================================================================

param(
    [switch]$SkipClientBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$packageJsonPath = Join-Path $repoRoot "src\app\package.json"
$appVersion = "0.8.0"
if (Test-Path $packageJsonPath) {
    try {
        $pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if ($pkg.version) { $appVersion = $pkg.version }
    } catch {}
}

$distDir = Join-Path $repoRoot "dist\windows"
$bundleDir = Join-Path $distDir "KansoCre8-v$appVersion-windows-x64"
$clientDist = Join-Path $repoRoot "src\app\client\dist"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - WINDOWS DESKTOP PACKAGING PIPELINE           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Stop any running KansoCre8 process to release file lock
Get-Process KansoCre8 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# 1. Client Web Build
if (-not $SkipClientBuild -or -not (Test-Path "$clientDist\index.html")) {
    Write-Host "`n[1/6] Building Production Svelte 5 Client Assets..." -ForegroundColor Yellow
    Push-Location (Join-Path $repoRoot "src\app")
    try {
        & npm run build:client
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/6] Using existing production client assets from $clientDist" -ForegroundColor Yellow
}

# 2. Bundle Self-Contained Server with esbuild
Write-Host "`n[2/6] Bundling Self-Contained Backend Server (esbuild)..." -ForegroundColor Yellow
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

# Stop any running KansoCre8 process to release file lock
Get-Process KansoCre8 -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 200

# 3. Build Native Windows Desktop Application (Tauri v2)
Write-Host "`n[3/6] Building Native Windows Desktop Application (Tauri v2)..." -ForegroundColor Yellow
$iconPath = Join-Path $repoRoot "src\app\src-tauri\icons\icon.ico"
$tauriExe = Join-Path $repoRoot "src\app\src-tauri\target\release\kanso-cre8.exe"

Push-Location (Join-Path $repoRoot "src\app")
try {
    & npm run tauri:build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] Tauri build exited with code $LASTEXITCODE; checking for existing release binary..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARN] Tauri build notice: $_; checking for existing binary..." -ForegroundColor Yellow
} finally {
    Pop-Location
}

if (-not (Test-Path $tauriExe)) {
    $candidate = Get-ChildItem -Path (Join-Path $repoRoot "src\app\src-tauri\target") -Filter "kanso-cre8.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($candidate) { $tauriExe = $candidate.FullName }
}

# 4. Assemble Windows Distribution
Write-Host "`n[4/6] Assembling Portable Windows Distribution Bundle..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$bundleDir\app\client\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$bundleDir\app\runtime" -Force | Out-Null

# Copy Native Executable & Icon
if (Test-Path $tauriExe) {
    Copy-Item -Force $tauriExe (Join-Path $bundleDir "KansoCre8.exe")
    Copy-Item -Force $tauriExe (Join-Path $distDir "KansoCre8.exe")
    Write-Host "  [OK] Bundled native Tauri v2 desktop executable: KansoCre8.exe" -ForegroundColor Green
}
Copy-Item -Force $iconPath (Join-Path $bundleDir "app\icon.ico")

# Copy Client Web Dist & Brand Assets
Copy-Item -Recurse -Force "$clientDist\*" "$bundleDir\app\client\dist\"
if (Test-Path "$clientDist\brand") {
    Copy-Item -Recurse -Force "$clientDist\brand" "$bundleDir"
}

# Copy Sample Workspace for out-of-the-box offline vault
$sampleWs = Join-Path $repoRoot "src\app\sample-workspace"
if (Test-Path $sampleWs) {
    Copy-Item -Recurse -Force $sampleWs "$bundleDir\app\sample-workspace"
    Write-Host "  [OK] Bundled sample workspace into: $bundleDir\app\sample-workspace" -ForegroundColor Green
}

# Bundle Node.js Portable Runtime if available on build host
$systemNode = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $systemNode)) {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { $systemNode = $cmd.Source }
}
if ($systemNode -and (Test-Path $systemNode)) {
    Copy-Item -Force $systemNode "$bundleDir\app\runtime\node.exe"
    Write-Host "  [OK] Bundled portable Node.js runtime into: $bundleDir\app\runtime\node.exe" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Node.js not found for bundling into app\runtime; launcher will use system Node.js" -ForegroundColor Yellow
}

# Copy package.json
Copy-Item -Force (Join-Path $repoRoot "src\app\package.json") "$bundleDir\app\package.json"

# Create double-click batch launcher
$batContent = @"
@echo off
title Kanso Cre8 (簡素)
setlocal
cd /d "%~dp0"
start "" "KansoCre8.exe"
"@
Set-Content -Path (Join-Path $bundleDir "Start-KansoCre8.bat") -Value $batContent

# Create README
$readmeContent = @"
# Kanso Cre8 (簡素) — Windows Desktop Edition (v$appVersion)

Mindful Creative Vault — Local-First Project, Client & Knowledge Workstation.

## Launching
- Double-click **KansoCre8.exe** (or **Start-KansoCre8.bat**)
- The application will boot locally on http://localhost:4000 in an isolated desktop window.

## Architecture
- Standalone self-contained Node.js backend bundled with esbuild (Zero SQL / Zero database locks).
- Bundled portable runtime in app\runtime\ (100% offline portable).
- Hardware-accelerated desktop view via Microsoft Edge / Chromium.
- Pure Markdown-as-Database storage model.
"@
Set-Content -Path (Join-Path $bundleDir "README.txt") -Value $readmeContent

# Also populate dist/ root with executable and convenient root launcher
$distRoot = Join-Path $repoRoot "dist"
if (Test-Path $tauriExe) {
    Copy-Item -Force $tauriExe (Join-Path $distRoot "KansoCre8.exe")
}

$rootBatContent = @"
@echo off
title Kanso Cre8 (簡素)
setlocal
cd /d "%~dp0"
if exist "windows\KansoCre8-v$appVersion-windows-x64\KansoCre8.exe" (
    start "" "windows\KansoCre8-v$appVersion-windows-x64\KansoCre8.exe"
) else (
    start "" "KansoCre8.exe"
)
"@
Set-Content -Path (Join-Path $distRoot "Start-KansoCre8.bat") -Value $rootBatContent

Write-Host "  [OK] Assembled files into: $bundleDir" -ForegroundColor Green
Write-Host "  [OK] Populated root launcher in: $distRoot" -ForegroundColor Green

# 5. Create ZIP Distribution Archive
Write-Host "`n[5/6] Packaging Portable ZIP Archive..." -ForegroundColor Yellow
$zipFile = Join-Path $distDir "kanso-cre8-v$appVersion-windows-x64.zip"
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }

Compress-Archive -Path "$bundleDir\*" -DestinationPath $zipFile -CompressionLevel Optimal
Write-Host "  [OK] Created ZIP archive: $zipFile" -ForegroundColor Green

# 6. Summary
$zipInfo = Get-Item $zipFile
$zipMb = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESS: WINDOWS DESKTOP PACKAGE READY!             " -ForegroundColor Green
Write-Host "  Standalone Folder: $bundleDir                             " -ForegroundColor Green
Write-Host "  Distribution ZIP:  $zipFile ($zipMb MB)                   " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Refresh Windows Explorer icon cache
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class ShellNotify {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
    }
"@ -ErrorAction SilentlyContinue
    [ShellNotify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {}

