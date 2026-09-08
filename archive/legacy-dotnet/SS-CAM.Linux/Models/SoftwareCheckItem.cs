namespace SS_CAM.Linux.Models
{
    public class SoftwareCheckItem
    {
        public string Name { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public bool IsInstalled { get; set; }
        public string? Version { get; set; }
        public string StatusText { get; set; } = string.Empty;
        public string StatusColor { get; set; } = "#34D399";
        public string StatusIcon => IsInstalled ? "✅" : "❌";
    }
}
