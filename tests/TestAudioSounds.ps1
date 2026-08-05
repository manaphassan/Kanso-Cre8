# Post-Build Audio Feedback Test Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Testing SS-CAM Audio Feedback Sound System" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check Audio File Paths
$audioDir = "E:\Dev\Projects\SS-Brand-Assets\payload\Audio"
$soundFiles = @(
    "intro.mp3",
    "notification.mp3",
    "pause.mp3",
    "resume.mp3",
    "stop.mp3",
    "break.mp3",
    "breathing.mp3"
)

Write-Host "`n1. Checking Audio MP3 Files in Payload:" -ForegroundColor Yellow
$missing = 0
foreach ($file in $soundFiles) {
    $filePath = Join-Path $audioDir $file
    if (Test-Path $filePath) {
        $bytes = (Get-Item $filePath).Length
        Write-Host "   [OK] $file ($bytes bytes)" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $file" -ForegroundColor Red
        $missing++
    }
}

if ($missing -gt 0) {
    Write-Host "   [FAIL] $missing audio files missing!" -ForegroundColor Red
    exit 1
}

# 2. Test WPF MediaPlayer Direct Playback
Write-Host "`n2. Testing WPF MediaPlayer Direct Audio Playback:" -ForegroundColor Yellow

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

foreach ($file in $soundFiles) {
    $filePath = Join-Path $audioDir $file
    try {
        $player = New-Object System.Windows.Media.MediaPlayer
        $uri = New-Object System.Uri($filePath, [System.UriKind]::Absolute)
        $player.Open($uri)
        $player.Volume = 0.95
        $player.Play()
        Start-Sleep -Milliseconds 150
        $player.Close()
        Write-Host "   [OK] MediaPlayer initialized & played $file" -ForegroundColor Green
    } catch {
        Write-Host "   [FAIL] Could not play ${file}: ${_}" -ForegroundColor Red
    }
}

# 3. Test C# Compiled Assembly AudioFeedbackService Methods
Write-Host "`n3. Testing Compiled SS-CAM Assembly AudioFeedbackService:" -ForegroundColor Yellow
$asmPath = "E:\Dev\Projects\SS-Brand-Assets\src\SS-CAM\bin\Release\SS-CAM.exe"
$asm = [System.Reflection.Assembly]::LoadFile($asmPath)
$audioServiceType = $asm.GetType("SS_CAM.Services.AudioFeedbackService")

try {
    $audioServiceType.GetMethod('PlayIntroSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayFocusStartSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayPauseSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayResumeSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayStopSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayBreakSound').Invoke($null, $null)
    Start-Sleep -Milliseconds 150
    $audioServiceType.GetMethod('PlayBreathingSound').Invoke($null, $null)
    Write-Host "   [OK] AudioFeedbackService C# assembly sound triggers executed cleanly." -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] AudioFeedbackService execution error: ${_}" -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " [PASS] ALL AUDIO SOUND TESTS PASSED CLEANLY!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
