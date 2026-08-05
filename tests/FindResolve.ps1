Get-Process | Where-Object { $_.MainWindowTitle -like "*DaVinci*" -or $_.ProcessName -like "*Resolve*" } | ForEach-Object {
    Write-Host "Process: "$_.ProcessName
    Write-Host "Path   : "$_.Path
    Write-Host "Title  : "$_.MainWindowTitle
}

$drives = Get-PSDrive -PSProvider FileSystem
foreach ($d in $drives) {
    $p = Join-Path $d.Root "Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe"
    if (Test-Path $p) {
        Write-Host "Found on drive ${d}: ${p}"
    }
}
