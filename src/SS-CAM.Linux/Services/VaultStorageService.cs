using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace SS_CAM.Linux.Services
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
        public string IconEmoji { get; set; }
        public string Description { get; set; }
    }

    public class VaultStorageService
    {
        private static VaultStorageService? _instance;
        public static VaultStorageService Instance => _instance ??= new VaultStorageService();

        public string VaultRootPath { get; private set; }
        public CloudProviderType ProviderType { get; private set; }
        public bool IsAvailable => !string.IsNullOrWhiteSpace(VaultRootPath) && Directory.Exists(VaultRootPath);

        public VaultStorageService()
        {
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var providers = GetDetectedCloudProviders();
            var detected = providers.FirstOrDefault(p => p.IsDetected);

            if (detected != null)
            {
                VaultRootPath = Path.Combine(detected.DefaultPath, "KansoCre8-Vault");
                ProviderType = detected.Type;
            }
            else
            {
                VaultRootPath = Path.Combine(home, "KansoCre8-Vault");
                ProviderType = CloudProviderType.LocalFolder;
            }
        }

        public static List<CloudProviderInfo> GetDetectedCloudProviders()
        {
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var list = new List<CloudProviderInfo>();

            // 1. Nextcloud / ownCloud Linux client
            string nextcloudPath = Path.Combine(home, "Nextcloud");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.Nextcloud,
                DisplayName = "Nextcloud",
                DefaultPath = nextcloudPath,
                IsDetected = Directory.Exists(nextcloudPath),
                IconEmoji = "☁️",
                Description = "Sync via Nextcloud Linux client"
            });

            // 2. Dropbox Linux daemon
            string dropboxPath = Path.Combine(home, "Dropbox");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.Dropbox,
                DisplayName = "Dropbox",
                DefaultPath = dropboxPath,
                IsDetected = Directory.Exists(dropboxPath),
                IconEmoji = "📦",
                Description = "Sync via Dropbox Linux client"
            });

            // 3. Synology Drive Linux client
            string synoPath = Path.Combine(home, "SynologyDrive");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.SynologyDrive,
                DisplayName = "Synology Drive",
                DefaultPath = synoPath,
                IsDetected = Directory.Exists(synoPath),
                IconEmoji = "🗄️",
                Description = "Sync via Synology Drive Linux client"
            });

            // 4. Local Linux Home Directory
            string localVault = Path.Combine(home, "KansoCre8-Vault");
            list.Add(new CloudProviderInfo
            {
                Type = CloudProviderType.LocalFolder,
                DisplayName = "Local Vault",
                DefaultPath = localVault,
                IsDetected = true,
                IconEmoji = "📁",
                Description = "Fast local NVMe / SSD vault"
            });

            return list;
        }

        public void SetVaultPath(string path, CloudProviderType providerType = CloudProviderType.LocalFolder)
        {
            if (string.IsNullOrWhiteSpace(path)) return;
            VaultRootPath = path;
            ProviderType = providerType;
            if (!Directory.Exists(VaultRootPath))
            {
                Directory.CreateDirectory(VaultRootPath);
            }
        }
    }
}
