# SS-CAM Quick Notes Automated Verification
[CmdletBinding()]
param(
    [string]$QuickNoteXamlPath = "src\SS-CAM\Views\QuickNotePage.xaml"
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$targetPath = Join-Path $repoRoot $QuickNoteXamlPath

if (Test-Path $targetPath) {
    Write-Host "[PASS] QuickNotePage.xaml verified at $targetPath" -ForegroundColor Green
    exit 0
} else {
    Write-Warning "QuickNotePage.xaml not found at $targetPath"
    exit 1
}
