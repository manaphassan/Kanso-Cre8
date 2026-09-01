using System;
using System.Collections.Generic;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services
{
    public static class CategoryPresetService
    {
        public static List<CategoryPreset> GetDefaultPresets()
        {
            return new List<CategoryPreset>
            {
                new CategoryPreset
                {
                    Id = "preset_graphic",
                    Name = "Graphic & Print Design",
                    Suffix = "D",
                    IsDefault = true,
                    SlaDays = 3,
                    SlotWeight = 1.0,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_social",
                    Name = "Social Media Campaign",
                    Suffix = "S",
                    IsDefault = true,
                    SlaDays = 2,
                    SlotWeight = 0.7,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_video",
                    Name = "Video Production (9:16 / 16:9)",
                    Suffix = "V",
                    IsDefault = true,
                    SlaDays = 7,
                    SlotWeight = 2.0,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_brand",
                    Name = "Brand Identity & Guidelines",
                    Suffix = "P",
                    IsDefault = true,
                    SlaDays = 10,
                    SlotWeight = 2.5,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_ecommerce",
                    Name = "E-Commerce / Marketplace",
                    Suffix = "E",
                    IsDefault = true,
                    SlaDays = 3,
                    SlotWeight = 1.0,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_web",
                    Name = "Web & Landing Page Design",
                    Suffix = "W",
                    IsDefault = true,
                    SlaDays = 5,
                    SlotWeight = 1.5,
                    Folders = new List<string> { "01_BRIEFS", "02_RAW_ASSETS", "03_WORKING_FILES", "04_EXPORTS", "05_DELIVERABLES" }
                }
            };
        }

        public static List<CanvasPlatformPreset> GetPlatformPresets()
        {
            return new List<CanvasPlatformPreset>
            {
                new CanvasPlatformPreset { Key = "WordPress", Title = "WordPress / Web", Resolution = "1920×1080", ColorSpace = "sRGB 72 DPI", IconSymbol = "🌐", Width = 1920, Height = 1080 },
                new CanvasPlatformPreset { Key = "1:1", Title = "1:1 Social Square", Resolution = "1080×1080", ColorSpace = "sRGB 72 DPI", IconSymbol = "📱", Width = 1080, Height = 1080 },
                new CanvasPlatformPreset { Key = "9:16", Title = "9:16 Reels / TikTok", Resolution = "1080×1920", ColorSpace = "sRGB 72 DPI", IconSymbol = "🎬", Width = 1080, Height = 1920 },
                new CanvasPlatformPreset { Key = "PrintA4", Title = "Print A4 Poster", Resolution = "2480×3508", ColorSpace = "CMYK 300 DPI", IconSymbol = "🖨️", Width = 2480, Height = 3508 }
            };
        }

        public static List<string> GetSubBrands()
        {
            return new List<string>
            {
                "SSH - SuamiSihat Holding",
                "SSC - SuamiSihat Care",
                "SSW - SuamiSihat Wellness",
                "SSE - SuamiSihat E-Commerce",
                "SST - SuamiSihat Technology"
            };
        }

        public static List<string> GetDesigners()
        {
            return new List<string>
            {
                "Harussani",
                "Adam",
                "Sarah",
                "Afif",
                "Syahmi"
            };
        }
    }
}
