using System.Collections.Generic;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services
{
    public static class BrandAssetsService
    {
        public static List<ColorTokenItem> GetPrimaryPalette()
        {
            return new List<ColorTokenItem>
            {
                new ColorTokenItem
                {
                    Name = "SSH Prussian Blue",
                    Hex = "#022057",
                    Rgb = "2, 32, 87",
                    Cmyk = "98, 63, 0, 66",
                    Pantone = "Pantone 281 C",
                    Ral = "RAL 5013 (Cobalt Blue)",
                    CssToken = "--ss-prussian-blue",
                    Role = "Primary Dominant (30%)",
                    UsageRule = "Foundation structure, headers, and clinical authority backgrounds."
                },
                new ColorTokenItem
                {
                    Name = "SS Core Blue",
                    Hex = "#043388",
                    Rgb = "4, 51, 136",
                    Cmyk = "97, 63, 0, 47",
                    Pantone = "Pantone 287 C",
                    Ral = "RAL 5002 (Ultramarine Blue)",
                    CssToken = "--ss-blue",
                    Role = "Brand Core Seal",
                    UsageRule = "Core corporate identity, logomarks, and primary badges."
                },
                new ColorTokenItem
                {
                    Name = "SS Azure Accent",
                    Hex = "#21A1F7",
                    Rgb = "33, 161, 247",
                    Cmyk = "87, 35, 0, 3",
                    Pantone = "Pantone 299 C",
                    Ral = "RAL 5012 (Light Blue)",
                    CssToken = "--ss-azure",
                    Role = "Interactive Accent (10%)",
                    UsageRule = "Primary CTA buttons, active state indicators, and glowing highlights."
                },
                new ColorTokenItem
                {
                    Name = "Malibu Tint",
                    Hex = "#6DC6EC",
                    Rgb = "109, 198, 236",
                    Cmyk = "54, 16, 0, 7",
                    Pantone = "Pantone 297 C",
                    Ral = "RAL 5024 (Pastel Blue)",
                    CssToken = "--ss-malibu",
                    Role = "Tint Wash",
                    UsageRule = "Subtle card backgrounds, badges, and icon backdrops."
                },
                new ColorTokenItem
                {
                    Name = "Warm Gold",
                    Hex = "#BD9A73",
                    Rgb = "189, 154, 115",
                    Cmyk = "0, 19, 39, 26",
                    Pantone = "Pantone 465 C",
                    Ral = "RAL 1001 (Beige)",
                    CssToken = "--ss-warm-gold",
                    Role = "VIP & Premium Seal",
                    UsageRule = "Gold foil effects, premium tier product badges, and luxury accents."
                },
                new ColorTokenItem
                {
                    Name = "Care Emerald",
                    Hex = "#107C10",
                    Rgb = "16, 124, 16",
                    Cmyk = "87, 0, 87, 51",
                    Pantone = "Pantone 348 C",
                    Ral = "RAL 6029 (Mint Green)",
                    CssToken = "--ss-care-emerald",
                    Role = "Health & Herbal Trust",
                    UsageRule = "Organic ingredients, health claims, and success feedback."
                },
                new ColorTokenItem
                {
                    Name = "Tech Violet",
                    Hex = "#8B5CF6",
                    Rgb = "139, 92, 246",
                    Cmyk = "43, 63, 0, 4",
                    Pantone = "Pantone 2665 C",
                    Ral = "RAL 4005 (Blue Lilac)",
                    CssToken = "--ss-tech-violet",
                    Role = "Innovation & Platform",
                    UsageRule = "Digital products, AI automation tools, and developer features."
                }
            };
        }

        public static List<SubBrandPalette> GetSubBrandPalettes()
        {
            return new List<SubBrandPalette>
            {
                new SubBrandPalette
                {
                    BrandCode = "SSH",
                    BrandName = "SuamiSihat Holding",
                    PrimaryColorHex = "#022057",
                    AccentColorHex = "#21A1F7",
                    Tagline = "Corporate Holding, Operations & Clinical Formulations"
                },
                new SubBrandPalette
                {
                    BrandCode = "SSC",
                    BrandName = "SuamiSihat Care",
                    PrimaryColorHex = "#064E3B",
                    AccentColorHex = "#10B981",
                    Tagline = "Herbal Healthcare & Wellness Supplements"
                },
                new SubBrandPalette
                {
                    BrandCode = "SSW",
                    BrandName = "SuamiSihat Wellness",
                    PrimaryColorHex = "#78350F",
                    AccentColorHex = "#F59E0B",
                    Tagline = "Holistic Lifestyle, Fitness & Nutrition"
                },
                new SubBrandPalette
                {
                    BrandCode = "SSE",
                    BrandName = "SuamiSihat E-Commerce",
                    PrimaryColorHex = "#831843",
                    AccentColorHex = "#EC4899",
                    Tagline = "Direct-to-Consumer Marketplaces & Global Shipping"
                },
                new SubBrandPalette
                {
                    BrandCode = "SST",
                    BrandName = "SuamiSihat Technology",
                    PrimaryColorHex = "#312E81",
                    AccentColorHex = "#8B5CF6",
                    Tagline = "Digital Asset Management & AI Creative Pipelines"
                }
            };
        }
    }
}
