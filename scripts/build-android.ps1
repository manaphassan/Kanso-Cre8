# ==============================================================================
# Kanso Cre8 — Android Companion App Build Pipeline
# Uses native Android SDK 35 + JDK 21 + Build-Tools 35.0.0
# Outputs: dist/android/kanso-cre8-v0.1.0-companion.apk
# ==============================================================================

param(
    [switch]$SkipClientBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item "$PSScriptRoot\..").FullName
$androidDir = Join-Path $repoRoot "src\android\app"
$distDir = Join-Path $repoRoot "dist\android"
$clientDist = Join-Path $repoRoot "src\app\client\dist"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KANSO CRE8 - ANDROID COMPANION APK PACKAGING PIPELINE      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Environment Detection
Write-Host "`n[1/6] Checking JDK and Android SDK Toolchains..." -ForegroundColor Yellow

$jdkPath = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
if (-not (Test-Path "$jdkPath\bin\javac.exe")) {
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
        $jdkPath = $env:JAVA_HOME
    } else {
        $javacCmd = Get-Command javac -ErrorAction SilentlyContinue
        if ($javacCmd) {
            $jdkPath = (Get-Item $javacCmd.Source).Directory.Parent.FullName
        }
    }
}

if (-not (Test-Path "$jdkPath\bin\javac.exe")) {
    throw "JDK not found. Ensure OpenJDK 21 or Java 17+ is installed."
}

$javac = Join-Path $jdkPath "bin\javac.exe"
$jar = Join-Path $jdkPath "bin\jar.exe"
$keytool = Join-Path $jdkPath "bin\keytool.exe"
Write-Host "  [OK] Java Compiler: $javac" -ForegroundColor Green

$localApp = [Environment]::GetFolderPath('LocalApplicationData')
$sdkDir = Join-Path $localApp "Android\Sdk"
if (-not (Test-Path $sdkDir)) {
    throw "Android SDK not found at $sdkDir"
}

$androidJar = Join-Path $sdkDir "platforms\android-35\android.jar"
if (-not (Test-Path $androidJar)) {
    $platforms = Get-ChildItem "$sdkDir\platforms" | Sort-Object Name -Descending
    if ($platforms.Count -gt 0) {
        $androidJar = Join-Path $platforms[0].FullName "android.jar"
    } else {
        throw "No android.jar found in $sdkDir\platforms"
    }
}
Write-Host "  [OK] Android Platform Target: $androidJar" -ForegroundColor Green

$buildTools = Join-Path $sdkDir "build-tools\35.0.0"
if (-not (Test-Path $buildTools)) {
    $btList = Get-ChildItem "$sdkDir\build-tools" | Sort-Object Name -Descending
    if ($btList.Count -gt 0) {
        $buildTools = $btList[0].FullName
    } else {
        throw "No Android build-tools found in $sdkDir\build-tools"
    }
}

$aapt2 = Join-Path $buildTools "aapt2.exe"
$d8 = Join-Path $buildTools "d8.bat"
$zipalign = Join-Path $buildTools "zipalign.exe"
$apksigner = Join-Path $buildTools "apksigner.bat"

Write-Host "  [OK] Android Build Tools: $buildTools" -ForegroundColor Green

# 2. Client Web Build
if (-not $SkipClientBuild -or -not (Test-Path "$clientDist\index.html")) {
    Write-Host "`n[2/6] Building Production Svelte 5 Client Assets..." -ForegroundColor Yellow
    Push-Location (Join-Path $repoRoot "src\app")
    try {
        & npm run build:client
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[2/6] Using existing production client assets from $clientDist" -ForegroundColor Yellow
}

# 3. Prepare Work Directories
Write-Host "`n[3/6] Syncing Client Assets into Android Container..." -ForegroundColor Yellow
$workDir = Join-Path $repoRoot "src\android\build_tmp"
if (Test-Path $workDir) {
    Remove-Item -Recurse -Force $workDir
}
New-Item -ItemType Directory -Path "$workDir\gen" -Force | Out-Null
New-Item -ItemType Directory -Path "$workDir\bin" -Force | Out-Null
New-Item -ItemType Directory -Path "$workDir\assets\dist" -Force | Out-Null

Copy-Item -Recurse -Force "$clientDist\*" "$workDir\assets\dist\"
Write-Host "  [OK] Embedded client files into Android assets" -ForegroundColor Green

# 4. Compile Resources with AAPT2
Write-Host "`n[4/6] Compiling Android Resources and Manifest..." -ForegroundColor Yellow
$resDir = Join-Path $androidDir "src\main\res"
$manifestFile = Join-Path $androidDir "src\main\AndroidManifest.xml"
$compiledRes = Join-Path $workDir "compiled_res.zip"

& $aapt2 compile --dir $resDir -o $compiledRes
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

$unalignedApk = Join-Path $workDir "app-unaligned.apk"
& $aapt2 link -I $androidJar --manifest $manifestFile -o $unalignedApk --java "$workDir\gen" $compiledRes -A "$workDir\assets" --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }
Write-Host "  [OK] Generated R.java and packaged base asset APK" -ForegroundColor Green

# 5. Compile Java Source and DEX
Write-Host "`n[5/6] Compiling Java Source and Generating Dalvik Executable (DEX)..." -ForegroundColor Yellow
$srcFiles = @(
    (Get-Item "$androidDir\src\main\java\com\kansocre8\companion\MainActivity.java").FullName,
    (Get-ChildItem "$workDir\gen" -Recurse -Filter *.java | Select-Object -ExpandProperty FullName)
)

& $javac -encoding UTF-8 -cp $androidJar -d "$workDir\bin" $srcFiles
if ($LASTEXITCODE -ne 0) { throw "javac compilation failed" }

$classFiles = Get-ChildItem "$workDir\bin" -Recurse -Filter *.class | Select-Object -ExpandProperty FullName
& $d8 --lib $androidJar --output $workDir $classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 dex generation failed" }

$dexFile = Join-Path $workDir "classes.dex"
if (-not (Test-Path $dexFile)) {
    throw "classes.dex was not generated"
}

# Insert classes.dex into unaligned.apk
Push-Location $workDir
try {
    & $jar uf $unalignedApk "classes.dex"
} finally {
    Pop-Location
}
Write-Host "  [OK] Compiled classes.dex and merged into APK archive" -ForegroundColor Green

# 6. Zipalign and Sign APK
Write-Host "`n[6/6] Zipaligning and Signing Production Android Companion APK..." -ForegroundColor Yellow
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$alignedApk = Join-Path $workDir "app-aligned.apk"
& $zipalign -p -f 4 $unalignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

$keystore = Join-Path $repoRoot "src\android\kanso-companion.keystore"
if (-not (Test-Path $keystore)) {
    Write-Host "  -> Generating Kanso Cre8 Companion signing keystore..." -ForegroundColor Cyan
    & $keytool -genkeypair -v -keystore $keystore -alias kanso_key -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass kansocre8release -keypass kansocre8release `
        -dname "CN=Kanso Cre8, OU=Creative Engineering, O=Kanso Cre8 Vault, C=MY"
}

$finalApk = Join-Path $distDir "kanso-cre8-v0.1.0-companion.apk"
if (Test-Path $finalApk) { Remove-Item -Force $finalApk }

& $apksigner sign --ks $keystore --ks-key-alias kanso_key --ks-pass "pass:kansocre8release" --key-pass "pass:kansocre8release" --out $finalApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

# Clean temporary build folder
Remove-Item -Recurse -Force $workDir

$apkInfo = Get-Item $finalApk
$apkSizeMb = [math]::Round($apkInfo.Length / 1MB, 2)

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESS: ANDROID COMPANION APK READY!               " -ForegroundColor Green
Write-Host "  File: $finalApk ($apkSizeMb MB)                            " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
