using System;

namespace SS_CAM.Services
{
    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }

    public class NotificationEventArgs : EventArgs
    {
        public string Title { get; set; }
        public string Message { get; set; }
        public NotificationType Type { get; set; }
        public int DurationMs { get; set; }

        public NotificationEventArgs(string title, string message, NotificationType type, int durationMs)
        {
            Title = title;
            Message = message;
            Type = type;
            DurationMs = durationMs;
        }
    }

    public static class NotificationService
    {
        public static event EventHandler<NotificationEventArgs> OnNotificationReceived;

        public static void Show(string title, string message, NotificationType type = NotificationType.Info, int durationMs = 4000)
        {
            EventHandler<NotificationEventArgs> handler = OnNotificationReceived;
            if (handler != null)
            {
                handler(null, new NotificationEventArgs(title, message, type, durationMs));
            }
        }

        public static void ShowInfo(string title, string message)
        {
            Show(title, message, NotificationType.Info, 4000);
        }

        public static void ShowSuccess(string title, string message)
        {
            Show(title, message, NotificationType.Success, 4000);
        }

        public static void ShowWarning(string title, string message)
        {
            Show(title, message, NotificationType.Warning, 5000);
        }

        public static void ShowError(string title, string message)
        {
            Show(title, message, NotificationType.Error, 6000);
        }
    }
}
