param()

Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\harus\.gemini\antigravity-ide\brain\4fd40885-03c9-468d-9c50-b17a9f57c4fa\.user_uploaded\media_1789335531492.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$width = $bmp.Width
$height = $bmp.Height

Write-Host "Image size: ${width}x${height}"

# Sample background color near corners
$corner = $bmp.GetPixel(10, 10)
$bgR = [double]$corner.R
$bgG = [double]$corner.G
$bgB = [double]$corner.B
$bgLum = 0.299 * $bgR + 0.587 * $bgG + 0.114 * $bgB
Write-Host "Background luminance: $bgLum (R:$bgR G:$bgG B:$bgB)"

# 1. Generate Dark Theme Variant (Light / White / Cream Calligraphy on Transparent Background)
$darkBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# 2. Generate Light Theme Variant (Dark / Black / Charcoal Calligraphy on Transparent Background)
$lightBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Lock bits for high-speed pixel manipulation
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$srcData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$darkData = $darkBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$lightData = $lightBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $width * $height * 4
$srcBytes = New-Object byte[] $bytes
$darkBytes = New-Object byte[] $bytes
$lightBytes = New-Object byte[] $bytes

[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBytes, 0, $bytes)

for ($i = 0; $i -lt $bytes; $i += 4) {
    $b = [double]$srcBytes[$i]
    $g = [double]$srcBytes[$i + 1]
    $r = [double]$srcBytes[$i + 2]
    
    # Calculate luminance of pixel
    $lum = 0.299 * $r + 0.587 * $g + 0.114 * $b
    
    # Transparency factor: if lum is close to background lum (~232), alpha is 0
    # If lum is dark (stroke, ~0-40), alpha is 255
    $diff = ($bgLum - $lum) / $bgLum
    if ($diff -lt 0.05) {
        $alpha = 0.0
    } elseif ($diff -gt 0.6) {
        $alpha = 1.0
    } else {
        $alpha = ($diff - 0.05) / 0.55
        # Smooth curve
        $alpha = [Math]::Pow($alpha, 1.2)
    }
    
    $aByte = [byte]([Math]::Min(255, [Math]::Max(0, [int]($alpha * 255))))
    
    # Dark Mode Variant: Cream/White text (#F4F4F5 with coral tint for Cre8 or pure crisp off-white)
    $darkBytes[$i] = [byte]245     # B
    $darkBytes[$i + 1] = [byte]244 # G
    $darkBytes[$i + 2] = [byte]244 # R
    $darkBytes[$i + 3] = $aByte    # A
    
    # Light Mode Variant: Dark Charcoal (#0F172A / #18181B)
    $lightBytes[$i] = [byte]27     # B
    $lightBytes[$i + 1] = [byte]24 # G
    $lightBytes[$i + 2] = [byte]24 # R
    $lightBytes[$i + 3] = $aByte   # A
}

[System.Runtime.InteropServices.Marshal]::Copy($darkBytes, 0, $darkData.Scan0, $bytes)
[System.Runtime.InteropServices.Marshal]::Copy($lightBytes, 0, $lightData.Scan0, $bytes)

$bmp.UnlockBits($srcData)
$darkBmp.UnlockBits($darkData)
$lightBmp.UnlockBits($lightData)

$targetDir = "src\app\client\public\brand"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }

$darkOut = Join-Path $targetDir "kanso-calligraphy-dark.png"
$lightOut = Join-Path $targetDir "kanso-calligraphy-light.png"
$origOut = Join-Path $targetDir "kanso-calligraphy-banner.png"

$darkBmp.Save($darkOut, [System.Drawing.Imaging.ImageFormat]::Png)
$lightBmp.Save($lightOut, [System.Drawing.Imaging.ImageFormat]::Png)

# Also copy raw uploaded banner
Copy-Item -Force $srcPath $origOut

$bmp.Dispose()
$darkBmp.Dispose()
$lightBmp.Dispose()

Write-Host "Generated dark variant: $darkOut"
Write-Host "Generated light variant: $lightOut"
Write-Host "Saved original banner: $origOut"
