using System;
using System.Diagnostics;

namespace SS_CAM.Linux.Services
{
    public static class RadioStreamService
    {
        private static Process? _mpvProcess;

        public static bool IsPlaying => _mpvProcess != null && !_mpvProcess.HasExited;

        public static void PlayStream(string streamUrl)
        {
            StopStream();
            if (string.IsNullOrWhiteSpace(streamUrl)) return;

            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "mpv",
                    Arguments = $"--no-video --volume=85 \"{streamUrl}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                _mpvProcess = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[RadioStreamService] PlayStream error: {ex.Message}");
            }
        }

        public static void StopStream()
        {
            try
            {
                if (_mpvProcess != null && !_mpvProcess.HasExited)
                {
                    _mpvProcess.Kill();
                    _mpvProcess.Dispose();
                }
            }
            catch { }
            finally
            {
                _mpvProcess = null;
            }
        }
    }
}
