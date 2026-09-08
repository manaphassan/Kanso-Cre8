using System.Collections.Generic;

namespace SS_CAM.Linux.Models
{
    public class ColorTokenItem
    {
        public string Name { get; set; } = "";
        public string Hex { get; set; } = "";
        public string Rgb { get; set; } = "";
        public string Cmyk { get; set; } = "";
        public string Pantone { get; set; } = "";
        public string Ral { get; set; } = "";
        public string CssToken { get; set; } = "";
        public string Role { get; set; } = "";
        public string UsageRule { get; set; } = "";
        public string BackgroundBrush => Hex;
        public string TextBrush => (Hex == "#21A1F7" || Hex == "#BD9A73" || Hex == "#6DC6EC" || Hex == "#FEF3C7") ? "#022057" : "#FFFFFF";
    }

    public class SubBrandPalette
    {
        public string BrandCode { get; set; } = "";
        public string BrandName { get; set; } = "";
        public string PrimaryColorHex { get; set; } = "";
        public string AccentColorHex { get; set; } = "";
        public string Tagline { get; set; } = "";
        public List<ColorTokenItem> Swatches { get; set; } = new List<ColorTokenItem>();
    }
}
