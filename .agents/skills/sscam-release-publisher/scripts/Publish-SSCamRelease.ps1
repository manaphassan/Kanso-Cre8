# Publish-SSCamRelease.ps1
# Automates the SS-CAM GitHub Release publication pipeline.
# Usage:
#   .\Publish-SSCamRelease.ps1 -Version "3.0.0"
#   .\Publish-SSCamRelease.ps1 -Version "3.1.0" -SkipWiki
#   .\Publish-SSCamRelease.ps1 -Version "3.1.0" -DryRun

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [switch]$SkipWiki,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot  = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$tag       = "v$Version"
$today     = (Get-Date -Format 'yyyy-MM-dd')
$results   = [ordered]@{}

function Write-Result([string]$Step, [string]$Check, [string]$Status, [string]$Detail = '') {
    $color = switch ($Status) {
        'PASS'    { 'Green'  }
        'FAIL'    { 'Red'    }
        'BLOCKED' { 'Yellow' }
        default   { 'Gray'   }
    }
    $results[$Step] = @{ Check = $Check; Status = $Status; Detail = $Detail }
    Write-Host ("[{0}] {1}: {2}" -f $Status, $Step, $Check) -ForegroundColor $color
    if ($Detail) { Write-Host ("       {0}" -f $Detail) -ForegroundColor DarkGray }
}

Write-Host "SS-CAM Release Publisher" -ForegroundColor Cyan
Write-Host ("Release: {0} | Date: {1} | DryRun: {2}" -f $tag, $today, $DryRun.IsPresent)
Write-Host ("Repository: {0}" -f $repoRoot)
Write-Host ''

# ── STEP 1: Remove invalid GITHUB_TOKEN ─────────────────────────────────────
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue

# ── STEP 2: Source Guardian Health Check ─────────────────────────────────────
$guardian = Join-Path $repoRoot 'QA\verify-sscam.ps1'
Write-Host '[ HEALTH CHECK ]' -ForegroundColor Cyan
if (Test-Path $guardian) {
    & $guardian
    if ($LASTEXITCODE -ne 0) {
        Write-Result 'Health Check' 'Source Guardian' 'FAIL' 'Fix all FAIL-level findings before publishing.'
        Write-Host 'RESULT: FAIL (Source Guardian failed. Cannot continue.)' -ForegroundColor Red
        exit 1
    }
    Write-Result 'Health Check' 'Source Guardian (9 checks)' 'PASS'
} else {
    Write-Result 'Health Check' 'Source Guardian' 'FAIL' 'QA/verify-sscam.ps1 not found.'
    exit 1
}

# ── STEP 3: Verify tag exists on origin ─────────────────────────────────────
Write-Host '[ GIT TAG CHECK ]' -ForegroundColor Cyan
$remoteTag = git ls-remote --tags origin | Select-String $tag
if (-not $remoteTag) {
    Write-Result 'Git' "Tag $tag on origin" 'FAIL' "Tag $tag not found on remote. Run sscam-release-manager first."
    exit 1
}
Write-Result 'Git' "Tag $tag on origin" 'PASS'

# ── STEP 4: Generate release notes from CHANGELOG.md ────────────────────────
Write-Host '[ RELEASE NOTES ]' -ForegroundColor Cyan
$changelog = Join-Path $repoRoot 'CHANGELOG.md'
$scratchDir = Join-Path $PSScriptRoot '..\scratch'
if (-not (Test-Path $scratchDir)) { New-Item -ItemType Directory $scratchDir | Out-Null }

$notesFile = Join-Path $scratchDir "release-notes-$tag.md"
$clContent = Get-Content $changelog -Raw -Encoding UTF8

# Extract the first ## [X.Y.Z] block from CHANGELOG.md
$pattern = '(?s)## \[' + [regex]::Escape($Version) + '\].*?(?=## \[|\z)'
$match = [regex]::Match($clContent, $pattern)
if ($match.Success) {
    $notesContent = $match.Value.Trim()
    $notesContent | Set-Content -Encoding UTF8 $notesFile
    Write-Result 'Release Notes' "Extracted from CHANGELOG.md" 'PASS' $notesFile
} else {
    Write-Result 'Release Notes' "CHANGELOG.md ## [$Version] section" 'FAIL' "Section not found in CHANGELOG.md. Add it before publishing."
    exit 1
}

# ── STEP 5: Push branch and tag ─────────────────────────────────────────────
Write-Host '[ GIT PUSH ]' -ForegroundColor Cyan
if (-not $DryRun) {
    git push origin SS-Master
    git tag -f $tag
    git push origin $tag --force
    if ($LASTEXITCODE -eq 0) {
        Write-Result 'Git' "Push SS-Master + tag $tag to origin" 'PASS'
    } else {
        Write-Result 'Git' "Push SS-Master + tag $tag to origin" 'FAIL' "git push failed."
        exit 1
    }
} else {
    Write-Result 'Git' "Push SS-Master + tag $tag to origin" 'PASS' '(DryRun: skipped actual push)'
}

# ── STEP 6: Publish GitHub Release ──────────────────────────────────────────
Write-Host '[ GITHUB RELEASE ]' -ForegroundColor Cyan
$headline = ($notesContent -split "`n" | Where-Object { $_ -match '^\S' } | Select-Object -Skip 1 -First 1).Trim()
if (-not $headline) { $headline = "SS-CAM $tag Release" }
$releaseTitle = "SS-CAM $tag - $headline"

if (-not $DryRun) {
    $existingRelease = gh release view $tag --repo SuamiSihat/ss_cam 2>$null
    if ($LASTEXITCODE -eq 0) {
        # Release exists — edit it
        gh release edit $tag --repo SuamiSihat/ss_cam `
            --title $releaseTitle `
            --notes-file $notesFile `
            --latest
    } else {
        # Create new release
        gh release create $tag --repo SuamiSihat/ss_cam `
            --title $releaseTitle `
            --notes-file $notesFile
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Result 'GitHub Release' "$tag published as Latest" 'PASS'
    } else {
        Write-Result 'GitHub Release' "$tag publish failed" 'FAIL' "Check gh auth status and network connectivity."
    }
} else {
    Write-Result 'GitHub Release' "$tag published as Latest" 'PASS' '(DryRun: skipped actual publish)'
}

# ── STEP 7: Update GitHub Wiki ───────────────────────────────────────────────
Write-Host '[ WIKI UPDATE ]' -ForegroundColor Cyan
if ($SkipWiki) {
    Write-Result 'Wiki' 'Update Home + Release History' 'BLOCKED' '-SkipWiki flag set.'
} else {
    $wikiDir = Join-Path $repoRoot '.agents\wiki'
    try {
        if (-not (Test-Path $wikiDir)) {
            git clone "https://github.com/SuamiSihat/ss_cam.wiki.git" $wikiDir
        } else {
            Set-Location $wikiDir
            git pull origin master
            Set-Location $repoRoot
        }

        # Update Home.md release badge line
        $homePath = Join-Path $wikiDir 'Home.md'
        if (Test-Path $homePath) {
            $homeContent = Get-Content $homePath -Raw -Encoding UTF8
            $homeContent = $homeContent -replace 'release-v[\d.]+-blue', "release-$tag-blue"
            $homeContent = $homeContent -replace 'Latest Release.*', "Latest Release: [$tag](https://github.com/SuamiSihat/ss_cam/releases/tag/$tag)"
            $homeContent | Set-Content -Encoding UTF8 $homePath
        }

        # Update or create Release-History.md
        $historyPath = Join-Path $wikiDir 'Release-History.md'
        if (-not (Test-Path $historyPath)) {
            "# SS-CAM Release History`n" | Set-Content -Encoding UTF8 $historyPath
        }
        $historyContent = Get-Content $historyPath -Raw -Encoding UTF8
        $newEntry = "## [$tag] — $today`n`nSee [full release notes](https://github.com/SuamiSihat/ss_cam/releases/tag/$tag)`n`n---`n`n"
        if ($historyContent -notmatch [regex]::Escape("## [$tag]")) {
            # Prepend after the first heading
            $historyContent = $historyContent -replace '(# SS-CAM Release History\n+)', "`$1$newEntry"
            $historyContent | Set-Content -Encoding UTF8 $historyPath
        }

        if (-not $DryRun) {
            Set-Location $wikiDir
            git add -A
            git commit -m "Update wiki for SS-CAM $tag release"
            git push origin master
            Set-Location $repoRoot
            Write-Result 'Wiki' 'Home + Release History updated' 'PASS'
        } else {
            Write-Result 'Wiki' 'Home + Release History updated' 'PASS' '(DryRun: skipped push)'
        }
    } catch {
        Set-Location $repoRoot
        Write-Result 'Wiki' 'Wiki update failed' 'BLOCKED' $_.Exception.Message
    }
}

# ── STEP 8: Verify final release listing ─────────────────────────────────────
Write-Host '[ VERIFICATION ]' -ForegroundColor Cyan
$releaseList = gh release list --repo SuamiSihat/ss_cam 2>&1
if ($releaseList -match "$tag.*Latest") {
    Write-Result 'Verification' "$tag is Latest release on GitHub" 'PASS'
} else {
    Write-Result 'Verification' "$tag latest status" 'FAIL' "Tag not shown as Latest in: $releaseList"
}

# ── SUMMARY TABLE ────────────────────────────────────────────────────────────
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host 'SS-CAM Release Publisher — Result Summary' -ForegroundColor Cyan
Write-Host '============================================================'

$allPass = $true
foreach ($key in $results.Keys) {
    $r = $results[$key]
    $color = switch ($r.Status) {
        'PASS'    { 'Green'  }
        'FAIL'    { 'Red'    }
        'BLOCKED' { 'Yellow' }
        default   { 'Gray'   }
    }
    Write-Host ("[{0}] {1}: {2}" -f $r.Status, $key, $r.Check) -ForegroundColor $color
    if ($r.Status -eq 'FAIL') { $allPass = $false }
}

Write-Host ''
if ($allPass) {
    Write-Host "RESULT: PASS — SS-CAM $tag successfully published." -ForegroundColor Green
    exit 0
} else {
    Write-Host "RESULT: FAIL — One or more steps failed. Resolve before sign-off." -ForegroundColor Red
    exit 1
}
