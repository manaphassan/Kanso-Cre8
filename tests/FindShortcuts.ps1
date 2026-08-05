$sh = New-Object -ComObject WScript.Shell
$dirs = @(
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Get-ChildItem -Path $dir -Filter "*.lnk" -Recurse | ForEach-Object {
            try {
                $target = $sh.CreateShortcut($_.FullName).TargetPath
                if ($target -like "*Resolve*" -or $target -like "*DaVinci*" -or $target -like "*Synology*") {
                    Write-Host "Shortcut Name: "$_.Name
                    Write-Host "Target Path  : "$target
                    Write-Host ""
                }
            } catch {}
        }
    }
}
