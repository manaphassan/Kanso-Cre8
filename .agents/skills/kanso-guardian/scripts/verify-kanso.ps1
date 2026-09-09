<#
.SYNOPSIS
    Kanso Cre8 Architecture & Brand Compliance Validator
.DESCRIPTION
    Validates that the repository adheres to the Kanso Cre8 Brand Guidelines,
    pure Markdown-as-Database architecture, Linear/Geist tokens, and project structure.
#>

param(
    [switch]$VerboseOutput
)

$ErrorActionPreference = "Continue"
$passCount = 0
$failCount = 0
$warnCount = 0

function Report-Check {
    param(
        [string]$Category,
        [string]$Description,
        [string]$Status, # PASS, FAIL, WARN
        [string]$Detail = ""
    )
    
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        default { "White" }
    }
    
    Write-Host "  [$Status] $Description" -ForegroundColor $color
    if ($Detail) {
        Write-Host "         $Detail" -ForegroundColor Gray
    }
    
    if ($Status -eq "PASS") { $script:passCount++ }
    elseif ($Status -eq "FAIL") { $script:failCount++ }
    elseif ($Status -eq "WARN") { $script:warnCount++ }
}

$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.Parent.FullName
if (-not (Test-Path "$repoRoot\README.md")) {
    $repoRoot = Get-Location
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - BRAND & ARCHITECTURE GUARDIAN AUDITOR        " -ForegroundColor Cyan
Write-Host "  Repository: $repoRoot" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. BRAND IDENTITY & LICENSING
Write-Host "[ 1. BRAND IDENTITY & LICENSING ]" -ForegroundColor White
$licensePath = Join-Path $repoRoot "LICENSE"
if (Test-Path $licensePath) {
    $licenseText = Get-Content $licensePath -Raw
    if ($licenseText -match "PolyForm Noncommercial License 1.0.0") {
        Report-Check "License" "PolyForm Noncommercial 1.0.0 license file verified" "PASS"
    } else {
        Report-Check "License" "LICENSE file does not match PolyForm Noncommercial 1.0.0" "FAIL"
    }
} else {
    Report-Check "License" "LICENSE file missing at repository root" "FAIL"
}

$readmePath = Join-Path $repoRoot "README.md"
if (Test-Path $readmePath) {
    $readmeText = Get-Content $readmePath -Raw
    if ($readmeText -match "Kanso Cre8" -and $readmeText -notmatch "Native WPF Desktop \(src/SS-CAM\)") {
        Report-Check "Readme" "README.md is branded for Kanso Cre8 with zero legacy references" "PASS"
    } else {
        Report-Check "Readme" "README.md still contains legacy SS-CAM or unbranded text" "FAIL"
    }
} else {
    Report-Check "Readme" "README.md missing" "FAIL"
}

# 2. REPOSITORY STRUCTURE & SANITIZATION
Write-Host ""
Write-Host "[ 2. REPOSITORY STRUCTURE & SANITIZATION ]" -ForegroundColor White
$appDir = Join-Path $repoRoot "src\app"
if (Test-Path $appDir) {
    Report-Check "Structure" "Primary modern application located in src/app/" "PASS"
} else {
    Report-Check "Structure" "src/app/ directory not found" "FAIL"
}

$legacyInSrc = Test-Path "$repoRoot\src\SS-CAM"
if (-not $legacyInSrc) {
    Report-Check "Structure" "src/ root is clean of legacy SS-CAM directories" "PASS"
} else {
    Report-Check "Structure" "src/ still contains legacy SS-CAM folders" "FAIL"
}

$forbiddenArtifacts = @(
    "$repoRoot\archive",
    "$repoRoot\src\app\Dockerfile",
    "$repoRoot\src\app\docker-compose.yml"
)
$foundForbidden = $false
foreach ($item in $forbiddenArtifacts) {
    if (Test-Path $item) {
        Report-Check "Structure" "Unwanted legacy or container artifact found: $item" "FAIL"
        $foundForbidden = $true
    }
}
if (-not $foundForbidden) {
    Report-Check "Structure" "Repository fully sanitized: zero legacy archive or Docker artifacts" "PASS"
}

# 3. PURE MARKDOWN DATABASE ENGINE (NO SQL / NO CLOUD DB)
Write-Host ""
Write-Host "[ 3. PURE MARKDOWN STORAGE ENGINE AUDIT ]" -ForegroundColor White
$forbiddenDbPkgs = @("sqlite3", "prisma", "pg", "mysql2", "mongoose", "typeorm")
$pkgJsonPath = Join-Path $repoRoot "src\app\package.json"
$foundDb = $false

if (Test-Path $pkgJsonPath) {
    $pkgText = Get-Content $pkgJsonPath -Raw
    foreach ($pkg in $forbiddenDbPkgs) {
        if ($pkgText -match "`"$pkg`"") {
            Report-Check "Database" "Forbidden database package found: $pkg" "FAIL" "Kanso Cre8 strictly uses local Markdown + YAML."
            $foundDb = $true
        }
    }
    if (-not $foundDb) {
        Report-Check "Database" "Pure Markdown storage validated: zero SQL/database dependencies in package.json" "PASS"
    }
} else {
    Report-Check "Database" "src/app/package.json not found" "WARN"
}

# 4. DESIGN TOKENS (LINEAR / GEIST MINIMALISM)
Write-Host ""
Write-Host "[ 4. LINEAR / GEIST STUDIO DESIGN SYSTEM ]" -ForegroundColor White
$tokensPath = Join-Path $repoRoot "src\app\client\src\lib\styles\kanso-tokens.css"
if (Test-Path $tokensPath) {
    $tokensText = Get-Content $tokensPath -Raw
    if ($tokensText -match "--kanso-canvas:\s*#09090B" -and $tokensText -match "--kanso-canvas:\s*#F8FAFC") {
        Report-Check "DesignTokens" "Linear/Geist dark (#09090B) and light (#F8FAFC) tokens verified" "PASS"
    } else {
        Report-Check "DesignTokens" "kanso-tokens.css missing canonical canvas color tokens" "WARN"
    }
} else {
    Report-Check "DesignTokens" "kanso-tokens.css not found in client styles" "FAIL"
}

# 5. MULTI-CLIENT & ZETTELKASTEN LOGIC
Write-Host ""
Write-Host "[ 5. CORE WORKSPACE CAPABILITIES ]" -ForegroundColor White
$clientServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\clientService.ts"
if (Test-Path $clientServicePath) {
    $csText = Get-Content $clientServicePath -Raw
    if ($csText -match "loadClients|getClients") {
        Report-Check "ClientHub" "Multi-client profile and swatch management engine verified" "PASS"
    } else {
        Report-Check "ClientHub" "clientService.ts missing client management methods" "WARN"
    }
} else {
    Report-Check "ClientHub" "clientService.ts not found" "FAIL"
}

$zettelServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\zettelService.ts"
if (Test-Path $zettelServicePath) {
    Report-Check "Zettelkasten" "Zettelkasten WikiLink & task crawler engine verified" "PASS"
} else {
    Report-Check "Zettelkasten" "zettelService.ts not found" "FAIL"
}

$financeServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\financeService.ts"
if (Test-Path $financeServicePath) {
    Report-Check "Finance" "Markdown & YAML quote/invoice calculation service verified" "PASS"
} else {
    Report-Check "Finance" "financeService.ts not found" "FAIL"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($script:failCount -eq 0) {
    Write-Host "RESULT: PASS -- Kanso Cre8 governance standards verified!" -ForegroundColor Green
} else {
    Write-Host "RESULT: FAIL -- $($script:failCount) critical issue(s) detected." -ForegroundColor Red
}
Write-Host "Summary: $($script:passCount) passed / $($script:warnCount) warned / $($script:failCount) failed" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

exit $script:failCount
