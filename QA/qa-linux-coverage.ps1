#!/usr/bin/env pwsh
# SS-CAM Linux v4.6.0 — Functional Coverage QA Script
param()

$ErrorActionPreference = "Continue"
$root   = "D:\HaNa_Innovation\ss_cam\src\SS-CAM.Linux"
$pass   = 0; $fail = 0; $warn = 0

function Check([string]$label, [bool]$cond, [string]$note = "") {
    if ($cond) { Write-Host "  [PASS] $label" -ForegroundColor Green; $script:pass++ }
    else {
        $msg = "  [FAIL] $label"
        if ($note) { $msg += " -- $note" }
        Write-Host $msg -ForegroundColor Red; $script:fail++
    }
}
function Warn([string]$label, [bool]$cond, [string]$note = "") {
    if ($cond) { Write-Host "  [PASS] $label" -ForegroundColor Green; $script:pass++ }
    else {
        $msg = "  [WARN] $label"
        if ($note) { $msg += " -- $note" }
        Write-Host $msg -ForegroundColor Yellow; $script:warn++
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      SS-CAM Linux v4.6.0 — Functional Coverage QA          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. PAGE COMPLETENESS (15 pages) ──────────────────────────────────
Write-Host "[ PAGE COMPLETENESS ]" -ForegroundColor White
$pages = @(
    "DashboardView","ProjectCreatorView","SearchCopyView","CopywritingView",
    "BrandAssetsView","TaskManagerView","CalendarView","QuickNoteView",
    "WellbeingView","WaktuSolatView","FocusRadioView","QrCodeView",
    "WorkstationHealthView","SettingsView","DeliverablesView"
)
foreach ($p in $pages) {
    $axaml = Test-Path "$root\Views\Pages\$p.axaml"
    $cs    = Test-Path "$root\Views\Pages\$p.axaml.cs"
    Check "$p (.axaml + .cs)" ($axaml -and $cs)
}

# ── 2. SERVICES ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ SERVICES ]" -ForegroundColor White
$services = @("RadioStreamService","PrayerTimeService","QuickNoteService","WorkstationHealthService","WorkspaceService")
foreach ($s in $services) {
    Check "$s.cs" (Test-Path "$root\Services\$s.cs")
}

# ── 3. MODELS ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ MODELS ]" -ForegroundColor White
$models = @("ProjectStatusItem","QuickNoteItem","RadioStationItem","SoftwareCheckItem","CalendarModels")
foreach ($m in $models) {
    Check "$m.cs" (Test-Path "$root\Models\$m.cs")
}

# ── 4. NAVIGATION COMPLETENESS (14 nav entries) ──────────────────────
Write-Host ""
Write-Host "[ NAVIGATION — 14 pages in MainWindow ]" -ForegroundColor White
$mw = Get-Content "$root\Views\MainWindow.axaml" -Raw
$navItems = @(
    "Dashboard","Project Creator","Search","Copywriting","Brand Assets",
    "Task Manager","Big Calendar","Quick Notes","Wellbeing","Waktu Solat",
    "Radio Player","QR Code","Workstation Health","Settings"
)
foreach ($n in $navItems) {
    Check "Nav entry: '$n'" ($mw -match [regex]::Escape($n))
}

# ── 5. VIEWMODEL RELAY COMMANDS ──────────────────────────────────────
Write-Host ""
Write-Host "[ VIEWMODEL RELAY COMMANDS ]" -ForegroundColor White
$vm = Get-Content "$root\ViewModels\MainViewModel.cs" -Raw
$commands = @(
    "LoadProjectsCommand","CreateProjectCommand","GenerateQrCommand","SaveQrPngCommand",
    "FetchSolatCommand","RescanWorkstationCommand","ToggleRadioCommand","CheckNasStatusCommand",
    "NewNoteCommand","SaveNoteCommand","DeleteNoteCommand","SelectNoteCommand",
    "IncrementWaterCommand","TogglePomodoroCommand","PrevMonthCommand","NextMonthCommand",
    "SelectTabCommand","MoveStatusCommand","OpenFolderCommand"
)
foreach ($c in $commands) {
    Check "Command: $c" ($vm -match $c)
}

# ── 6. CODE SAFETY ───────────────────────────────────────────────────
Write-Host ""
Write-Host "[ CODE SAFETY ]" -ForegroundColor White
$allCs = Get-ChildItem "$root" -Recurse -Filter "*.cs" | Where-Object { $_.FullName -notmatch "\\obj\\" }

# Silent catch (truly empty: catch { })
$silentCatch = $allCs | Select-String "catch\s*\(\)\s*\{\s*\}" -Pattern
Check "No silent empty catch{ }" ($silentCatch.Count -eq 0) "$($silentCatch.Count) found"

# UI-thread blocking
$blockingCalls = $allCs | Select-String "\.Result\b|\.Wait\(\)" -Pattern | Where-Object { $_.Line -notmatch "//" }
Check "No UI blocking (.Result/.Wait)" ($blockingCalls.Count -eq 0) "$($blockingCalls.Count) instances"

# No hardcoded filesystem paths (Unix absolute paths)
$hardcodedPaths = $allCs | Select-String '(?<!//.*)"(/home/|/opt/|/usr/|/etc/)' -Pattern | Where-Object { $_.Line -notmatch "//" }
Warn "No hardcoded Unix paths" ($hardcodedPaths.Count -eq 0) "$($hardcodedPaths.Count) found"

# ── 7. DEPENDENCIES ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[ DEPENDENCIES ]" -ForegroundColor White
$csproj = Get-Content "$root\SS-CAM.Linux.csproj" -Raw
Check "QRCoder NuGet"             ($csproj -match "QRCoder")
Check "CommunityToolkit.Mvvm"     ($csproj -match "CommunityToolkit")
Check "Avalonia reference"        ($csproj -match "Avalonia")
Check "YamlDotNet"                ($csproj -match "YamlDotNet")
Check "Newtonsoft.Json"           ($csproj -match "Newtonsoft")

# ── 8. BUILD OUTPUT ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[ BUILD OUTPUT ]" -ForegroundColor White
$dll = "$root\bin\Release\net10.0\SS-CAM.Linux.dll"
Check "SS-CAM.Linux.dll exists" (Test-Path $dll)
if (Test-Path $dll) {
    $sz = [math]::Round((Get-Item $dll).Length / 1KB, 1)
    Write-Host "    Binary size: ${sz} KB" -ForegroundColor Gray
    $age = (Get-Date) - (Get-Item $dll).LastWriteTime
    Warn "Binary is recent (< 30 min)" ($age.TotalMinutes -lt 30) "built $([int]$age.TotalMinutes)m ago"
}

# ── 9. AXAML BINDING SPOT-CHECK ──────────────────────────────────────
Write-Host ""
Write-Host "[ AXAML BINDING SPOT-CHECK ]" -ForegroundColor White
$axamlFiles = Get-ChildItem "$root\Views" -Recurse -Filter "*.axaml" | Where-Object { $_.FullName -notmatch "\\obj\\" }
# Check no Watermark= (all replaced with PlaceholderText)
$watermarks = $axamlFiles | Select-String '\bWatermark=' -Pattern
Check "No deprecated Watermark= in AXAML" ($watermarks.Count -eq 0) "$($watermarks.Count) remaining"

# Check no VerticalScrollBarVisibility= on TextBox (Avalonia 11 removed it)
$badScroll = $axamlFiles | Select-String 'TextBox[^>]*VerticalScrollBarVisibility=' -Pattern
Check "No invalid TextBox VerticalScrollBarVisibility=" ($badScroll.Count -eq 0) "$($badScroll.Count) found"

# Check all pages have x:DataType="vm:MainViewModel"
$missingDataType = $axamlFiles | Where-Object { $_.Name -ne "MainWindow.axaml" } | Select-String 'x:DataType' -Pattern -NotMatch
Check "All page AXAML have x:DataType binding" ($missingDataType.Count -eq 0) "$($missingDataType.Count) files missing"

# ── SUMMARY ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PASS: $pass   WARN: $warn   FAIL: $fail"
if ($fail -eq 0 -and $warn -eq 0) {
    Write-Host "  RESULT: PASS - Clean. 0 errors, 0 warnings." -ForegroundColor Green
} elseif ($fail -eq 0) {
    $wMsg = "  RESULT: PASS (with $warn warnings - assess against risk)"
    Write-Host $wMsg -ForegroundColor Yellow
} else {
    $fMsg = "  RESULT: FAIL - $fail checks failed."
    Write-Host $fMsg -ForegroundColor Red
}
Write-Host ""
