[CmdletBinding()]
param(
    [switch]$Build,
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Debug'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$guardian = Join-Path $repoRoot 'QA\verify-sscam.ps1'
$project = Join-Path $repoRoot 'src\SS-CAM\SS-CAM.csproj'
$msbuild64 = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe'
$msbuild32 = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\MSBuild.exe'
$msbuild = if (Test-Path -LiteralPath $msbuild64) { $msbuild64 } else { $msbuild32 }
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Write-Result([string]$Status, [string]$Label, [string]$Detail = '') {
    $colour = switch ($Status) {
        'PASS' { 'Green' }
        'FAIL' { 'Red' }
        'WARN' { 'Yellow' }
        'BLOCKED' { 'Yellow' }
        default { 'Gray' }
    }
    Write-Host ("[{0}] {1}" -f $Status, $Label) -ForegroundColor $colour
    if ($Detail) { Write-Host ("       {0}" -f $Detail) -ForegroundColor DarkGray }
}

Write-Host 'SS-CAM QA baseline' -ForegroundColor Cyan
Write-Host ("Repository: {0}" -f $repoRoot)

if (Test-Path -LiteralPath $guardian) {
    & $guardian
    if ($LASTEXITCODE -ne 0) {
        $failures.Add('Source Guardian reported a FAIL-level issue.')
        Write-Result 'FAIL' 'Source Guardian' 'Resolve FAIL-level findings before completing QA.'
    } else {
        Write-Result 'PASS' 'Source Guardian' 'Completed without FAIL-level findings.'
    }
} else {
    $failures.Add('QA/verify-sscam.ps1 was not found.')
    Write-Result 'FAIL' 'Source Guardian' 'QA/verify-sscam.ps1 is missing.'
}

if ($failures.Count -gt 0) {
    Write-Host ("RESULT: FAIL ({0})" -f ($failures -join ' ')) -ForegroundColor Red
    exit 1
}

if ($Build) {
    if (-not (Test-Path -LiteralPath $project)) {
        $failures.Add('SS-CAM project file was not found.')
        Write-Result 'FAIL' 'Build preflight' 'src/SS-CAM/SS-CAM.csproj is missing.'
    } elseif (-not (Test-Path -LiteralPath $msbuild)) {
        $warnings.Add('The .NET Framework MSBuild executable was not found.')
        Write-Result 'BLOCKED' 'Build' 'Install .NET Framework 4.8 developer tools or provide MSBuild.'
    } else {
        & $msbuild $project "/p:Configuration=$Configuration" /t:Rebuild /v:minimal
        if ($LASTEXITCODE -ne 0) {
            $failures.Add("$Configuration build failed.")
            Write-Result 'FAIL' 'Build' "$Configuration build failed."
        } else {
            Write-Result 'PASS' 'Build' "$Configuration build completed."
        }
    }
} else {
    Write-Result 'N/A' 'Build' 'Use -Build to run MSBuild.'
}

if ($failures.Count -gt 0) {
    Write-Host ("RESULT: FAIL ({0})" -f ($failures -join ' ')) -ForegroundColor Red
    exit 1
}

if ($warnings.Count -gt 0) {
    Write-Host ("RESULT: BLOCKED ({0})" -f ($warnings -join ' ')) -ForegroundColor Yellow
    exit 0
}

Write-Host 'RESULT: PASS (automated baseline only; run the scoped workflow tests before sign-off.)' -ForegroundColor Green
