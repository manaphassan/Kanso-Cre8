namespace SS_CAM.Linux.Models;

public class RadioStationItem
{
    public string Name { get; set; } = string.Empty;
    public string StreamUrl { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;

    public RadioStationItem() { }

    public RadioStationItem(string name, string streamUrl, string genre, string accentColor)
    {
        Name = name;
        StreamUrl = streamUrl;
        Genre = genre;
        AccentColor = accentColor;
    }
}
