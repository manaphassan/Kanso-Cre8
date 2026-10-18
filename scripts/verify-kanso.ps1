[CmdletBinding()]
param()

$target = Join-Path $PSScriptRoot "..\.agents\skills\kanso-guardian\scripts\verify-kanso.ps1"
if (Test-Path $target) {
    & $target @args
    exit $LASTEXITCODE
} else {
    Write-Error "verify-kanso.ps1 not found at $target"
    exit 1
}
