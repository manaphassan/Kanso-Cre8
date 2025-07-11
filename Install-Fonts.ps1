# Save this as Install-Fonts.ps1
param (
    [string]$FontFolder = ".\FontLibrary"
)

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires administrator privileges. Please run as administrator."
    exit
}

# Check if folder exists
if (-not (Test-Path $FontFolder)) {
    Write-Host "Font folder not found: $FontFolder"
    exit
}

# Get all font files
$fonts = Get-ChildItem -Path $FontFolder -Include ('*.ttf','*.otf','*.fon') -Recurse

if ($fonts.Count -eq 0) {
    Write-Host "No font files found in $FontFolder"
    exit
}

# Load Windows Shell COM object
$shell = New-Object -ComObject Shell.Application
$fontsNamespace = $shell.Namespace(0x14)

foreach ($font in $fonts) {
    try {
        $fontsNamespace.CopyHere($font.FullName)
        Write-Host "Installed font: $($font.Name)"
    } catch {
        Write-Host "Failed to install $($font.Name): $_"
    }
}

Write-Host "Font installation complete. $($fonts.Count) fonts processed."
