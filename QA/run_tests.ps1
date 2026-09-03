$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$exePath = Join-Path $repoRoot "dist\SS-CAM.exe"
if (-not (Test-Path $exePath)) {
    $exePath = Join-Path $repoRoot "src\SS-CAM\bin\Release\SS-CAM.exe"
}
[Reflection.Assembly]::LoadFrom($exePath) | Out-Null
$ws = Join-Path $PSScriptRoot "TestWorkspace\TestDesigner"
New-Item -ItemType Directory -Path $ws -Force | Out-Null

Write-Host "--- TEST: ProjectGeneratorService ---"
$gen = New-Object SS_CAM.Services.ProjectGeneratorService
try {
    $path = $gen.GenerateProjectFolder($ws, "Test Project", "SS - SuamiSihat", "2026", "0001", "Social Media", [System.Collections.Generic.List[string]]::new())
    Write-Host "Generated: $path"
    if (Test-Path $path) { Write-Host "PASS: Normal Folder Created" } else { Write-Host "FAIL: Folder missing" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

try {
    $path2 = $gen.GenerateProjectFolder($ws, "Invalid/\\Name*", "SS - SuamiSihat", "2026", "0002", "Social Media", [System.Collections.Generic.List[string]]::new())
    Write-Host "Generated: $path2"
    if (Test-Path $path2) { Write-Host "PASS: Invalid Chars Handled" } else { Write-Host "FAIL: Invalid Chars failed" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: WorkspaceScanner ---"
try {
    $snapshot = [SS_CAM.Services.WorkspaceScanner]::Scan($ws)
    if ($snapshot -ne $null -and $snapshot.TotalProjects -eq 2) { 
        Write-Host "PASS: Scanner found 2 projects (TotalProjects=$($snapshot.TotalProjects))" 
    } else { 
        Write-Host "FAIL: Scanner found $($snapshot.TotalProjects) projects" 
    }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: PrayerTimeService & Curated Content ---"
try {
    $hadiths = [SS_CAM.Services.PrayerTimeService]::GetCuratedHadiths()
    $events = [SS_CAM.Services.PrayerTimeService]::GetIslamicEvents()
    if ($hadiths.Count -gt 0 -and $events.Count -gt 0) { 
        Write-Host "PASS: Curated content loaded (Hadiths=$($hadiths.Count), Events=$($events.Count))" 
    } else { 
        Write-Host "FAIL: Curated content failed to load" 
    }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: UserProfileService ---"
try {
    $prof = [SS_CAM.Services.UserProfileService]::LoadProfile()
    if ($prof -ne $null) { Write-Host "PASS: Profile loaded successfully (DesignerName=$($prof.DesignerName))" } else { Write-Host "FAIL: Profile loaded wrong data" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

# Cleanup test workspace
if (Test-Path $ws) {
    Remove-Item -Path $ws -Recurse -Force -ErrorAction SilentlyContinue
}
