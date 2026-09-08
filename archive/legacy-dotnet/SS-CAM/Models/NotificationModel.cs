using System;

namespace SS_CAM.Models
{
    public class NotificationItem
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public Services.NotificationType Type { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsRead { get; set; }
        public string ProjectPath { get; set; }

        public NotificationItem()
        {
            Id = Guid.NewGuid().ToString();
            Timestamp = DateTime.Now;
            IsRead = false;
        }

        public string TimeAgo
        {
            get
            {
                TimeSpan diff = DateTime.Now - Timestamp;
                if (diff.TotalSeconds < 60) return "Just now";
                if (diff.TotalMinutes < 60) return string.Format("{0}m ago", (int)diff.TotalMinutes);
                if (diff.TotalHours < 24) return string.Format("{0}h ago", (int)diff.TotalHours);
                return Timestamp.ToString("MMM dd");
            }
        }

        public string IconSymbol
        {
            get
            {
                switch (Type)
                {
                    case Services.NotificationType.Success:
                        return "CheckmarkCircle24";
                    case Services.NotificationType.Warning:
                        return "Warning24";
                    case Services.NotificationType.Error:
                        return "DismissCircle24";
                    default:
                        return "Info24";
                }
            }
        }

        public string TypeColorResource
        {
            get
            {
                switch (Type)
                {
                    case Services.NotificationType.Success:
                        return "SystemFillColorSuccessBrush";
                    case Services.NotificationType.Warning:
                        return "SystemFillColorCautionBrush";
                    case Services.NotificationType.Error:
                        return "SystemFillColorCriticalBrush";
                    default:
                        return "FluentBrand80";
                }
            }
        }
    }
}
