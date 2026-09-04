param(
    [string]$Tag = "v4.6.1",
    [string]$Repo = "SuamiSihat/ss_cam"
)

$inFile = [System.IO.Path]::GetTempFileName()
$outFile = [System.IO.Path]::GetTempFileName()
$errFile = [System.IO.Path]::GetTempFileName()

try {
    [System.IO.File]::WriteAllText($inFile, "protocol=https`nhost=github.com`n`n")
    $p = Start-Process -FilePath "git" -ArgumentList "credential-manager", "get" -NoNewWindow -Wait -PassThru -RedirectStandardInput $inFile -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    $lines = Get-Content $outFile
    $token = ""
    foreach ($line in $lines) {
        if ($line.StartsWith("password=")) {
            $token = $line.Substring(9).Trim()
            break
        }
    }

    if (-not $token) {
        Write-Error "Could not get GitHub token from Git Credential Manager."
        exit 1
    }

    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept" = "application/vnd.github+json"
        "User-Agent" = "SS-CAM-Publisher"
        "X-GitHub-Api-Version" = "2022-11-28"
    }

    Write-Host "[1/3] Querying GitHub Release $Tag for repo $Repo..." -ForegroundColor Cyan
    $releaseUrl = "https://api.github.com/repos/$Repo/releases/tags/$Tag"
    
    $release = $null
    try {
        $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get
        Write-Host "Found Release: $($release.name) (ID: $($release.id))" -ForegroundColor Green
    } catch {
        Write-Host "Release not found. Creating release $Tag..." -ForegroundColor Yellow
        $createUrl = "https://api.github.com/repos/$Repo/releases"
        $body = @{
            tag_name = $Tag
            target_commitish = "SS-Master"
            name = "SS-CAM $Tag - SuamiSihat Creative Assets Management"
            body = "Official multi-platform release of SS-CAM $Tag for Windows, Android, and Linux."
            draft = $false
            prerelease = $false
        } | ConvertTo-Json

        $release = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body -ContentType "application/json"
        Write-Host "Created Release: $($release.name) (ID: $($release.id))" -ForegroundColor Green
    }

    $uploadBase = $release.upload_url -replace '\{\?name,label\}', ''

    $filesToUpload = @(
        @{ Path = "dist\SS-CAM-$Tag-linux-x64.tar.gz"; Name = "SS-CAM-$Tag-linux-x64.tar.gz"; ContentType = "application/gzip" },
        @{ Path = "dist\ss-cam-linux-x64.tar.gz"; Name = "ss-cam-linux-x64.tar.gz"; ContentType = "application/gzip" },
        @{ Path = "dist\SS-CAM-$Tag.exe"; Name = "SS-CAM-$Tag.exe"; ContentType = "application/vnd.microsoft.portable-executable" },
        @{ Path = "dist\SS-CAM-$Tag-android-release.apk"; Name = "SS-CAM-$Tag-android-release.apk"; ContentType = "application/vnd.android.package-archive" },
        @{ Path = "dist\SS-CAM-$Tag-android-debug.apk"; Name = "SS-CAM-$Tag-android-debug.apk"; ContentType = "application/vnd.android.package-archive" }
    )

    if (-not (Test-Path "dist\SS-CAM-$Tag.exe") -and (Test-Path "src\SS-CAM\bin\Release\SS-CAM.exe")) {
        $filesToUpload[2].Path = "src\SS-CAM\bin\Release\SS-CAM.exe"
    }
    if (-not (Test-Path "dist\SS-CAM-$Tag-android-debug.apk") -and (Test-Path "src\SS-CAM.Android\app\build\outputs\apk\debug\app-debug.apk")) {
        $filesToUpload[4].Path = "src\SS-CAM.Android\app\build\outputs\apk\debug\app-debug.apk"
    }

    Write-Host "`n[2/3] Uploading release assets..." -ForegroundColor Cyan

    $existingAssets = $release.assets
    $existingMap = @{}
    if ($existingAssets) {
        foreach ($a in $existingAssets) {
            $existingMap[$a.name] = $a.id
        }
    }

    foreach ($f in $filesToUpload) {
        $localPath = Join-Path (Get-Location) $f.Path
        if (Test-Path $localPath) {
            $fileName = $f.Name
            
            if ($existingMap.ContainsKey($fileName)) {
                $assetId = $existingMap[$fileName]
                Write-Host "Replacing existing asset $fileName (ID: $assetId)..." -ForegroundColor Yellow
                $deleteUrl = "https://api.github.com/repos/$Repo/releases/assets/$assetId"
                Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete
            }

            $lenMb = [Math]::Round(((Get-Item $localPath).Length / 1MB), 2)
            Write-Host "Uploading $fileName ($lenMb MB)..." -ForegroundColor Green
            $uploadUrl = "$uploadBase`?name=$fileName"
            
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $uploadHeaders = @{
                "Authorization" = "Bearer $token"
                "Content-Type" = $f.ContentType
                "User-Agent" = "SS-CAM-Publisher"
                "X-GitHub-Api-Version" = "2022-11-28"
            }

            $response = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $bytes
            Write-Host "Uploaded: $fileName" -ForegroundColor Green
        } else {
            Write-Host "Skipping missing local file: $($f.Path)" -ForegroundColor DarkGray
        }
    }

    Write-Host "`n[3/3] Release Asset Verification:" -ForegroundColor Cyan
    $updatedRelease = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get
    foreach ($asset in $updatedRelease.assets) {
        $sz = [Math]::Round(($asset.size / 1MB), 2)
        Write-Host "  * $($asset.name) ($sz MB) -> $($asset.browser_download_url)" -ForegroundColor Green
    }

    Write-Host "`nRelease $Tag updated successfully with all platform assets!" -ForegroundColor Green
}
finally {
    Remove-Item $inFile, $outFile, $errFile -Force -ErrorAction SilentlyContinue
}
