using System;

namespace SS_CAM.Models
{
    public class TeamNote
    {
        public string Id { get; set; }
        public string Author { get; set; }      // e.g. "0001D - Brand"
        public string StaffId { get; set; }     // e.g. "0001D"
        public string Timestamp { get; set; }   // ISO 8601 string
        public string Content { get; set; }
        public bool Pinned { get; set; }

        public TeamNote()
        {
            Id = Guid.NewGuid().ToString("N");
            Timestamp = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
            Pinned = false;
        }

        // Display helpers (no lambdas — C#5 compatible)
        public string DisplayTimestamp
        {
            get
            {
                DateTime dt;
                if (DateTime.TryParse(Timestamp, out dt))
                    return dt.ToString("dd MMM yyyy, HH:mm");
                return Timestamp;
            }
        }

        public string PinIcon { get { return Pinned ? "\uE840" : "\uE77F"; } }
        public string PinTooltip { get { return Pinned ? "Unpin" : "Pin to top"; } }
    }
}
