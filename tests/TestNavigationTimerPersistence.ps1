Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

[System.Reflection.Assembly]::LoadFrom("e:\Dev\Projects\SS-Brand-Assets\src\SS-CAM\bin\Release\SS-CAM.exe") | Out-Null

$app = [System.Windows.Application]::Current
if (-not $app) { $app = New-Object System.Windows.Application }

$mw = New-Object SS_CAM.MainWindow
$mw.Show()

Write-Host "1. Navigating to WellbeingPage..." -ForegroundColor Cyan
$mw.NavigateTo([SS_CAM.Views.WellbeingPage], $mw.NavWellbeingBtn)

$timer = [SS_CAM.Services.WellbeingTimerService]::SharedInstance
Write-Host "2. Starting 5-Min Break timer session..." -ForegroundColor Cyan
$timer.StartSession(5, "5-Min Break Test")

Write-Host "Initial Timer State: "$timer.State " - Remaining Secs: "$timer.GetLiveRemainingSeconds()

Write-Host "3. Navigating to DashboardPage..." -ForegroundColor Cyan
$mw.NavigateTo([SS_CAM.Views.DashboardPage], $mw.NavDashboardBtn)
Start-Sleep -Seconds 2

Write-Host "Timer State while on Dashboard: "$timer.State " - Remaining Secs: "$timer.GetLiveRemainingSeconds()

Write-Host "4. Navigating back to WellbeingPage..." -ForegroundColor Cyan
$mw.NavigateTo([SS_CAM.Views.WellbeingPage], $mw.NavWellbeingBtn)

Write-Host "Final Timer State: "$timer.State " - Remaining Secs: "$timer.GetLiveRemainingSeconds()

if ($timer.State -eq [SS_CAM.Services.WellbeingTimerService+TimerState]::Running -and $timer.GetLiveRemainingSeconds() -lt 300) {
    Write-Host "[SUCCESS] Timer persisted cleanly across navigation!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Timer was reset or lost during navigation!" -ForegroundColor Red
}

$mw.Close()
