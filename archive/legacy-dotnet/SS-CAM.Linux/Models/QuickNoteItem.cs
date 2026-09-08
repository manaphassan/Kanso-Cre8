using System;

namespace SS_CAM.Linux.Models
{
    public class QuickNoteItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = "Untitled Note";
        public string Content { get; set; } = "";
        public string Category { get; set; } = "General";
        public string CreatedDate { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm");
        public bool IsPinned { get; set; } = false;
    }
}
