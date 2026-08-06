using System;

namespace SS_CAM.Models
{
    public class RadioStation
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Genre { get; set; }
        public string StreamUrl { get; set; }
        public string IconEmoji { get; set; }
        public bool IsFavorite { get; set; }
        public bool IsPreset { get; set; }
        public string Description { get; set; }

        public RadioStation()
        {
            Id = Guid.NewGuid().ToString("N");
            IconEmoji = "📻";
            Genre = "General";
            IsFavorite = false;
            IsPreset = false;
        }
    }
}
