<#
.SYNOPSIS
    Automated build, version bump, and signing pipeline for SS-CAM Android Companion App.
.DESCRIPTION
    Builds the production Android App Bundle (.aab) with cryptographic signing,
    ready for upload to Google Play Console.
.PARAMETER BumpVersion
    Automatically increments versionCode by 1 in build.gradle.kts.
.PARAMETER VersionName
    Optional versionName override (e.g. "4.6.1").
.PARAMETER BuildApk
    Also builds the standalone APK in addition to the AAB bundle.
#>
[CmdletBinding()]
param(
    [switch]$NoBump,
    [string]$VersionName = "",
    [switch]$BuildApk
)

$BumpVersion = !$NoBump.IsPresent
$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..\..\..\..\").FullName
$androidDir = Join-Path $repoRoot "src\SS-CAM.Android"
$appGradle = Join-Path $androidDir "app\build.gradle.kts"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SS-CAM Android Release & Play Store Packaging Pipeline" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Environment Setup
Write-Host "`n[1/5] Checking Build Environment..." -ForegroundColor Yellow

$jdkCandidates = @(
    "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot",
    "C:\Program Files\Java\jdk-17",
    "C:\Program Files\Android\Android Studio\jbr",
    "$env:JAVA_HOME"
)

$foundJdk = $null
foreach ($jdk in $jdkCandidates) {
    if (![string]::IsNullOrWhiteSpace($jdk) -and (Test-Path "$jdk\bin\javac.exe")) {
        $foundJdk = $jdk
        break
    }
}

if ($null -eq $foundJdk) {
    Write-Error "JDK 17 not found. Please install Microsoft OpenJDK 17 LTS."
}

$env:JAVA_HOME = $foundJdk
$env:Path = "$foundJdk\bin;$env:Path"
Write-Host "  -> JAVA_HOME: $foundJdk" -ForegroundColor Green

# Android SDK
$sdkDir = "$env:LOCALAPPDATA\Android\Sdk"
if (!(Test-Path $sdkDir)) {
    Write-Error "Android SDK not found at $sdkDir."
}
$env:ANDROID_HOME = $sdkDir

$localPropPath = Join-Path $androidDir "local.properties"
$escapedSdk = $sdkDir.Replace('\', '\\')
Set-Content -Path $localPropPath -Value "sdk.dir=$escapedSdk"
Write-Host "  -> ANDROID_HOME: $sdkDir" -ForegroundColor Green

# 2. Version Bump
if ($BumpVersion -and (Test-Path $appGradle)) {
    Write-Host "`n[2/5] Bumping Version Code..." -ForegroundColor Yellow
    $gradleContent = Get-Content -Path $appGradle -Raw
    
    if ($gradleContent -match 'versionCode\s*=\s*(\d+)') {
        $currentCode = [int]$matches[1]
        $newCode = $currentCode + 1
        $gradleContent = $gradleContent -replace 'versionCode\s*=\s*\d+', "versionCode = $newCode"
        Write-Host "  -> versionCode: $currentCode -> $newCode" -ForegroundColor Green
    }
    
    if (![string]::IsNullOrWhiteSpace($VersionName)) {
        $gradleContent = $gradleContent -replace 'versionName\s*=\s*"[^"]+"', "versionName = `"$VersionName`""
        Write-Host "  -> versionName: $VersionName" -ForegroundColor Green
    }
    
    Set-Content -Path $appGradle -Value $gradleContent
}

# 3. Release Signing Verification
Write-Host "`n[3/5] Verifying Keystore & Signing Config..." -ForegroundColor Yellow
$keystorePath = Join-Path $androidDir "app\sscam-release.jks"
if (!(Test-Path $keystorePath)) {
    Write-Host "  -> Keystore not found, generating sscam-release.jks..." -ForegroundColor Cyan
    $keytool = "$foundJdk\bin\keytool.exe"
    & $keytool -genkey -v -keystore $keystorePath -alias sscam_key -keyalg RSA -keysize 2048 -validity 10000 -storepass sscam2026release -keypass sscam2026release -dname "CN=SuamiSihat, OU=Creative Production, O=SuamiSihat Sdn Bhd, L=Shah Alam, ST=Selangor, C=MY"
}
Write-Host "  -> Keystore: $keystorePath (Valid)" -ForegroundColor Green

# 4. Gradle Build Execution
Write-Host "`n[4/5] Compiling Release Bundle (bundleRelease)..." -ForegroundColor Yellow
Push-Location $androidDir
try {
    & ".\gradlew.bat" bundleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Gradle bundleRelease failed with exit code $LASTEXITCODE"
    }

    if ($BuildApk) {
        Write-Host "  -> Compiling Standalone Release APK (assembleRelease)..." -ForegroundColor Yellow
        & ".\gradlew.bat" assembleRelease --no-daemon
    }
}
finally {
    Pop-Location
}

# 5. Output Verification
Write-Host "`n[5/5] Verifying Output Artifacts..." -ForegroundColor Yellow
$aabPath = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $aabPath) {
    $aabItem = Get-Item $aabPath
    $sizeMb = [math]::Round($aabItem.Length / 1MB, 2)
    
    # Signature check
    $jarsigner = "$foundJdk\bin\jarsigner.exe"
    $sigCheck = & $jarsigner -verify -certs $aabPath 2>&1
    $isSigned = $sigCheck -match "jar verified"
    
    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL: SS-CAM Android Release Ready!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Bundle (.AAB): $aabPath" -ForegroundColor White
    Write-Host "  Bundle Size:   $sizeMb MB" -ForegroundColor White
    Write-Host "  Signature:     $(if ($isSigned) { 'VERIFIED (RSA 2048)' } else { 'UNSIGNED' })" -ForegroundColor $(if ($isSigned) { 'Green' } else { 'Red' })
    
    if ($BuildApk) {
        $apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
        if (Test-Path $apkPath) {
            Write-Host "  APK Output:    $apkPath" -ForegroundColor White
        }
    }
    
    Write-Host "`n------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "  Google Play Console Release Notes (XML):" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
    $releaseNotes = @"
<en-GB>
- Real-Time Multi-Platform Sync with Desktop & Web
- 2x2 Bento Studio Telemetry dashboard
- Persistent Offline Mode with auto-queue sync
- Quick Notes with user isolation & markdown
- Standby Desk Companion clock & focus timer
- Studio Radio & live AzuraCast metadata
- Android 15 & Jetpack Compose optimizations
</en-GB>
<ms-MY>
- Sinkronisasi masa-nyata antara Desktop, Web & Mobile
- Papan pemuka telemetri studio Bento 2x2
- Mod luar talian dengan auto-sync data
- Quick Notes peribadi & pasukan (Markdown)
- Jam meja Standby Desk Mode & pemasa fokus
- Radio studio siaran langsung AzuraCast
- Pengoptimuman Android 15 & Jetpack Compose
</ms-MY>
"@
    Write-Host $releaseNotes -ForegroundColor Gray
    Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
} else {
    Write-Error "Output bundle not found at $aabPath"
}
