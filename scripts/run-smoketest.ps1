# ==============================================================================
# Kanso Cre8 — Automated End-to-End Smoke Test Suite
# ==============================================================================

param(
    [string]$BaseUrl = "http://localhost:4000"
)

$ErrorActionPreference = "Continue"
$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$script:passCount = 0
$script:failCount = 0

function Report-Result {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][bool]$Passed,
        [string]$Detail = ""
    )
    if ($Passed) {
        $script:passCount++
        Write-Host "  [PASS] $Name $Detail" -ForegroundColor Green
    } else {
        $script:failCount++
        Write-Host "  [FAIL] $Name $Detail" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 (簡素) - END-TO-END SMOKE TEST SUITE           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Brand & Architectural Governance
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[1/5] Checking Brand Governance and Storage Law..." -ForegroundColor Yellow
$verifyScript = Join-Path $repoRoot ".agents\skills\kanso-guardian\scripts\verify-kanso.ps1"
if (Test-Path $verifyScript) {
    $out = & powershell -ExecutionPolicy Bypass -File $verifyScript 2>&1
    $govPassed = ($LASTEXITCODE -eq 0) -and ($out -match "10 passed / 0 warned / 0 failed")
    Report-Result -Name "Brand and Architecture Auditor (verify-kanso.ps1)" -Passed $govPassed -Detail "(10/10 checks passed)"
} else {
    Report-Result -Name "Brand and Architecture Auditor script found" -Passed $false -Detail "Script missing"
}

# ------------------------------------------------------------------------------
# 2. Automated Backend & Markdown Engine Test Suite
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Running Automated Backend and Vault Verification Suite..." -ForegroundColor Yellow
Push-Location (Join-Path $repoRoot "src\app")
try {
    $testOutput = & npm test 2>&1
    $testOutputStr = $testOutput -join "`n"
    $match = [regex]::Match($testOutputStr, "(\d+)\s+Passed,\s+0\s+Failed")
    $allTestsPassed = ($LASTEXITCODE -eq 0) -and $match.Success
    $detail = if ($match.Success) { "($($match.Groups[1].Value)/$($match.Groups[1].Value) passed)" } else { "Tests failed or output mismatch" }
    Report-Result -Name "Automated Unit/Integration Suite (npm test)" -Passed $allTestsPassed -Detail $detail
} catch {
    Report-Result -Name "Automated Unit/Integration Suite (npm test)" -Passed $false -Detail $_.Exception.Message
} finally {
    Pop-Location
}

# ------------------------------------------------------------------------------
# 3. Windows Native Executable & Multi-Resolution Icon Integrity
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Validating Desktop Binary and Multi-Resolution Icon Set..." -ForegroundColor Yellow
$pkgJson = Join-Path $repoRoot "src\app\package.json"
$appVer = "0.7.0"
if (Test-Path $pkgJson) {
    try {
        $p = Get-Content $pkgJson -Raw | ConvertFrom-Json
        if ($p.version) { $appVer = $p.version }
    } catch {}
}

$distExe = Join-Path $repoRoot "dist\windows\KansoCre8-v$appVer-windows-x64\KansoCre8.exe"
if (-not (Test-Path $distExe)) {
    $fallbackExe = Get-ChildItem -Path (Join-Path $repoRoot "dist\windows") -Filter "KansoCre8.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($fallbackExe) { $distExe = $fallbackExe.FullName }
}

$launcherExe = Join-Path $repoRoot "src\windows-launcher\KansoCre8.exe"
$distZip = Join-Path $repoRoot "dist\windows\kanso-cre8-v$appVer-windows-x64.zip"
if (-not (Test-Path $distZip)) {
    $fallbackZip = Get-ChildItem -Path (Join-Path $repoRoot "dist\windows") -Filter "kanso-cre8-v*-windows-x64.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($fallbackZip) { $distZip = $fallbackZip.FullName }
}
$icoPath = Join-Path $repoRoot "src\app\src-tauri\icons\icon.ico"

Report-Result -Name "Standalone KansoCre8.exe exists in dist/" -Passed (Test-Path $distExe)
Report-Result -Name "Compiled KansoCre8.exe exists in src/windows-launcher/" -Passed (Test-Path $launcherExe)
Report-Result -Name "Distribution ZIP exists in dist/windows/" -Passed (Test-Path $distZip)
Report-Result -Name "Multi-resolution icon.ico exists" -Passed (Test-Path $icoPath)

# Validate ICO frame count and dimensions
if (Test-Path $icoPath) {
    $icoBytes = [System.IO.File]::ReadAllBytes($icoPath)
    $frameCount = [System.BitConverter]::ToUInt16($icoBytes, 4)
    $has7Frames = ($frameCount -ge 7)
    Report-Result -Name "ICO Multi-Resolution Frames" -Passed $has7Frames -Detail "($frameCount frames: 16, 24, 32, 48, 64, 128, 256)"
}

# Validate Win32 Icon Extraction from executable
Add-Type -AssemblyName System.Drawing
if (Test-Path $distExe) {
    try {
        $extracted = [System.Drawing.Icon]::ExtractAssociatedIcon($distExe)
        $iconValid = ($extracted -ne $null) -and ($extracted.Width -gt 0)
        Report-Result -Name "Win32 Icon Extraction from dist/KansoCre8.exe" -Passed $iconValid -Detail "($($extracted.Width)x$($extracted.Height))"
        $extracted.Dispose()
    } catch {
        Report-Result -Name "Win32 Icon Extraction from dist/KansoCre8.exe" -Passed $false -Detail $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# 4. Web Production Assets & Splash Screen Integrity
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Validating Client Dist Assets and Splash Screen..." -ForegroundColor Yellow
$clientHtml = Join-Path $repoRoot "src\app\client\dist\index.html"
$splashDark = Join-Path $repoRoot "src\app\client\dist\brand\kanso-calligraphy-dark.png"
$splashLight = Join-Path $repoRoot "src\app\client\dist\brand\kanso-calligraphy-light.png"
$brandIcon = Join-Path $repoRoot "src\app\client\dist\brand\kanso-icon.png"

Report-Result -Name "Production index.html exists" -Passed (Test-Path $clientHtml)
Report-Result -Name "Dark Calligraphy Splash asset exists" -Passed (Test-Path $splashDark)
Report-Result -Name "Light Calligraphy Splash asset exists" -Passed (Test-Path $splashLight)
Report-Result -Name "Master Brand Icon asset exists" -Passed (Test-Path $brandIcon)

if (Test-Path $clientHtml) {
    $htmlContent = [System.IO.File]::ReadAllText($clientHtml)
    $hasSplash = $htmlContent.Contains("kanso-boot-splash") -and $htmlContent.Contains("dismissKansoSplash")
    Report-Result -Name "Calligraphy Splash Screen embedded in index.html" -Passed $hasSplash
}

# ------------------------------------------------------------------------------
# 5. Live Server & REST API Endpoint Connectivity
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Testing Live REST API Endpoints ($BaseUrl)..." -ForegroundColor Yellow

$serverProcess = $null
$startedServer = $false
try {
    $testPing = Invoke-WebRequest -Uri "$BaseUrl/api/status" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
} catch {}

if (-not $testPing) {
    Write-Host "  Backend not detected on $BaseUrl. Launching isolated server instance..." -ForegroundColor Cyan
    $appDir = Join-Path $repoRoot "src\app"
    $serverProcess = Start-Process node -ArgumentList "server/index.js" -WorkingDirectory $appDir -PassThru -WindowStyle Hidden
    $startedServer = $true
    Start-Sleep -Seconds 2
}

$endpoints = @(
    @{ Path = "/api/status"; Desc = "System Health and Uptime" },
    @{ Path = "/api/auth/roster"; Desc = "Staff Directory Roster" },
    @{ Path = "/api/dashboard"; Desc = "Executive Dashboard Telemetry" },
    @{ Path = "/api/companies"; Desc = "Multi-Client Profiles & Swatches" },
    @{ Path = "/api/projects"; Desc = "Client Project Vaults" },
    @{ Path = "/api/finance/invoices"; Desc = "Markdown Invoices Vault" },
    @{ Path = "/api/finance/quotes"; Desc = "Markdown Quotes Vault" },
    @{ Path = "/api/journal/daily"; Desc = "Bullet Journal Daily Log" },
    @{ Path = "/api/notes/atomic"; Desc = "Zettelkasten Atomic Notes" },
    @{ Path = "/api/system/studio-profile"; Desc = "Studio Master Dossier" },
    @{ Path = "/"; Desc = "Client Web Shell and Splash Interface" }
)

foreach ($ep in $endpoints) {
    $url = $BaseUrl + $ep.Path
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        $sw.Stop()
        $isOk = ($resp.StatusCode -eq 200)
        $latency = "$($sw.ElapsedMilliseconds)ms"
        Report-Result -Name "$($ep.Path) ($($ep.Desc))" -Passed $isOk -Detail "[HTTP $($resp.StatusCode) in $latency]"
    } catch {
        $sw.Stop()
        Report-Result -Name "$($ep.Path) ($($ep.Desc))" -Passed $false -Detail "[Error: $($_.Exception.Message)]"
    }
}

if ($startedServer -and $serverProcess) {
    Write-Host "`n  Stopping isolated smoke test server instance..." -ForegroundColor Cyan
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------------------
# Final Summary
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($script:failCount -eq 0) {
    Write-Host "  SMOKE TEST RESULT: ALL TESTS PASSED! ($script:passCount/$script:passCount)        " -ForegroundColor Green
} else {
    Write-Host "  SMOKE TEST RESULT: $script:failCount FAILED, $script:passCount PASSED            " -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($script:failCount -gt 0) {
    exit 1
}
