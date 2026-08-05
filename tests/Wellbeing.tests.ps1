$ErrorActionPreference = 'Stop'

$originalPath = $env:LOCALAPPDATA
$testDir = Join-Path $env:TEMP "WellbeingTest_$([guid]::NewGuid().ToString().Substring(0,8))"
$env:LOCALAPPDATA = $testDir

try {
    # Dot-source the script we want to test
    . (Join-Path $PSScriptRoot "..\installer\src\Installer.WellbeingData.ps1")
    
    Write-Host "Running Wellbeing Tests..."

    # Test 1: Encryption/Decryption Round Trip
    Write-Host "Test 1: DPAPI Encryption Roundtrip"
    $secret = "This is a private focus intention."
    $encrypted = Protect-WellbeingText -PlainText $secret
    if ($encrypted -eq $secret) { throw "Encryption failed, output is plaintext." }
    $decrypted = Unprotect-WellbeingText -EncryptedBase64 $encrypted
    if ($decrypted -ne $secret) { throw "Decryption failed, output mismatch." }

    # Test 2: Empty string handling
    $emptyEnc = Protect-WellbeingText -PlainText ""
    if ($emptyEnc -ne "") { throw "Empty encryption should return empty string." }
    
    # Test 3: Initialize store
    Write-Host "Test 3: Initialize store"
    $data = Initialize-WellbeingStore
    if ($data.SchemaVersion -ne 1) { throw "Invalid schema version." }
    
    # Test 4: Save and Get data
    Write-Host "Test 4: Save and Get data"
    Save-WellbeingData -Data $data
    
    $loadedData = Get-WellbeingData
    if ($loadedData.Preferences.CheckInsEnabled -ne $true) { throw "Preferences failed to load." }
    
    # Test 5: Mind Drop retention purge
    Write-Host "Test 5: Mind Drop retention purge"
    $pastDate = (Get-Date).AddDays(-1).ToString("s")
    $todayDate = (Get-Date).ToString("s")
    
    $loadedData.MindDrops = @(
        @{ Id = "1"; Content = "Keep"; RetentionMode = "Manual"; CreatedAt = $pastDate },
        @{ Id = "2"; Content = "PurgeEndOfDay"; RetentionMode = "EndOfDay"; CreatedAt = $pastDate },
        @{ Id = "3"; Content = "KeepEndOfDay"; RetentionMode = "EndOfDay"; CreatedAt = $todayDate },
        @{ Id = "4"; Content = "PurgeSession"; RetentionMode = "Session"; CreatedAt = $todayDate }
    )
    Save-WellbeingData -Data $loadedData
    
    $purgedData = Get-WellbeingData
    if ($purgedData.MindDrops.Count -ne 2) { throw "Retention purge failed! Count was $($purgedData.MindDrops.Count)" }
    $ids = $purgedData.MindDrops | Select-Object -ExpandProperty Id
    if ("1" -notin $ids) { throw "Missing kept manual drop." }
    if ("3" -notin $ids) { throw "Missing kept today drop." }
    if ("2" -in $ids) { throw "Failed to purge old EndOfDay drop." }
    if ("4" -in $ids) { throw "Failed to purge Session drop." }

    Write-Host "ALL TESTS PASSED."
}
finally {
    $env:LOCALAPPDATA = $originalPath
    if (Test-Path -LiteralPath $testDir) {
        Remove-Item -LiteralPath $testDir -Recurse -Force
    }
}
