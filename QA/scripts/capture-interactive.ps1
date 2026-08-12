# SS-CAM Screenshot Capture — Works in PowerShell 5.1 and PowerShell 7+
# Run from YOUR terminal: .\QA\scripts\capture-interactive.ps1

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# P/Invoke only — no System.Drawing references in C# (avoids PS7 Bitmap issue)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool rp);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int x, int y, int c, int e);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; }

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(150);
        mouse_event(0x0002, x, y, 0, 0);
        System.Threading.Thread.Sleep(80);
        mouse_event(0x0004, x, y, 0, 0);
        System.Threading.Thread.Sleep(1500);
    }
}
"@

$docs = "e:\Dev\Projects\SS-Brand-Assets\docs"
$exe  = "e:\Dev\Projects\SS-Brand-Assets\src\SS-CAM\bin\Release\SS-CAM.exe"

# Screenshot using pure PowerShell System.Drawing (works PS5.1 + PS7)
function Take-Screenshot($hwnd, $path) {
    [Win32]::ShowWindow($hwnd, 9) | Out-Null
    [Win32]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 2000

    $r = New-Object Win32+RECT
    [Win32]::GetWindowRect($hwnd, [ref]$r) | Out-Null
    $w = $r.R - $r.L
    $h = $r.B - $r.T

    if ($w -lt 50 -or $h -lt 50) {
        Write-Host "    ERR: window size ${w}x${h}" -ForegroundColor Red
        return
    }

    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($r.L, $r.T, 0, 0, (New-Object System.Drawing.Size($w, $h)), [System.Drawing.CopyPixelOperation]::SourceCopy)
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    $kb = [math]::Round((Get-Item $path).Length / 1KB, 0)
    Write-Host "    OK ${w}x${h} ${kb}KB" -ForegroundColor Green
}

function Get-AppProc {
    Get-Process -Name "SS-CAM" -EA SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne 0 } |
        Select-Object -First 1
}

function NavTo($absX, $absY) {
    [Win32]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 300
    [Win32]::Click($absX, $absY)
}

# ---- Launch app ----
$proc = Get-AppProc
if (-not $proc) {
    Write-Host "Launching SS-CAM..." -ForegroundColor Cyan
    Start-Process $exe
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $proc = Get-AppProc
        if ($proc) { Write-Host "  App ready (${i}s)" -ForegroundColor Green; break }
    }
}
if (-not $proc) { Write-Error "SS-CAM window not found"; exit 1 }

$hwnd = $proc.MainWindowHandle
Write-Host "Window handle: $hwnd  PID: $($proc.Id)" -ForegroundColor DarkCyan

# ---- Resize to 1280x820 ----
[Win32]::MoveWindow($hwnd, 20, 20, 1280, 820, $true) | Out-Null
Start-Sleep -Milliseconds 800

# ---- Nav coordinate reference (window at x=20, y=20) ----
# Nav icon column center ~x=50 absolute
# Item y positions (absolute screen, window at y=20):
#   Dashboard:         y≈150
#   Project Creator:   y≈235
#   Search & Copy:     y≈285
#   Waktu Solat:       y≈595
#   Settings:          y≈770
$nx = 50

Write-Host ""
Write-Host "=== SS-CAM v3.0.1 Screenshot Capture ===" -ForegroundColor Yellow
Write-Host "Do NOT move the mouse during capture!" -ForegroundColor Red
Write-Host ""

Write-Host "1/6  Dashboard..." -ForegroundColor Cyan
Take-Screenshot $hwnd "$docs\app-dashboard.png"

Write-Host "2/6  Project Creator..." -ForegroundColor Cyan
NavTo $nx 235
Take-Screenshot $hwnd "$docs\app-project-creator.png"

Write-Host "3/6  Search & Copy..." -ForegroundColor Cyan
NavTo $nx 285
Take-Screenshot $hwnd "$docs\app-search-copy.png"

Write-Host "4/6  Waktu Solat..." -ForegroundColor Cyan
NavTo $nx 595
Take-Screenshot $hwnd "$docs\app-waktu-solat.png"

Write-Host "5/6  Settings & Profile..." -ForegroundColor Cyan
NavTo $nx 770
Take-Screenshot $hwnd "$docs\app-profile-settings.png"

Write-Host "6/6  Navigation (full sidebar view)..." -ForegroundColor Cyan
NavTo $nx 150
Take-Screenshot $hwnd "$docs\app-navigation.png"

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Yellow
Get-ChildItem $docs -Filter "app-*.png" |
    Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,0)}} |
    Sort-Object Name | Format-Table -AutoSize

Write-Host "Run these to publish:" -ForegroundColor Green
Write-Host '  git add docs/*.png' -ForegroundColor DarkGray
Write-Host '  git commit -m "docs: refresh screenshots to v3.0.1 Fluent 2 UI"' -ForegroundColor DarkGray
Write-Host '  git push origin SS-Master' -ForegroundColor DarkGray
