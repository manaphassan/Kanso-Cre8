[Reflection.Assembly]::LoadFrom("e:\Dev\Projects\SS-Brand-Assets\dist\SS-CAM-v2.6.0.exe") | Out-Null
$ws = "e:\Dev\Projects\SS-Brand-Assets\QA\TestWorkspace"

Write-Host "--- TEST: ProjectGeneratorService ---"
$gen = New-Object SS_CAM.Services.ProjectGeneratorService
try {
    $path = $gen.GenerateProjectFolder($ws, "Test Project", "SS - SuamiSihat", "2026", "0001", "Social Media", [System.Collections.Generic.List[string]]::new())
    Write-Host "Generated: $path"
    if (Test-Path $path) { Write-Host "PASS: Normal Folder Created" } else { Write-Host "FAIL: Folder missing" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: WorkspaceScanner.Scan ---"
try {
    $dashboard = [SS_CAM.Services.WorkspaceScanner]::Scan($ws)
    Write-Host "PASS: Scanned successfully. Total files: $(.TotalFiles)"
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: PrayerTimeService.FetchToday ---"
try {
    $res = [SS_CAM.Services.PrayerTimeService]::FetchToday("WLY01")
    if ($res -ne $null) { Write-Host "PASS: Prayer API returned today's data" } else { Write-Host "FAIL: Prayer API returned null" }
} catch {
    Write-Host "FAIL: Exception - $_"
}
