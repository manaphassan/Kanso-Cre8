using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Win32;
using System.Diagnostics;
using SS_CAM.Models;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public class UserProfileService
    {
        private static readonly string ConfigFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SuamiSihat",
            "user_profile.json"
        );

        public static UserProfile LoadProfile()
        {
            var profile = JsonPersistenceHelper.Load<UserProfile>(ConfigFilePath);
            if (profile == null || string.IsNullOrWhiteSpace(profile.DesignerName))
            {
                profile = GetDefaultProfile();
                SaveProfile(profile);
            }
            return profile;
        }

        public static void SaveProfile(UserProfile profile)
        {
            JsonPersistenceHelper.Save(ConfigFilePath, profile);
        }

        public static UserProfile ResetToDefaults()
        {
            UserProfile defaultProfile = GetDefaultProfile();
            SaveProfile(defaultProfile);
            return defaultProfile;
        }

        private static UserProfile GetDefaultProfile()
        {
            return new UserProfile();
        }

        public static SystemSpecs GetSystemSpecs()
        {
            var specs = new SystemSpecs();
            try
            {
                // OS
                string arch = Environment.Is64BitOperatingSystem ? " (64-bit)" : " (32-bit)";
                specs.OSVersion = "Windows 11" + arch;
                try
                {
                    using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
                    {
                        if (key != null)
                        {
                            string prodName = key.GetValue("ProductName") as string;
                            if (!string.IsNullOrEmpty(prodName)) specs.OSVersion = prodName + arch;
                        }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] OS Registry error: " + ex.Message); }

                // CPU
                try
                {
                    using (var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0"))
                    {
                        if (key != null)
                        {
                            string cpuName = key.GetValue("ProcessorNameString") as string;
                            if (!string.IsNullOrEmpty(cpuName)) specs.ProcessorName = cpuName.Trim();
                        }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] CPU Registry error: " + ex.Message); }

                // Motherboard Model
                try
                {
                    using (var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\BIOS"))
                    {
                        if (key != null)
                        {
                            string mfg = key.GetValue("BaseBoardManufacturer") as string ?? key.GetValue("SystemManufacturer") as string ?? "";
                            string model = key.GetValue("BaseBoardProduct") as string ?? key.GetValue("SystemProductName") as string ?? "";
                            if (!string.IsNullOrEmpty(mfg) || !string.IsNullOrEmpty(model))
                            {
                                specs.MotherboardModel = (mfg + " " + model).Trim();
                            }
                        }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] Motherboard Registry error: " + ex.Message); }

                // GPU Model
                try
                {
                    using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\WinSAT"))
                    {
                        if (key != null)
                        {
                            string gpuName = key.GetValue("GraphicsCard") as string;
                            if (!string.IsNullOrEmpty(gpuName)) specs.GraphicsGPU = gpuName.Trim();
                        }
                    }
                    if (specs.GraphicsGPU == "DirectX 12 Compatible GPU")
                    {
                        using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"))
                        {
                            if (key != null)
                            {
                                string driverDesc = key.GetValue("DriverDesc") as string;
                                if (!string.IsNullOrEmpty(driverDesc)) specs.GraphicsGPU = driverDesc.Trim();
                            }
                        }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] GPU Registry error: " + ex.Message); }

                // Storage Free vs Used
                try
                {
                    string systemDrivePath = Path.GetPathRoot(Environment.SystemDirectory);
                    if (string.IsNullOrEmpty(systemDrivePath)) systemDrivePath = "C:\\";
                    var drive = new DriveInfo(systemDrivePath);
                    if (drive.IsReady)
                    {
                        double freeGB = drive.AvailableFreeSpace / (1024.0 * 1024 * 1024);
                        double totalGB = drive.TotalSize / (1024.0 * 1024 * 1024);
                        double usedGB = totalGB - freeGB;
                        double usedPercent = totalGB > 0 ? (usedGB / totalGB) * 100.0 : 0;

                        specs.AvailableStorage = string.Format("Drive {0} {1:F1} GB free / {2:F1} GB total", drive.Name.Replace("\\", "").Replace(":", ""), freeGB, totalGB);
                        specs.StorageFreeText = string.Format("{0:F1} GB Free", freeGB);
                        specs.StorageUsedText = string.Format("{0:F1} GB Used ({1:F0}%)", usedGB, usedPercent);
                        specs.StorageUsedPercent = Math.Round(usedPercent, 1);
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] DriveInfo error: " + ex.Message); }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] GetSystemSpecs error: " + ex.Message); }
            return specs;
        }

        public static List<SoftwareHealthItem> ScanInstalledDesignSoftware()
        {
            var catalog = new[]
            {
                new { Icon = "🎨", Name = "Adobe Photoshop",   Keys = new[] { "Adobe Photoshop", "Photoshop" }, Folders = new[] { @"Adobe\Adobe Photoshop", @"Adobe Photoshop" }, Exes = new[] { "Photoshop.exe" }, Exts = new[] { ".psd" }, Url = "https://www.adobe.com/products/photoshop.html" },
                new { Icon = "✏️",  Name = "Adobe Illustrator", Keys = new[] { "Adobe Illustrator", "Illustrator" }, Folders = new[] { @"Adobe\Adobe Illustrator", @"Adobe Illustrator" }, Exes = new[] { "Illustrator.exe" }, Exts = new[] { ".ai" }, Url = "https://www.adobe.com/products/illustrator.html" },
                new { Icon = "🎞️", Name = "Adobe Premiere Pro", Keys = new[] { "Adobe Premiere Pro", "Premiere" }, Folders = new[] { @"Adobe\Adobe Premiere Pro", @"Adobe Premiere Pro" }, Exes = new[] { "Adobe Premiere Pro.exe" }, Exts = new[] { ".prproj" }, Url = "https://www.adobe.com/products/premiere.html" },
                new { Icon = "🎬", Name = "Adobe After Effects", Keys = new[] { "Adobe After Effects", "AfterFX" }, Folders = new[] { @"Adobe\Adobe After Effects", @"Adobe After Effects" }, Exes = new[] { "AfterFX.exe" }, Exts = new[] { ".aep" }, Url = "https://www.adobe.com/products/aftereffects.html" },
                new { Icon = "📄", Name = "Adobe InDesign",    Keys = new[] { "Adobe InDesign", "InDesign" }, Folders = new[] { @"Adobe\Adobe InDesign", @"Adobe InDesign" }, Exes = new[] { "InDesign.exe" }, Exts = new[] { ".indd" }, Url = "https://www.adobe.com/products/indesign.html" },
                new { Icon = "🌐", Name = "Adobe XD",          Keys = new[] { "Adobe XD" }, Folders = new[] { @"Adobe\Adobe XD", @"Adobe XD" }, Exes = new[] { "Adobe XD.exe" }, Exts = new[] { ".xd" }, Url = "https://helpx.adobe.com/support/xd.html" },
                new { Icon = "🖼️", Name = "Affinity Designer", Keys = new[] { "Affinity Designer", "Affinity Designer 2", "Affinity Designer 3", "Serif Affinity Designer", "Affinity" }, Folders = new[] { @"Affinity\Designer 2", @"Affinity\Designer 3", @"Affinity\Designer", @"Serif\Affinity Designer", @"Serif\Affinity Designer 2", @"Serif\Affinity Designer 3" }, Exes = new[] { "Designer.exe", "AffinityDesigner.exe" }, Exts = new[] { ".afdesign" }, Url = "https://affinity.serif.com/designer/" },
                new { Icon = "📸", Name = "Affinity Photo",    Keys = new[] { "Affinity Photo", "Affinity Photo 2", "Affinity Photo 3", "Serif Affinity Photo", "Affinity" }, Folders = new[] { @"Affinity\Photo 2", @"Affinity\Photo 3", @"Affinity\Photo", @"Serif\Affinity Photo", @"Serif\Affinity Photo 2", @"Serif\Affinity Photo 3" }, Exes = new[] { "Photo.exe", "AffinityPhoto.exe" }, Exts = new[] { ".afphoto" }, Url = "https://affinity.serif.com/photo/" },
                new { Icon = "🎨", Name = "Affinity by Canva (v3 / .af)", Keys = new[] { "Affinity by Canva", "Affinity 3", "Affinity V3", "Affinity Suite", "Serif Affinity", "Affinity" }, Folders = new[] { @"Affinity\Suite 3", @"Affinity\Designer 3", @"Affinity", @"Serif\Affinity", @"Serif" }, Exes = new[] { "Affinity.exe", "Designer.exe", "Photo.exe", "Publisher.exe" }, Exts = new[] { ".af", ".afdesign", ".afphoto", ".afpub" }, Url = "https://affinity.serif.com/" },
                new { Icon = "🖥️", Name = "Figma",             Keys = new[] { "Figma" }, Folders = new[] { "Figma" }, Exes = new[] { "Figma.exe" }, Exts = new string[] { }, Url = "https://www.figma.com/downloads/" },
                new { Icon = "🎨", Name = "Canva",             Keys = new[] { "Canva" }, Folders = new[] { "Canva" }, Exes = new[] { "Canva.exe" }, Exts = new string[] { }, Url = "https://www.canva.com/download/" },
                new { Icon = "📐", Name = "CorelDRAW",         Keys = new[] { "CorelDRAW" }, Folders = new[] { "CorelDRAW" }, Exes = new[] { "CorelDRW.exe" }, Exts = new[] { ".cdr" }, Url = "https://www.coreldraw.com/en/product/coreldraw/" },
            };

            // 1. Registry Lookup
            string[] uninstallPaths = new[]
            {
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\Serif\Affinity",
                @"SOFTWARE\Serif",
            };

            var found = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var hives = new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser };
            var views = new[] { RegistryView.Registry64, RegistryView.Registry32, RegistryView.Default };

            foreach (var hive in hives)
            {
                foreach (var view in views)
                {
                    foreach (string path in uninstallPaths)
                    {
                        try
                        {
                            using (var baseKey = RegistryKey.OpenBaseKey(hive, view))
                            using (var uninstall = baseKey.OpenSubKey(path))
                            {
                                if (uninstall == null) continue;
                                foreach (string subName in uninstall.GetSubKeyNames())
                                {
                                    try
                                    {
                                        using (var sub = uninstall.OpenSubKey(subName))
                                        {
                                            if (sub == null) continue;
                                            string displayName = sub.GetValue("DisplayName") as string ?? subName;
                                            string version    = sub.GetValue("DisplayVersion") as string ?? sub.GetValue("Version") as string ?? "";
                                            if (!string.IsNullOrEmpty(displayName))
                                                found[displayName] = version;
                                        }
                                    }
                                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                                }
                            }
                        }
                        catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                    }
                }
            }

            // Common base folders for direct filesystem checks
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

            string[] baseDirs = new[] { pf, pfx86, Path.Combine(localAppData, "Programs"), localAppData, appData, Path.Combine(userProfile, "AppData", "Local", "Microsoft", "WindowsApps") };

            var result = new List<SoftwareHealthItem>();
            foreach (var app in catalog)
            {
                string installedVersion = null;
                bool isInstalled = false;

                // A. Check Registry
                foreach (var kv in found)
                {
                    foreach (var key in app.Keys)
                    {
                        if (kv.Key.IndexOf(key, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            isInstalled = true;
                            installedVersion = kv.Value;
                            break;
                        }
                    }
                    if (isInstalled) break;
                }

                // B. Check Filesystem fallback if registry check did not catch it
                if (!isInstalled)
                {
                    foreach (string baseDir in baseDirs)
                    {
                        if (string.IsNullOrEmpty(baseDir) || !Directory.Exists(baseDir)) continue;
                        foreach (string folder in app.Folders)
                        {
                            string fullPath = Path.Combine(baseDir, folder);
                            if (Directory.Exists(fullPath))
                            {
                                isInstalled = true;
                                installedVersion = "Installed";

                                foreach (string exe in app.Exes)
                                {
                                    string exePath = Path.Combine(fullPath, exe);
                                    if (File.Exists(exePath))
                                    {
                                        try
                                        {
                                            var versionInfo = FileVersionInfo.GetVersionInfo(exePath);
                                            if (!string.IsNullOrEmpty(versionInfo.FileVersion))
                                            {
                                                installedVersion = versionInfo.FileVersion;
                                                break;
                                            }
                                        }
                                        catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[UserProfileService] FileVersionInfo error: " + ex.Message); }
                                    }
                                }
                                break;
                            }
                        }
                        if (isInstalled) break;
                    }
                }

                result.Add(new SoftwareHealthItem
                {
                    Icon              = app.Icon,
                    SoftwareName      = app.Name,
                    FileExtension     = app.Exts != null && app.Exts.Length > 0 ? app.Exts[0] : "-",
                    ScannedVersion    = isInstalled ? (string.IsNullOrEmpty(installedVersion) ? "Installed" : installedVersion) : "Not Installed",
                    IsInstalled       = isInstalled,
                    StatusText        = isInstalled ? "Installed" : "Not Installed",
                    StatusColor       = isInstalled ? "#059669" : "#64748B",
                    DownloadUrl       = isInstalled ? "" : app.Url,
                    ShowActionButton  = !isInstalled,
                });
            }
            return result;
        }

        public static void ClearAllDataAndCache()
        {
            try
            {
                string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat");
                if (Directory.Exists(path))
                {
                    foreach (string file in Directory.GetFiles(path))
                    {
                        File.Delete(file);
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }
    }
}
