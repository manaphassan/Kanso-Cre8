param()

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$csSource = Join-Path $repoRoot "scripts\GenerateKansoIcons.cs"
$exePath = Join-Path $repoRoot "scripts\GenerateKansoIcons.exe"

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

Write-Host "Compiling Kanso Icon Generator..." -ForegroundColor Cyan
& $cscPath /nologo /out:$exePath /r:System.Drawing.dll /r:System.dll $csSource
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile GenerateKansoIcons.cs"
    exit 1
}

Write-Host "Generating crisp multi-resolution icon set..." -ForegroundColor Yellow
& $exePath
if ($LASTEXITCODE -ne 0) {
    Write-Error "Icon generation failed"
    exit 1
}

Write-Host "All Kanso Cre8 icons successfully updated!" -ForegroundColor Green
