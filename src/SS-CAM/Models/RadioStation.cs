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
        public string CoverImageUrl { get; set; }   // Remote CDN URL (optional)
        public string LocalCoverPath { get; set; }  // Cached local JPEG path
        public string Language { get; set; }         // e.g. "Malay", "English"
        public string Country { get; set; }          // e.g. "Malaysia"

        public RadioStation()
        {
            Id = Guid.NewGuid().ToString("N");
            IconEmoji = "\uD83D\uDCFB";
            Genre = "General";
            IsFavorite = false;
            IsPreset = false;
            Language = "English";
            Country = "Malaysia";
        }

        // Station initials for the fallback placeholder tile
        public string Initials
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Name)) return "?";
                string[] parts = Name.Split(new char[] { ' ' }, System.StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2) return (parts[0][0].ToString() + parts[1][0].ToString()).ToUpper();
                return Name.Length >= 2 ? Name.Substring(0, 2).ToUpper() : Name.ToUpper();
            }
        }

        public bool HasLocalCover
        {
            get { return !string.IsNullOrWhiteSpace(LocalCoverPath) && System.IO.File.Exists(LocalCoverPath); }
        }

        /// <summary>
        /// Segoe Fluent Icons glyph for the favourite toggle button on station cards.
        /// Filled star (\uE735) when favourite, outline star (\uE734) otherwise.
        /// </summary>
        public string FavIcon
        {
            get { return IsFavorite ? "\uE735" : "\uE734"; }
        }
    }
}
