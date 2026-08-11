[Reflection.Assembly]::LoadFrom("e:\Dev\Projects\SS-Brand-Assets\dist\SS-CAM-v2.6.0.exe") | Out-Null
$ws = "e:\Dev\Projects\SS-Brand-Assets\QA\TestWorkspace\TestDesigner"
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
    $folders = [SS_CAM.Services.WorkspaceScanner]::GetRecentProjects($ws, 10)
    if ($folders.Count -eq 2) { Write-Host "PASS: Scanner found 2 projects" } else { Write-Host "FAIL: Scanner found 0 projects" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: PrayerTimeService ---"
try {
    $api = new-object SS_CAM.Services.PrayerTimeService
    # WLY01 is KL
    $task = $api.FetchPrayerTimesAsync("WLY01")
    $task.Wait()
    $res = $task.Result
    if ($res -ne $null -and $res.Count -eq 6) { Write-Host "PASS: Prayer API returned 6 times" } else { Write-Host "FAIL: Prayer API failed" }
} catch {
    Write-Host "FAIL: Exception - $_"
}

Write-Host "--- TEST: UserProfileService ---"
try {
    $prof = [SS_CAM.Services.UserProfileService]::LoadProfile()
    if ($prof.DesignerName -eq "TestDesigner") { Write-Host "PASS: Profile loaded successfully" } else { Write-Host "FAIL: Profile loaded wrong data" }
} catch {
    Write-Host "FAIL: Exception - $_"
}
