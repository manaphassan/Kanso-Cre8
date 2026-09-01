using System;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;

namespace SS_CAM.Linux.Services
{
    public static class ClipboardService
    {
        public static async Task SetTextAsync(string text)
        {
            if (text == null) text = "";

            // 1. Try Avalonia top-level clipboard via reflection
            try
            {
                if (Application.Current?.ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop && desktop.MainWindow != null)
                {
                    var topLevel = TopLevel.GetTopLevel(desktop.MainWindow);
                    var clipboard = topLevel?.Clipboard;
                    if (clipboard != null)
                    {
                        var method = clipboard.GetType().GetMethod("SetTextAsync", new[] { typeof(string) });
                        if (method != null)
                        {
                            var task = method.Invoke(clipboard, new object[] { text }) as Task;
                            if (task != null) await task;
                            return;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[ClipboardService] Clipboard reflection error: {ex.Message}");
            }

            // 2. Linux native fallback: xclip or wl-copy
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "sh",
                    Arguments = $"-c \"printf '%s' '{text.Replace("'", "'\\''")}' | (xclip -selection clipboard 2>/dev/null || wl-copy 2>/dev/null || true)\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var p = Process.Start(psi);
                p?.WaitForExit(500);
            }
            catch { }
        }
    }
}
