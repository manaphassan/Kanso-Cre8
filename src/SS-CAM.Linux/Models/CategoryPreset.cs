using System.Collections.Generic;

namespace SS_CAM.Linux.Models
{
    public class CategoryPreset
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Suffix { get; set; } = "D";
        public bool IsDefault { get; set; } = false;
        public int SlaDays { get; set; } = 3;
        public double SlotWeight { get; set; } = 1.0;
        public List<string> Folders { get; set; } = new List<string>();
    }

    public class CanvasPlatformPreset
    {
        public string Key { get; set; } = "";
        public string Title { get; set; } = "";
        public string Resolution { get; set; } = "";
        public string ColorSpace { get; set; } = "RGB 72 DPI";
        public string IconSymbol { get; set; } = "🌐";
        public int Width { get; set; } = 1920;
        public int Height { get; set; } = 1080;
    }
}
