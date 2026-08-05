$local = [Environment]::GetFolderPath("LocalApplicationData")

function Check-App($name, $paths, $latestVer, $dlUrl) {
    $foundPath = $null
    $ver = "Not Installed"
    $isInstalled = $false

    foreach ($p in $paths) {
        if (Test-Path $p) {
            $foundPath = $p
            $isInstalled = $true
            try {
                $vi = (Get-Item $p).VersionInfo
                if (-not [string]::IsNullOrWhiteSpace($vi.FileVersion)) {
                    $ver = "v" + $vi.FileVersion
                } elseif (-not [string]::IsNullOrWhiteSpace($vi.ProductVersion)) {
                    $ver = "v" + $vi.ProductVersion
                } else {
                    $ver = "Installed"
                }
            } catch {
                $ver = "Installed"
            }
            break
        }
    }

    $col = if ($isInstalled) { "Green" } else { "Gray" }
    Write-Host "$name :" -NoNewline
    Write-Host " $ver" -ForegroundColor $col
    Write-Host "   Path: $foundPath"
    Write-Host "   Download: $dlUrl"
    Write-Host ""
}

Write-Host "=== Testing Expanded Synology, DaVinci & Affinity Scan ===" -ForegroundColor Cyan
Write-Host ""

Check-App "1. Serif Affinity Suite (v2/v3)" @(
    "E:\Applications\Affinity\Affinity.exe",
    "C:\Program Files\Affinity\Designer 2\Designer.exe"
) "v3.2.3 (Affinity Suite)" "https://www.affinity.studio/"

Check-App "9. DaVinci Resolve Studio" @(
    "E:\Applications\Blackmagic Design\DaVinci Resolve\Resolve.exe",
    "C:\Program Files\Blackmagic Design\DaVinci Resolve\Resolve.exe"
) "v19.0.1 / v20.0" "https://www.blackmagicdesign.com/products/davinciresolve"

Check-App "10. Synology Drive Client" @(
    (Join-Path $local "SynologyDrive\SynologyDrive.app\bin\cloud-drive-ui.exe"),
    "C:\Program Files (x86)\Synology\SynologyDrive\bin\launcher.exe",
    "C:\Program Files (x86)\Synology\SynologyDrive\bin\synology-drive.exe"
) "v4.0.2-17889" "https://www.synology.com/en-global/support/download/utility"
