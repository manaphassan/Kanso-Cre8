$sh = New-Object -ComObject WScript.Shell
$dirs = @(
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
)

Write-Host "=== Start Menu Shortcuts ===" -ForegroundColor Cyan
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Get-ChildItem -Path $dir -Filter "*.lnk" -Recurse | ForEach-Object {
            try {
                $target = $sh.CreateShortcut($_.FullName).TargetPath
                if ($target -like "*Affinity*" -or $_.Name -like "*Affinity*") {
                    Write-Host "Shortcut: "$_.Name
                    Write-Host "Target  : "$target
                    Write-Host ""
                }
            } catch {}
        }
    }
}

Write-Host "=== Running Processes ===" -ForegroundColor Cyan
Get-Process | Where-Object { $_.ProcessName -like "*Affinity*" -or $_.MainWindowTitle -like "*Affinity*" } | ForEach-Object {
    Write-Host "Process: "$_.ProcessName
    Write-Host "Path   : "$_.Path
}
