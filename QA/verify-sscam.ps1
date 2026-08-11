# ==============================================================================
#  SS-CAM Source Guardian — QA/verify-sscam.ps1
#  Run before every commit and as part of agent code review.
#
#  EXIT CODES:  0 = All checks passed / 1 = FAIL-level issue found
#  USAGE:
#    .\QA\verify-sscam.ps1          # Full check, summary report
#    .\QA\verify-sscam.ps1 -Fix     # Auto-fix encoding issues
#    .\QA\verify-sscam.ps1 -Verbose # Show every scanned file
# ==============================================================================

param([switch]$Fix, [switch]$Verbose)

$ErrorActionPreference = "Continue"
$root    = Split-Path $PSScriptRoot -Parent
$srcRoot = Join-Path $root "src\SS-CAM"
$PASS = 0; $WARN = 0; $FAIL = 0
$issues = [System.Collections.Generic.List[string]]::new()

function Write-Check([string]$label, [string]$status, [string]$detail) {
    $color = switch ($status) { "PASS"{"Green"} "WARN"{"Yellow"} "FAIL"{"Red"} default{"Gray"} }
    Write-Host ("  [{0}] {1}" -f $status.PadRight(4), $label) -ForegroundColor $color
    if ($detail -and ($status -ne "PASS" -or $Verbose)) {
        foreach ($line in ($detail -split "`n")) { Write-Host "         $line" -ForegroundColor DarkGray }
    }
    if ($status -eq "FAIL") { $script:FAIL++; $script:issues.Add("FAIL: $label`n       $detail") }
    if ($status -eq "WARN") { $script:WARN++; $script:issues.Add("WARN: $label`n       $detail") }
    if ($status -eq "PASS") { $script:PASS++ }
}

Write-Host "`nSS-CAM Source Guardian" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor DarkGray
Write-Host "Source root: $srcRoot`n"

$allSrc = Get-ChildItem $srcRoot -Recurse -Include "*.cs","*.xaml" |
          Where-Object { $_.FullName -notmatch "\\(bin|obj|packages)\\" }

# ── CHECK 1: UTF-8 BOM ────────────────────────────────────────────────────────
Write-Host "[ ENCODING ]" -ForegroundColor Cyan
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$noBomFiles = @()
foreach ($file in $allSrc) {
    $bytes  = [System.IO.File]::ReadAllBytes($file.FullName)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $highCnt = ($bytes | Where-Object { $_ -gt 0x7F }).Count
    if (-not $hasBom -and $highCnt -gt 0) {
        $noBomFiles += $file
        if ($Fix) {
            $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8Bom)
        }
    }
}
if ($noBomFiles.Count -eq 0) {
    Write-Check "UTF-8 BOM on all high-byte source files" "PASS" ""
} else {
    $fixNote = if ($Fix) { " (auto-fixed)" } else { " -- run with -Fix to auto-repair" }
    Write-Check "UTF-8 BOM on all high-byte source files" "FAIL" "$($noBomFiles.Count) file(s) missing BOM$fixNote`n$(($noBomFiles | ForEach-Object { $_.Name }) -join "`n")"
}

# ── CHECK 2: No raw non-ASCII in XAML attribute strings ──────────────────────
$rawUnicodeXaml = @()
foreach ($xf in ($allSrc | Where-Object { $_.Extension -eq ".xaml" })) {
    $text = [System.IO.File]::ReadAllText($xf.FullName, [System.Text.Encoding]::UTF8)
    # Match attribute values (Text=, Content=, ToolTip=, Header=, Tag=, Title=) and check if value itself has high chars
    $found = $false
    $attrMatches = [regex]::Matches($text, '(?:Text|Content|ToolTip|Header|Tag|Title|PlaceholderText)\s*=\s*"([^"]*)"')
    foreach ($m in $attrMatches) {
        $val = $m.Groups[1].Value
        foreach ($c in $val.ToCharArray()) {
            if ([int]$c -gt 0xFF) { $found = $true; break }
        }
        if ($found) { break }
    }
    if ($found) { $rawUnicodeXaml += $xf.Name }
}
if ($rawUnicodeXaml.Count -eq 0) {
    Write-Check "No raw Unicode U+0100+ in XAML attribute strings" "PASS" ""
} else {
    Write-Check "No raw Unicode U+0100+ in XAML attribute strings" "WARN" "Use XML entities (&#xNNNN;) or ASCII: $($rawUnicodeXaml -join ', ')"
}

# ── CHECK 3: Fluent 2 — ui:Button ─────────────────────────────────────────────
Write-Host "`n[ FLUENT 2 DESIGN ]" -ForegroundColor Cyan
$viewXamls = Get-ChildItem "$srcRoot\Views" -Filter "*.xaml" -ErrorAction SilentlyContinue
$nativeButtons = @()
foreach ($xf in $viewXamls) {
    $text = Get-Content $xf.FullName -Raw -Encoding UTF8
    if ($text -match '(?<!ui:)<Button\s') { $nativeButtons += $xf.Name }
}
if ($nativeButtons.Count -eq 0) {
    Write-Check "All buttons use <ui:Button> not plain <Button>" "PASS" ""
} else {
    Write-Check "All buttons use <ui:Button> not plain <Button>" "WARN" "Found native WPF Button in: $($nativeButtons -join ', ')"
}

# ── CHECK 4: NavigationView root shell ────────────────────────────────────────
$mwXaml = Join-Path $srcRoot "MainWindow.xaml"
if (Test-Path $mwXaml) {
    $mwText = Get-Content $mwXaml -Raw -Encoding UTF8
    if ($mwText -match 'ui:NavigationView') {
        Write-Check "NavigationView is root shell (Fluent 2 nav pattern)" "PASS" ""
    } else {
        Write-Check "NavigationView is root shell (Fluent 2 nav pattern)" "FAIL" "MainWindow.xaml must use ui:NavigationView as primary nav"
    }
} else {
    Write-Check "NavigationView root shell" "FAIL" "MainWindow.xaml not found"
}

# ── CHECK 5: Pages not Windows (AboutWindow is an approved dialog Window) ─────
$allowedWindows = @('AboutWindow.xaml')
$windowViews = @()
foreach ($xf in $viewXamls) {
    if ($allowedWindows -contains $xf.Name) { continue }
    $first = (Get-Content $xf.FullName -TotalCount 1 -Encoding UTF8)
    if ($first -match '^<Window') { $windowViews += $xf.Name }
}
if ($windowViews.Count -eq 0) {
    Write-Check "All views are Page/ui:Page (not Window)" "PASS" ""
} else {
    Write-Check "All views are Page/ui:Page (not Window)" "FAIL" "View files must be Pages: $($windowViews -join ', ')"
}

Write-Host "`n[ DATA SAFETY ]" -ForegroundColor Cyan
# ── CHECK 6: No hardcoded DEV machine filesystem paths ───────────────────────
# Only flags absolute dev paths - not AppData or Environment.GetFolderPath usage
$hardcodedPaths = @()
$pathPat = '"[A-Ee-e]:\\\\(Dev|Projects|Testing|Users\\\\[A-Za-z])'
foreach ($file in ($allSrc | Where-Object { $_.Extension -eq ".cs" })) {
    $text = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($text -match $pathPat) { $hardcodedPaths += $file.Name }
}
if ($hardcodedPaths.Count -eq 0) {
    Write-Check "No hardcoded filesystem paths in C# code" "PASS" ""
} else {
    Write-Check "No hardcoded filesystem paths in C# code" "FAIL" "Hardcoded paths found in: $($hardcodedPaths -join ', ')"
}

# ── CHECK 7: No silent empty catch{} ─────────────────────────────────────────
$emptyCatch = @()
foreach ($file in ($allSrc | Where-Object { $_.Extension -eq ".cs" })) {
    $text = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($text -match 'catch\s*(\([^)]*\))?\s*\{\s*\}') { $emptyCatch += $file.Name }
}
if ($emptyCatch.Count -eq 0) {
    Write-Check "No silent empty catch{} blocks" "PASS" ""
} else {
    Write-Check "No silent empty catch{} blocks" "WARN" "Replace with Debug.WriteLine logging: $($emptyCatch -join ', ')"
}

# ── CHECK 8: HttpClient singleton ────────────────────────────────────────────
$httpNew = @()
foreach ($file in ($allSrc | Where-Object { $_.Extension -eq ".cs" })) {
    $text = Get-Content $file.FullName -Raw -Encoding UTF8
    $m = [regex]::Matches($text, 'new HttpClient\(\)')
    if ($m.Count -gt 0) { $httpNew += "$($file.Name) ($($m.Count)x)" }
}
if ($httpNew.Count -eq 0) {
    Write-Check "HttpClient is static readonly singleton" "PASS" ""
} else {
    Write-Check "HttpClient is static readonly singleton" "WARN" "Use private static readonly HttpClient: $($httpNew -join ', ')"
}

# ── CHECK 9: No UI thread blocking ───────────────────────────────────────────
Write-Host "`n[ THREAD SAFETY ]" -ForegroundColor Cyan
$uiBlock = @()
foreach ($file in ($allSrc | Where-Object { $_.Extension -eq ".cs" })) {
    $text = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($text -match '\.Result\b|\.Wait\(\)') { $uiBlock += $file.Name }
}
if ($uiBlock.Count -eq 0) {
    Write-Check "No UI thread blocking (.Result / .Wait)" "PASS" ""
} else {
    Write-Check "No UI thread blocking (.Result / .Wait)" "WARN" "Use async/await: $($uiBlock -join ', ')"
}

# ── SUMMARY ───────────────────────────────────────────────────────────────────
Write-Host "`n$("=" * 60)" -ForegroundColor DarkGray
Write-Host "RESULT: " -NoNewline
if ($FAIL -gt 0) {
    Write-Host "FAIL" -ForegroundColor Red -NoNewline
    Write-Host " -- $FAIL critical issue(s) must be resolved before committing."
} elseif ($WARN -gt 0) {
    Write-Host "WARN" -ForegroundColor Yellow -NoNewline
    Write-Host " -- $WARN warning(s), $PASS checks passed. Commit allowed with caution."
} else {
    Write-Host "PASS" -ForegroundColor Green -NoNewline
    Write-Host " -- All $PASS checks passed. Safe to commit."
}
Write-Host "Checks: $PASS passed / $WARN warned / $FAIL failed (of $($PASS+$WARN+$FAIL) total)`n"
if ($FAIL -gt 0) { exit 1 } else { exit 0 }