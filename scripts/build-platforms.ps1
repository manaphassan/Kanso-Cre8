# ==============================================================================
# Kanso Cre8 - local build entry point
# Builds the packages for this machine's OS (Tauri does not cross-compile)
# and writes dist/manifest.json with SHA-256 checksums. macOS packages and
# release uploads come from the Release workflow on GitHub.
#   powershell -ExecutionPolicy Bypass -File scripts/build-platforms.ps1
# ==============================================================================

param(
    [ValidateSet("Auto", "Windows", "Linux")]
    [string]$Platform = "Auto"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot/..").FullName
$appVersion = (Get-Content (Join-Path $repoRoot "src/app/package.json") -Raw | ConvertFrom-Json).version
$distDir = Join-Path $repoRoot "dist"
$onLinux = (Get-Variable IsLinux -ErrorAction SilentlyContinue) -and $IsLinux

if ($Platform -eq "Auto") { $Platform = if ($onLinux) { "Linux" } else { "Windows" } }
if ($Platform -eq "Windows" -and $onLinux) { throw "Windows packages must be built on Windows." }
if ($Platform -eq "Linux" -and -not $onLinux) { throw "Linux packages must be built on Linux." }

$script = Join-Path $PSScriptRoot ("build-{0}.ps1" -f $Platform.ToLower())
& $script
if (-not $?) { throw "$Platform build failed." }

$artifacts = Get-ChildItem -Path (Join-Path $distDir $Platform.ToLower()) -File | ForEach-Object {
    [ordered]@{
        name       = $_.Name
        path       = "dist/$($Platform.ToLower())/$($_.Name)"
        size_bytes = $_.Length
        sha256     = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash.ToLower()
    }
}

$manifest = [ordered]@{
    product    = "Kanso Cre8"
    version    = $appVersion
    platform   = $Platform.ToLower()
    build_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    artifacts  = @($artifacts)
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding ascii -Path (Join-Path $distDir "manifest.json")
Write-Host "`nManifest: dist/manifest.json ($(@($artifacts).Count) artifacts)" -ForegroundColor Cyan
