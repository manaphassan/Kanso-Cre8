# SS-CAM Screenshot Capture Tool
# Run this script MANUALLY from your Windows desktop terminal (NOT from the agent terminal)
# It requires the interactive desktop session to capture WPF app windows.
#
# Usage:
#   1. Open PowerShell normally on your desktop
#   2. Run: .\QA\scripts\capture-screenshots.ps1
#   3. The app will launch automatically and screenshots saved to .\docs\

param(
    [string]$OutputDir = "$PSScriptRoot\..\..\docs",
    [string]$ExePath   = "$PSScriptRoot\..\..\src\SS-CAM\bin\Release\SS-CAM.exe"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies @("System.Windows.Forms", "System.Drawing") -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public static class WinSnap {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool rp);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; }

    public static string Snap(IntPtr hwnd, string filePath, int delayMs) {
        ShowWindow(hwnd, 9);
        SetForegroundWindow(hwnd);
        System.Threading.Thread.Sleep(delayMs);

        RECT r;
        if (!GetWindowRect(hwnd, out r)) return "GetWindowRect failed";
        int w = r.R - r.L, h = r.B - r.T;
        if (w < 10 || h < 10) return "Zero size: " + w + "x" + h;

        using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(r.L, r.T, 0, 0, new Size(w, h));
            bmp.Save(filePath, ImageFormat.Png);
        }
        return "OK " + w + "x" + h;
    }

    public static void MouseClick(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(100);
        var input = new System.Windows.Forms.MouseEventArgs(System.Windows.Forms.MouseButtons.Left, 1, x, y, 0);
        // Use mouse_event via SendInput equivalent
        System.Windows.Forms.Cursor.Position = new System.Drawing.Point(x, y);
    }
}
'@

$resolvedDir = Resolve-Path $OutputDir -ErrorAction SilentlyContinue
if ($resolvedDir) { $OutputDir = $resolvedDir.Path }
if (-not $OutputDir) { $OutputDir = "e:\Dev\Projects\SS-Brand-Assets\docs" }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

# Find or launch SS-CAM
function Get-AppProc {
    Get-Process -Name "SS-CAM" -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and $_.MainWindowHandle -ne 0 } |
        Sort-Object MainWindowHandle -Descending | Select-Object -First 1
}

$proc = Get-AppProc
if (-not $proc) {
    Write-Host "Launching SS-CAM..." -ForegroundColor Cyan
    Start-Process $ExePath
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $proc = Get-AppProc
        if ($proc) { Write-Host "  Window ready (${i}s)" -ForegroundColor Green; break }
        Write-Host "  Waiting... ${i}s"
    }
}

if (-not $proc) { Write-Error "SS-CAM window not found after 15s"; exit 1 }

$hwnd = $proc.MainWindowHandle
Write-Host "SS-CAM handle: $hwnd | PID: $($proc.Id)" -ForegroundColor Cyan

# Size and position window
[WinSnap]::MoveWindow($hwnd, 20, 20, 1280, 820, $true) | Out-Null
Start-Sleep -Milliseconds 600

function Snap($label, $file, $delay = 1500) {
    $path = Join-Path $OutputDir $file
    $r = [WinSnap]::Snap($hwnd, $path, $delay)
    $kb = if (Test-Path $path) { [math]::Round((Get-Item $path).Length/1KB, 0) } else { "?" }
    Write-Host "  [$label] $r -> $kb KB" -ForegroundColor $(if ($r -like "OK*") { "Green" } else { "Red" })
}

function ClickNavItem($x, $y) {
    # Simulate mouse click using SendInput
    $curPos = [System.Windows.Forms.Cursor]::Position
    [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new($x, $y)
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.Cursor]::Position = $curPos
}

# Nav bar is at x~50 in the app at left. Items start from y~120
# App is at 20,20 so absolute positions:
# Dashboard   = 20+50, 20+120 = 70, 140
# Project     = 70, 200
# Search      = 70, 250
# Wellbeing   = 70, 310
# Brand       = 70, 360
# Radio       = 70, 420
# Prayer      = 70, 470
# Quick Notes = 70, 530
# Task Mgr    = 70, 580
# Workstation = 70, 630
# Settings    = 70, 720

$baseX = 70  # nav icon center X
$appY  = 20  # app top

Write-Host "`n=== SS-CAM Screenshots ===" -ForegroundColor Yellow

# 1. Dashboard (default page)
Write-Host "1. Dashboard..."
Snap "Dashboard" "app-dashboard.png" 2000

# 2. Navigation overview (same page, sidebar visible) - capture while sidebar expanded
Write-Host "2. Navigation sidebar..."
Snap "Navigation" "app-navigation.png" 500

# Navigate via mouse clicks to each page
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MouseHelper {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
    public const int MOUSEEVENTF_LEFTDOWN = 0x02;
    public const int MOUSEEVENTF_LEFTUP   = 0x04;
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(120);
        mouse_event(MOUSEEVENTF_LEFTDOWN, x, y, 0, 0);
        System.Threading.Thread.Sleep(60);
        mouse_event(MOUSEEVENTF_LEFTUP, x, y, 0, 0);
        System.Threading.Thread.Sleep(100);
    }
}
'@

function NavClick($absX, $absY, $pageName, $outFile, $waitMs = 1500) {
    Write-Host "$pageName..."
    [System.Windows.Forms.SetForegroundWindow]
    [Win32]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 300
    [MouseHelper]::Click($absX, $absY)
    Snap $pageName $outFile $waitMs
}

# 3. Project Creator
NavClick $baseX ($appY + 200) "3. Project Creator" "app-project-creator.png"

# 4. Search & Copy  
NavClick $baseX ($appY + 255) "4. Search & Copy" "app-search-copy.png"

# 5. Waktu Solat (Prayer Times)
NavClick $baseX ($appY + 455) "5. Waktu Solat" "app-waktu-solat.png"

# 6. Settings
NavClick $baseX ($appY + 715) "6. Settings & Profile" "app-profile-settings.png"

Write-Host "`n=== DONE ===" -ForegroundColor Yellow
Get-ChildItem $OutputDir -Filter "app-*.png" | 
    Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,0)}} | 
    Sort-Object Name | Format-Table -AutoSize
