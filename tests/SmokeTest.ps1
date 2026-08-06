<#
.SYNOPSIS
    SmokeTest.ps1 — Automated build verification & UI instantiation test for SS-CAM.
#>
[CmdletBinding()]
param(
    [string]$ExePath = "src\SS-CAM\bin\Release\SS-CAM.exe"
)

$ErrorActionPreference = "Stop"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Running Post-Build SS-CAM Smoke Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$fullExePath = [IO.Path]::GetFullPath($ExePath)
if (-not (Test-Path $fullExePath)) {
    throw "Smoke Test Failed: Executable not found at $fullExePath"
}

Write-Host "1. Checking File Existence & Binary Integrity..." -ForegroundColor Yellow
$fileInfo = Get-Item $fullExePath
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host "   Binary Path : $fullExePath"
Write-Host "   File Size   : $fileSizeMB MB"

Write-Host "`n2. Verifying Bitdefender / AV Assembly Metadata..." -ForegroundColor Yellow
$verInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($fullExePath)
Write-Host "   Company Name: $($verInfo.CompanyName)"
Write-Host "   Product Name: $($verInfo.ProductName)"
Write-Host "   File Version: $($verInfo.FileVersion)"

if ($verInfo.CompanyName -ne "SuamiSihat") {
    throw "Bitdefender Compliance Warning: CompanyName is missing or invalid!"
}
Write-Host "   [PASS] Bitdefender Metadata Checks Passed Cleanly." -ForegroundColor Green

Write-Host "`n3. Testing WPF Pages & Module Instantiation (STA Thread)..." -ForegroundColor Yellow

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$asm = [System.Reflection.Assembly]::LoadFrom($fullExePath)

# Initialize Application context so App.xaml resources (brushes, themes) are in scope
if (-not [System.Windows.Application]::Current) {
    $appType = $asm.GetType("SS_CAM.App")
    $appInstance = [System.Activator]::CreateInstance($appType)
    $appInstance.InitializeComponent()
}

$pagesToTest = @(
    "SS_CAM.Views.DashboardPage",
    "SS_CAM.Views.WellbeingPage",
    "SS_CAM.Views.ProjectCreatorPage",
    "SS_CAM.Views.SearchCopyPage",
    "SS_CAM.Views.BrandAssetsPage",
    "SS_CAM.Views.RadioPage",
    "SS_CAM.Views.WorkstationHealthPage",
    "SS_CAM.Views.SettingsPage"
)

foreach ($pageName in $pagesToTest) {
    Write-Host "   Testing instantiation of $pageName..." -NoNewline
    $type = $asm.GetType($pageName)
    if (-not $type) {
        throw "Type $pageName not found in assembly!"
    }
    $instance = [System.Activator]::CreateInstance($type)
    if (-not $instance) {
        throw "Failed to instantiate $pageName!"
    }
    Write-Host " [OK]" -ForegroundColor Green
}

Write-Host "   Testing MainWindow instantiation..." -NoNewline
$winType = $asm.GetType("SS_CAM.MainWindow")
$winInstance = [System.Activator]::CreateInstance($winType)
if (-not $winInstance) {
    throw "Failed to instantiate MainWindow!"
}
Write-Host " [OK]" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " [PASS] ALL SMOKE TESTS PASSED CLEANLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
