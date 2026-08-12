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
        public int NextProjectNumber { get; set; }
        /// <summary>Persisted theme name: "Falconia" or "Metamorphosis".</summary>
        public string Theme { get; set; }
        /// <summary>JAKIM prayer time zone code, e.g. "WLY01".</summary>
        public string PrayerZone { get; set; }
        /// <summary>Whether adhan reminders are enabled.</summary>
        public bool PrayerRemindersEnabled { get; set; }
        /// <summary>Audio visualizer mode: "HeroMesh", "SpectrumBars", "Waveform", "PulsatingOrb".</summary>
        public string VisualizerMode { get; set; }

        public UserProfile()
        {
            DesignerName = "Brand";
            StaffId = "0001D";
            Department = "Creative & Brand";
            Email = "brand@suamisihat.com";
            AvatarPath = "";
            WorkspaceRoot = @"D:\Testing";
            NextProjectNumber = 1;
            Theme = "Falconia";
            PrayerZone = "WLY01";
            PrayerRemindersEnabled = true;
            VisualizerMode = "HeroMesh";
        }
    }

    public class SystemSpecs
    {
        public string OSVersion { get; set; }
        public string ProcessorName { get; set; }
        public string MotherboardModel { get; set; }
        public string TotalRAM { get; set; }
        public string GraphicsGPU { get; set; }
        public string AvailableStorage { get; set; }
        public string StorageFreeText { get; set; }
        public string StorageUsedText { get; set; }
        public double StorageUsedPercent { get; set; }
        public string DisplayResolution { get; set; }

        public SystemSpecs()
        {
            OSVersion = "Windows 11 (64-bit)";
            ProcessorName = "64-bit Multi-Core Processor";
            MotherboardModel = "BaseBoard System Board";
            TotalRAM = "16 GB RAM";
            GraphicsGPU = "DirectX 12 Compatible GPU";
            AvailableStorage = "Drive C: 84.9 GB free / 512.0 GB total";
            StorageFreeText = "84.9 GB Free";
            StorageUsedText = "427.1 GB Used (83%)";
            StorageUsedPercent = 83.0;
            DisplayResolution = "1920 x 1080";
        }
    }

    public class SoftwareHealthItem
    {
        public string Icon { get; set; }
        public string SoftwareName { get; set; }
        public string FileExtension { get; set; }
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
            FileExtension = "";
            ScannedVersion = "Not Installed";
            LatestVersion = "";
            StatusText = "Not Installed";
            StatusColor = "#64748B";
            IsInstalled = false;
            DownloadUrl = "";
            ShowActionButton = false;
        }
    }
}

