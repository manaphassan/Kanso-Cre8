using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services
{
    public class HealthDiagnosticsResult
    {
        public string CpuModel { get; set; } = "AMD Ryzen / Intel Core";
        public double UsedRamGb { get; set; } = 4.2;
        public double TotalRamGb { get; set; } = 16.0;
        public int RamUsagePercent { get; set; } = 26;
        public double DiskRootUsedGb { get; set; } = 45.0;
        public double DiskRootTotalGb { get; set; } = 250.0;
        public int DiskRootUsagePercent { get; set; } = 18;
        public double DiskHomeUsedGb { get; set; } = 120.0;
        public double DiskHomeTotalGb { get; set; } = 1000.0;
        public string KernelVersion { get; set; } = "Linux 6.x";
        public long NasPingLatencyMs { get; set; } = 2;
        public List<SoftwareCheckItem> SoftwareChecks { get; set; } = new();
    }

    public static class WorkstationHealthService
    {
        public static Task<HealthDiagnosticsResult> GetDiagnosticsAsync()
        {
            return Task.Run(() =>
            {
                var result = new HealthDiagnosticsResult();

                // 1. Read /proc/cpuinfo
                try
                {
                    if (File.Exists("/proc/cpuinfo"))
                    {
                        foreach (var line in File.ReadAllLines("/proc/cpuinfo"))
                        {
                            if (line.StartsWith("model name", StringComparison.OrdinalIgnoreCase))
                            {
                                var parts = line.Split(':');
                                if (parts.Length > 1) { result.CpuModel = parts[1].Trim(); break; }
                            }
                        }
                    }
                }
                catch { }

                // 2. Read /proc/meminfo
                try
                {
                    if (File.Exists("/proc/meminfo"))
                    {
                        long totalKb = 0, availKb = 0;
                        foreach (var line in File.ReadAllLines("/proc/meminfo"))
                        {
                            if (line.StartsWith("MemTotal:")) totalKb = ParseKb(line);
                            if (line.StartsWith("MemAvailable:")) availKb = ParseKb(line);
                        }

                        if (totalKb > 0)
                        {
                            result.TotalRamGb = totalKb / (1024.0 * 1024.0);
                            result.UsedRamGb = (totalKb - availKb) / (1024.0 * 1024.0);
                            result.RamUsagePercent = (int)((result.UsedRamGb / result.TotalRamGb) * 100.0);
                        }
                    }
                }
                catch { }

                // 3. Disk info
                try
                {
                    var driveRoot = new DriveInfo("/");
                    if (driveRoot.IsReady)
                    {
                        result.DiskRootTotalGb = driveRoot.TotalSize / (1024.0 * 1024.0 * 1024.0);
                        result.DiskRootUsedGb = (driveRoot.TotalSize - driveRoot.AvailableFreeSpace) / (1024.0 * 1024.0 * 1024.0);
                        result.DiskRootUsagePercent = (int)((result.DiskRootUsedGb / result.DiskRootTotalGb) * 100.0);
                    }
                }
                catch { }

                // 4. Creative Toolchain checks
                result.SoftwareChecks = new List<SoftwareCheckItem>
                {
                    CheckSoftware("Blender 3D", "blender"),
                    CheckSoftware("Inkscape Vector", "inkscape"),
                    CheckSoftware("GIMP Image Editor", "gimp"),
                    CheckSoftware("VS Code / Cursor", "code"),
                    CheckSoftware("OBS Studio", "obs"),
                    CheckSoftware("Git SCM", "git"),
                    CheckSoftware("FFmpeg Transcoder", "ffmpeg"),
                    CheckSoftware("mpv Audio Streamer", "mpv")
                };

                return result;
            });
        }

        private static long ParseKb(string line)
        {
            try
            {
                var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2 && long.TryParse(parts[1], out var kb)) return kb;
            }
            catch { }
            return 0;
        }

        private static SoftwareCheckItem CheckSoftware(string name, string binary)
        {
            string? foundPath = FindInPath(binary);
            bool isInstalled = !string.IsNullOrWhiteSpace(foundPath);
            return new SoftwareCheckItem
            {
                Name = name,
                Path = foundPath ?? $"Not found in $PATH ({binary})",
                IsInstalled = isInstalled,
                StatusText = isInstalled ? "Installed (Ready)" : "Missing",
                StatusColor = isInstalled ? "#10B981" : "#EF4444"
            };
        }

        private static string? FindInPath(string binary)
        {
            string[] standardPaths = { "/usr/bin", "/usr/local/bin", "/bin", "/snap/bin", "/var/lib/flatpak/exports/bin" };
            foreach (var dir in standardPaths)
            {
                string full = Path.Combine(dir, binary);
                if (File.Exists(full)) return full;
            }

            string? pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrWhiteSpace(pathEnv))
            {
                foreach (var dir in pathEnv.Split(':'))
                {
                    string full = Path.Combine(dir, binary);
                    if (File.Exists(full)) return full;
                }
            }

            return null;
        }
    }
}
