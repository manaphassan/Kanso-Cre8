# ==============================================================================
# Kanso Cre8 — Master Multi-Platform Build & Distribution Pipeline
# Builds: Windows Desktop (x64), Linux Standalone (x64), Android Companion (APK)
# ==============================================================================

param(
    [ValidateSet("All", "Windows", "Linux", "Android")]
    [string]$Platform = "All",
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
$scriptsDir = Join-Path $repoRoot "scripts"
$distDir = Join-Path $repoRoot "dist"
$clientDist = Join-Path $repoRoot "src\app\client\dist"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - MASTER MULTI-PLATFORM BUILD ORCHESTRATOR     " -ForegroundColor Cyan
Write-Host "  Version:  $appVersion (Production Ready)                  " -ForegroundColor Cyan
Write-Host "  Target:   $Platform                                       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Build Client Web Bundle Once
if (-not $SkipClientBuild -or -not (Test-Path "$clientDist\index.html")) {
    Write-Host "`n>>> [STEP 1/4] Compiling Core Svelte 5 Frontend Production Bundle..." -ForegroundColor Yellow
    Push-Location (Join-Path $repoRoot "src\app")
    try {
        & npm run build:client
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n>>> [STEP 1/4] Using pre-compiled Svelte 5 Frontend Bundle ($clientDist)" -ForegroundColor Yellow
}

# 2. Windows Build
if ($Platform -eq "All" -or $Platform -eq "Windows") {
    Write-Host "`n>>> [STEP 2/4] Packaging Windows Desktop Distribution..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "build-windows.ps1") -SkipClientBuild
}

# 3. Linux Build
if ($Platform -eq "All" -or $Platform -eq "Linux") {
    Write-Host "`n>>> [STEP 3/4] Packaging Linux Desktop Distribution..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "build-linux.ps1") -SkipClientBuild
}

# 4. Android Build
if ($Platform -eq "All" -or $Platform -eq "Android") {
    Write-Host "`n>>> [STEP 4/4] Packaging Android Companion APK..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "build-android.ps1") -SkipClientBuild
}

# 5. Generate Manifest & SHA256 Checksums
Write-Host "`n>>> Generating Release Manifest & SHA256 Checksums..." -ForegroundColor Yellow

$artifacts = @()
$buildFiles = @(
    (Join-Path $distDir "windows\kanso-cre8-v$appVersion-windows-x64.zip"),
    (Join-Path $distDir "linux\kanso-cre8-v$appVersion-linux-x64.tar.gz"),
    (Join-Path $distDir "android\kanso-cre8-v$appVersion-companion.apk")
)

foreach ($filePath in $buildFiles) {
    if (Test-Path $filePath) {
        $item = Get-Item $filePath
        $hash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        $artifacts += @{
            name = $item.Name
            path = $filePath.Substring($repoRoot.Length + 1).Replace('\', '/')
            size_bytes = $item.Length
            size_mb = [math]::Round($item.Length / 1MB, 2)
            sha256 = $hash
        }
    }
}

$manifest = @{
    product = "Kanso Cre8"
    tagline = "The Mindful Creative Vault"
    version = $appVersion
    build_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    artifacts = $artifacts
}

$manifestJson = $manifest | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path $distDir "manifest.json") -Value $manifestJson

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  KANSO CRE8 - MULTI-PLATFORM BUILD SUITE COMPLETE!         " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

foreach ($a in $artifacts) {
    Write-Host ("  [{0}] {1,-35} {2,6} MB  ({3})" -f "OK", $a.name, $a.size_mb, $a.sha256.Substring(0, 12) + "...") -ForegroundColor White
}

Write-Host "`nManifest: dist/manifest.json" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
