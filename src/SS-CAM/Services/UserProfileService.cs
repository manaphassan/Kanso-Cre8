using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Text;
using System.Windows;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public class SoftwareHealthItem
    {
        public string Icon { get; set; }
        public string SoftwareName { get; set; }
        public string ScannedVersion { get; set; }
        public string LatestVersion { get; set; }
        public string StatusText { get; set; }
        public string StatusColor { get; set; }
        public bool IsInstalled { get; set; }
        public string DownloadUrl { get; set; }
        public bool ShowActionButton { get; set; }
    }

    public static class UserProfileService
    {
        private static readonly string _profilePath;

        static UserProfileService()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string ssDir = Path.Combine(appData, "SuamiSihat");

            if (!Directory.Exists(ssDir))
            {
                Directory.CreateDirectory(ssDir);
            }

            _profilePath = Path.Combine(ssDir, "user_profile.json");
        }

        public static UserProfile LoadProfile()
        {
            try
            {
                if (File.Exists(_profilePath))
                {
                    string json = File.ReadAllText(_profilePath, Encoding.UTF8);
                    UserProfile profile = JsonConvert.DeserializeObject<UserProfile>(json);
                    if (profile != null) return profile;
                }
            }
            catch { }

            return GetDefaultProfile();
        }

        public static void SaveProfile(UserProfile profile)
        {
            try
            {
                string json = JsonConvert.SerializeObject(profile, Formatting.Indented);
                File.WriteAllText(_profilePath, json, Encoding.UTF8);
            }
            catch { }
        }

        public static UserProfile GetDefaultProfile()
        {
            return new UserProfile
            {
                DesignerName = "SS Branding",
                StaffId = "SS000X",
                Department = "Creative Department",
                Email = "branding@suamisihat.com",
                AvatarPath = "",
                WorkspaceRoot = @"D:\Testing",
                NextJobNumber = 1
            };
        }

        public static UserProfile ResetToDefaults()
        {
            UserProfile defaultProfile = GetDefaultProfile();
            SaveProfile(defaultProfile);
            return defaultProfile;
        }

        public static void ClearAllDataAndCache()
        {
            UserProfile defaultProfile = GetDefaultProfile();
            SaveProfile(defaultProfile);

            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string ssDir = Path.Combine(appData, "SuamiSihat");
                if (Directory.Exists(ssDir))
                {
                    string wellbeingFile = Path.Combine(ssDir, "wellbeing_history.json");
                    if (File.Exists(wellbeingFile)) File.Delete(wellbeingFile);

                    string avatarPng = Path.Combine(ssDir, "avatar.png");
                    if (File.Exists(avatarPng)) File.Delete(avatarPng);

                    string avatarJpg = Path.Combine(ssDir, "avatar.jpg");
                    if (File.Exists(avatarJpg)) File.Delete(avatarJpg);
                }
            }
            catch { }
        }

        public static SystemSpecs GetSystemSpecs()
        {
            SystemSpecs specs = new SystemSpecs
            {
                OSVersion = Environment.OSVersion.VersionString + (Environment.Is64BitOperatingSystem ? " (64-bit)" : " (32-bit)"),
                ProcessorName = Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "x64 Multi-Core CPU",
                GraphicsGPU = "DirectX 12 GPU",
                TotalRAM = "16 GB RAM",
                DisplayResolution = string.Format("{0} x {1}", (int)SystemParameters.PrimaryScreenWidth, (int)SystemParameters.PrimaryScreenHeight),
                AvailableStorage = "Drive C: "
            };

            try
            {
                DriveInfo driveC = new DriveInfo("C");
                double freeGb = driveC.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                specs.AvailableStorage = string.Format("Drive C: {0:F1} GB free", freeGb);
            }
            catch { }

            try
            {
                using (ManagementObjectSearcher searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        ulong bytes = (ulong)obj["TotalPhysicalMemory"];
                        double ramGb = bytes / (1024.0 * 1024.0 * 1024.0);
                        specs.TotalRAM = string.Format("{0:F0} GB RAM", ramGb);
                    }
                }

                using (ManagementObjectSearcher searcher = new ManagementObjectSearcher("SELECT Name FROM Win32_VideoController"))
                {
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        if (obj["Name"] != null)
                        {
                            string gpuName = obj["Name"].ToString();
                            if (!string.IsNullOrEmpty(gpuName))
                            {
                                specs.GraphicsGPU = gpuName;
                                break;
                            }
                        }
                    }
                }
            }
            catch { }

            return specs;
        }

        public static List<SoftwareHealthItem> ScanInstalledDesignSoftware()
        {
            List<SoftwareHealthItem> items = new List<SoftwareHealthItem>();

            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string roamApp = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string userDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            // 1. Serif Affinity Suite (v2 / v3 / Canva Edition)
            items.Add(CheckAppHealth(
                "🎨",
                "Serif Affinity Suite (v2/v3)",
                new[] {
                    @"E:\Applications\Affinity\Affinity.exe",
                    @"D:\Applications\Affinity\Affinity.exe",
                    @"C:\Applications\Affinity\Affinity.exe",
                    Path.Combine(pf, "Affinity", "Designer 2", "Designer.exe"),
                    Path.Combine(pf, "Affinity", "Photo 2", "Photo.exe"),
                    Path.Combine(pf, "Affinity", "Publisher 2", "Publisher.exe"),
                    @"E:\Applications\Affinity\Designer 2\Designer.exe",
                    @"D:\Applications\Affinity\Designer 2\Designer.exe",
                    Path.Combine(pf, "Serif", "Affinity", "Designer", "Designer.exe")
                },
                "v3.2.3",
                "https://www.affinity.studio/"
            ));

            // 2. Adobe Photoshop
            items.Add(CheckAppHealth(
                "🖼️",
                "Adobe Photoshop",
                new[] {
                    Path.Combine(pf, "Adobe", "Adobe Photoshop 2024", "Photoshop.exe"),
                    Path.Combine(pf, "Adobe", "Adobe Photoshop 2023", "Photoshop.exe"),
                    Path.Combine(pf, "Adobe", "Adobe Photoshop CC", "Photoshop.exe")
                },
                "v25.11 (CC 2024)",
                "https://www.adobe.com/products/photoshop.html"
            ));

            // 3. Adobe Illustrator
            items.Add(CheckAppHealth(
                "✒️",
                "Adobe Illustrator",
                new[] {
                    Path.Combine(pf, "Adobe", "Adobe Illustrator 2024", "Support Files", "Contents", "Windows", "Illustrator.exe"),
                    Path.Combine(pf, "Adobe", "Adobe Illustrator 2023", "Support Files", "Contents", "Windows", "Illustrator.exe")
                },
                "v28.6 (CC 2024)",
                "https://www.adobe.com/products/illustrator.html"
            ));

            // 4. Adobe Premiere Pro
            items.Add(CheckAppHealth(
                "🎬",
                "Adobe Premiere Pro",
                new[] {
                    Path.Combine(pf, "Adobe", "Adobe Premiere Pro 2024", "Adobe Premiere Pro.exe"),
                    Path.Combine(pf, "Adobe", "Adobe Premiere Pro 2023", "Adobe Premiere Pro.exe")
                },
                "v24.5 (CC 2024)",
                "https://www.adobe.com/products/premiere.html"
            ));

            // 5. Adobe After Effects
            items.Add(CheckAppHealth(
                "💥",
                "Adobe After Effects",
                new[] {
                    Path.Combine(pf, "Adobe", "Adobe After Effects 2024", "Support Files", "AfterFX.exe"),
                    Path.Combine(pf, "Adobe", "Adobe After Effects 2023", "Support Files", "AfterFX.exe")
                },
                "v24.5 (CC 2024)",
                "https://www.adobe.com/products/aftereffects.html"
            ));

            // 6. Figma Desktop
            items.Add(CheckAppHealth(
                "❖",
                "Figma Desktop",
                new[] {
                    Path.Combine(localApp, "Figma", "Figma.exe"),
                    Path.Combine(localApp, "Programs", "Figma", "Figma.exe")
                },
                "v126.2.10",
                "https://www.figma.com/downloads/"
            ));

            // 7. Canva Desktop
            items.Add(CheckAppHealth(
                "✨",
                "Canva Desktop",
                new[] {
                    Path.Combine(localApp, "Programs", "Canva", "Canva.exe"),
                    Path.Combine(roamApp, "Canva", "Canva.exe")
                },
                "v1.123.1",
                "https://www.canva.com/download/windows/"
            ));

            // 8. CapCut Desktop
            items.Add(CheckAppHealth(
                "✂️",
                "CapCut Desktop",
                new[] {
                    Path.Combine(localApp, "CapCut", "Apps", "CapCut.exe"),
                    Path.Combine(localApp, "CapCut", "CapCut.exe")
                },
                "v9.1.0",
                "https://www.capcut.com/download"
            ));

            // 9. DaVinci Resolve Studio
            items.Add(CheckAppHealth(
                "🎞️",
                "DaVinci Resolve Studio",
                new[] {
                    @"E:\Applications\Blackmagic Design\DaVinci Resolve\Resolve.exe",
                    @"D:\Applications\Blackmagic Design\DaVinci Resolve\Resolve.exe",
                    @"C:\Applications\Blackmagic Design\DaVinci Resolve\Resolve.exe",
                    Path.Combine(pf, "Blackmagic Design", "DaVinci Resolve", "Resolve.exe"),
                    Path.Combine(pf86, "Blackmagic Design", "DaVinci Resolve", "Resolve.exe")
                },
                "v20.3 (Studio)",
                "https://www.blackmagicdesign.com/products/davinciresolve"
            ));

            // 10. Synology Drive Client
            items.Add(CheckAppHealth(
                "☁️",
                "Synology Drive Client",
                new[] {
                    Path.Combine(localApp, "SynologyDrive", "SynologyDrive.app", "bin", "cloud-drive-ui.exe"),
                    Path.Combine(localApp, "SynologyDrive", "SynologyDrive.app", "bin", "cloud-drive-daemon.exe"),
                    Path.Combine(pf86, "Synology", "SynologyDrive", "bin", "launcher.exe"),
                    Path.Combine(pf86, "Synology", "SynologyDrive", "bin", "synology-drive.exe"),
                    Path.Combine(pf, "Synology", "SynologyDrive", "bin", "launcher.exe"),
                    Path.Combine(pf, "Synology", "SynologyDrive", "bin", "synology-drive.exe")
                },
                "v4.0.2-17889",
                "https://www.synology.com/en-global/support/download/utility"
            ));

            // 11. Google Antigravity
            items.Add(CheckAppHealth(
                "🚀",
                "Google Antigravity (AGY)",
                new[] {
                    Path.Combine(localApp, "Programs", "Antigravity", "Antigravity.exe"),
                    Path.Combine(userDir, ".gemini", "antigravity", "antigravity.exe")
                },
                "v2.5.0",
                "https://gemini.google.com"
            ));

            return items;
        }

        private static SoftwareHealthItem CheckAppHealth(string icon, string name, string[] candidatePaths, string latestVersionLabel, string downloadUrl)
        {
            string foundPath = null;
            string fileVer = null;

            foreach (string path in candidatePaths)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    foundPath = path;
                    try
                    {
                        FileVersionInfo vi = FileVersionInfo.GetVersionInfo(path);
                        if (!string.IsNullOrEmpty(vi.FileVersion))
                            fileVer = "v" + vi.FileVersion;
                        else if (!string.IsNullOrEmpty(vi.ProductVersion))
                            fileVer = "v" + vi.ProductVersion;
                        else
                            fileVer = "Installed";
                    }
                    catch
                    {
                        fileVer = "Installed";
                    }
                    break;
                }
            }

            bool isInstalled = !string.IsNullOrEmpty(foundPath);
            string scannedVersion = isInstalled ? fileVer : "Not Installed";
            string statusText = isInstalled ? "Installed · Healthy" : "Missing / Download Available";
            string statusColor = isInstalled ? "#10B981" : "#F59E0B";

            return new SoftwareHealthItem
            {
                Icon = icon,
                SoftwareName = name,
                ScannedVersion = scannedVersion,
                LatestVersion = latestVersionLabel,
                StatusText = statusText,
                StatusColor = statusColor,
                IsInstalled = isInstalled,
                DownloadUrl = downloadUrl,
                ShowActionButton = !isInstalled
            };
        }
    }
}
