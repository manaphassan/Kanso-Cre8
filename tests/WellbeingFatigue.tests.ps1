$ErrorActionPreference = 'Stop'

$originalPath = $env:LOCALAPPDATA
$testDir = Join-Path $env:TEMP "WellbeingTestFatigue_$([guid]::NewGuid().ToString().Substring(0,8))"
$env:LOCALAPPDATA = $testDir

try {
    # Dot-source the dependencies
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.WellbeingData.ps1")
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.Wellbeing.ps1")
    
    Write-Host "Running Fatigue Rule Tests..."

    $data = Initialize-WellbeingStore
    Save-WellbeingData -Data $data

    # Test 1: Check-in Rules
    Write-Host "Test 1: Check-in Rules"
    # Mood 1, Energy 1, Pressure 4 -> Should recommend breathing reset and gentle focus
    Save-WellbeingCheckIn -Mood 1 -Energy 1 -Pressure 4 -Context "manual" | Out-Null
    
    $recs = Invoke-FatigueRuleEngine
    $recsArr = @($recs)
    if ($recsArr.Count -eq 0) { throw "Expected recommendation." }
    if ($recsArr[0].Message -notmatch "breathing reset") { throw "Expected breathing reset." }

    # Test 2: Two consecutive low energy check-ins
    Save-WellbeingCheckIn -Mood 3 -Energy 2 -Pressure 2 -Context "manual" | Out-Null
    # Last checkin: E2. Previous: E1. Both <= 2.
    $recs = Invoke-FatigueRuleEngine
    $hasAlert = $false
    foreach ($r in $recs) { if ($r.Type -eq "Alert" -and $r.Message -match "Low energy") { $hasAlert = $true } }
    if (-not $hasAlert) { throw "Expected consecutive low energy alert." }

    # Test 3: Reset Session tracking
    Write-Host "Test 3: Reset Tracking"
    $rSession = Start-WellbeingResetSession -ResetType "breathing" -DurationSeconds 120
    if ($rSession.Status -ne "running") { throw "Status should be running" }
    Stop-WellbeingResetSession -Id $rSession.Id -ActualSeconds 120
    $loadedData = Get-WellbeingData
    if ($loadedData.ResetSessions[0].Status -ne "completed") { throw "Reset should be completed" }

    Write-Host "ALL TESTS PASSED."
}
finally {
    $env:LOCALAPPDATA = $originalPath
    if (Test-Path -LiteralPath $testDir) {
        Remove-Item -LiteralPath $testDir -Recurse -Force
    }
}
