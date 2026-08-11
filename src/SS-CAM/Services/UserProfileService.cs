using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Win32;
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
            if (string.IsNullOrWhiteSpace(profile.DesignerName))
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
            return new SystemSpecs();
        }

        public static List<SoftwareHealthItem> ScanInstalledDesignSoftware()
        {
            // Known design suite software to check for in the Windows registry
            var catalog = new[]
            {
                new { Icon = "🎨", Name = "Adobe Photoshop",        Key = "Adobe Photoshop",        Url = "https://www.adobe.com/products/photoshop.html" },
                new { Icon = "✏️",  Name = "Adobe Illustrator",      Key = "Adobe Illustrator",      Url = "https://www.adobe.com/products/illustrator.html" },
                new { Icon = "🎞️", Name = "Adobe Premiere Pro",     Key = "Adobe Premiere Pro",     Url = "https://www.adobe.com/products/premiere.html" },
                new { Icon = "🎬", Name = "Adobe After Effects",    Key = "Adobe After Effects",    Url = "https://www.adobe.com/products/aftereffects.html" },
                new { Icon = "📄", Name = "Adobe InDesign",         Key = "Adobe InDesign",         Url = "https://www.adobe.com/products/indesign.html" },
                new { Icon = "🌐", Name = "Adobe XD",               Key = "Adobe XD",               Url = "https://helpx.adobe.com/support/xd.html" },
                new { Icon = "🖼️", Name = "Affinity Designer",      Key = "Affinity Designer",      Url = "https://affinity.serif.com/designer/" },
                new { Icon = "📸", Name = "Affinity Photo",         Key = "Affinity Photo",         Url = "https://affinity.serif.com/photo/" },
                new { Icon = "🖥️", Name = "Figma",                  Key = "Figma",                  Url = "https://www.figma.com/downloads/" },
                new { Icon = "🎨", Name = "Canva",                  Key = "Canva",                  Url = "https://www.canva.com/download/" },
                new { Icon = "📐", Name = "CorelDRAW",              Key = "CorelDRAW",              Url = "https://www.coreldraw.com/en/product/coreldraw/" },
            };

            // Registry paths where software appears under Uninstall
            string[] uninstallPaths = new[]
            {
                @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            };

            // Build lookup: display name fragment → installed version
            var found = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var hives = new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser };

            foreach (var hive in hives)
            {
                foreach (string path in uninstallPaths)
                {
                    try
                    {
                        using (var baseKey = RegistryKey.OpenBaseKey(hive, RegistryView.Default))
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
                                        string displayName = sub.GetValue("DisplayName") as string ?? "";
                                        string version    = sub.GetValue("DisplayVersion") as string ?? "";
                                        if (!string.IsNullOrEmpty(displayName))
                                            found[displayName] = version;
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    catch { }
                }
            }

            var result = new List<SoftwareHealthItem>();
            foreach (var app in catalog)
            {
                // Find the first registry entry whose display name contains the keyword
                string installedVersion = null;
                foreach (var kv in found)
                {
                    if (kv.Key.IndexOf(app.Key, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        installedVersion = kv.Value;
                        break;
                    }
                }

                bool isInstalled = installedVersion != null;
                result.Add(new SoftwareHealthItem
                {
                    Icon              = app.Icon,
                    SoftwareName      = app.Name,
                    ScannedVersion    = isInstalled ? (string.IsNullOrEmpty(installedVersion) ? "Installed" : installedVersion) : "Not Installed",
                    IsInstalled       = isInstalled,
                    StatusText        = isInstalled ? "✅ Installed" : "⬜ Not Installed",
                    StatusColor       = isInstalled ? "#10B981" : "#94A3B8",
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
            catch { }
        }
    }
}
