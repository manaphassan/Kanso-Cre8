#!/usr/bin/env pwsh
# SS-CAM Linux v4.6.0 — Functional Coverage & Smoke Test QA Script
param()

$ErrorActionPreference = "Continue"
$root = "D:\HaNa_Innovation\ss_cam\src\SS-CAM.Linux"
$pass = 0; $fail = 0; $warn = 0

function Check([string]$label, [bool]$cond, [string]$note = "") {
    if ($cond) { 
        Write-Host "  [PASS] $label" -ForegroundColor Green
        $script:pass++ 
    } else {
        $msg = "  [FAIL] $label"
        if ($note) { $msg += " -- $note" }
        Write-Host $msg -ForegroundColor Red
        $script:fail++
    }
}

function Warn([string]$label, [bool]$cond, [string]$note = "") {
    if ($cond) { 
        Write-Host "  [PASS] $label" -ForegroundColor Green
        $script:pass++ 
    } else {
        $msg = "  [WARN] $label"
        if ($note) { $msg += " -- $note" }
        Write-Host $msg -ForegroundColor Yellow
        $script:warn++
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     SS-CAM Linux v4.6.0 -- Functional Coverage QA Smoke Test" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. PAGE COMPLETENESS (15 pages) ──────────────────────────────────
Write-Host "[ 1. VIEW COVERAGE (15 Pages) ]" -ForegroundColor White
$pages = @(
    "DashboardView", "ProjectCreatorView", "SearchCopyView", "CopywritingView",
    "BrandAssetsView", "TaskManagerView", "CalendarView", "QuickNoteView",
    "WellbeingView", "WaktuSolatView", "FocusRadioView", "QrCodeView",
    "WorkstationHealthView", "SettingsView", "DeliverablesView"
)
foreach ($p in $pages) {
    $axaml = Test-Path "$root\Views\Pages\$p.axaml"
    $cs    = Test-Path "$root\Views\Pages\$p.axaml.cs"
    Check ("{0} (.axaml + .axaml.cs)" -f $p) ($axaml -and $cs)
}

# ── 2. SERVICES ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 2. BUSINESS SERVICES ]" -ForegroundColor White
$services = @(
    "WorkspaceScanner", "ProjectGeneratorService", "CopywritingDesktopService",
    "CategoryPresetService", "MalaysiaHolidayService", "BrandAssetsService",
    "WellbeingDataService", "WorkstationHealthService", "RadioStreamService",
    "PrayerTimeService", "QuickNoteService", "ClipboardService"
)
foreach ($s in $services) {
    Check ("{0}.cs" -f $s) (Test-Path "$root\Services\$s.cs")
}

# ── 3. MODELS ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 3. DATA MODELS ]" -ForegroundColor White
$models = @(
    "ProjectStatusItem", "QuickNoteItem", "RadioStationItem", "SoftwareCheckItem",
    "CalendarModels", "CategoryPreset", "BrandTokenModels", "DashboardModels"
)
foreach ($m in $models) {
    Check ("{0}.cs" -f $m) (Test-Path "$root\Models\$m.cs")
}

# ── 4. NAVIGATION COMPLETENESS ───────────────────────────────────────
Write-Host ""
Write-Host "[ 4. NAVIGATION BAR ITEMS ]" -ForegroundColor White
$mw = Get-Content "$root\Views\MainWindow.axaml" -Raw
$navItems = @(
    "Dashboard", "Project Creator", "Search &amp; Copy", "Copywriting",
    "Brand Assets", "Deliverables", "Task Manager", "Big Calendar",
    "Quick Notes", "QR Code", "Radio Player", "Wellbeing",
    "Waktu Solat", "Workstation Health", "Settings"
)
foreach ($n in $navItems) {
    Check ("Nav entry: '{0}'" -f $n) ($mw -match [regex]::Escape($n))
}

# ── 5. VIEWMODEL RELAY COMMAND METHODS ───────────────────────────────
Write-Host ""
Write-Host "[ 5. VIEWMODEL RELAY COMMAND METHODS ]" -ForegroundColor White
$vm = Get-Content "$root\ViewModels\MainViewModel.cs" -Raw
$commands = @(
    "LoadProjects", "GenerateProject", "GenerateQr",
    "ToggleRadio", "PlayStation", "AddWater", "ResetWater",
    "RescanHealth", "SaveSettings", "CheckNasStatus",
    "SaveCurrentNote", "DeleteNote",
    "PrevMonth", "NextMonth", "SelectTab", "StartTask",
    "ReviewTask", "ApproveTask", "CopyPlainText", "CopyMarkdownScript"
)
foreach ($c in $commands) {
    Check ("RelayCommand Method: {0}" -f $c) ($vm -match ("\b" + $c + "(Async)?\("))
}

# ── 6. CODE SAFETY & STANDARDS ───────────────────────────────────────
Write-Host ""
Write-Host "[ 6. CODE SAFETY & THREADING ]" -ForegroundColor White
$allCs = Get-ChildItem "$root" -Recurse -Filter "*.cs" | Where-Object { $_.FullName -notmatch "\\obj\\" }

# UI-thread blocking (.Result / .Wait)
$blockingCalls = $allCs | Select-String -Pattern "\.Result\b|\.Wait\(\)" | Where-Object { $_.Line -notmatch "//" }
Check "No UI thread blocking (.Result / .Wait)" ($blockingCalls.Count -eq 0) ("{0} found" -f $blockingCalls.Count)

# ── 7. BUILD OUTPUT VERIFICATION ─────────────────────────────────────
Write-Host ""
Write-Host "[ 7. BUILD ARTIFACTS ]" -ForegroundColor White
$dll = "$root\bin\Release\net10.0\SS-CAM.Linux.dll"
Check "SS-CAM.Linux.dll built" (Test-Path $dll)

$pubExe = "D:\HaNa_Innovation\ss_cam\publish\linux-x64\SS-CAM.Linux"
Check "Single-file linux-x64 binary exists" (Test-Path $pubExe)
if (Test-Path $pubExe) {
    $szMb = [math]::Round((Get-Item $pubExe).Length / 1MB, 2)
    Write-Host ("    Linux Executable Size: {0} MB" -f $szMb) -ForegroundColor Gray
}

$tar = "D:\HaNa_Innovation\ss_cam\publish\ss-cam-linux-x64.tar.gz"
Check "Distribution tarball (ss-cam-linux-x64.tar.gz) exists" (Test-Path $tar)

# ── SUMMARY ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ("  PASS: {0}   WARN: {1}   FAIL: {2}" -f $pass, $warn, $fail)
if ($fail -eq 0 -and $warn -eq 0) {
    Write-Host "  RESULT: PASS -- All functional smoke tests passed." -ForegroundColor Green
} elseif ($fail -eq 0) {
    Write-Host ("  RESULT: PASS (with {0} warnings)" -f $warn) -ForegroundColor Yellow
} else {
    Write-Host ("  RESULT: FAIL -- {0} checks failed." -f $fail) -ForegroundColor Red
}
Write-Host ""
