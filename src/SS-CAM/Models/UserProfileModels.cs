using System;

namespace SS_CAM.Models
{
    public class UserProfile
    {
        public string DesignerName { get; set; }
        public string StaffId { get; set; }
        public string Department { get; set; }
        public string Email { get; set; }
        public string AvatarPath { get; set; }
        public string WorkspaceRoot { get; set; }
        public int NextJobNumber { get; set; }
        /// <summary>Persisted theme name: "SS Default" or "Metamorphosis".</summary>
        public string Theme { get; set; }
        /// <summary>JAKIM prayer time zone code, e.g. "WLY01".</summary>
        public string PrayerZone { get; set; }
        /// <summary>Whether adhan reminders are enabled.</summary>
        public bool PrayerRemindersEnabled { get; set; }

        public UserProfile()
        {
            DesignerName = "Brand";
            StaffId = "0001D";
            Department = "Creative & Brand";
            Email = "brand@suamisihat.com";
            AvatarPath = "";
            WorkspaceRoot = @"D:\Testing";
            NextJobNumber = 1;
            Theme = null;   // null = SS Default (ThemeService treats null as SSDefault)
            PrayerZone = "WLY01";
            PrayerRemindersEnabled = true;
        }
    }

    public class SystemSpecs
    {
        public string OSVersion { get; set; }
        public string ProcessorName { get; set; }
        public string TotalRAM { get; set; }
        public string GraphicsGPU { get; set; }
        public string AvailableStorage { get; set; }
        public string DisplayResolution { get; set; }

        public SystemSpecs()
        {
            OSVersion = "Windows 11 (64-bit)";
            ProcessorName = "64-bit Multi-Core Processor";
            TotalRAM = "16 GB RAM";
            GraphicsGPU = "DirectX 12 Compatible GPU";
            AvailableStorage = "Drive D: 100+ GB Free";
            DisplayResolution = "1920 x 1080";
        }
    }

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

        public SoftwareHealthItem()
        {
            Icon = "📦";
            SoftwareName = "";
            ScannedVersion = "Not Installed";
            LatestVersion = "";
            StatusText = "⚪ Not Installed";
            StatusColor = "#94A3B8";
            IsInstalled = false;
            DownloadUrl = "";
            ShowActionButton = false;
        }
    }
}
