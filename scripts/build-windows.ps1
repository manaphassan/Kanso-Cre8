# ==============================================================================
# Kanso Cre8 — Windows Desktop Standalone Build Pipeline
# Compiles native Windows launcher (KansoCre8.exe) and packages portable bundle
# Outputs: dist/windows/kanso-cre8-v0.1.0-windows-x64.zip
# ==============================================================================

param(
    [switch]$SkipClientBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$distDir = Join-Path $repoRoot "dist\windows"
$bundleDir = Join-Path $distDir "KansoCre8-v0.1.0-windows-x64"
$clientDist = Join-Path $repoRoot "src\app\client\dist"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - WINDOWS DESKTOP PACKAGING PIPELINE           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

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

# 3. Compile Native Windows Desktop Application (KansoCre8.exe)
Write-Host "`n[3/6] Compiling Native Windows Desktop Application (KansoCre8.exe)..." -ForegroundColor Yellow
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $cscPath)) {
    throw "Microsoft C# Compiler (csc.exe) not found."
}

$wpfDir = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF"
if (-not (Test-Path $wpfDir)) {
    $wpfDir = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\WPF"
}

$launcherSrc = Join-Path $repoRoot "src\windows-launcher\Program.cs"
$iconPath = Join-Path $repoRoot "src\app\src-tauri\icons\icon.ico"
$launcherOut = Join-Path $repoRoot "src\windows-launcher\KansoCre8.exe"
$libDir = Join-Path $repoRoot "src\windows-launcher\lib"
$wv2Wpf = Join-Path $libDir "Microsoft.Web.WebView2.Wpf.dll"
$wv2Core = Join-Path $libDir "Microsoft.Web.WebView2.Core.dll"

& $cscPath /nologo /target:winexe /win32icon:$iconPath /out:$launcherOut `
    /r:"$wpfDir\PresentationFramework.dll" `
    /r:"$wpfDir\PresentationCore.dll" `
    /r:"$wpfDir\WindowsBase.dll" `
    /r:System.Xaml.dll `
    /r:System.dll `
    /r:System.Drawing.dll `
    /r:System.Core.dll `
    /r:$wv2Wpf `
    /r:$wv2Core `
    $launcherSrc

if ($LASTEXITCODE -ne 0) { throw "Native WPF compilation failed" }
Write-Host "  [OK] Compiled native WPF desktop application: $launcherOut" -ForegroundColor Green

# Ensure launcher directory has required dependencies for direct repo execution
Copy-Item -Force $wv2Wpf (Join-Path $repoRoot "src\windows-launcher\Microsoft.Web.WebView2.Wpf.dll")
Copy-Item -Force $wv2Core (Join-Path $repoRoot "src\windows-launcher\Microsoft.Web.WebView2.Core.dll")
Copy-Item -Force (Join-Path $libDir "WebView2Loader.dll") (Join-Path $repoRoot "src\windows-launcher\WebView2Loader.dll")
New-Item -ItemType Directory -Path (Join-Path $repoRoot "src\windows-launcher\runtimes\win-x64\native") -Force | Out-Null
Copy-Item -Force (Join-Path $libDir "x64\WebView2Loader.dll") (Join-Path $repoRoot "src\windows-launcher\runtimes\win-x64\native\WebView2Loader.dll")

# 4. Assemble Windows Distribution
Write-Host "`n[4/6] Assembling Portable Windows Distribution Bundle..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$bundleDir\app\client\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$bundleDir\app\runtime" -Force | Out-Null
New-Item -ItemType Directory -Path "$bundleDir\runtimes\win-x64\native" -Force | Out-Null

# Copy Launcher & Icon
Copy-Item -Force $launcherOut (Join-Path $bundleDir "KansoCre8.exe")
Copy-Item -Force $iconPath (Join-Path $bundleDir "app\icon.ico")

# Copy Native WebView2 Assemblies & Loader
Copy-Item -Force $wv2Wpf "$bundleDir\Microsoft.Web.WebView2.Wpf.dll"
Copy-Item -Force $wv2Core "$bundleDir\Microsoft.Web.WebView2.Core.dll"
Copy-Item -Force (Join-Path $libDir "WebView2Loader.dll") "$bundleDir\WebView2Loader.dll"
Copy-Item -Force (Join-Path $libDir "x64\WebView2Loader.dll") "$bundleDir\runtimes\win-x64\native\WebView2Loader.dll"
Write-Host "  [OK] Bundled native WebView2 WPF assemblies and loader" -ForegroundColor Green

# Copy Client Web Dist & Brand Assets
Copy-Item -Recurse -Force "$clientDist\*" "$bundleDir\app\client\dist\"
if (Test-Path "$clientDist\brand") {
    Copy-Item -Recurse -Force "$clientDist\brand" "$bundleDir"
    Copy-Item -Recurse -Force "$clientDist\brand\*" (Join-Path $repoRoot "src\windows-launcher\brand")
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
# Kanso Cre8 (簡素) — Windows Desktop Edition (v0.1.0)

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

Write-Host "  [OK] Assembled files into: $bundleDir" -ForegroundColor Green

# 5. Create ZIP Distribution Archive
Write-Host "`n[5/6] Packaging Portable ZIP Archive..." -ForegroundColor Yellow
$zipFile = Join-Path $distDir "kanso-cre8-v0.1.0-windows-x64.zip"
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

