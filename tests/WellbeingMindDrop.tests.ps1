$ErrorActionPreference = 'Stop'

$originalPath = $env:LOCALAPPDATA
$testDir = Join-Path $env:TEMP "WellbeingTestMindDrop_$([guid]::NewGuid().ToString().Substring(0,8))"
$env:LOCALAPPDATA = $testDir

try {
    # Dot-source the dependencies
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.WellbeingData.ps1")
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.Wellbeing.ps1")
    
    Write-Host "Running Mind Drop Tests..."

    $data = Initialize-WellbeingStore
    Save-WellbeingData -Data $data

    # Test 1: Mind Drop creation and encryption
    Write-Host "Test 1: Mind Drop Creation"
    $drop = Save-WellbeingMindDrop -Content "Need to email design client about revisions" -RetentionMode "EndOfDay"
    if ($drop.RetentionMode -ne "EndOfDay") { throw "RetentionMode mismatch." }
    
    $loadedData = Get-WellbeingData
    if ($loadedData.MindDrops.Count -ne 1) { throw "MindDrop not saved." }
    
    $encContent = $loadedData.MindDrops[0].Content
    if ($encContent -match "email design client") { throw "Content was not encrypted in storage!" }
    
    $decContent = Unprotect-WellbeingText -EncryptedBase64 $encContent
    if ($decContent -ne "Need to email design client about revisions") { throw "Decryption mismatch." }
    
    # Test 2: Metrics
    Write-Host "Test 2: Metrics"
    $metrics = Get-WellbeingTodayMetrics
    if ($metrics.MindDropsCaptured -ne 1) { throw "Metrics failed." }

    Write-Host "ALL TESTS PASSED."
}
finally {
    $env:LOCALAPPDATA = $originalPath
    if (Test-Path -LiteralPath $testDir) {
        Remove-Item -LiteralPath $testDir -Recurse -Force
    }
}
