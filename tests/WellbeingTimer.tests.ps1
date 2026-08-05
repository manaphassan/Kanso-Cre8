$ErrorActionPreference = 'Stop'

$originalPath = $env:LOCALAPPDATA
$testDir = Join-Path $env:TEMP "WellbeingTest3_$([guid]::NewGuid().ToString().Substring(0,8))"
$env:LOCALAPPDATA = $testDir

try {
    # Dot-source the dependencies
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.WellbeingData.ps1")
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.Wellbeing.ps1")
    
    Write-Host "Running Timer Tests..."

    # Test 1: P/Invoke GetIdleTime
    $idle = Get-WellbeingIdleSeconds
    Write-Host "Idle seconds: $idle"
    if ($null -eq $idle) { throw "GetWellbeingIdleSeconds returned null." }

    # Test 2: Start session
    Write-Host "Test 2: Start session"
    Start-WellbeingSession -DurationMinutes 25 -SessionType "Standard Focus"
    if ($script:WellbeingTimerState -ne "Running") { throw "Failed to start." }
    
    # Test 3: Update tick
    Write-Host "Test 3: Update tick"
    Start-Sleep -Seconds 1
    $tick = Update-WellbeingTimerTick
    $formatted = Get-WellbeingCurrentTimeFormatted
    Write-Host "Time: $formatted"
    
    # Test 4: Pause and Resume
    Write-Host "Test 4: Pause and Resume"
    Pause-WellbeingSession
    if ($script:WellbeingTimerState -ne "Paused") { throw "Failed to pause." }
    if ($script:WellbeingElapsedSeconds -le 0) { throw "Elapsed seconds didn't accumulate on pause." }
    Resume-WellbeingSession
    if ($script:WellbeingTimerState -ne "Running") { throw "Failed to resume." }

    # Test 5: End session
    Write-Host "Test 5: Stop session"
    $session = Stop-WellbeingSession -Reason "Test complete"
    if ($session.Status -ne "ended_early") { throw "Status should be ended_early." }
    if ($script:WellbeingTimerState -ne "Ready") { throw "State should be Ready after stop." }
    
    $loadedData = Get-WellbeingData
    if ($loadedData.FocusSessions.Count -ne 1) { throw "Session not saved." }

    Write-Host "ALL TESTS PASSED."
}
finally {
    $env:LOCALAPPDATA = $originalPath
    if (Test-Path -LiteralPath $testDir) {
        Remove-Item -LiteralPath $testDir -Recurse -Force
    }
}
