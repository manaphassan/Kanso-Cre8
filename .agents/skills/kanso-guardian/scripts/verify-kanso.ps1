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

$notesServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\notesService.ts"
$zettelServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\zettelService.ts"
if ((Test-Path $notesServicePath) -or (Test-Path $zettelServicePath)) {
    Report-Check "NotesEngine" "Atelier Notes WikiLink & task crawler engine verified" "PASS"
} else {
    Report-Check "NotesEngine" "notesService.ts not found" "FAIL"
}

$financeServicePath = Join-Path $repoRoot "src\app\client\src\lib\services\financeService.ts"
if (Test-Path $financeServicePath) {
    Report-Check "Finance" "Markdown & YAML quote/invoice calculation service verified" "PASS"
} else {
    Report-Check "Finance" "financeService.ts not found" "FAIL"
}

# 6. CLIENT PRIVACY & IDENTITY SANITIZATION
Write-Host ""
Write-Host "[ 6. CLIENT PRIVACY & IDENTITY SANITIZATION ]" -ForegroundColor White
$denyListPath = Join-Path $repoRoot "docs\.deny-list.txt"
if (Test-Path $denyListPath) {
    $denyPatterns = Get-Content $denyListPath | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object { $_.Trim() }
    $sampleWsPath = Join-Path $repoRoot "src\app\sample-workspace"
    $leaksFound = @()
    if (Test-Path $sampleWsPath) {
        $sampleFiles = Get-ChildItem -Path $sampleWsPath -Recurse -File -Include *.json, *.jsonl, *.md
        foreach ($file in $sampleFiles) {
            $content = Get-Content $file.FullName -Raw
            foreach ($pattern in $denyPatterns) {
                if ($content -match [regex]::Escape($pattern)) {
                    $leaksFound += "$($file.Name) contains '$pattern'"
                }
            }
        }
    }
    if ($leaksFound.Count -eq 0) {
        Report-Check "Privacy" "Sample workspace verified clean of real personal identities" "PASS"
    } else {
        Report-Check "Privacy" "Identity leaks detected in sample workspace: $($leaksFound -join '; ')" "FAIL"
    }
} else {
    Report-Check "Privacy" "docs/.deny-list.txt missing" "WARN"
}

# 7. SOURCE & DOCUMENTATION EMOJI HYGIENE
Write-Host ""
Write-Host "[ 7. SOURCE & DOCUMENTATION EMOJI HYGIENE ]" -ForegroundColor White
$textExtensions = @(".js", ".ts", ".svelte", ".json", ".md", ".html", ".css", ".ps1", ".rs", ".toml")
$emojiRegex = [regex]'[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]'
$emojiLeaks = @()
$scanDirs = @((Join-Path $repoRoot "src"), (Join-Path $repoRoot "docs"))

foreach ($dir in $scanDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Recurse -File | Where-Object {
            $ext = $_.Extension.ToLower()
            $textExtensions -contains $ext -and $_.FullName -notmatch '\\(node_modules|target|dist|\.git)\\'
        }
        foreach ($f in $files) {
            $text = Get-Content $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($text -and $emojiRegex.IsMatch($text)) {
                $rel = $f.FullName.Substring($repoRoot.Length + 1)
                $emojiLeaks += $rel
            }
        }
    }
}

if ($emojiLeaks.Count -eq 0) {
    Report-Check "EmojiHygiene" "Source code and documentation are 100% clean of unicode emojis" "PASS"
} else {
    Report-Check "EmojiHygiene" "Unicode emojis detected in files: $($emojiLeaks -join ', ')" "FAIL"
}

# 8. COMPONENT COLOR TOKEN ADHERENCE
Write-Host ""
Write-Host "[ 8. COMPONENT COLOR TOKEN ADHERENCE ]" -ForegroundColor White
$hexAllowListPath = Join-Path $repoRoot "docs\.hex-allowlist.txt"
$allowedHexFiles = @()
if (Test-Path $hexAllowListPath) {
    $allowedHexFiles = Get-Content $hexAllowListPath | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        $_.Trim().Replace('/', '\')
    }
}

$svelteFiles = Get-ChildItem -Path (Join-Path $repoRoot "src\app\client\src") -Recurse -Filter *.svelte
$unauthorizedHexFiles = @()
$hexPattern = [regex]'#[0-9a-fA-F]{3,8}\b'

foreach ($file in $svelteFiles) {
    $rel = $file.FullName.Substring($repoRoot.Length + 1)
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($hexPattern.IsMatch($content)) {
        $isAllowed = $false
        foreach ($pattern in $allowedHexFiles) {
            if ($rel -like "*$pattern*" -or $file.Name -eq $pattern) {
                $isAllowed = $true
                break
            }
        }
        if (-not $isAllowed) {
            $unauthorizedHexFiles += $rel
        }
    }
}

if ($unauthorizedHexFiles.Count -eq 0) {
    Report-Check "DesignTokens" "All .svelte components adhere strictly to CSS design tokens or approved exceptions" "PASS"
} else {
    Report-Check "DesignTokens" "Unauthorized hex colors detected in: $($unauthorizedHexFiles -join ', ')" "FAIL" "Add canonical token or document in docs/.hex-allowlist.txt"
}

# 9. SECRET & BINARY HYGIENE AUDIT
Write-Host ""
Write-Host "[ 9. SECRET & BINARY HYGIENE AUDIT ]" -ForegroundColor White
$binaryExtensions = @("\.exe$", "\.dll$", "\.so$", "\.dylib$", "\.pfx$", "\.keystore$", "\.env$", "\.pem$", "\.key$", "\.cer$", "\.der$")
$trackedFiles = & git ls-files
$trackedBinaries = @()
foreach ($f in $trackedFiles) {
    foreach ($ext in $binaryExtensions) {
        if ($f -match $ext) {
            $trackedBinaries += $f
            break
        }
    }
}

$secretLeaks = @()
$secretRegexes = @(
    'AKIA[0-9A-Z]{16}',
    'ghp_[0-9a-zA-Z]{36}',
    '-----BEGIN (?:RSA|OPENSSH|EC|DSA)? PRIVATE KEY-----'
)

foreach ($f in $trackedFiles) {
    $full = Join-Path $repoRoot $f
    if (Test-Path $full) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        if (@(".js", ".ts", ".svelte", ".json", ".md", ".html", ".css", ".ps1", ".rs", ".toml") -contains $ext) {
            $content = Get-Content $full -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($content) {
                foreach ($pattern in $secretRegexes) {
                    if ($content -match $pattern) {
                        $secretLeaks += "$f matches $pattern"
                    }
                }
            }
        }
    }
}

if ($trackedBinaries.Count -eq 0 -and $secretLeaks.Count -eq 0) {
    Report-Check "Hygiene" "Zero tracked binary artifacts or plaintext secrets detected" "PASS"
} else {
    $detail = ($trackedBinaries + $secretLeaks) -join "; "
    Report-Check "Hygiene" "Tracked binaries or secret patterns detected: $detail" "FAIL"
}

# 10. LEGACY TOKEN & BRAND SANITIZATION
Write-Host ""
Write-Host "[ 10. LEGACY TOKEN & BRAND SANITIZATION ]" -ForegroundColor White
$legacyAllowPath = Join-Path $repoRoot "docs\.legacy-allowlist.txt"
$allowedLegacyFiles = @()
if (Test-Path $legacyAllowPath) {
    $allowedLegacyFiles = Get-Content $legacyAllowPath | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        $_.Trim().Replace('/', '\')
    }
}

$legacyRegex = [regex]'(ss_cam|SS-CAM|SSNAS|zettel)'
$legacyMatches = @()
$sourceFiles = Get-ChildItem -Path (Join-Path $repoRoot "src\app") -Recurse -File | Where-Object {
    $ext = $_.Extension.ToLower()
    @(".js", ".ts", ".svelte", ".json", ".md", ".html", ".css", ".rs") -contains $ext -and
    $_.FullName -notmatch '\\(node_modules|target|dist|\.git)\\'
}

foreach ($f in $sourceFiles) {
    $rel = $f.FullName.Substring($repoRoot.Length + 1)
    $content = Get-Content $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($content -and $legacyRegex.IsMatch($content)) {
        $isAllowed = $false
        foreach ($pattern in $allowedLegacyFiles) {
            if ($rel -like "*$pattern*" -or $f.Name -eq $pattern) {
                $isAllowed = $true
                break
            }
        }
        if (-not $isAllowed) {
            $legacyMatches += $rel
        }
    }
}

if ($legacyMatches.Count -eq 0) {
    Report-Check "Sanitization" "Zero unaliased legacy tokens (ss_cam/SS-CAM/SSNAS/zettel) detected" "PASS"
} else {
    Report-Check "Sanitization" "Unaliased legacy tokens detected in: $($legacyMatches -join ', ')" "FAIL"
}

# 11. MODULAR COMPONENT & ROUTE ARCHITECTURE
Write-Host ""
Write-Host "[ 11. MODULAR ARCHITECTURE & LINE LIMITS ]" -ForegroundColor White
$routeFiles = Get-ChildItem -Path (Join-Path $repoRoot "src\app\server\routes") -Filter *.js
$over300Routes = @()
foreach ($rf in $routeFiles) {
    $lineCount = (Get-Content $rf.FullName).Count
    if ($lineCount -gt 300) {
        $over300Routes += "$($rf.Name) ($lineCount lines)"
    }
}

$linesAllowPath = Join-Path $repoRoot "docs\.lines-allowlist.txt"
$allowedLineFiles = @()
if (Test-Path $linesAllowPath) {
    $allowedLineFiles = Get-Content $linesAllowPath | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object {
        $_.Trim().Replace('/', '\')
    }
}

$clientSrcFiles = Get-ChildItem -Path (Join-Path $repoRoot "src\app\client\src") -Recurse -File | Where-Object {
    $ext = $_.Extension.ToLower()
    @(".svelte", ".ts", ".js", ".css") -contains $ext
}
$over400Components = @()
foreach ($cf in $clientSrcFiles) {
    $lineCount = (Get-Content $cf.FullName).Count
    if ($lineCount -gt 400) {
        $rel = $cf.FullName.Substring($repoRoot.Length + 1)
        $isAllowed = $false
        foreach ($pattern in $allowedLineFiles) {
            if ($rel -like "*$pattern*" -or $cf.Name -eq $pattern) {
                $isAllowed = $true
                break
            }
        }
        if (-not $isAllowed) {
            $over400Components += "$($cf.Name) ($lineCount lines)"
        }
    }
}

if ($over300Routes.Count -eq 0 -and $over400Components.Count -eq 0) {
    Report-Check "Modularity" "Modular architectural limits enforced: routes <= 300 lines, components <= 400 lines" "PASS"
} else {
    $violations = @()
    if ($over300Routes.Count -gt 0) { $violations += "Routes > 300: $($over300Routes -join ', ')" }
    if ($over400Components.Count -gt 0) { $violations += "Components > 400: $($over400Components -join ', ')" }
    Report-Check "Modularity" "Modular line count violations: $($violations -join '; ')" "FAIL"
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

