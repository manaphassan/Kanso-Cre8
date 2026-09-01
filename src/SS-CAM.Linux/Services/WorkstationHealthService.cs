using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;

namespace SS_CAM.Linux.Services;

/// <summary>
/// Reads Linux system diagnostics — CPU, RAM, disk, distro info.
/// Mirrors WorkstationHealthPage from the Windows build but adapted for Linux.
/// </summary>
public class WorkstationHealthService
{
    public record SoftwareCheckResult(string Name, bool IsInstalled, string? Version);
    public record SystemInfo(
        string Distro,
        string Kernel,
        int CpuCores,
        string CpuName,
        string RamTotal,
        string RamAvailable,
        string DiskTotal,
        string DiskFree
    );

    public SystemInfo GetSystemInfo()
    {
        return new SystemInfo(
            Distro:       GetDistro(),
            Kernel:       GetKernel(),
            CpuCores:     Environment.ProcessorCount,
            CpuName:      GetCpuName(),
            RamTotal:     GetRamTotal(),
            RamAvailable: GetRamAvailable(),
            DiskTotal:    GetDiskTotal(),
            DiskFree:     GetDiskFree()
        );
    }

    public SoftwareCheckResult[] CheckCreativeSoftware()
    {
        return
        [
            CheckTool("git",              "Git SCM"),
            CheckTool("ffmpeg",           "FFmpeg"),
            CheckTool("mpv",              "mpv (Radio Streaming)"),
            CheckTool("convert",          "ImageMagick"),
            CheckTool("curl",             "cURL"),
            CheckTool("inkscape",         "Inkscape"),
            CheckTool("gimp",             "GIMP"),
            CheckTool("dotnet",           ".NET Runtime"),
            CheckTool("affinity-designer","Affinity Designer (Wine)"),
            CheckTool("affinity-photo",   "Affinity Photo (Wine)"),
        ];
    }

    private static SoftwareCheckResult CheckTool(string command, string displayName)
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo
            {
                FileName = "which",
                Arguments = command,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            });
            p?.WaitForExit(1500);
            bool found = p?.ExitCode == 0;

            string? version = null;
            if (found)
            {
                try
                {
                    using var vp = Process.Start(new ProcessStartInfo
                    {
                        FileName = command,
                        Arguments = "--version",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    });
                    vp?.WaitForExit(1000);
                    version = vp?.StandardOutput.ReadLine()?.Trim();
                    if (string.IsNullOrEmpty(version))
                        version = vp?.StandardError.ReadLine()?.Trim();
                    if (version?.Length > 40) version = version[..40];
                }
                catch { /* version is optional */ }
            }

            return new SoftwareCheckResult(displayName, found, version);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[WorkstationHealthService] CheckTool({command}): {ex.Message}");
            return new SoftwareCheckResult(displayName, false, null);
        }
    }

    private static string GetDistro()
    {
        try
        {
            if (File.Exists("/etc/os-release"))
            {
                foreach (var line in File.ReadAllLines("/etc/os-release"))
                    if (line.StartsWith("PRETTY_NAME="))
                        return line["PRETTY_NAME=".Length..].Trim('"');
            }
        }
        catch { /* ignore */ }
        return RuntimeInformation.OSDescription;
    }

    private static string GetKernel()
    {
        try
        {
            using var p = RunCmd("uname", "-r");
            return p?.StandardOutput.ReadToEnd().Trim() ?? RuntimeInformation.OSDescription;
        }
        catch { return RuntimeInformation.OSDescription; }
    }

    private static string GetCpuName()
    {
        try
        {
            if (File.Exists("/proc/cpuinfo"))
            {
                foreach (var line in File.ReadAllLines("/proc/cpuinfo"))
                    if (line.StartsWith("model name"))
                        return line.Split(':')[1].Trim();
            }
        }
        catch { /* ignore */ }
        return "Unknown CPU";
    }

    private static string GetRamTotal()
    {
        try { return FormatBytes(GC.GetGCMemoryInfo().TotalAvailableMemoryBytes * 2); }
        catch { return "Unknown"; }
    }

    private static string GetRamAvailable()
    {
        try
        {
            if (File.Exists("/proc/meminfo"))
            {
                foreach (var line in File.ReadAllLines("/proc/meminfo"))
                    if (line.StartsWith("MemAvailable:"))
                    {
                        long kb = long.Parse(line.Split(':')[1].Trim().Split(' ')[0]);
                        return FormatBytes(kb * 1024);
                    }
            }
        }
        catch { /* ignore */ }
        return "Unknown";
    }

    private static string GetDiskTotal()
    {
        try
        {
            var info = new DriveInfo("/");
            return FormatBytes(info.TotalSize);
        }
        catch { return "Unknown"; }
    }

    private static string GetDiskFree()
    {
        try
        {
            var info = new DriveInfo("/");
            return FormatBytes(info.AvailableFreeSpace);
        }
        catch { return "Unknown"; }
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes >= 1_099_511_627_776L) return $"{bytes / 1_099_511_627_776.0:F1} TB";
        if (bytes >= 1_073_741_824L)    return $"{bytes / 1_073_741_824.0:F1} GB";
        if (bytes >= 1_048_576L)        return $"{bytes / 1_048_576.0:F0} MB";
        return $"{bytes / 1024} KB";
    }

    private static Process? RunCmd(string cmd, string args)
    {
        var p = Process.Start(new ProcessStartInfo
        {
            FileName = cmd, Arguments = args,
            RedirectStandardOutput = true, RedirectStandardError = true,
            UseShellExecute = false, CreateNoWindow = true
        });
        p?.WaitForExit(2000);
        return p;
    }
}
