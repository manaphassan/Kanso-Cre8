Write-Host "=== 1. Checking Running Processes ===" -ForegroundColor Cyan
Get-Process | Where-Object { $_.ProcessName -like "*synology*" -or $_.ProcessName -like "*cloud*" -or $_.ProcessName -like "*resolve*" -or $_.ProcessName -like "*davinci*" } | Select-Object ProcessName, Path, Id

Write-Host "`n=== 2. Checking Registry Uninstall Keys ===" -ForegroundColor Cyan
$regPaths = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

foreach ($rp in $regPaths) {
    Get-ItemProperty $rp -ErrorAction SilentlyContinue | Where-Object {
        $_.DisplayName -like "*Synology*" -or $_.DisplayName -like "*DaVinci*" -or $_.DisplayName -like "*Resolve*" -or $_.DisplayName -like "*Affinity*"
    } | Select-Object DisplayName, DisplayVersion, InstallLocation, Publisher
}

Write-Host "`n=== 3. Checking Program Files & AppData Paths ===" -ForegroundColor Cyan
$searchTargets = @(
    "C:\Program Files\Synology",
    "C:\Program Files (x86)\Synology",
    "$env:LOCALAPPDATA\Synology",
    "$env:APPDATA\SynologyDrive",
    "$env:LOCALAPPDATA\SynologyDrive",
    "C:\Program Files\Blackmagic Design",
    "C:\Program Files (x86)\Blackmagic Design",
    "$env:LOCALAPPDATA\Blackmagic Design"
)

foreach ($st in $searchTargets) {
    if (Test-Path $st) {
        Write-Host "FOUND: $st" -ForegroundColor Green
        Get-ChildItem $st -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object FullName
    }
}
