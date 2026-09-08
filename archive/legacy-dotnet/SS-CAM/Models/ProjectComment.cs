using System;
using System.Collections.Generic;

namespace SS_CAM.Models
{
    public class ProjectComment
    {
        public string Id { get; set; }
        public string ProjectId { get; set; }
        public string DeliverableId { get; set; }
        public string Author { get; set; }
        public string AuthorRole { get; set; }
        public string AuthorAvatar { get; set; }
        public string Content { get; set; }
        public List<string> Mentions { get; set; }
        public string Timestamp { get; set; }
        public bool Resolved { get; set; }

        public ProjectComment()
        {
            Id = string.Format("cmt_{0}_{1}", DateTime.UtcNow.Ticks, Guid.NewGuid().ToString("N").Substring(0, 4));
            Author = "Designer";
            AuthorRole = "User";
            AuthorAvatar = "#043388";
            Content = string.Empty;
            Mentions = new List<string>();
            Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            Resolved = false;
        }

        public string DisplayTimestamp
        {
            get
            {
                DateTime dt;
                if (DateTime.TryParse(Timestamp, out dt))
                    return dt.ToLocalTime().ToString("dd MMM yyyy, HH:mm");
                return Timestamp;
            }
        }

        public string ResolveStatusText
        {
            get
            {
                return Resolved ? "Resolved" : "Open";
            }
        }
    }
}
