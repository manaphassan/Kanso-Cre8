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

        public UserProfile()
        {
            DesignerName = "Brand";
            StaffId = "0001D";
            Department = "Creative & Brand";
            Email = "brand@suamisihat.com";
            AvatarPath = "";
            WorkspaceRoot = @"D:\Testing";
            NextJobNumber = 1;
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
}
