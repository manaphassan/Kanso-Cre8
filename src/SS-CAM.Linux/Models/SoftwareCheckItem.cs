namespace SS_CAM.Linux.Models;

public class SoftwareCheckItem
{
    public string Name        { get; set; } = string.Empty;
    public bool   IsInstalled { get; set; }
    public string? Version    { get; set; }

    public string StatusIcon  => IsInstalled ? "✅" : "❌";
    public string StatusColor => IsInstalled ? "#34D399" : "#F87171";
}
