using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace SS_CAM.Linux.Services;

/// <summary>
/// Radio streaming via mpv subprocess — no native library dependencies.
/// mpv is pre-installed on Fedora, available via apt/dnf/pacman on all major distros.
/// Gracefully degrades if mpv is not found.
/// </summary>
public class RadioStreamService : IDisposable
{
    private Process? _mpvProcess;
    private string? _currentUrl;
    private int _volume = 80;
    private bool _disposed;

    public bool IsPlaying => _mpvProcess != null && !_mpvProcess.HasExited;
    public string? CurrentUrl => _currentUrl;
    public int Volume => _volume;

    /// <summary>True if mpv is available on this system.</summary>
    public bool IsMpvAvailable { get; private set; }

    public RadioStreamService()
    {
        IsMpvAvailable = CheckMpvAvailable();
    }

    private static bool CheckMpvAvailable()
    {
        try
        {
            using var probe = Process.Start(new ProcessStartInfo
            {
                FileName = "mpv",
                Arguments = "--version",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            probe?.WaitForExit(2000);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public Task PlayAsync(string streamUrl)
    {
        try
        {
            Stop();
            _currentUrl = streamUrl;

            if (!IsMpvAvailable)
            {
                Debug.WriteLine("[RadioStreamService] mpv not found — stream will not play. Install via: sudo apt install mpv");
                return Task.CompletedTask;
            }

            _mpvProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "mpv",
                    Arguments = $"--no-video --volume={_volume} --really-quiet \"{streamUrl}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                },
                EnableRaisingEvents = true
            };

            _mpvProcess.Exited += (_, _) =>
                Debug.WriteLine($"[RadioStreamService] mpv process exited for {streamUrl}");

            _mpvProcess.Start();
            Debug.WriteLine($"[RadioStreamService] Streaming: {streamUrl} (PID {_mpvProcess.Id})");
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[RadioStreamService] PlayAsync error: {ex.Message}");
        }
        return Task.CompletedTask;
    }

    public void Stop()
    {
        try
        {
            if (_mpvProcess != null && !_mpvProcess.HasExited)
            {
                _mpvProcess.Kill(entireProcessTree: true);
                _mpvProcess.WaitForExit(1000);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[RadioStreamService] Stop error: {ex.Message}");
        }
        finally
        {
            _mpvProcess?.Dispose();
            _mpvProcess = null;
        }
    }

    public void SetVolume(int volume)
    {
        _volume = Math.Clamp(volume, 0, 100);
        // mpv IPC volume change would require a named pipe — for now, restart with new volume
        if (IsPlaying && _currentUrl != null)
            _ = PlayAsync(_currentUrl);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        Stop();
        GC.SuppressFinalize(this);
    }
}
