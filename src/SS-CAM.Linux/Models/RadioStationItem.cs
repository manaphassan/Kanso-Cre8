namespace SS_CAM.Linux.Models
{
    public class RadioStationItem
    {
        public string Name { get; set; } = string.Empty;
        public string StreamUrl { get; set; } = string.Empty;
        public string Genre { get; set; } = string.Empty;
        public string Bitrate { get; set; } = "128 kbps";
        public string AccentColor { get; set; } = string.Empty;

        public RadioStationItem() { }

        public RadioStationItem(string name, string streamUrl, string genre, string accentColor = "", string bitrate = "128 kbps")
        {
            Name = name;
            StreamUrl = streamUrl;
            Genre = genre;
            AccentColor = accentColor;
            Bitrate = bitrate;
        }
    }
}
