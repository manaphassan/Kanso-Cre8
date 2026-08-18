[CmdletBinding()]
param(
    [string]$CommitMessage = "feat(web): update Web Portal sidebar navigation and login hero background",
    [string]$NasHost = "suamisihat.myds.me",
    [int]$NasPort = 2222,
    [string]$NasUser = "harussani",
    [string]$NasDockerDir = "/volume1/docker/ss-cam-web"
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$webDir = Join-Path $repoRoot 'src\SS-CAM.Web'
$guardianScript = Join-Path $repoRoot 'QA\verify-sscam.ps1'

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " SS-CAM Web Portal Automated Deployment Pipeline" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"
Write-Host "Web Dir:    $webDir"
Write-Host ""

# ─── STEP 1: Run Local Web Test Suite ────────────────────────────────
Write-Host "[ 1/4 ] Running Web Management Portal Unit & DOM Tests..." -ForegroundColor Yellow
Push-Location $webDir
try {
    & node server/test/run-tests.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ FAIL: Web Portal test suite failed. Aborting deployment." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ PASS: Web Portal test suite passed." -ForegroundColor Green
} finally {
    Pop-Location
}

# ─── STEP 2: Run Source Guardian Audit & UTF-8 BOM Repair ─────────────
Write-Host "`n[ 2/4 ] Running Source Guardian & BOM verification..." -ForegroundColor Yellow
if (Test-Path $guardianScript) {
    & powershell -ExecutionPolicy Bypass -File $guardianScript -Fix
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ FAIL: Source Guardian checks failed. Aborting deployment." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ PASS: Source Guardian verification completed." -ForegroundColor Green
}

# ─── STEP 3: Git Stage, Commit & Push to SS-Master ─────────────────────
Write-Host "`n[ 3/4 ] Committing and Pushing to Git (origin/SS-Master)..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    git add src/SS-CAM.Web/
    $status = git status --porcelain
    if ($status) {
        git commit -m $CommitMessage
        Write-Host "Commit created: $CommitMessage" -ForegroundColor Green
    } else {
        Write-Host "No uncommitted changes detected in src/SS-CAM.Web." -ForegroundColor Gray
    }

    git push origin SS-Master
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ FAIL: Git push to origin/SS-Master failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ PASS: Successfully pushed branch SS-Master to GitHub." -ForegroundColor Green
} finally {
    Pop-Location
}

# ─── STEP 4: Synology NAS Sync & Docker Restart Instructions ──────────
Write-Host "`n[ 4/4 ] Synology NAS Docker Deployment Setup" -ForegroundColor Yellow
Write-Host "To complete live deployment on NAS (${NasHost}:${NasPort}), run the following in your SSH session:" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "cd $NasDockerDir" -ForegroundColor White
Write-Host "if [ ! -d .git ]; then git init && git remote add origin https://github.com/SuamiSihat/ss_cam.git; fi" -ForegroundColor White
Write-Host "git fetch origin && git checkout -f -B SS-Master origin/SS-Master" -ForegroundColor White
Write-Host "sudo docker-compose restart" -ForegroundColor White
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " SUCCESS: Web Portal deployment prep & Git push completed!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
