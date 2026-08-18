<#
.SYNOPSIS
    SS-CAM Repository Housekeeper & Security Scanner
.DESCRIPTION
    Performs post git pull/push cleanup, file structure organization checks,
    UTF-8 BOM encoding enforcement, and security/malicious code scanning.
.PARAMETER DryRun
    Previews actions without deleting or modifying any files.
.PARAMETER CleanTemp
    Removes transient build outputs, temporary files, and log dumps.
.PARAMETER Organize
    Inspects root directory clutter and validates repository folder hierarchy.
.PARAMETER ScanSecurity
    Audits codebase for exposed secrets, unauthorized binaries, and unsafe constructs.
.PARAMETER FixBOM
    Enforces UTF-8 BOM encoding across C#, XAML, and Markdown files.
.PARAMETER All
    Runs ScanSecurity, Organize, CleanTemp, and FixBOM.
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$CleanTemp,
    [switch]$Organize,
    [switch]$ScanSecurity,
    [switch]$FixBOM,
    [switch]$All
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..\")

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  SS-CAM Repo Housekeeper & Security Audit" -ForegroundColor Cyan
Write-Host "  Root: $RepoRoot" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  [MODE: DRY-RUN (Preview Only)]" -ForegroundColor Yellow
}
Write-Host "====================================================" -ForegroundColor Cyan

if (-not ($CleanTemp -or $Organize -or $ScanSecurity -or $FixBOM -or $All)) {
    $All = $true
}

$HasIssues = $false

# ----------------------------------------------------
# 1. SECURITY & MALICIOUS CODE AUDIT
# ----------------------------------------------------
if ($ScanSecurity -or $All) {
    Write-Host "`n[1/4] Running Security & Malicious Code Audit..." -ForegroundColor Cyan

    $SuspiciousPatterns = @(
        @{ Name = "Hardcoded Secret/Token"; Pattern = '(?i)(api[_-]?key|secret[_-]?key|password|bearer\s+[a-z0-9_\-\.]{20,})\s*[:=]\s*["''][^"'']{8,}["'']' },
        @{ Name = "AWS Credential"; Pattern = '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}' },
        @{ Name = "Private Key Header"; Pattern = '-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----' },
        @{ Name = "Suspicious Shell Execution"; Pattern = 'Process\.Start\s*\(\s*["''](cmd|powershell|cscript|wscript|bash|sh)' }
    )

    $ScannedExtensions = @("*.cs", "*.xaml", "*.json", "*.xml", "*.config", "*.ps1", "*.cmd")
    $SourceFiles = Get-ChildItem -Path $RepoRoot -Recurse -Include $ScannedExtensions | Where-Object {
        $_.FullName -notlike "*\bin\*" -and $_.FullName -notlike "*\obj\*" -and $_.FullName -notlike "*\.git\*" -and $_.FullName -notlike "*\packages\*" -and $_.FullName -notlike "*\dist\*" -and $_.FullName -notlike "*\scratch\*" -and $_.FullName -notlike "*\node_modules\*"
    }

    $FoundSecurityRisks = 0

    foreach ($file in $SourceFiles) {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($content)) { continue }

        foreach ($rule in $SuspiciousPatterns) {
            if ($content -match $rule.Pattern) {
                # Skip known test/mock strings or false positives if needed
                if ($file.FullName -like "*verify-sscam.ps1*" -or $file.FullName -like "*repo-cleaner.ps1*") { continue }
                Write-Host "  [SECURITY WARNING] $($rule.Name) detected in: $($file.FullName.Replace($RepoRoot.Path, ''))" -ForegroundColor Red
                $FoundSecurityRisks++
            }
        }
    }

    # Scan for unauthorized executables or scripts in asset/source trees
    $ForbiddenExts = @("*.exe", "*.dll", "*.bat", "*.vbs")
    $SuspectDirs = @( (Join-Path $RepoRoot "src\SS-CAM"), (Join-Path $RepoRoot "docs") )

    foreach ($dir in $SuspectDirs) {
        if (Test-Path $dir) {
            $SuspectFiles = Get-ChildItem -Path $dir -Recurse -Include $ForbiddenExts | Where-Object {
                $_.FullName -notlike "*\packages\*" -and $_.FullName -notlike "*\bin\*" -and $_.FullName -notlike "*\obj\*" -and $_.FullName -notlike "*\node_modules\*" -and $_.Name -ne "nuget.exe"
            }
            foreach ($sf in $SuspectFiles) {
                Write-Host "  [SUSPICIOUS FILE] Unexpected binary/script in content directory: $($sf.FullName.Replace($RepoRoot.Path, ''))" -ForegroundColor Yellow
                $FoundSecurityRisks++
            }
        }
    }

    if ($FoundSecurityRisks -eq 0) {
        Write-Host "  [PASS] No security vulnerabilities or suspicious binaries found." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] $FoundSecurityRisks security item(s) flagged for review." -ForegroundColor Yellow
        $HasIssues = $true
    }
}

# ----------------------------------------------------
# 2. FILE HIERARCHY & ROOT CLUTTER CHECK
# ----------------------------------------------------
if ($Organize -or $All) {
    Write-Host "`n[2/4] Checking Root Directory Clutter & Folder Hierarchy..." -ForegroundColor Cyan

    $AllowedRootItems = @(
        ".agents", ".git", ".gitattributes", ".gitignore", ".markdownlint.json",
        "AGENTS.md", "CHANGELOG.md", "CONTRIBUTING.md", "FOLDER-STRUCTURE.md",
        "QA", "README.md", "ROADMAP.md", "dist", "docs", "install.cmd",
        "installer", "nuget.exe", "payload", "scratch", "src", "tests",
        "SS-CAM-v*.exe", "LICENSE"
    )

    $RootItems = Get-ChildItem -Path $RepoRoot
    $ClutterCount = 0

    foreach ($item in $RootItems) {
        $isAllowed = $false
        foreach ($pattern in $AllowedRootItems) {
            if ($item.Name -like $pattern) {
                $isAllowed = $true
                break
            }
        }

        if (-not $isAllowed) {
            Write-Host "  [UNEXPECTED ROOT ITEM] $($item.Name)" -ForegroundColor Yellow
            $ClutterCount++
        }
    }

    if ($ClutterCount -eq 0) {
        Write-Host "  [PASS] Repository root is clean and compliant with FOLDER-STRUCTURE.md." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Found $ClutterCount misplaced item(s) in repository root." -ForegroundColor Yellow
        $HasIssues = $true
    }
}

# ----------------------------------------------------
# 3. TEMP & BUILD ARTIFACT CLEANUP
# ----------------------------------------------------
if ($CleanTemp -or $All) {
    Write-Host "`n[3/4] Cleaning Build Artifacts & Temporary Files..." -ForegroundColor Cyan

    $TempFolders = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Include "bin", "obj" | Where-Object {
        $_.FullName -notlike "*\.git\*" -and $_.FullName -notlike "*\node_modules\*"
    }

    $TempFiles = Get-ChildItem -Path $RepoRoot -Recurse -File -Include "*.user", "*.suo", "*.tmp", "*.bak" | Where-Object {
        $_.FullName -notlike "*\.git\*" -and $_.FullName -notlike "*\node_modules\*"
    }

    $CleanCount = 0

    foreach ($folder in $TempFolders) {
        $relPath = $folder.FullName.Replace($RepoRoot.Path, '')
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Would remove directory: $relPath" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $folder.FullName -Recurse -Force
            Write-Host "  [REMOVED] Directory: $relPath" -ForegroundColor Green
        }
        $CleanCount++
    }

    foreach ($file in $TempFiles) {
        $relPath = $file.FullName.Replace($RepoRoot.Path, '')
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Would remove file: $relPath" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $file.FullName -Force
            Write-Host "  [REMOVED] File: $relPath" -ForegroundColor Green
        }
        $CleanCount++
    }

    if ($CleanCount -eq 0) {
        Write-Host "  [PASS] No leftover build outputs or temp files found." -ForegroundColor Green
    } else {
        if ($DryRun) {
            Write-Host "  [INFO] $CleanCount temp artifact(s) identified for cleanup." -ForegroundColor Yellow
        } else {
            Write-Host "  [SUCCESS] Cleaned $CleanCount temp artifact(s)." -ForegroundColor Green
        }
    }
}

# ----------------------------------------------------
# 4. UTF-8 BOM & ENCODING ENFORCEMENT
# ----------------------------------------------------
if ($FixBOM -or $All) {
    Write-Host "`n[4/4] Verifying & Enforcing UTF-8 BOM Encoding..." -ForegroundColor Cyan

    $VerifyScript = Join-Path $RepoRoot "QA\verify-sscam.ps1"
    if (Test-Path $VerifyScript) {
        if ($DryRun) {
            & $VerifyScript
        } else {
            & $VerifyScript -Fix
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [PASS] Encoding verification passed." -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Encoding verification found issues." -ForegroundColor Red
            $HasIssues = $true
        }
    } else {
        Write-Host "  [WARN] verify-sscam.ps1 script not found at $VerifyScript" -ForegroundColor Yellow
    }
}

Write-Host "`n====================================================" -ForegroundColor Cyan
if ($HasIssues) {
    Write-Host "  Housekeeper finished with warnings/issues." -ForegroundColor Yellow
} else {
    Write-Host "  Housekeeper finished cleanly with ZERO issues." -ForegroundColor Green
}
Write-Host "====================================================" -ForegroundColor Cyan
