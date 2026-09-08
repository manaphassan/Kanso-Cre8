using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public enum CloudProviderType
    {
        LocalFolder,
        Dropbox,
        GoogleDrive,
        OneDrive,
        SynologyDrive,
        Nextcloud,
        CustomNetworkShare
    }

    public class CloudProviderInfo
    {
        public CloudProviderType Type { get; set; }
        public string DisplayName { get; set; }
        public string DefaultPath { get; set; }
        public bool IsDetected { get; set; }
        public string IconSymbol { get; set; }
        public string Description { get; set; }
    }

    public interface IVaultStorageProvider
    {
        string VaultRootPath { get; }
        CloudProviderType ProviderType { get; }
        bool IsAvailable { get; }
        bool EnsureVaultHierarchy();
        string GetYearFolderPath(string year);
        string GetMonthFolderPath(string year, string monthName);
        string GetProjectPath(string year, string monthFolder, string projectFolder);
    }

    public class VaultStorageService : IVaultStorageProvider
    {
        private static VaultStorageService _instance;
        public static VaultStorageService Instance => _instance ??= new VaultStorageService();

        public string VaultRootPath { get; private set; }
        public CloudProviderType ProviderType { get; private set; }
        public bool IsAvailable => !string.IsNullOrWhiteSpace(VaultRootPath) && Directory.Exists(VaultRootPath);

        public VaultStorageService()
        {
            InitializeFromProfile();
        }

        public void InitializeFromProfile()
        {
            try
            {
                var profile = UserProfileService.LoadProfile();
                if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot) && Directory.Exists(profile.WorkspaceRoot))
                {
                    VaultRootPath = profile.WorkspaceRoot;
                    ProviderType = DetectProviderType(VaultRootPath);
                    return;
                }

                // Fallback detection
                var detected = GetDetectedCloudProviders().FirstOrDefault(p => p.IsDetected);
                if (detected != null)
                {
                    VaultRootPath = Path.Combine(detected.DefaultPath, "KansoCre8-Vault");
                    ProviderType = detected.Type;
                }
                else
                {
                    string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                    VaultRootPath = Path.Combine(home, "Documents", "KansoCre8-Vault");
                    ProviderType = CloudProviderType.LocalFolder;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[VaultStorageService] Init error: " + ex.Message);
                string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                VaultRootPath = Path.Combine(home, "Documents", "KansoCre8-Vault");
                ProviderType = CloudProviderType.LocalFolder;
            }
        }

        public void SetVaultPath(string path, CloudProviderType providerType = CloudProviderType.LocalFolder)
        {
            if (string.IsNullOrWhiteSpace(path)) return;
            VaultRootPath = path;
            ProviderType = providerType;
            EnsureVaultHierarchy();

            try
            {
                var profile = UserProfileService.LoadProfile() ?? new UserProfile();
                profile.WorkspaceRoot = path;
                UserProfileService.SaveProfile(profile);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[VaultStorageService] SaveProfile error: " + ex.Message);
            }
        }

        public static List<CloudProviderInfo> GetDetectedCloudProviders()
        {
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            var list = new List<CloudProviderInfo>();

            // 1. Google Drive (Virtual G: or sync folder)
            string gDrivePath = Directory.Exists(@"G:\My Drive") ? @"G:\My Drive" : Path.Combine(userProfile, "Google Drive");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.GoogleDrive,
                DisplayName = "Google Drive",
                DefaultPath = gDrivePath,
                IsDetected = Directory.Exists(gDrivePath),
                IconSymbol = "Cloud24",
                Description = "Sync via Google Drive for Desktop"
            });

            // 2. Dropbox
            string dropboxPath = Path.Combine(userProfile, "Dropbox");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.Dropbox,
                DisplayName = "Dropbox",
                DefaultPath = dropboxPath,
                IsDetected = Directory.Exists(dropboxPath),
                IconSymbol = "Cloud24",
                Description = "Sync via Dropbox desktop daemon"
            });

            // 3. Microsoft OneDrive
            string oneDrivePath = Environment.GetEnvironmentVariable("OneDrive") ?? Path.Combine(userProfile, "OneDrive");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.OneDrive,
                DisplayName = "Microsoft OneDrive",
                DefaultPath = oneDrivePath,
                IsDetected = Directory.Exists(oneDrivePath),
                IconSymbol = "Cloud24",
                Description = "Sync via Windows OneDrive integration"
            });

            // 4. Synology Drive
            string synoPath = Path.Combine(userProfile, "SynologyDrive");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.SynologyDrive,
                DisplayName = "Synology Drive",
                DefaultPath = synoPath,
                IsDetected = Directory.Exists(synoPath),
                IconSymbol = "Server24",
                Description = "Sync via Synology Drive Client"
            });

            // 5. Nextcloud / ownCloud
            string nextcloudPath = Path.Combine(userProfile, "Nextcloud");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.Nextcloud,
                DisplayName = "Nextcloud",
                DefaultPath = nextcloudPath,
                IsDetected = Directory.Exists(nextcloudPath),
                IconSymbol = "Cloud24",
                Description = "Self-hosted Nextcloud / WebDAV sync"
            });

            // 6. Local Documents / NVMe
            string localDocs = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "KansoCre8-Vault");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.LocalFolder,
                DisplayName = "Local Drive (Offline / Custom)",
                DefaultPath = localDocs,
                IsDetected = true,
                IconSymbol = "Folder24",
                Description = "Fast local NVMe / SSD folder"
            });

            return list;
        }

        public CloudProviderType DetectProviderType(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return CloudProviderType.LocalFolder;
            string lower = path.ToLowerInvariant();

            if (lower.Contains("dropbox")) return CloudProviderType.Dropbox;
            if (lower.Contains("google drive") || lower.StartsWith("g:\\")) return CloudProviderType.GoogleDrive;
            if (lower.Contains("onedrive")) return CloudProviderType.OneDrive;
            if (lower.Contains("synologydrive") || lower.Contains("ssnas") || lower.Contains("nas")) return CloudProviderType.SynologyDrive;
            if (lower.Contains("nextcloud") || lower.Contains("owncloud")) return CloudProviderType.Nextcloud;
            if (lower.StartsWith(@"\\")) return CloudProviderType.CustomNetworkShare;

            return CloudProviderType.LocalFolder;
        }

        public bool EnsureVaultHierarchy()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(VaultRootPath)) return false;
                if (!Directory.Exists(VaultRootPath))
                {
                    Directory.CreateDirectory(VaultRootPath);
                }

                string currentYear = DateTime.Now.Year.ToString();
                string yearFolder = Path.Combine(VaultRootPath, currentYear);
                if (!Directory.Exists(yearFolder)) Directory.CreateDirectory(yearFolder);

                string configFolder = Path.Combine(VaultRootPath, "_Config");
                if (!Directory.Exists(configFolder)) Directory.CreateDirectory(configFolder);

                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[VaultStorageService] EnsureHierarchy error: " + ex.Message);
                return false;
            }
        }

        public string GetYearFolderPath(string year)
        {
            return Path.Combine(VaultRootPath, year);
        }

        public string GetMonthFolderPath(string year, string monthName)
        {
            return Path.Combine(VaultRootPath, year, monthName);
        }

        public string GetProjectPath(string year, string monthFolder, string projectFolder)
        {
            return Path.Combine(VaultRootPath, year, monthFolder, projectFolder);
        }
    }
}
